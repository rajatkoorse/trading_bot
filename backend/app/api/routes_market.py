from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
import pandas as pd

from app.data.feed_manager import feed_manager
from app.data.nse_fetcher import normalize_indian_symbol, get_indian_stock_name, df_to_candle_list
from app.analytics.indicators import enrich_dataframe_with_indicators
from app.models.schemas import Candle

router = APIRouter(prefix="/api/market", tags=["Market Data"])

@router.get("/watchlist")
def get_watchlist():
    items = []
    for s in feed_manager.watchlist:
        items.append({
            "symbol": s,
            "name": get_indian_stock_name(s),
            "price": feed_manager.get_latest_price(s)
        })
    return {"watchlist": items}

@router.post("/watchlist")
def add_to_watchlist(symbol: str = Query(..., description="Indian ticker (e.g. TATASTEEL)")):
    norm = normalize_indian_symbol(symbol)
    feed_manager.add_symbol(norm)
    return {"status": "success", "symbol": norm, "name": get_indian_stock_name(norm)}

@router.delete("/watchlist/{symbol}")
def remove_from_watchlist(symbol: str):
    norm = normalize_indian_symbol(symbol)
    feed_manager.remove_symbol(norm)
    return {"status": "success", "removed": norm}

@router.get("/candles/{symbol}")
def get_candles(
    symbol: str,
    timeframe: str = Query(default="5m", description="1m, 5m, 15m, 1h, 1d"),
    limit: int = Query(default=150, description="Number of candles to return")
):
    norm = normalize_indian_symbol(symbol)
    df = feed_manager.get_candles(norm, timeframe=timeframe, limit=limit)
    if df.empty:
        raise HTTPException(status_code=404, detail="Candle data not found")
        
    df_enriched = enrich_dataframe_with_indicators(df)
    candles = df_to_candle_list(df)
    
    # Extract indicator overlay series for charts
    indicators = {
        "ema_9": df_enriched['ema_9'].fillna(0).tolist(),
        "ema_21": df_enriched['ema_21'].fillna(0).tolist(),
        "ema_50": df_enriched['ema_50'].fillna(0).tolist(),
        "supertrend": df_enriched['supertrend'].fillna(0).tolist(),
        "supertrend_dir": df_enriched['supertrend_dir'].fillna(0).tolist(),
        "vwap": df_enriched['vwap'].fillna(0).tolist(),
        "rsi": df_enriched['rsi'].fillna(50).tolist(),
        "macd_hist": df_enriched['macd_hist'].fillna(0).tolist()
    }
    
    return {
        "symbol": norm,
        "name": get_indian_stock_name(norm),
        "timeframe": timeframe,
        "candles": candles,
        "indicators": indicators,
        "latest_price": float(df['close'].iloc[-1])
    }
