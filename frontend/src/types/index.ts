export type SignalType = 'BUY' | 'SELL' | 'HOLD';
export type SignalStatus = 'ACTIVE' | 'TRIGGERED' | 'HIT_TP1' | 'HIT_TP2' | 'HIT_SL' | 'EXPIRED' | 'CANCELLED';
export type OrderSide = 'BUY' | 'SELL';
export type PositionStatus = 'OPEN' | 'CLOSED';

export interface Candle {
  timestamp: number;
  datetime: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface IndicatorSnapshot {
  ema_9?: number;
  ema_21?: number;
  ema_50?: number;
  ema_200?: number;
  rsi?: number;
  macd?: number;
  macd_signal?: number;
  macd_hist?: number;
  supertrend?: number;
  supertrend_direction?: number;
  vwap?: number;
  atr?: number;
  bb_upper?: number;
  bb_lower?: number;
}

export interface AISignal {
  id: string;
  symbol: string;
  timeframe: string;
  timestamp: number;
  datetime: string;
  signal_type: SignalType;
  entry_price: number;
  stop_loss: number;
  target_1: number;
  target_2: number;
  rrr: number;
  confidence_score: number;
  ml_probability: number;
  indicators: IndicatorSnapshot;
  reasons: string[];
  status: SignalStatus;
  executed: boolean;
  created_at: string;
}

export interface TradePosition {
  id: string;
  signal_id?: string;
  symbol: string;
  side: OrderSide;
  entry_price: number;
  quantity: number;
  current_price: number;
  stop_loss: number;
  target_1: number;
  target_2: number;
  trailing_stop?: number;
  pnl: number;
  pnl_pct: number;
  status: PositionStatus;
  entry_time: string;
  exit_time?: string;
  exit_price?: number;
  exit_reason?: string;
  fees_incurred: number;
  highest_price?: number;
  lowest_price?: number;
}

export interface PortfolioSummary {
  total_equity: number;
  cash_balance: number;
  allocated_margin: number;
  invested_capital?: number;
  initial_equity?: number;
  unrealized_pnl: number;
  realized_pnl: number;
  daily_pnl: number;
  daily_pnl_pct: number;
  total_trades: number;
  profitable_trades: number;
  losing_trades: number;
  win_rate: number;
  profit_factor: number;
  max_drawdown_pct: number;
  open_positions_count: number;
  broker_name?: string;
  broker_mode?: string;
  is_live?: boolean;
}

export interface BotStatus {
  is_running: boolean;
  mode: string;
  last_scan_time?: string;
  active_symbols: string[];
  timeframe: string;
  open_positions_count: number;
  daily_loss_pct: number;
  circuit_breaker_tripped: boolean;
  kill_switch_active: boolean;
  discord_alerts_enabled: boolean;
  market_is_open?: boolean;
  market_session_text?: string;
}

export interface WatchlistItem {
  symbol: string;
  name: string;
  price: number;
}

export interface BacktestTrade {
  symbol: string;
  side: OrderSide;
  entry_time: string;
  exit_time: string;
  entry_price: number;
  exit_price: number;
  quantity: number;
  pnl: number;
  pnl_pct: number;
  exit_reason: string;
  fees: number;
}

export interface EquityPoint {
  timestamp: string;
  equity: number;
  drawdown_pct: number;
}

export interface BacktestResult {
  initial_capital: number;
  final_capital: number;
  total_return_pct: number;
  cagr_pct: number;
  sharpe_ratio: number;
  sortino_ratio: number;
  max_drawdown_pct: number;
  win_rate_pct: number;
  total_trades: number;
  profitable_trades: number;
  losing_trades: number;
  profit_factor: number;
  average_trade_pnl: number;
  trades: BacktestTrade[];
  equity_curve: EquityPoint[];
}

export interface MarketCandlesResponse {
  symbol: string;
  name: string;
  timeframe: string;
  candles: Candle[];
  indicators: {
    ema_9: number[];
    ema_21: number[];
    ema_50: number[];
    supertrend: number[];
    supertrend_dir: number[];
    vwap: number[];
    rsi: number[];
    macd_hist: number[];
  };
  latest_price: number;
}

export interface OlympTradeAsset {
  key: string;
  symbol: string;
  name: string;
  category: string;
  payout: number;
  price: number;
}

export interface OlympTradePosition {
  id: string;
  asset: string;
  direction: 'CALL' | 'PUT';
  amount: number;
  entry_price: number;
  current_price: number;
  exit_price?: number;
  entry_time_str: string;
  expiry_time_str: string;
  duration_minutes: number;
  time_left_seconds: number;
  payout_pct: number;
  account_type: 'demo' | 'real';
  status: 'ACTIVE' | 'WON' | 'LOST' | 'TIE';
  pnl: number;
  pnl_pct: number;
}

export interface OlympTradeAccountStatus {
  active_account: 'demo' | 'real';
  demo_balance: number;
  real_balance: number;
  current_balance: number;
  invested_margin: number;
  available_cash: number;
  realized_pnl_today: number;
  total_trades: number;
  winning_trades: number;
  win_rate: number;
  is_connected: boolean;
  user_id?: string;
}

export interface GlobalCandleResponse {
  asset: string;
  name: string;
  category: string;
  payout: number;
  timeframe: string;
  candles: Candle[];
  indicators: {
    ema_9: number[];
    ema_21: number[];
    ema_50: number[];
    supertrend: number[];
    supertrend_dir: number[];
    vwap: number[];
    rsi: number[];
    macd_hist: number[];
  };
  latest_price: number;
}
