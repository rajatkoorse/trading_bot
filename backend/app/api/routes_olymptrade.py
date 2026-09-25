import time
from fastapi import APIRouter, HTTPException, Query, Body
from typing import List, Dict, Any, Optional

from app.data.global_fetcher import GLOBAL_ASSETS, fetch_global_candles, get_global_latest_price
from app.data.brokers.olymptrade import olymp_trade_broker
from app.analytics.indicators import enrich_dataframe_with_indicators

router = APIRouter(prefix="/api/olymptrade", tags=["Olymp Trade 24/7"])

@router.get("/status")
def get_olymptrade_status():
    bal = olymp_trade_broker.get_account_balance()
    return bal

@router.post("/connect")
def connect_olymptrade(credentials: Dict[str, Any] = Body(...)):
    res = olymp_trade_broker.connect(credentials)
    if not res.get("success"):
        raise HTTPException(status_code=400, detail=res.get("message", "Connection failed"))
    return res

@router.post("/disconnect")
def disconnect_olymptrade():
    res = olymp_trade_broker.disconnect()
    return res

@router.post("/live-bridge/sync")
def sync_olymptrade_live_bridge(payload: Dict[str, Any] = Body(...)):
    """
    Called by the browser session bridge running on olymptrade.com.
    Auto-syncs live balances and receives orders to execute live on Olymp Trade.
    """
    res = olymp_trade_broker.sync_live_bridge(payload)
    return res

@router.get("/live-bridge/status")
def get_olymptrade_live_bridge_status():
    return {
        "bridge_active": olymp_trade_broker.is_live_bridge_active,
        "last_sync_seconds_ago": int(time.time() - olymp_trade_broker.last_bridge_sync_time) if olymp_trade_broker.last_bridge_sync_time > 0 else None,
        "pending_orders_count": len(olymp_trade_broker.pending_bridge_orders)
    }

@router.post("/switch-account")
def switch_olymptrade_account(payload: Dict[str, Any] = Body(...)):
    acc_id = payload.get("account_id") or payload.get("account_type") or "demo"
    res = olymp_trade_broker.switch_account(str(acc_id))
    return res

@router.get("/assets")
def list_global_assets():
    assets_list = []
    ticks_map = {}
    for key, info in GLOBAL_ASSETS.items():
        price = get_global_latest_price(key)
        ticks_map[key] = price
        assets_list.append({
            "key": key,
            "symbol": info["symbol"],
            "name": info["name"],
            "category": info["category"],
            "payout": info["payout"],
            "price": price
        })
    # Update ticks
    olymp_trade_broker.update_ticks(ticks_map)
    return {"assets": assets_list, "account": olymp_trade_broker.get_account_balance()}

@router.get("/candles/{asset:path}")
def get_global_candles(
    asset: str,
    timeframe: str = Query(default="1m", description="1m, 5m, 15m, 1h"),
    limit: int = Query(default=100, le=200)
):
    df = fetch_global_candles(asset, timeframe=timeframe, limit=limit)
    if df.empty:
        raise HTTPException(status_code=404, detail="Candle data not found for global asset.")

    df_enriched = enrich_dataframe_with_indicators(df)
    candles = df.to_dict(orient="records")

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

    latest_price = float(df['close'].iloc[-1])
    olymp_trade_broker.update_ticks({asset: latest_price})

    asset_info = GLOBAL_ASSETS.get(asset.upper(), {
        "name": asset,
        "category": "Global",
        "payout": 82
    })

    return {
        "asset": asset,
        "name": asset_info["name"],
        "category": asset_info["category"],
        "payout": asset_info["payout"],
        "timeframe": timeframe,
        "candles": candles,
        "indicators": indicators,
        "latest_price": latest_price
    }

@router.post("/order")
def place_olymptrade_order(
    asset: str = Body(...),
    direction: str = Body(..., description="'CALL' (UP) or 'PUT' (DOWN)"),
    amount: float = Body(..., gt=0),
    duration_minutes: int = Body(default=1, ge=1, le=60)
):
    try:
        pos = olymp_trade_broker.place_order(
            asset=asset,
            direction=direction,
            amount=amount,
            duration_minutes=duration_minutes
        )
        if not pos:
            raise HTTPException(status_code=400, detail="Failed to place order.")
        return {"status": "success", "order": pos}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/positions")
def get_olymptrade_positions():
    # Evaluate any updates first
    ticks_map = {}
    for key in GLOBAL_ASSETS.keys():
        ticks_map[key] = get_global_latest_price(key)
    olymp_trade_broker.update_ticks(ticks_map)
    
    return olymp_trade_broker.get_positions()

@router.post("/reset-demo")
def reset_olymptrade_demo(amount: float = Query(default=10000.0, description="Demo balance in USD")):
    res = olymp_trade_broker.reset_demo_balance(amount)
    return res
