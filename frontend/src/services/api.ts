import axios from 'axios';
import {
  WatchlistItem,
  MarketCandlesResponse,
  AISignal,
  TradePosition,
  PortfolioSummary,
  BotStatus,
  BacktestResult
} from '../types';

export function getBackendBaseUrl(): string {
  if (typeof window !== 'undefined') {
    const custom = localStorage.getItem('trader_backend_url');
    if (custom && custom.trim()) {
      return custom.trim().replace(/\/+$/, '');
    }
  }
  const viteEnv = (import.meta as any).env;
  if (viteEnv && viteEnv.VITE_API_URL) {
    return (viteEnv.VITE_API_URL as string).replace(/\/+$/, '');
  }
  return '';
}

export function setBackendBaseUrl(url: string): void {
  if (typeof window !== 'undefined') {
    if (!url || !url.trim()) {
      localStorage.removeItem('trader_backend_url');
    } else {
      localStorage.setItem('trader_backend_url', url.trim().replace(/\/+$/, ''));
    }
  }
}

export function getApiBase(): string {
  const base = getBackendBaseUrl();
  return base ? `${base}/api` : '/api';
}

export const api = {
  // Market Data
  getWatchlist: async (): Promise<WatchlistItem[]> => {
    const res = await axios.get(`${getApiBase()}/market/watchlist`);
    return res.data.watchlist;
  },

  addToWatchlist: async (symbol: string): Promise<any> => {
    const res = await axios.post(`${getApiBase()}/market/watchlist?symbol=${encodeURIComponent(symbol)}`);
    return res.data;
  },

  removeFromWatchlist: async (symbol: string): Promise<any> => {
    const res = await axios.delete(`${getApiBase()}/market/watchlist/${encodeURIComponent(symbol)}`);
    return res.data;
  },

  getCandles: async (symbol: string, timeframe: string = '5m', limit: number = 150): Promise<MarketCandlesResponse> => {
    const res = await axios.get(`${getApiBase()}/market/candles/${encodeURIComponent(symbol)}?timeframe=${timeframe}&limit=${limit}`);
    return res.data;
  },

  // AI Signals
  getRecentSignals: async (limit: number = 30, symbol?: string): Promise<AISignal[]> => {
    const url = symbol 
      ? `${getApiBase()}/signals/recent?limit=${limit}&symbol=${encodeURIComponent(symbol)}`
      : `${getApiBase()}/signals/recent?limit=${limit}`;
    const res = await axios.get(url);
    return res.data.signals;
  },

  triggerScan: async (symbol: string): Promise<AISignal> => {
    const res = await axios.post(`${getApiBase()}/signals/scan?symbol=${encodeURIComponent(symbol)}`);
    return res.data.signal;
  },

  // Positions & Trades
  getPositions: async (): Promise<TradePosition[]> => {
    const res = await axios.get(`${getApiBase()}/trades/positions`);
    return res.data.positions;
  },

  getTradeHistory: async (limit: number = 50): Promise<TradePosition[]> => {
    const res = await axios.get(`${getApiBase()}/trades/history?limit=${limit}`);
    return res.data.history;
  },

  getPortfolio: async (): Promise<PortfolioSummary> => {
    const res = await axios.get(`${getApiBase()}/trades/portfolio`);
    return res.data;
  },

  executeQuickOrder: async (params: { symbol: string; side: 'BUY' | 'SELL'; quantity: number; stop_loss_pts?: number; target_pts?: number }): Promise<any> => {
    const res = await axios.post(`${getApiBase()}/trades/quick-order`, params);
    return res.data;
  },

  closeTrade: async (positionId: string): Promise<any> => {
    const res = await axios.post(`${getApiBase()}/trades/close/${positionId}`);
    return res.data;
  },

  partialCloseTrade: async (positionId: string, qty: number): Promise<any> => {
    const res = await axios.post(`${getApiBase()}/trades/partial-close/${positionId}`, { qty });
    return res.data;
  },

  lockBreakevenTrade: async (positionId: string): Promise<any> => {
    const res = await axios.post(`${getApiBase()}/trades/lock-breakeven/${positionId}`);
    return res.data;
  },

  resetPaperAccount: async (amount: number = 100000): Promise<any> => {
    const res = await axios.post(`${getApiBase()}/trades/reset-paper?amount=${amount}`);
    return res.data;
  },

  setAccountCapital: async (amount: number): Promise<any> => {
    const res = await axios.post(`${getApiBase()}/trades/set-capital?amount=${amount}`);
    return res.data;
  },

  // Bot Controller & Brokers
  getBotStatus: async (): Promise<BotStatus> => {
    const res = await axios.get(`${getApiBase()}/bot/status`);
    return res.data;
  },

  startBot: async (): Promise<any> => {
    const res = await axios.post(`${getApiBase()}/bot/start`);
    return res.data;
  },

  stopBot: async (): Promise<any> => {
    const res = await axios.post(`${getApiBase()}/bot/stop`);
    return res.data;
  },

  toggleAutoTrade: async (enable: boolean): Promise<any> => {
    const res = await axios.post(`${getApiBase()}/bot/toggle-auto-trade`, { enable });
    return res.data;
  },

  setKillSwitch: async (active: boolean): Promise<any> => {
    const res = await axios.post(`${getApiBase()}/bot/kill-switch`, { active });
    return res.data;
  },

  setExecutionMode: async (mode: string): Promise<any> => {
    const res = await axios.post(`${getApiBase()}/bot/mode`, { mode });
    return res.data;
  },

  connectBroker: async (broker_name: string, credentials: Record<string, string>): Promise<any> => {
    const res = await axios.post(`${getApiBase()}/bot/broker-connect`, { broker_name, credentials });
    return res.data;
  },

  getZerodhaLoginUrl: async (api_key: string): Promise<string> => {
    const res = await axios.get(`${getApiBase()}/bot/zerodha-login-url?api_key=${encodeURIComponent(api_key)}`);
    return res.data.login_url;
  },

  generateZerodhaToken: async (params: { api_key: string; api_secret: string; request_token: string }): Promise<any> => {
    const res = await axios.post(`${getApiBase()}/bot/zerodha-generate-token`, params);
    return res.data;
  },

  updateRiskSettings: async (settings: any): Promise<any> => {
    const res = await axios.post(`${getApiBase()}/bot/risk-settings`, settings);
    return res.data;
  },

  updateDiscordSettings: async (settings: { webhook_url: string; enabled: boolean }): Promise<any> => {
    const res = await axios.post(`${getApiBase()}/bot/discord-settings`, settings);
    return res.data;
  },

  testDiscordWebhook: async (): Promise<{ success: boolean; message: string }> => {
    const res = await axios.post(`${getApiBase()}/bot/discord-test`);
    return res.data;
  },

  // Backtest
  runBacktest: async (params: any): Promise<BacktestResult> => {
    const res = await axios.post(`${getApiBase()}/backtest/run`, params);
    return res.data;
  }
};
