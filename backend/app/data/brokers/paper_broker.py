import uuid
from datetime import datetime
from typing import List, Dict, Any, Optional

from app.data.brokers.base_broker import BaseBroker
from app.models.schemas import AISignal, TradePosition, OrderSide, PositionStatus, SignalType
from app.database import (
    save_trade, get_trades, get_portfolio_balance,
    update_portfolio_balance
)
from app.risk.risk_manager import risk_manager
from app.config import settings

class PaperBroker(BaseBroker):
    """
    Real-Time Indian Market Paper Trading Simulator.
    Uses institutional exchange equity & margin accounting:
    - Total Equity = Initial Capital + Realized PnL + Unrealized PnL
    - Available Free Cash = Total Equity - Allocated Margin
    - Accurate STT, Brokerage (₹20), GST, Exchange fee deductions on every closed trade.
    """
    
    def __init__(self):
        self.slippage_bps = 2.0 # 0.02% realistic liquid slippage

    def get_account_balance(self) -> Dict[str, Any]:
        bal = get_portfolio_balance()
        initial_equity = bal.get("initial_equity", settings.risk.account_equity)
        
        # Realized PnL from closed trades
        closed_trades = get_trades(status="CLOSED")
        realized_pnl = sum(t.get("pnl", 0.0) for t in closed_trades)
        
        # Open positions & floating unrealized PnL
        open_trades = self.get_open_positions()
        unrealized_pnl = sum(t.pnl for t in open_trades)
        allocated_margin = sum(t.entry_price * t.quantity for t in open_trades)
        
        # Institutional Equity Formula
        total_equity = initial_equity + realized_pnl + unrealized_pnl
        available_cash = max(0.0, total_equity - allocated_margin)
        
        return {
            "cash_balance": round(available_cash, 2),
            "allocated_margin": round(allocated_margin, 2),
            "invested_capital": round(allocated_margin, 2),
            "unrealized_pnl": round(unrealized_pnl, 2),
            "realized_pnl": round(realized_pnl, 2),
            "total_equity": round(total_equity, 2),
            "initial_equity": round(initial_equity, 2),
            "broker_name": f"Paper Trading Simulator (₹{initial_equity:,.0f} Initial)",
            "broker_mode": "paper",
            "is_live": False
        }

    def get_open_positions(self) -> List[TradePosition]:
        raw_trades = get_trades(status="OPEN")
        return [TradePosition(**t) for t in raw_trades]

    def execute_signal(self, signal: AISignal, quantity: int) -> Optional[TradePosition]:
        """Executes a real-time order strictly within available free cash margin."""
        bal = self.get_account_balance()
        
        slippage_factor = (1 + (self.slippage_bps / 10000.0)) if signal.signal_type == SignalType.BUY else (1 - (self.slippage_bps / 10000.0))
        fill_price = round(signal.entry_price * slippage_factor, 2)
        
        required_capital = fill_price * quantity
        if required_capital > bal["cash_balance"]:
            quantity = int(bal["cash_balance"] / fill_price)
            if quantity <= 0:
                return None
            required_capital = fill_price * quantity

        side = OrderSide.BUY if signal.signal_type == SignalType.BUY else OrderSide.SELL
        now_str = datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')
        
        pos_id = f"pos_{uuid.uuid4().hex[:10]}"
        position = TradePosition(
            id=pos_id,
            signal_id=signal.id,
            symbol=signal.symbol,
            side=side,
            entry_price=fill_price,
            quantity=quantity,
            current_price=fill_price,
            stop_loss=signal.stop_loss,
            target_1=signal.target_1,
            target_2=signal.target_2,
            trailing_stop=signal.stop_loss,
            pnl=0.0,
            pnl_pct=0.0,
            status=PositionStatus.OPEN,
            entry_time=now_str,
            highest_price=fill_price,
            lowest_price=fill_price,
            fees_incurred=0.0
        )
        
        save_trade(position.model_dump())
        return position

    def close_position(self, position_id: str, reason: str = "MANUAL_CLOSE", exit_price: Optional[float] = None) -> Optional[TradePosition]:
        """Closes an open position at current real-time market price and settles net PnL and Indian fees."""
        open_positions = self.get_open_positions()
        pos = next((p for p in open_positions if p.id == position_id), None)
        if not pos:
            return None
            
        now_str = datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')
        actual_exit_price = exit_price if exit_price is not None else pos.current_price
        
        turnover_buy = pos.entry_price * pos.quantity if pos.side == OrderSide.BUY else actual_exit_price * pos.quantity
        turnover_sell = actual_exit_price * pos.quantity if pos.side == OrderSide.BUY else pos.entry_price * pos.quantity
        
        fees = risk_manager.calculate_indian_market_charges(turnover_buy, turnover_sell, is_intraday=True)
        
        if pos.side == OrderSide.BUY:
            gross_pnl = (actual_exit_price - pos.entry_price) * pos.quantity
        else:
            gross_pnl = (pos.entry_price - actual_exit_price) * pos.quantity
            
        net_pnl = round(gross_pnl - fees, 2)
        net_pnl_pct = round((net_pnl / (pos.entry_price * pos.quantity)) * 100.0, 2)
        
        pos.status = PositionStatus.CLOSED
        pos.exit_time = now_str
        pos.exit_price = actual_exit_price
        pos.current_price = actual_exit_price
        pos.exit_reason = reason
        pos.pnl = net_pnl
        pos.pnl_pct = net_pnl_pct
        pos.fees_incurred = fees
        
        # Settle streak for risk cooldown
        risk_manager.record_trade_result(is_profitable=(net_pnl > 0))
        
        save_trade(pos.model_dump())
        return pos

    def partial_close(self, position_id: str, close_qty: int, reason: str = "PARTIAL_TP1") -> Optional[TradePosition]:
        """Closes a partial fraction of the position (e.g. 50% at Target 1) to lock profits."""
        open_positions = self.get_open_positions()
        pos = next((p for p in open_positions if p.id == position_id), None)
        if not pos or close_qty <= 0 or close_qty >= pos.quantity:
            return None
            
        actual_exit_price = pos.current_price
        turnover_buy = pos.entry_price * close_qty if pos.side == OrderSide.BUY else actual_exit_price * close_qty
        turnover_sell = actual_exit_price * close_qty if pos.side == OrderSide.BUY else pos.entry_price * close_qty
        fees = risk_manager.calculate_indian_market_charges(turnover_buy, turnover_sell, is_intraday=True)
        
        if pos.side == OrderSide.BUY:
            gross_pnl = (actual_exit_price - pos.entry_price) * close_qty
        else:
            gross_pnl = (pos.entry_price - actual_exit_price) * close_qty
            
        net_pnl = round(gross_pnl - fees, 2)
        
        # Record partial closure as a closed sub-trade
        partial_trade = TradePosition(
            id=f"{pos.id}_part",
            signal_id=pos.signal_id,
            symbol=pos.symbol,
            side=pos.side,
            entry_price=pos.entry_price,
            quantity=close_qty,
            current_price=actual_exit_price,
            stop_loss=pos.stop_loss,
            target_1=pos.target_1,
            target_2=pos.target_2,
            trailing_stop=pos.trailing_stop,
            pnl=net_pnl,
            pnl_pct=round((net_pnl / (pos.entry_price * close_qty)) * 100.0, 2),
            status=PositionStatus.CLOSED,
            entry_time=pos.entry_time,
            exit_time=datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S'),
            exit_price=actual_exit_price,
            exit_reason=reason,
            fees_incurred=fees
        )
        save_trade(partial_trade.model_dump())
        
        # Update remaining open position
        pos.quantity -= close_qty
        save_trade(pos.model_dump())
        return pos

    def lock_breakeven(self, position_id: str) -> Optional[TradePosition]:
        """Instantly shifts stop loss to break-even + statutory charges cover."""
        open_positions = self.get_open_positions()
        pos = next((p for p in open_positions if p.id == position_id), None)
        if not pos:
            return None
            
        be_price = risk_manager.calculate_breakeven_price(pos.entry_price, pos.quantity, pos.side)
        pos.trailing_stop = be_price
        pos.stop_loss = be_price
        save_trade(pos.model_dump())
        return pos

    def update_positions_with_market_tick(self, symbol: str, current_price: float) -> List[Dict[str, Any]]:
        """
        Real-Time Sub-Second Tick Evaluator:
        - Updates live floating PnL
        - Shifts Stop Loss to Break-Even at 1.0R
        - Dynamic trailing stops
        - Exits at Target 2 or Trailing Stop
        """
        events = []
        open_positions = self.get_open_positions()
        
        for pos in open_positions:
            if pos.symbol != symbol:
                continue
                
            pos.current_price = current_price
            
            # High / Low tracking
            if pos.highest_price is None or current_price > pos.highest_price:
                pos.highest_price = current_price
            if pos.lowest_price is None or current_price < pos.lowest_price:
                pos.lowest_price = current_price
                
            # Floating gross PnL
            if pos.side == OrderSide.BUY:
                gross_pnl = (current_price - pos.entry_price) * pos.quantity
            else:
                gross_pnl = (pos.entry_price - current_price) * pos.quantity
            pos.pnl = round(gross_pnl, 2)
            pos.pnl_pct = round((gross_pnl / (pos.entry_price * pos.quantity)) * 100.0, 2)
            
            # 1. AUTO BREAK-EVEN SHIFT AT 1.0R (Minimal Loss Rule)
            if settings.risk.auto_breakeven_at_1r:
                r_dist = abs(pos.entry_price - pos.stop_loss)
                if pos.side == OrderSide.BUY and current_price >= (pos.entry_price + r_dist):
                    be = risk_manager.calculate_breakeven_price(pos.entry_price, pos.quantity, pos.side)
                    if pos.trailing_stop is None or pos.trailing_stop < be:
                        pos.trailing_stop = be
                elif pos.side == OrderSide.SELL and current_price <= (pos.entry_price - r_dist):
                    be = risk_manager.calculate_breakeven_price(pos.entry_price, pos.quantity, pos.side)
                    if pos.trailing_stop is None or pos.trailing_stop > be:
                        pos.trailing_stop = be

            # 2. DYNAMIC ATR TRAILING STOP
            if settings.risk.use_trailing_stop:
                if pos.side == OrderSide.BUY:
                    if pos.highest_price and pos.highest_price > pos.target_1:
                        new_trail = round(pos.highest_price - (pos.entry_price - pos.stop_loss), 2)
                        if new_trail > (pos.trailing_stop or 0):
                            pos.trailing_stop = new_trail
                else:
                    if pos.lowest_price and pos.lowest_price < pos.target_1:
                        new_trail = round(pos.lowest_price + (pos.stop_loss - pos.entry_price), 2)
                        if pos.trailing_stop is None or new_trail < pos.trailing_stop:
                            pos.trailing_stop = new_trail

            # 3. CHECK TP2 HIT (Full Profit)
            if (pos.side == OrderSide.BUY and current_price >= pos.target_2) or (pos.side == OrderSide.SELL and current_price <= pos.target_2):
                closed = self.close_position(pos.id, reason="HIT_TP2_FULL_PROFIT", exit_price=current_price)
                events.append({"event": "TP2_HIT", "position": closed})
                continue
                
            # 4. CHECK STOP LOSS / TRAILING STOP HIT
            active_stop = pos.trailing_stop if pos.trailing_stop is not None else pos.stop_loss
            if pos.side == OrderSide.BUY and current_price <= active_stop:
                reason = "BREAKEVEN_STOP_HIT" if pos.trailing_stop and pos.trailing_stop >= pos.entry_price else ("TRAILING_STOP_HIT" if pos.trailing_stop and pos.trailing_stop > pos.stop_loss else "STOP_LOSS_HIT")
                closed = self.close_position(pos.id, reason=reason, exit_price=current_price)
                events.append({"event": "SL_HIT", "position": closed})
                continue
            elif pos.side == OrderSide.SELL and current_price >= active_stop:
                reason = "BREAKEVEN_STOP_HIT" if pos.trailing_stop and pos.trailing_stop <= pos.entry_price else ("TRAILING_STOP_HIT" if pos.trailing_stop and pos.trailing_stop < pos.stop_loss else "STOP_LOSS_HIT")
                closed = self.close_position(pos.id, reason=reason, exit_price=current_price)
                events.append({"event": "SL_HIT", "position": closed})
                continue

            save_trade(pos.model_dump())
            
        return events

paper_broker = PaperBroker()
