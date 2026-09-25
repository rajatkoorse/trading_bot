import httpx
import logging
from typing import Optional, Dict, Any
from datetime import datetime

from app.config import settings
from app.models.schemas import AISignal, TradePosition, SignalType

logger = logging.getLogger("discord_notifier")

class DiscordNotifier:
    """Dispatches rich embed notifications to a Discord channel via Webhook."""
    
    @staticmethod
    async def send_webhook_payload(payload: Dict[str, Any]) -> bool:
        webhook_url = settings.discord.webhook_url
        if not settings.discord.enabled or not webhook_url:
            return False
            
        try:
            async with httpx.AsyncClient(timeout=6.0) as client:
                res = await client.post(webhook_url, json=payload)
                return res.status_code in [200, 204]
        except Exception as e:
            logger.error(f"Failed to send Discord webhook: {e}")
            return False

    @staticmethod
    async def notify_new_signal(signal: AISignal) -> bool:
        if not settings.discord.notify_on_signals:
            return False
            
        is_buy = signal.signal_type == SignalType.BUY
        color = 0x00E676 if is_buy else 0xFF1744 # Green or Red
        emoji = "🟢 🚀 **STRONG BUY**" if is_buy else "🔴 🔻 **STRONG SELL**"
        
        reasons_text = "\n".join([f"• {r}" for r in signal.reasons])
        
        embed = {
            "title": f"{emoji} Signal on `{signal.symbol}` ({signal.timeframe})",
            "description": f"**AI Confidence:** `{signal.confidence_score}%` | **ML Prob:** `{signal.ml_probability*100:.1f}%`\n**RRR:** `1:{signal.rrr}`",
            "color": color,
            "fields": [
                {"name": "🎯 Entry Price", "value": f"₹{signal.entry_price:,.2f}", "inline": True},
                {"name": "🛑 Stop Loss", "value": f"₹{signal.stop_loss:,.2f}", "inline": True},
                {"name": "💰 Target 1 (1.5R)", "value": f"₹{signal.target_1:,.2f}", "inline": True},
                {"name": "💎 Target 2 (2.5R)", "value": f"₹{signal.target_2:,.2f}", "inline": True},
                {"name": "📊 Indicators", "value": f"RSI: `{signal.indicators.rsi}` | SuperTrend: `{signal.indicators.supertrend}` | VWAP: `₹{signal.indicators.vwap}`", "inline": False},
                {"name": "🧠 AI Confluence Factors", "value": reasons_text or "Pattern alignment", "inline": False}
            ],
            "footer": {
                "text": f"AI Trader (NSE/BSE) • {datetime.utcnow().strftime('%d-%b-%Y %H:%M:%S UTC')}"
            }
        }
        
        payload = {
            "username": "AI Trading Bot (NSE/BSE)",
            "avatar_url": "https://cdn-icons-png.flaticon.com/512/2910/2910312.png",
            "embeds": [embed]
        }
        return await DiscordNotifier.send_webhook_payload(payload)

    @staticmethod
    async def notify_trade_event(title: str, message: str, color_hex: int = 0x2979FF, fields: Optional[list] = None) -> bool:
        if not settings.discord.notify_on_trades:
            return False
            
        embed = {
            "title": title,
            "description": message,
            "color": color_hex,
            "fields": fields or [],
            "footer": {
                "text": f"AI Trader (NSE/BSE) • {datetime.utcnow().strftime('%d-%b-%Y %H:%M:%S UTC')}"
            }
        }
        payload = {
            "username": "AI Trading Bot (NSE/BSE)",
            "embeds": [embed]
        }
        return await DiscordNotifier.send_webhook_payload(payload)

    @staticmethod
    async def send_test_notification() -> Dict[str, Any]:
        """Sends a test ping to verify webhook URL connectivity."""
        embed = {
            "title": "✅ AI Trading Bot Webhook Connected",
            "description": "Discord webhook integration for **NSE & BSE AI Signals** is working perfectly!\nYou will receive instant notifications when signals trigger or trades execute.",
            "color": 0x00E676,
            "fields": [
                {"name": "Market", "value": "NSE & BSE (India)", "inline": True},
                {"name": "Mode", "value": f"{settings.broker.active_broker.upper()}", "inline": True},
                {"name": "Risk / Trade", "value": f"{settings.risk.risk_per_trade_pct}%", "inline": True}
            ],
            "footer": {
                "text": "Personal Trading Assistant"
            }
        }
        payload = {
            "username": "AI Trading Bot (NSE/BSE)",
            "embeds": [embed]
        }
        success = await DiscordNotifier.send_webhook_payload(payload)
        return {"success": success, "message": "Discord message delivered successfully!" if success else "Failed to send webhook. Check URL."}

discord_notifier = DiscordNotifier()
