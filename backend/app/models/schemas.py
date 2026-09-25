from enum import Enum
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime

class SignalType(str, Enum):
    BUY = "BUY"
    SELL = "SELL"
    HOLD = "HOLD"

class SignalStatus(str, Enum):
    ACTIVE = "ACTIVE"
    TRIGGERED = "TRIGGERED"
    HIT_TP1 = "HIT_TP1"
    HIT_TP2 = "HIT_TP2"
    HIT_SL = "HIT_SL"
    EXPIRED = "EXPIRED"
    CANCELLED = "CANCELLED"

class OrderSide(str, Enum):
    BUY = "BUY"
    SELL = "SELL"

class PositionStatus(str, Enum):
    OPEN = "OPEN"
    CLOSED = "CLOSED"

class Candle(BaseModel):
    timestamp: int
    datetime: str
    open: float
    high: float
    low: float
    close: float
    volume: float

class IndicatorSnapshot(BaseModel):
    ema_9: Optional[float] = None
    ema_21: Optional[float] = None
    ema_50: Optional[float] = None
    ema_200: Optional[float] = None
    rsi: Optional[float] = None
    macd: Optional[float] = None
    macd_signal: Optional[float] = None
    macd_hist: Optional[float] = None
    supertrend: Optional[float] = None
    supertrend_direction: Optional[int] = None # 1 for bullish, -1 for bearish
    vwap: Optional[float] = None
    atr: Optional[float] = None
    bb_upper: Optional[float] = None
    bb_lower: Optional[float] = None

class AISignal(BaseModel):
    id: str
    symbol: str
    timeframe: str
    timestamp: int
    datetime: str
    signal_type: SignalType
    entry_price: float
    stop_loss: float
    target_1: float
    target_2: float
    rrr: float
    confidence_score: float = Field(..., description="0 to 100 percentage")
    ml_probability: float = Field(..., description="Directional ML model output 0.0 to 1.0")
    indicators: IndicatorSnapshot
    reasons: List[str]
    status: SignalStatus = SignalStatus.ACTIVE
    executed: bool = False
    created_at: str

class TradePosition(BaseModel):
    id: str
    signal_id: Optional[str] = None
    symbol: str
    side: OrderSide
    entry_price: float
    quantity: int
    current_price: float
    stop_loss: float
    target_1: float
    target_2: float
    trailing_stop: Optional[float] = None
    pnl: float = 0.0
    pnl_pct: float = 0.0
    status: PositionStatus = PositionStatus.OPEN
    entry_time: str
    exit_time: Optional[str] = None
    exit_price: Optional[float] = None
    exit_reason: Optional[str] = None
    fees_incurred: float = 0.0 # STT, Brokerage, GST
    highest_price: Optional[float] = None
    lowest_price: Optional[float] = None

class PortfolioSummary(BaseModel):
    total_equity: float
    cash_balance: float
    allocated_margin: float
    invested_capital: float = 0.0
    initial_equity: float = 100000.0
    unrealized_pnl: float
    realized_pnl: float
    daily_pnl: float
    daily_pnl_pct: float
    total_trades: int
    profitable_trades: int
    losing_trades: int
    win_rate: float
    profit_factor: float
    max_drawdown_pct: float
    open_positions_count: int
    broker_name: str = "Paper Trading Simulator"
    broker_mode: str = "paper"
    is_live: bool = False

class BotStatus(BaseModel):
    is_running: bool
    mode: str # 'paper' or 'live'
    last_scan_time: Optional[str] = None
    active_symbols: List[str]
    timeframe: str
    open_positions_count: int
    daily_loss_pct: float
    circuit_breaker_tripped: bool
    kill_switch_active: bool
    discord_alerts_enabled: bool

class BacktestRequest(BaseModel):
    symbols: List[str] = ["^NSEI", "RELIANCE.NS", "HDFCBANK.NS"]
    start_date: str = "2024-01-01"
    end_date: Optional[str] = None
    timeframe: str = "15m"
    initial_capital: float = 100000.0
    risk_per_trade_pct: float = 1.5
    min_confidence_pct: float = 70.0
    use_trailing_stop: bool = True
    slippage_bps: float = 2.0 # Basis points slippage

class BacktestTrade(BaseModel):
    symbol: str
    side: OrderSide
    entry_time: str
    exit_time: str
    entry_price: float
    exit_price: float
    quantity: int
    pnl: float
    pnl_pct: float
    exit_reason: str
    fees: float

class EquityPoint(BaseModel):
    timestamp: str
    equity: float
    drawdown_pct: float

class BacktestResult(BaseModel):
    initial_capital: float
    final_capital: float
    total_return_pct: float
    cagr_pct: float
    sharpe_ratio: float
    sortino_ratio: float
    max_drawdown_pct: float
    win_rate_pct: float
    total_trades: int
    profitable_trades: int
    losing_trades: int
    profit_factor: float
    average_trade_pnl: float
    trades: List[BacktestTrade]
    equity_curve: List[EquityPoint]
