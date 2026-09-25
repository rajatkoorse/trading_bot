import pytest
from app.data.brokers.paper_broker import PaperBroker
from app.models.schemas import AISignal, SignalType, SignalStatus, IndicatorSnapshot, OrderSide
from app.database import init_db, update_portfolio_balance

def setup_module(module):
    init_db()
    from app.database import get_db_connection
    conn = get_db_connection()
    conn.execute("DELETE FROM trades")
    conn.commit()
    conn.close()

def test_paper_execution_and_tp_hit():
    broker = PaperBroker()
    
    indicators = IndicatorSnapshot(
        ema_9=1005, ema_21=1000, ema_50=990, ema_200=950,
        rsi=60, macd=2, macd_signal=1, macd_hist=1,
        supertrend=980, supertrend_direction=1, vwap=995, atr=10,
        bb_upper=1020, bb_lower=980
    )
    signal = AISignal(
        id="sig_paper_1",
        symbol="TCS.NS",
        timeframe="5m",
        timestamp=1000000,
        datetime="2024-01-01 10:00:00",
        signal_type=SignalType.BUY,
        entry_price=4000.0,
        stop_loss=3950.0,
        target_1=4075.0,
        target_2=4125.0,
        rrr=1.5,
        confidence_score=85.0,
        ml_probability=0.75,
        indicators=indicators,
        reasons=["SuperTrend Bullish"],
        status=SignalStatus.ACTIVE,
        executed=False,
        created_at="2024-01-01 10:00:00"
    )
    
    pos = broker.execute_signal(signal, quantity=10)
    assert pos is not None
    assert pos.symbol == "TCS.NS"
    assert pos.side == OrderSide.BUY
    assert pos.quantity == 10
    
    # Simulate price moving to TP2
    events = broker.update_positions_with_market_tick("TCS.NS", 4130.0)
    assert len(events) == 1
    assert events[0]["event"] == "TP2_HIT"
    assert events[0]["position"].pnl > 0 # Profit in INR
