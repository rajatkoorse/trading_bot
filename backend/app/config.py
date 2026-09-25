import os
from typing import List
from pydantic import BaseModel, Field
from pydantic_settings import BaseSettings

class RiskSettings(BaseModel):
    account_equity: float = Field(default=100000.0, description="Virtual or Live starting balance in INR (₹)")
    risk_per_trade_pct: float = Field(default=1.0, description="Strict capital risk per trade (default 1.0% for minimal loss)")
    max_daily_loss_pct: float = Field(default=2.0, description="Max total portfolio loss in a day before bot hard freezes (2.0%)")
    max_open_positions: int = Field(default=3, description="Max concurrent active positions (prevents overexposure)")
    default_rrr: float = Field(default=2.0, description="Target Risk-to-Reward Ratio (e.g. 1:2)")
    min_confidence_pct: float = Field(default=75.0, description="Minimum AI Confidence % (75%+ required for high-probability entries)")
    use_trailing_stop: bool = Field(default=True, description="Enable dynamic ATR-based trailing stop-loss")
    trailing_atr_multiplier: float = Field(default=1.5, description="ATR multiplier for trailing stop")
    auto_breakeven_at_1r: bool = Field(default=True, description="Move Stop Loss to Break-Even once 1.0R profit is reached")
    partial_profit_tp1_pct: float = Field(default=50.0, description="Close 50% quantity at Target 1 to lock guaranteed profits")
    consecutive_loss_cooldown_count: int = Field(default=2, description="Pause bot if 2 consecutive trades hit Stop Loss")
    consecutive_loss_cooldown_minutes: int = Field(default=45, description="Cooldown duration in minutes after consecutive losses")
    enable_kill_switch: bool = Field(default=False, description="Global emergency freeze on all trade execution")

class DiscordSettings(BaseModel):
    webhook_url: str = Field(default="", description="Discord channel webhook URL for instant signal alerts")
    enabled: bool = Field(default=False, description="Enable/Disable Discord webhook dispatches")
    notify_on_signals: bool = Field(default=True, description="Post new AI trading signals")
    notify_on_trades: bool = Field(default=True, description="Post order executions, TP/SL hits")
    notify_daily_summary: bool = Field(default=True, description="Post daily PnL & performance recap")

class BrokerSettings(BaseModel):
    active_broker: str = Field(default="paper", description="'paper', 'angel_one', 'zerodha', 'dhan'")
    angel_api_key: str = Field(default="", description="Angel One SmartAPI Key")
    angel_client_code: str = Field(default="", description="Angel One Client ID")
    angel_password: str = Field(default="", description="Angel One MPIN/Password")
    angel_totp_token: str = Field(default="", description="Angel One TOTP secret key")
    zerodha_api_key: str = Field(default="", description="Zerodha Kite API Key")
    zerodha_api_secret: str = Field(default="", description="Zerodha Kite API Secret")
    zerodha_access_token: str = Field(default="", description="Zerodha Kite Access Token")

class Settings(BaseSettings):
    app_name: str = "AI Signals Trader (NSE / BSE)"
    app_env: str = "production"
    debug: bool = False
    host: str = "127.0.0.1"
    port: int = 8000
    
    # Storage
    db_path: str = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "trading_system.db")
    
    # Watchlist (Indian Markets)
    default_watchlist: List[str] = [
        "^NSEI",       # NIFTY 50 Index
        "^NSEBANK",    # BANK NIFTY Index
        "RELIANCE.NS", # Reliance Industries
        "HDFCBANK.NS", # HDFC Bank
        "TCS.NS",      # Tata Consultancy Services
        "INFY.NS",     # Infosys
        "ICICIBANK.NS",# ICICI Bank
        "TATAMOTORS.NS",# Tata Motors
        "SBIN.NS",     # State Bank of India
        "BHARTIARTL.NS",# Bharti Airtel
        "ITC.NS",      # ITC Ltd
        "LT.NS"        # Larsen & Toubro
    ]
    
    # Timeframes: 1m, 5m, 15m, 1h, 1d
    default_timeframe: str = "5m"
    polling_interval_seconds: int = 4 # High-frequency real-time update cycle
    
    # Sub-configs
    risk: RiskSettings = RiskSettings()
    discord: DiscordSettings = DiscordSettings()
    broker: BrokerSettings = BrokerSettings()

    class Config:
        env_file = ".env"
        env_nested_delimiter = "__"

settings = Settings()
