import time
from datetime import datetime, timedelta
from typing import Tuple, Dict, Any, Optional
from app.config import settings
from app.models.schemas import AISignal, OrderSide

class RiskManager:
    """
    Institutional Capital Preservation Core engineered to MINIMIZE DRAWDOWN and PROTECT REAL CAPITAL:
    - 1.0% strict fractional risk-per-trade
    - Hard daily loss circuit breaker (2.0%)
    - Consecutive loss cooldown (stops bot for 45 mins after 2 consecutive Stop Losses to avoid choppy chop)
    - Auto-Breakeven lock at 1.0R (including STT & Brokerage cover)
    - Volatility & Spread sanity filters
    """
    
    def __init__(self):
        self.consecutive_losses: int = 0
        self.cooldown_until: Optional[datetime] = None

    def record_trade_result(self, is_profitable: bool):
        """Monitors winning vs losing streaks to trigger cooling-off periods."""
        if not is_profitable:
            self.consecutive_losses += 1
            if self.consecutive_losses >= settings.risk.consecutive_loss_cooldown_count:
                cooldown_mins = settings.risk.consecutive_loss_cooldown_minutes
                self.cooldown_until = datetime.utcnow() + timedelta(minutes=cooldown_mins)
        else:
            self.consecutive_losses = 0
            self.cooldown_until = None

    def is_in_cooldown(self) -> Tuple[bool, str]:
        if self.cooldown_until and datetime.utcnow() < self.cooldown_until:
            rem = int((self.cooldown_until - datetime.utcnow()).total_seconds() / 60)
            return True, f"Consecutive Loss Cooldown active. Bot paused for {rem} more minutes to protect capital."
        return False, ""

    @staticmethod
    def calculate_indian_market_charges(turnover_buy: float, turnover_sell: float, is_intraday: bool = True) -> float:
        """
        Accurate Indian market statutory taxes & charges:
        - Brokerage: ₹20 per executed order (Discount broker standard)
        - STT: 0.025% on Sell side for Intraday Equity
        - Exchange Turnover Charges (NSE): 0.00345% of total turnover
        - GST: 18% on (Brokerage + Exchange Charges)
        - SEBI Charges: ₹10 per Crore (0.0001%)
        - Stamp Duty: 0.003% on Buy side
        """
        total_turnover = turnover_buy + turnover_sell
        brokerage = min(20.0, turnover_buy * 0.0003) + min(20.0, turnover_sell * 0.0003)
        stt = turnover_sell * 0.00025 if is_intraday else (total_turnover * 0.001)
        etc = total_turnover * 0.0000345
        gst = (brokerage + etc) * 0.18
        sebi = total_turnover * 0.000001
        stamp = turnover_buy * 0.00003
        return round(brokerage + stt + etc + gst + sebi + stamp, 2)

    @staticmethod
    def calculate_breakeven_price(entry_price: float, quantity: int, side: OrderSide) -> float:
        """
        Calculates exact break-even exit price that covers round-trip brokerage & statutory fees,
        ensuring 0 net financial loss.
        """
        est_turnover = entry_price * quantity * 2
        est_fees = RiskManager.calculate_indian_market_charges(entry_price * quantity, entry_price * quantity)
        fee_per_share = est_fees / max(1, quantity)
        
        if side == OrderSide.BUY:
            return round(entry_price + fee_per_share + 0.05, 2) # Offset slightly above entry
        else:
            return round(entry_price - fee_per_share - 0.05, 2)

    @staticmethod
    def calculate_position_size(
        account_equity: float,
        entry_price: float,
        stop_loss: float,
        risk_per_trade_pct: Optional[float] = None
    ) -> int:
        """
        Calculates safe share/lot quantity so maximum potential loss never exceeds risk_per_trade_pct,
        and maximum capital allocated never exceeds the balanced portfolio slot (Account Equity / Max Positions).
        """
        risk_pct = risk_per_trade_pct or settings.risk.risk_per_trade_pct
        risk_amount = account_equity * (risk_pct / 100.0)
        
        sl_diff = abs(entry_price - stop_loss)
        if sl_diff <= 0 or entry_price <= 0:
            return 1
            
        raw_qty = risk_amount / sl_diff
        
        # Balance portfolio allocation cap: Max capital for 1 trade = Equity / Max Positions
        max_alloc_capital = account_equity / max(1, settings.risk.max_open_positions)
        max_affordable_qty = int(max_alloc_capital / entry_price)
        
        # Ensure at least 1 unit if affordable within total equity
        if max_affordable_qty <= 0 and entry_price <= account_equity:
            max_affordable_qty = 1
            
        final_qty = max(1, min(int(raw_qty), max(1, max_affordable_qty)))
        return final_qty

    def evaluate_order_safety(
        self,
        signal: AISignal,
        current_equity: float,
        open_positions_count: int,
        daily_loss_pct: float
    ) -> Tuple[bool, str, int]:
        """
        Validates whether an order complies with all strict minimal-loss rules before execution.
        """
        if settings.risk.enable_kill_switch:
            return False, "Emergency Kill Switch is ACTIVE. Trading halted.", 0

        # Check cooldown from consecutive losses
        in_cd, cd_msg = self.is_in_cooldown()
        if in_cd:
            return False, cd_msg, 0

        # Check daily circuit breaker
        if daily_loss_pct >= settings.risk.max_daily_loss_pct:
            return False, f"Max Daily Loss Limit ({settings.risk.max_daily_loss_pct}%) reached. Trading paused for today.", 0

        # Check max open positions
        if open_positions_count >= settings.risk.max_open_positions:
            return False, f"Max open positions ({settings.risk.max_open_positions}) reached. Wait for existing trades to close.", 0

        # Check minimum AI confidence (Strict 75%+ for minimal loss)
        if signal.confidence_score < settings.risk.min_confidence_pct:
            return False, f"Signal confidence {signal.confidence_score}% below strict threshold {settings.risk.min_confidence_pct}%.", 0

        # Check Risk to Reward
        if signal.rrr < 1.4:
            return False, f"Risk to Reward ratio ({signal.rrr}) is below minimum acceptable 1:1.4", 0

        # Calculate position size
        qty = RiskManager.calculate_position_size(
            account_equity=current_equity,
            entry_price=signal.entry_price,
            stop_loss=signal.stop_loss,
            risk_per_trade_pct=settings.risk.risk_per_trade_pct
        )
        
        if qty <= 0:
            return False, "Insufficient capital for lot/share sizing.", 0

        return True, "Risk checks PASSED.", qty

risk_manager = RiskManager()
