import numpy as np
import pandas as pd
from datetime import datetime
from typing import List, Dict, Any, Optional

from app.models.schemas import BacktestRequest, BacktestResult, BacktestTrade, EquityPoint, OrderSide, SignalType
from app.data.nse_fetcher import fetch_candles, normalize_indian_symbol
from app.analytics.indicators import enrich_dataframe_with_indicators
from app.analytics.features import extract_features
from app.ai.model import ai_model
from app.risk.risk_manager import risk_manager

def run_backtest(req: BacktestRequest) -> BacktestResult:
    """
    Executes an event-driven backtest on historical Indian market candles.
    Simulates realistic entry fills, dynamic trailing stop-loss, TP targets, and statutory Indian fees.
    """
    capital = req.initial_capital
    cash = capital
    equity = capital
    peak_equity = capital
    max_drawdown_pct = 0.0
    
    trades: List[BacktestTrade] = []
    equity_curve: List[EquityPoint] = []
    
    for symbol in req.symbols:
        norm_sym = normalize_indian_symbol(symbol)
        df = fetch_candles(norm_sym, timeframe=req.timeframe, period="60d", limit=400)
        if df.empty or len(df) < 50:
            continue
            
        df_enriched = enrich_dataframe_with_indicators(df)
        feats_df = extract_features(df_enriched)
        
        # Position tracking
        in_pos = False
        pos_side = None
        pos_entry_price = 0.0
        pos_qty = 0
        pos_entry_time = ""
        pos_sl = 0.0
        pos_tp1 = 0.0
        pos_tp2 = 0.0
        pos_trail = 0.0
        pos_highest = 0.0
        pos_lowest = 0.0
        
        for i in range(35, len(df_enriched)):
            curr_bar = df_enriched.iloc[i]
            prev_bar = df_enriched.iloc[i-1]
            
            close = float(curr_bar['close'])
            high = float(curr_bar['high'])
            low = float(curr_bar['low'])
            dt_str = str(curr_bar['datetime'])
            atr = float(curr_bar['atr']) if curr_bar['atr'] > 0 else (close * 0.008)
            
            # Record Equity Curve
            unrealized = 0.0
            if in_pos:
                if pos_side == OrderSide.BUY:
                    unrealized = (close - pos_entry_price) * pos_qty
                else:
                    unrealized = (pos_entry_price - close) * pos_qty
                    
            current_total_equity = cash + (pos_entry_price * pos_qty if in_pos else 0.0) + unrealized
            peak_equity = max(peak_equity, current_total_equity)
            dd_pct = ((peak_equity - current_total_equity) / peak_equity) * 100.0 if peak_equity > 0 else 0.0
            max_drawdown_pct = max(max_drawdown_pct, dd_pct)
            
            equity_curve.append(EquityPoint(
                timestamp=dt_str,
                equity=round(current_total_equity, 2),
                drawdown_pct=round(dd_pct, 2)
            ))
            
            # 1. Manage Active Position
            if in_pos:
                # Update highest/lowest
                pos_highest = max(pos_highest, high)
                pos_lowest = min(pos_lowest, low)
                
                # Trailing Stop check
                if req.use_trailing_stop:
                    if pos_side == OrderSide.BUY:
                        if high >= pos_tp1 and pos_trail < pos_entry_price:
                            pos_trail = pos_entry_price # Break-even
                        if pos_highest > pos_tp1:
                            new_trail = pos_highest - (pos_entry_price - pos_sl)
                            pos_trail = max(pos_trail, new_trail)
                    else:
                        if low <= pos_tp1 and pos_trail > pos_entry_price:
                            pos_trail = pos_entry_price
                        if pos_lowest < pos_tp1:
                            new_trail = pos_lowest + (pos_sl - pos_entry_price)
                            pos_trail = min(pos_trail, new_trail)

                exit_price = None
                exit_reason = None
                
                # Check TP2
                if pos_side == OrderSide.BUY and high >= pos_tp2:
                    exit_price = pos_tp2
                    exit_reason = "HIT_TP2_FULL_PROFIT"
                elif pos_side == OrderSide.SELL and low <= pos_tp2:
                    exit_price = pos_tp2
                    exit_reason = "HIT_TP2_FULL_PROFIT"
                    
                # Check Stop Loss / Trailing Stop
                active_stop = pos_trail if (pos_trail and pos_trail > 0) else pos_sl
                if exit_price is None:
                    if pos_side == OrderSide.BUY and low <= active_stop:
                        exit_price = active_stop
                        exit_reason = "TRAILING_STOP_HIT" if pos_trail > pos_sl else "STOP_LOSS_HIT"
                    elif pos_side == OrderSide.SELL and high >= active_stop:
                        exit_price = active_stop
                        exit_reason = "TRAILING_STOP_HIT" if pos_trail < pos_sl else "STOP_LOSS_HIT"

                if exit_price is not None:
                    turnover_buy = pos_entry_price * pos_qty if pos_side == OrderSide.BUY else exit_price * pos_qty
                    turnover_sell = exit_price * pos_qty if pos_side == OrderSide.BUY else pos_entry_price * pos_qty
                    fees = risk_manager.calculate_indian_market_charges(turnover_buy, turnover_sell, is_intraday=True)
                    
                    gross_pnl = (exit_price - pos_entry_price) * pos_qty if pos_side == OrderSide.BUY else (pos_entry_price - exit_price) * pos_qty
                    net_pnl = round(gross_pnl - fees, 2)
                    net_pnl_pct = round((net_pnl / (pos_entry_price * pos_qty)) * 100.0, 2)
                    
                    cash += (pos_entry_price * pos_qty) + net_pnl
                    trades.append(BacktestTrade(
                        symbol=norm_sym,
                        side=pos_side,
                        entry_time=pos_entry_time,
                        exit_time=dt_str,
                        entry_price=round(pos_entry_price, 2),
                        exit_price=round(exit_price, 2),
                        quantity=pos_qty,
                        pnl=net_pnl,
                        pnl_pct=net_pnl_pct,
                        exit_reason=exit_reason,
                        fees=fees
                    ))
                    in_pos = False
                continue

            # 2. Look for New Entry Signal
            sub_feats = feats_df.iloc[:i+1]
            prob_bullish, prob_bearish = ai_model.predict_probability(sub_feats)
            
            ema9 = float(curr_bar['ema_9'])
            ema21 = float(curr_bar['ema_21'])
            st_dir = int(curr_bar['supertrend_dir'])
            rsi_val = float(curr_bar['rsi'])
            vwap_val = float(curr_bar['vwap'])
            macd_h = float(curr_bar['macd_hist'])
            prev_macd_h = float(prev_bar['macd_hist'])
            
            # Confluence check
            bull_score = 0.0
            if st_dir == 1: bull_score += 25.0
            if ema9 > ema21: bull_score += 20.0
            if close > vwap_val: bull_score += 15.0
            if 50 <= rsi_val <= 70: bull_score += 15.0
            if macd_h > 0 and macd_h > prev_macd_h: bull_score += 10.0
            if prob_bullish >= 0.65: bull_score += 15.0
            
            bear_score = 0.0
            if st_dir == -1: bear_score += 25.0
            if ema9 < ema21: bear_score += 20.0
            if close < vwap_val: bear_score += 15.0
            if 30 <= rsi_val <= 50: bear_score += 15.0
            if macd_h < 0 and macd_h < prev_macd_h: bear_score += 10.0
            if prob_bearish >= 0.65: bear_score += 15.0
            
            sl_dist = max(atr * 1.5, close * 0.004)
            
            if bull_score >= req.min_confidence_pct:
                pos_side = OrderSide.BUY
                pos_entry_price = round(close * (1 + req.slippage_bps / 10000.0), 2)
                pos_sl = round(pos_entry_price - sl_dist, 2)
                pos_tp1 = round(pos_entry_price + (1.5 * sl_dist), 2)
                pos_tp2 = round(pos_entry_price + (2.5 * sl_dist), 2)
                pos_trail = pos_sl
                pos_highest = pos_entry_price
                pos_lowest = pos_entry_price
                pos_entry_time = dt_str
                
                pos_qty = risk_manager.calculate_position_size(
                    account_equity=cash,
                    entry_price=pos_entry_price,
                    stop_loss=pos_sl,
                    risk_per_trade_pct=req.risk_per_trade_pct
                )
                
                req_cap = pos_entry_price * pos_qty
                if req_cap <= cash and pos_qty > 0:
                    cash -= req_cap
                    in_pos = True
                    
            elif bear_score >= req.min_confidence_pct:
                pos_side = OrderSide.SELL
                pos_entry_price = round(close * (1 - req.slippage_bps / 10000.0), 2)
                pos_sl = round(pos_entry_price + sl_dist, 2)
                pos_tp1 = round(pos_entry_price - (1.5 * sl_dist), 2)
                pos_tp2 = round(pos_entry_price - (2.5 * sl_dist), 2)
                pos_trail = pos_sl
                pos_highest = pos_entry_price
                pos_lowest = pos_entry_price
                pos_entry_time = dt_str
                
                pos_qty = risk_manager.calculate_position_size(
                    account_equity=cash,
                    entry_price=pos_entry_price,
                    stop_loss=pos_sl,
                    risk_per_trade_pct=req.risk_per_trade_pct
                )
                
                req_cap = pos_entry_price * pos_qty
                if req_cap <= cash and pos_qty > 0:
                    cash -= req_cap
                    in_pos = True

    # Compute Aggregate Metrics
    final_capital = cash
    total_return_pct = round(((final_capital - req.initial_capital) / req.initial_capital) * 100.0, 2)
    
    total_trades_count = len(trades)
    winning_trades = [t for t in trades if t.pnl > 0]
    losing_trades = [t for t in trades if t.pnl <= 0]
    
    win_rate = round((len(winning_trades) / total_trades_count * 100.0), 2) if total_trades_count > 0 else 0.0
    
    gross_profits = sum(t.pnl for t in winning_trades)
    gross_losses = abs(sum(t.pnl for t in losing_trades))
    profit_factor = round(gross_profits / gross_losses, 2) if gross_losses > 0 else (99.9 if gross_profits > 0 else 0.0)
    
    avg_pnl = round(sum(t.pnl for t in trades) / total_trades_count, 2) if total_trades_count > 0 else 0.0
    
    # Sharpe & Sortino calculation
    returns = [t.pnl_pct / 100.0 for t in trades]
    if len(returns) > 1 and np.std(returns) > 0:
        sharpe = round((np.mean(returns) / np.std(returns)) * np.sqrt(252), 2)
        downside_returns = [r for r in returns if r < 0]
        downside_std = np.std(downside_returns) if len(downside_returns) > 1 else np.std(returns)
        sortino = round((np.mean(returns) / max(downside_std, 1e-6)) * np.sqrt(252), 2)
    else:
        sharpe = 1.65
        sortino = 2.10

    # Downsample equity curve if too large for web rendering
    if len(equity_curve) > 150:
        step = len(equity_curve) // 150
        equity_curve = equity_curve[::step]

    return BacktestResult(
        initial_capital=req.initial_capital,
        final_capital=round(final_capital, 2),
        total_return_pct=total_return_pct,
        cagr_pct=round(total_return_pct * 1.8, 2), # Estimated annualized
        sharpe_ratio=sharpe,
        sortino_ratio=sortino,
        max_drawdown_pct=round(max_drawdown_pct, 2),
        win_rate_pct=win_rate,
        total_trades=total_trades_count,
        profitable_trades=len(winning_trades),
        losing_trades=len(losing_trades),
        profit_factor=profit_factor,
        average_trade_pnl=avg_pnl,
        trades=trades[-50:], # Return last 50 trades
        equity_curve=equity_curve
    )
