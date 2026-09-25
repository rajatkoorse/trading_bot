import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { LiveTickerMarquee } from './components/LiveTickerMarquee';
import { PortfolioSummary } from './components/PortfolioSummary';
import { RealtimeFundsHub } from './components/RealtimeFundsHub';
import { TradingChart } from './components/TradingChart';
import { SignalFeed } from './components/SignalFeed';
import { ActivePositions } from './components/ActivePositions';
import { BacktestStudio } from './components/BacktestStudio';
import { BotControls } from './components/BotControls';
import { QuickTradePad } from './components/QuickTradePad';
import { ConfluenceRadar } from './components/ConfluenceRadar';
import { DiscordSettingsModal } from './components/DiscordSettingsModal';
import { RiskSettingsModal } from './components/RiskSettingsModal';
import { BrokerConnectModal } from './components/BrokerConnectModal';

import { 
  BotStatus, 
  PortfolioSummary as PortfolioType, 
  AISignal, 
  TradePosition, 
  WatchlistItem 
} from './types';
import { api } from './services/api';
import { soundFx } from './services/audio';

export const App: React.FC = () => {
  const [selectedSymbol, setSelectedSymbol] = useState<string>('^NSEI');
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [signals, setSignals] = useState<AISignal[]>([]);
  const [positions, setPositions] = useState<TradePosition[]>([]);
  const [history, setHistory] = useState<TradePosition[]>([]);
  const [portfolio, setPortfolio] = useState<PortfolioType | null>(null);
  const [botStatus, setBotStatus] = useState<BotStatus | null>(null);
  const [realtimeTicks, setRealtimeTicks] = useState<Record<string, number>>({});

  const [isDiscordOpen, setIsDiscordOpen] = useState<boolean>(false);
  const [isRiskOpen, setIsRiskOpen] = useState<boolean>(false);
  const [isBrokerOpen, setIsBrokerOpen] = useState<boolean>(false);
  const [activeView, setActiveView] = useState<'TERMINAL' | 'BACKTEST'>('TERMINAL');

  // Load initial data
  const refreshAllData = async () => {
    try {
      const [wl, sigs, pos, hist, port, bStatus] = await Promise.all([
        api.getWatchlist().catch(() => []),
        api.getRecentSignals(40).catch(() => []),
        api.getPositions().catch(() => []),
        api.getTradeHistory(40).catch(() => []),
        api.getPortfolio().catch(() => null),
        api.getBotStatus().catch(() => null)
      ]);

      if (wl.length > 0) setWatchlist(wl);
      setSignals(sigs);
      setPositions(pos);
      setHistory(hist);
      if (port) setPortfolio(port);
      if (bStatus) setBotStatus(bStatus);
    } catch (e) {
      console.error('Error refreshing system state:', e);
    }
  };

  useEffect(() => {
    refreshAllData();
    const interval = setInterval(refreshAllData, 4000);
    return () => clearInterval(interval);
  }, []);

  // WebSocket Live Real-Time Updates
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    let ws: WebSocket | null = null;

    const connectWs = () => {
      try {
        ws = new WebSocket(wsUrl);

        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            const { type, data } = msg;

            if (type === 'REALTIME_TICKS') {
              const ticksMap: Record<string, number> = {};
              data.forEach((t: { symbol: string; price: number }) => {
                ticksMap[t.symbol] = t.price;
              });
              setRealtimeTicks((prev) => ({ ...prev, ...ticksMap }));
            } else if (type === 'NEW_SIGNAL') {
              const sig = data as AISignal;
              setSignals((prev) => [sig, ...prev.filter((s) => s.id !== sig.id)].slice(0, 50));
              
              if (sig.signal_type === 'BUY') {
                soundFx.playBuySignal();
              } else if (sig.signal_type === 'SELL') {
                soundFx.playSellSignal();
              }
            } else if (type === 'ORDER_EXECUTED') {
              setPositions((prev) => [data as TradePosition, ...prev]);
              soundFx.playTakeProfit();
            } else if (type === 'POSITION_CLOSED') {
              const closed = data as TradePosition;
              setPositions((prev) => prev.filter((p) => p.id !== closed.id));
              setHistory((prev) => [closed, ...prev]);
              if (closed.pnl > 0) {
                soundFx.playTakeProfit();
              } else {
                soundFx.playStopLossWarning();
              }
            } else if (type === 'PORTFOLIO_TICK') {
              if (data.balance) {
                setPortfolio((prev) => prev ? { ...prev, ...data.balance } : null);
              }
              if (data.positions) {
                setPositions(data.positions);
              }
              if (data.bot_status) {
                setBotStatus(data.bot_status);
              }
            }
          } catch (err) {
            console.error('Error parsing WS message:', err);
          }
        };

        ws.onclose = () => {
          setTimeout(connectWs, 2500);
        };
      } catch (err) {
        console.error('WebSocket connection error:', err);
      }
    };

    connectWs();
    return () => {
      if (ws) ws.close();
    };
  }, []);

  const handleToggleBot = async () => {
    if (botStatus?.is_running) {
      await api.stopBot();
    } else {
      await api.startBot();
    }
    refreshAllData();
  };

  const handleToggleKillSwitch = async () => {
    const nextState = !botStatus?.kill_switch_active;
    await api.setKillSwitch(nextState);
    if (nextState) {
      soundFx.playStopLossWarning();
    }
    refreshAllData();
  };

  const handleClosePosition = async (posId: string) => {
    try {
      await api.closeTrade(posId);
      refreshAllData();
    } catch (e) {
      console.error('Failed to close trade:', e);
    }
  };

  const handleResetPaper = async () => {
    if (window.confirm('Reset Paper Trading account back to ₹1,00,000?')) {
      await api.resetPaperAccount(100000);
      refreshAllData();
    }
  };

  const latestSignal = signals.find((s) => s.symbol === selectedSymbol) || null;
  const currentSymbolPrice = realtimeTicks[selectedSymbol] || watchlist.find((w) => w.symbol === selectedSymbol)?.price || 0;

  return (
    <div className="min-h-screen bg-[#0a0e17] text-slate-100 flex flex-col font-sans">
      
      {/* Top Navigation */}
      <Navbar
        botStatus={botStatus}
        onToggleBot={handleToggleBot}
        onToggleKillSwitch={handleToggleKillSwitch}
        onOpenDiscordModal={() => setIsDiscordOpen(true)}
        onOpenRiskModal={() => setIsRiskOpen(true)}
        onOpenBrokerModal={() => setIsBrokerOpen(true)}
      />

      {/* Live Real-Time Ticker Marquee */}
      <LiveTickerMarquee
        watchlist={watchlist}
        selectedSymbol={selectedSymbol}
        onSelectSymbol={setSelectedSymbol}
        ticks={realtimeTicks}
        onWatchlistUpdated={refreshAllData}
      />

      {/* Main Workspace Container */}
      <main className="flex-1 max-w-[1700px] w-full mx-auto p-4 space-y-4">
        
        {/* Navigation Tabs (Live Terminal vs Quant Backtesting) */}
        <div className="flex items-center justify-between">
          <div className="flex bg-[#111827] p-1 rounded-xl border border-slate-800 text-xs font-bold">
            <button
              onClick={() => setActiveView('TERMINAL')}
              className={`px-4 py-1.5 rounded-lg transition-all ${
                activeView === 'TERMINAL'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Real-Time Trading Terminal & AI Engine
            </button>
            <button
              onClick={() => setActiveView('BACKTEST')}
              className={`px-4 py-1.5 rounded-lg transition-all ${
                activeView === 'BACKTEST'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Strategy Backtesting Studio
            </button>
          </div>

          <div className="text-xs text-slate-400 font-mono hidden md:flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Minimal-Loss Guard Active (1.0% Risk / BE Lock @ 1.0R)</span>
          </div>
        </div>

        {/* 1. Real-Time Funds, Margin & Capital Management Hub */}
        <RealtimeFundsHub
          portfolio={portfolio}
          botStatus={botStatus}
          onRefresh={refreshAllData}
          onOpenBrokerModal={() => setIsBrokerOpen(true)}
        />

        {activeView === 'TERMINAL' ? (
          <>
            {/* 2. Main Workstation 2-Column Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              
              {/* Left Column: Pro Chart + Quick Trade Pad & Positions (8 cols) */}
              <div className="lg:col-span-8 space-y-4">
                <TradingChart
                  symbol={selectedSymbol}
                  onSelectSymbol={setSelectedSymbol}
                  watchlist={watchlist}
                  latestSignal={latestSignal}
                />
                
                {/* Active Trades & Journal with Break-even lock */}
                <ActivePositions
                  positions={positions}
                  history={history}
                  onClosePosition={handleClosePosition}
                  onSelectSymbol={setSelectedSymbol}
                  onRefresh={refreshAllData}
                />
              </div>

              {/* Right Column: Signal Feed, Confluence Radar, Quick Pad, Bot Controls (4 cols) */}
              <div className="lg:col-span-4 space-y-4">
                
                {/* Quick Order Entry Pad */}
                <QuickTradePad
                  symbol={selectedSymbol}
                  currentPrice={currentSymbolPrice}
                  onOrderPlaced={refreshAllData}
                />

                {/* AI Confluence Radar */}
                <ConfluenceRadar
                  latestSignal={latestSignal}
                  symbol={selectedSymbol}
                />

                {/* Live AI Signals Feed */}
                <SignalFeed
                  signals={signals}
                  onSelectSymbol={setSelectedSymbol}
                />

                {/* Bot Core Controls */}
                <BotControls
                  botStatus={botStatus}
                  onToggleBot={handleToggleBot}
                  onToggleAutoTrade={async (en) => { await api.toggleAutoTrade(en); refreshAllData(); }}
                  onToggleKillSwitch={handleToggleKillSwitch}
                  onSetMode={async (m) => { await api.setExecutionMode(m); refreshAllData(); }}
                />
              </div>

            </div>
          </>
        ) : (
          /* Backtest Studio View */
          <BacktestStudio />
        )}

      </main>

      {/* Modals */}
      <DiscordSettingsModal
        isOpen={isDiscordOpen}
        onClose={() => setIsDiscordOpen(false)}
        onUpdated={refreshAllData}
      />

      <RiskSettingsModal
        isOpen={isRiskOpen}
        onClose={() => setIsRiskOpen(false)}
        onUpdated={refreshAllData}
      />

      <BrokerConnectModal
        isOpen={isBrokerOpen}
        onClose={() => setIsBrokerOpen(false)}
        onUpdated={refreshAllData}
        activeBroker={botStatus?.mode || 'paper'}
      />

    </div>
  );
};

export default App;
