from fastapi import APIRouter, HTTPException, Body, Query
from typing import Dict, Any, Optional
from app.execution.bot_engine import bot_engine
from app.config import settings
from app.alerts.discord_notifier import discord_notifier
from app.data.brokers.angel_one import angel_one_broker
from app.data.brokers.zerodha_kite import zerodha_kite_broker
from app.data.brokers.dhan import dhan_broker
from app.models.schemas import BotStatus

router = APIRouter(prefix="/api/bot", tags=["Bot Controller"])

@router.get("/status", response_model=BotStatus)
def get_bot_status():
    return bot_engine.get_status()

@router.post("/start")
def start_bot():
    bot_engine.start()
    return {"status": "success", "message": "Real-Time AI Bot started", "bot_status": bot_engine.get_status().model_dump()}

@router.post("/stop")
def stop_bot():
    bot_engine.stop()
    return {"status": "success", "message": "AI Bot stopped", "bot_status": bot_engine.get_status().model_dump()}

@router.post("/toggle-auto-trade")
def toggle_auto_trade(enable: bool = Body(..., embed=True)):
    bot_engine.auto_trade = enable
    return {"status": "success", "auto_trade": bot_engine.auto_trade}

@router.post("/kill-switch")
def set_kill_switch(active: bool = Body(..., embed=True)):
    res = bot_engine.toggle_kill_switch(active)
    return {"status": "success", "kill_switch": res["kill_switch"]}

@router.post("/mode")
def set_execution_mode(mode: str = Body(..., embed=True)):
    if mode not in ["paper", "angel_one", "zerodha", "dhan"]:
        raise HTTPException(status_code=400, detail="Invalid mode. Must be 'paper', 'angel_one', 'zerodha', or 'dhan'")
    settings.broker.active_broker = mode
    bot_engine.mode = mode
    return {"status": "success", "mode": mode}

@router.get("/zerodha-login-url")
def get_zerodha_login_url(api_key: str = Query(...)):
    url = zerodha_kite_broker.get_login_url(api_key)
    return {"login_url": url}

@router.post("/zerodha-generate-token")
async def generate_zerodha_token(
    api_key: str = Body(...),
    api_secret: str = Body(...),
    request_token: str = Body(...)
):
    res = await zerodha_kite_broker.generate_access_token(
        request_token=request_token,
        api_key=api_key,
        api_secret=api_secret
    )
    if res.get("success"):
        settings.broker.active_broker = "zerodha"
        bot_engine.mode = "zerodha"
    return res

@router.post("/broker-connect")
def connect_live_broker(broker_name: str = Body(...), credentials: Dict[str, str] = Body(...)):
    """Validates and establishes live session with Indian broker APIs."""
    if broker_name == "dhan":
        res = dhan_broker.connect(credentials)
        if res.get("success"):
            settings.broker.active_broker = "dhan"
            bot_engine.mode = "dhan"
        return res
    elif broker_name == "angel_one":
        res = angel_one_broker.connect(credentials)
        if res.get("success"):
            settings.broker.active_broker = "angel_one"
            bot_engine.mode = "angel_one"
        return res
    elif broker_name == "zerodha":
        res = zerodha_kite_broker.connect(credentials)
        if res.get("success"):
            settings.broker.active_broker = "zerodha"
            bot_engine.mode = "zerodha"
        return res
    else:
        settings.broker.active_broker = "paper"
        bot_engine.mode = "paper"
        return {"success": True, "message": "Switched to Paper Trading Mode (₹)"}

@router.post("/risk-settings")
def update_risk_settings(data: Dict[str, Any]):
    if "risk_per_trade_pct" in data:
        settings.risk.risk_per_trade_pct = float(data["risk_per_trade_pct"])
    if "max_daily_loss_pct" in data:
        settings.risk.max_daily_loss_pct = float(data["max_daily_loss_pct"])
    if "max_open_positions" in data:
        settings.risk.max_open_positions = int(data["max_open_positions"])
    if "min_confidence_pct" in data:
        settings.risk.min_confidence_pct = float(data["min_confidence_pct"])
    if "use_trailing_stop" in data:
        settings.risk.use_trailing_stop = bool(data["use_trailing_stop"])
    if "auto_breakeven_at_1r" in data:
        settings.risk.auto_breakeven_at_1r = bool(data["auto_breakeven_at_1r"])
    return {"status": "success", "risk_settings": settings.risk.model_dump()}

@router.post("/discord-settings")
async def update_discord_settings(data: Dict[str, Any]):
    from app.database import set_config_value
    if "webhook_url" in data:
        settings.discord.webhook_url = str(data["webhook_url"])
        set_config_value("discord_webhook_url", settings.discord.webhook_url)
    if "enabled" in data:
        settings.discord.enabled = bool(data["enabled"])
        set_config_value("discord_enabled", "true" if settings.discord.enabled else "false")
    return {"status": "success", "discord_settings": settings.discord.model_dump()}

@router.post("/discord-test")
async def test_discord_webhook():
    res = await discord_notifier.send_test_notification()
    return res
