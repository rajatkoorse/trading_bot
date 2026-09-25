import asyncio
import logging
from datetime import datetime
from typing import Dict, Any, Optional

from app.config import settings
from app.models.schemas import BotStatus, AISignal, SignalType, PositionStatus
from app.data.feed_manager import feed_manager
from app.data.nse_fetcher import is_indian_market_open, get_market_session_info
from app.data.brokers.paper_broker import paper_broker
from app.data.brokers.angel_one import angel_one_broker
from app.data.brokers.zerodha_kite import zerodha_kite_broker
from app.data.brokers.dhan import dhan_broker
from app.ai.signal_generator import generate_ai_signal
from app.risk.risk_manager import risk_manager
from app.alerts.discord_notifier import discord_notifier
from app.database import save_signal, get_recent_signals, get_trades
from app.api.websocket_manager import ws_manager

logger = logging.getLogger("bot_engine")

class BotEngine:
    """
    Real-Time Autonomous Trading Engine for Indian Markets (NSE/BSE).
    - Supports Paper Trading (₹), Free DhanHQ API, Free Angel One SmartAPI, and Zerodha.
    - Sub-second tick processing
    - Strict Minimal-Loss rules (Consecutive loss cooldown, Auto Break-Even shift)
    - Live WebSockets tick broadcaster
    - Discord real-time alerts
    """
    def __init__(self):
        self.is_running: bool = False
        self.auto_trade: bool = True
        self.mode: str = settings.broker.active_broker # 'paper', 'angel_one', 'zerodha', 'dhan'
        self.task: Optional[asyncio.Task] = None
        self.last_scan_time: Optional[str] = None
        self.daily_start_equity: float = settings.risk.account_equity
        self.circuit_breaker_tripped: bool = False
        self.kill_switch_active: bool = settings.risk.enable_kill_switch

    def get_active_broker(self):
        if self.mode == "angel_one":
            return angel_one_broker
        elif self.mode == "zerodha":
            return zerodha_kite_broker
        elif self.mode == "dhan":
            return dhan_broker
        return paper_broker

    def get_status(self) -> BotStatus:
        broker = self.get_active_broker()
        bal = broker.get_account_balance()
        open_pos = broker.get_open_positions()
        
        # Calculate daily loss pct
        daily_pnl = bal["total_equity"] - self.daily_start_equity
        daily_loss_pct = max(0.0, (-daily_pnl / self.daily_start_equity) * 100.0) if self.daily_start_equity > 0 else 0.0
        
        if daily_loss_pct >= settings.risk.max_daily_loss_pct:
            self.circuit_breaker_tripped = True
            
        market_session = get_market_session_info()
            
        return BotStatus(
            is_running=self.is_running,
            mode=self.mode,
            last_scan_time=self.last_scan_time,
            active_symbols=feed_manager.watchlist,
            timeframe=feed_manager.active_timeframe,
            open_positions_count=len(open_pos),
            daily_loss_pct=round(daily_loss_pct, 2),
            circuit_breaker_tripped=self.circuit_breaker_tripped,
            kill_switch_active=self.kill_switch_active,
            discord_alerts_enabled=settings.discord.enabled,
            market_is_open=market_session["is_open"],
            market_session_text=market_session["status_text"]
        )

    def start(self):
        if not self.is_running:
            self.is_running = True
            self.task = asyncio.create_task(self._main_loop())
            logger.info("Real-Time AI Trading Engine started.")

    def stop(self):
        if self.is_running:
            self.is_running = False
            if self.task:
                self.task.cancel()
            logger.info("AI Trading Engine paused.")

    def toggle_kill_switch(self, enable: bool):
        self.kill_switch_active = enable
        settings.risk.enable_kill_switch = enable
        if enable:
            logger.warning("EMERGENCY KILL SWITCH ACTIVATED! Flattening all open positions.")
            broker = self.get_active_broker()
            for pos in broker.get_open_positions():
                broker.close_position(pos.id, reason="EMERGENCY_KILL_SWITCH")
        return {"kill_switch": enable}

    async def scan_single_symbol(self, symbol: str, force: bool = False) -> Optional[AISignal]:
        tf = feed_manager.active_timeframe
        df = feed_manager.get_candles(symbol, timeframe=tf, limit=120)
        if df.empty or len(df) < 30:
            return None
            
        current_price = float(df['close'].iloc[-1])
        broker = self.get_active_broker()
        
        # 1. Real-time tick update on all open positions
        events = broker.update_positions_with_market_tick(symbol, current_price)
        for ev in events:
            pos = ev["position"]
            if ev["event"] == "TP2_HIT":
                await discord_notifier.notify_trade_event(
                    title=f"🎯 Target 2 Reached! ({symbol})",
                    message=f"**Net Profit:** ₹{pos.pnl:,.2f} (+{pos.pnl_pct}%)\n**Exit Price:** ₹{pos.exit_price:,.2f}",
                    color_hex=0x00E676
                )
            elif ev["event"] == "SL_HIT":
                is_be = "BREAKEVEN" in (pos.exit_reason or "")
                await discord_notifier.notify_trade_event(
                    title=f"🛡️ Position Closed ({symbol}) - {pos.exit_reason}",
                    message=f"**Net P&L:** ₹{pos.pnl:,.2f} ({pos.pnl_pct}%)\n**Exit Price:** ₹{pos.exit_price:,.2f}",
                    color_hex=0xFFD600 if is_be else 0xFF1744
                )
            await ws_manager.broadcast("POSITION_CLOSED", pos.model_dump())

        # 2. Evaluate AI Signal with High-Confidence Filter
        signal = generate_ai_signal(
            symbol=symbol,
            df=df,
            timeframe=tf,
            min_confidence=settings.risk.min_confidence_pct,
            force_evaluation=force
        )
        
        if signal:
            save_signal(signal.model_dump())
            await ws_manager.broadcast("NEW_SIGNAL", signal.model_dump())
            
            if signal.signal_type in [SignalType.BUY, SignalType.SELL]:
                await discord_notifier.notify_new_signal(signal)
                
            # 3. Real-Time Execution with Risk Validation
            if self.auto_trade and signal.signal_type in [SignalType.BUY, SignalType.SELL]:
                bal = broker.get_account_balance()
                open_pos = broker.get_open_positions()
                
                existing = [p for p in open_pos if p.symbol == symbol]
                if not existing:
                    daily_loss = max(0.0, (-((bal["total_equity"] - self.daily_start_equity)) / self.daily_start_equity) * 100.0)
                    allowed, reason, qty = risk_manager.evaluate_order_safety(
                        signal=signal,
                        current_equity=bal["total_equity"],
                        open_positions_count=len(open_pos),
                        daily_loss_pct=daily_loss
                    )
                    
                    if allowed and qty > 0:
                        position = broker.execute_signal(signal, qty)
                        if position:
                            signal.executed = True
                            save_signal(signal.model_dump())
                            await ws_manager.broadcast("ORDER_EXECUTED", position.model_dump())
                            await discord_notifier.notify_trade_event(
                                title=f"⚡ Live Order Placed: {signal.signal_type.value} {symbol}",
                                message=f"**Quantity:** `{qty}` | **Fill Price:** `₹{position.entry_price:,.2f}`\n**SL:** `₹{position.stop_loss:,.2f}` | **TP:** `₹{position.target_1:,.2f}`",
                                color_hex=0x2979FF
                            )
                    else:
                        logger.info(f"Signal for {symbol} not executed: {reason}")
                        
        return signal

    async def _main_loop(self):
        """Continuous Real-Time Streaming & Tick Broadcaster with Market Timing Controls."""
        logger.info("Real-time tick engine running...")
        while self.is_running:
            try:
                self.last_scan_time = datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')
                is_open = is_indian_market_open()
                broker = self.get_active_broker()
                
                # Check End-of-Day auto square-off when market has closed (after 3:30 PM)
                if not is_open:
                    open_trades = broker.get_open_positions()
                    if open_trades:
                        logger.info(f"Market Closed at 3:30 PM: Settling {len(open_trades)} intraday positions.")
                        for pos in open_trades:
                            closed = broker.close_position(pos.id, reason="EOD_MARKET_CLOSE_SQUAREOFF")
                            if closed:
                                await ws_manager.broadcast("POSITION_CLOSED", closed.model_dump())
                
                ticks_payload = []
                for symbol in list(feed_manager.watchlist):
                    if not self.is_running:
                        break
                    
                    # Only generate new AI signals & executions during active live market hours
                    if is_open:
                        await self.scan_single_symbol(symbol)
                    p = feed_manager.get_latest_price(symbol)
                    ticks_payload.append({"symbol": symbol, "price": p})
                    await asyncio.sleep(0.08)
                    
                await ws_manager.broadcast("REALTIME_TICKS", ticks_payload)
                
                bal = broker.get_account_balance()
                open_pos = [p.model_dump() for p in broker.get_open_positions()]
                await ws_manager.broadcast("PORTFOLIO_TICK", {
                    "balance": bal,
                    "positions": open_pos,
                    "bot_status": self.get_status().model_dump()
                })
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in real-time bot loop: {e}", exc_info=True)
                
            await asyncio.sleep(settings.polling_interval_seconds)

bot_engine = BotEngine()
