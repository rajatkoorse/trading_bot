from fastapi import APIRouter, Query, HTTPException
from typing import List, Optional
from app.database import get_recent_signals
from app.execution.bot_engine import bot_engine
from app.data.nse_fetcher import normalize_indian_symbol
from app.models.schemas import AISignal

router = APIRouter(prefix="/api/signals", tags=["AI Signals"])

@router.get("/recent")
def list_signals(
    limit: int = Query(default=30, le=100),
    symbol: Optional[str] = None
):
    norm = normalize_indian_symbol(symbol) if symbol else None
    signals = get_recent_signals(limit=limit, symbol=norm)
    return {"signals": signals}

@router.post("/scan")
async def trigger_scan(symbol: str = Query(..., description="Indian symbol to analyze")):
    norm = normalize_indian_symbol(symbol)
    signal = await bot_engine.scan_single_symbol(norm, force=True)
    if not signal:
        raise HTTPException(status_code=400, detail="Could not generate signal. Check symbol data.")
    return {"status": "success", "signal": signal.model_dump()}
