import pytest
from app.risk.risk_manager import RiskManager, risk_manager
from app.models.schemas import AISignal, SignalType, SignalStatus, IndicatorSnapshot
from app.config import settings

def test_indian_market_charges():
    # Buy 100 shares at 1000 = 100,000 turnover
    # Sell 100 shares at 1020 = 102,000 turnover
    fees = RiskManager.calculate_indian_market_charges(100000.0, 102000.0, is_intraday=True)
    assert fees > 20.0 # Must include brokerage + STT + GST + exchange fees
    assert fees < 200.0 # Reasonably within discount broker range (~₹60-80)

def test_position_sizing():
    # Account 100,000, Risk 1.5% = ₹1,500
    # Entry 1000, SL 985 -> sl_diff = 15 -> raw_qty = 100
    # Max capital slot is 100,000 / settings.risk.max_open_positions
    expected_slot_qty = int((100000.0 / settings.risk.max_open_positions) / 1000.0)
    qty = RiskManager.calculate_position_size(
        account_equity=100000.0,
        entry_price=1000.0,
        stop_loss=985.0,
        risk_per_trade_pct=1.5
    )
    assert qty == expected_slot_qty

def test_risk_evaluation_kill_switch():
    settings.risk.enable_kill_switch = True
    
    indicators = IndicatorSnapshot(
        ema_9=1005, ema_21=1000, ema_50=990, ema_200=950,
        rsi=60, macd=2, macd_signal=1, macd_hist=1,
        supertrend=980, supertrend_direction=1, vwap=995, atr=10,
        bb_upper=1020, bb_lower=980
    )
    signal = AISignal(
        id="sig_test_1",
        symbol="RELIANCE.NS",
        timeframe="5m",
        timestamp=1000000,
        datetime="2024-01-01 10:00:00",
        signal_type=SignalType.BUY,
        entry_price=1000.0,
        stop_loss=985.0,
        target_1=1022.5,
        target_2=1037.5,
        rrr=1.5,
        confidence_score=85.0,
        ml_probability=0.75,
        indicators=indicators,
        reasons=["SuperTrend Bullish"],
        status=SignalStatus.ACTIVE,
        executed=False,
        created_at="2024-01-01 10:00:00"
    )
    
    allowed, reason, qty = risk_manager.evaluate_order_safety(
        signal=signal,
        current_equity=100000.0,
        open_positions_count=0,
        daily_loss_pct=0.0
    )
    assert not allowed
    assert "Kill Switch" in reason
    
    # Restore kill switch
    settings.risk.enable_kill_switch = False
