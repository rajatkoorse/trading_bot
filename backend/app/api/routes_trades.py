import uuid
from datetime import datetime
from fastapi import APIRouter, HTTPException, Path, Body, Query
from typing import List, Dict, Any, Optional
from app.execution.bot_engine import bot_engine
from app.database import get_trades, get_portfolio_balance, update_portfolio_balance
from app.models.schemas import PortfolioSummary, TradePosition, PositionStatus, AISignal, SignalType, IndicatorSnapshot
from app.data.feed_manager import feed_manager
from app.data.nse_fetcher import normalize_indian_symbol
from app.config import settings

router = APIRouter(prefix="/api/trades", tags=["Trades & Portfolio"])

@router.get("/positions")
def get_positions():
    broker = bot_engine.get_active_broker()
    positions = broker.get_open_positions()
    return {"positions": [p.model_dump() for p in positions]}

@router.get("/history")
def get_trade_history(limit: int = 50):
    raw_trades = get_trades(status="CLOSED", limit=limit)
    return {"history": raw_trades}

@router.get("/portfolio", response_model=PortfolioSummary)
def get_portfolio():
    broker = bot_engine.get_active_broker()
    bal = broker.get_account_balance()
    open_pos = broker.get_open_positions()
    closed_trades = get_trades(status="CLOSED")
    
    total_trades_count = len(closed_trades)
    winning = [t for t in closed_trades if (t.get("pnl") or 0) > 0]
    losing = [t for t in closed_trades if (t.get("pnl") or 0) <= 0]
    
    win_rate = round((len(winning) / total_trades_count * 100.0), 2) if total_trades_count > 0 else 0.0
    
    gross_win = sum(t.get("pnl", 0) for t in winning)
    gross_loss = abs(sum(t.get("pnl", 0) for t in losing))
    profit_factor = round(gross_win / gross_loss, 2) if gross_loss > 0 else (99.9 if gross_win > 0 else 0.0)
    
    realized_pnl = sum(t.get("pnl", 0) for t in closed_trades)
    unrealized_pnl = sum(p.pnl for p in open_pos)
    
    daily_pnl = realized_pnl + unrealized_pnl
    daily_pnl_pct = round((daily_pnl / bal["initial_equity"]) * 100.0, 2) if bal["initial_equity"] > 0 else 0.0
    
    broker_info = bal.get("broker_name", "Paper Trading Simulator")
    broker_mode = bal.get("broker_mode", bot_engine.mode)
    is_live = bal.get("is_live", False)

    return PortfolioSummary(
        total_equity=bal["total_equity"],
        cash_balance=bal["cash_balance"],
        allocated_margin=bal["allocated_margin"],
        invested_capital=bal.get("invested_capital", bal["allocated_margin"]),
        initial_equity=bal.get("initial_equity", 100000.0),
        unrealized_pnl=unrealized_pnl,
        realized_pnl=realized_pnl,
        daily_pnl=daily_pnl,
        daily_pnl_pct=daily_pnl_pct,
        total_trades=total_trades_count,
        profitable_trades=len(winning),
        losing_trades=len(losing),
        win_rate=win_rate,
        profit_factor=profit_factor,
        max_drawdown_pct=0.0,
        open_positions_count=len(open_pos),
        broker_name=broker_info,
        broker_mode=broker_mode,
        is_live=is_live
    )

@router.post("/quick-order")
def execute_quick_order(
    symbol: str = Body(...),
    side: str = Body(...), # 'BUY' or 'SELL'
    quantity: int = Body(...),
    stop_loss_pts: Optional[float] = Body(default=None),
    target_pts: Optional[float] = Body(default=None)
):
    """Executes an instant market order directly from the dashboard."""
    norm = normalize_indian_symbol(symbol)
    curr_price = feed_manager.get_latest_price(norm)
    if curr_price <= 0:
        raise HTTPException(status_code=400, detail="Could not retrieve real-time price for symbol.")
        
    sl_dist = stop_loss_pts if stop_loss_pts and stop_loss_pts > 0 else (curr_price * 0.008)
    tp_dist = target_pts if target_pts and target_pts > 0 else (sl_dist * 2.0)
    
    is_buy = side.upper() == "BUY"
    sl_price = round(curr_price - sl_dist, 2) if is_buy else round(curr_price + sl_dist, 2)
    tp1_price = round(curr_price + tp_dist, 2) if is_buy else round(curr_price - tp_dist, 2)
    tp2_price = round(curr_price + (tp_dist * 1.5), 2) if is_buy else round(curr_price - (tp_dist * 1.5), 2)
    
    sig = AISignal(
        id=f"manual_{uuid.uuid4().hex[:8]}",
        symbol=norm,
        timeframe="1m",
        timestamp=int(datetime.utcnow().timestamp()),
        datetime=datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S'),
        signal_type=SignalType.BUY if is_buy else SignalType.SELL,
        entry_price=curr_price,
        stop_loss=sl_price,
        target_1=tp1_price,
        target_2=tp2_price,
        rrr=round(tp_dist / sl_dist, 2),
        confidence_score=90.0,
        ml_probability=0.85,
        indicators=IndicatorSnapshot(),
        reasons=["Direct Quick Order from Trader Dashboard"],
        status=PositionStatus.OPEN,
        executed=True,
        created_at=datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')
    )
    
    broker = bot_engine.get_active_broker()
    pos = broker.execute_signal(sig, quantity)
    if not pos:
        raise HTTPException(status_code=400, detail="Insufficient capital or order rejected by risk engine.")
    return {"status": "success", "position": pos.model_dump()}

@router.post("/close/{position_id}")
def close_trade(position_id: str = Path(...)):
    broker = bot_engine.get_active_broker()
    pos = broker.close_position(position_id, reason="MANUAL_UI_CLOSE")
    if not pos:
        raise HTTPException(status_code=404, detail="Position not found or already closed")
    return {"status": "success", "closed_position": pos.model_dump()}

@router.post("/partial-close/{position_id}")
def partial_close_trade(position_id: str = Path(...), qty: int = Body(..., embed=True)):
    broker = bot_engine.get_active_broker()
    if hasattr(broker, 'partial_close'):
        pos = broker.partial_close(position_id, qty, reason="MANUAL_PARTIAL_PROFIT")
        if not pos:
            raise HTTPException(status_code=400, detail="Could not partially close position.")
        return {"status": "success", "position": pos.model_dump()}
    raise HTTPException(status_code=400, detail="Partial close not supported for current broker.")

@router.post("/lock-breakeven/{position_id}")
def lock_breakeven_trade(position_id: str = Path(...)):
    broker = bot_engine.get_active_broker()
    if hasattr(broker, 'lock_breakeven'):
        pos = broker.lock_breakeven(position_id)
        if not pos:
            raise HTTPException(status_code=400, detail="Could not lock break-even.")
        return {"status": "success", "position": pos.model_dump()}
    raise HTTPException(status_code=400, detail="Break-even lock not supported.")

@router.post("/reset-paper")
def reset_paper_account(amount: float = Query(default=100000.0, description="Amount in INR")):
    broker = bot_engine.get_active_broker()
    for pos in broker.get_open_positions():
        broker.close_position(pos.id, reason="RESET_ACCOUNT")
    update_portfolio_balance(amount, initial_equity=amount)
    return {"status": "success", "message": f"Paper account reset to ₹{amount:,.2f}"}

@router.post("/set-capital")
def set_account_capital(amount: float = Query(..., description="Set custom starting capital in INR")):
    if amount <= 0:
        raise HTTPException(status_code=400, detail="Capital must be greater than 0.")
    update_portfolio_balance(amount, initial_equity=amount)
    return {"status": "success", "message": f"Account capital set to ₹{amount:,.2f}"}
