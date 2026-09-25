import React, { useState, useEffect, useRef } from 'react';
import { 
  Globe2, 
  TrendingUp, 
  TrendingDown, 
  ArrowUpRight, 
  ArrowDownRight, 
  Wallet, 
  RotateCcw, 
  Clock, 
  ShieldCheck, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle,
  Plus, 
  Minus,
  RefreshCw,
  Key,
  Layers,
  Zap,
  DollarSign
} from 'lucide-react';
import { createChart, IChartApi, ISeriesApi, CandlestickData } from 'lightweight-charts';
import { OlympTradeAsset, OlympTradePosition, OlympTradeAccountStatus } from '../types';
import { api } from '../services/api';
import { soundFx } from '../services/audio';

export const OlympTradeHub: React.FC = () => {
  const [selectedAsset, setSelectedAsset] = useState<string>('EUR/USD');
  const [assets, setAssets] = useState<OlympTradeAsset[]>([]);
  const [account, setAccount] = useState<OlympTradeAccountStatus | null>(null);
  const [activePositions, setActivePositions] = useState<OlympTradePosition[]>([]);
  const [historyPositions, setHistoryPositions] = useState<OlympTradePosition[]>([]);
  
  const [tradeAmount, setTradeAmount] = useState<number>(50);
  const [duration, setDuration] = useState<number>(1); // minutes
  const [timeframe, setTimeframe] = useState<string>('1m');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  
  // Credentials modal & Login State
  const [isCredsOpen, setIsCredsOpen] = useState<boolean>(false);
  const [authMode, setAuthMode] = useState<'token' | 'sync'>('token');
  const [sessionToken, setSessionToken] = useState<string>('');
  const [userId, setUserId] = useState<string>('');
  const [inputDemoBal, setInputDemoBal] = useState<number>(10000);
  const [inputRealBal, setInputRealBal] = useState<number>(0);
  const [loginError, setLoginError] = useState<string>('');

  const chartContainerRef = useRef<HTMLDivElement | null>(null);
  const chartInstance = useRef<IChartApi | null>(null);
  const candleSeries = useRef<ISeriesApi<'Candlestick'> | null>(null);

  // Load Assets and Account state
  const refreshOlympData = async () => {
    try {
      const [assetsRes, posRes, accRes] = await Promise.all([
        api.getGlobalAssets().catch(() => ({ assets: [], account: null })),
        api.getOlympTradePositions().catch(() => ({ active: [], history: [] })),
        api.getOlympTradeStatus().catch(() => null)
      ]);

      if (assetsRes.assets?.length > 0) setAssets(assetsRes.assets);
      if (assetsRes.account) setAccount(assetsRes.account);
      else if (accRes) setAccount(accRes);

      if (posRes.active) setActivePositions(posRes.active);
      if (posRes.history) setHistoryPositions(posRes.history);
    } catch (e) {
      console.error('Error refreshing Olymp Trade data:', e);
    }
  };

  useEffect(() => {
    refreshOlympData();
    const interval = setInterval(refreshOlympData, 1500); // 1.5s fast 24/7 poll
    return () => clearInterval(interval);
  }, [selectedAsset]);

  // Render & Update Lightweight Chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    if (!chartInstance.current) {
      const chart = createChart(chartContainerRef.current, {
        layout: {
          background: { color: '#0b111e' },
          textColor: '#94a3b8'
        },
        grid: {
          vertLines: { color: '#1e293b' },
          horzLines: { color: '#1e293b' }
        },
        crosshair: {
          mode: 1
        },
        rightPriceScale: {
          borderColor: '#334155'
        },
        timeScale: {
          borderColor: '#334155',
          timeVisible: true,
          secondsVisible: true
        }
      });

      const series = chart.addCandlestickSeries({
        upColor: '#10b981',
        downColor: '#ef4444',
        borderVisible: false,
        wickUpColor: '#10b981',
        wickDownColor: '#ef4444'
      });

      chartInstance.current = chart;
      candleSeries.current = series;

      const handleResize = () => {
        if (chartContainerRef.current && chartInstance.current) {
          chartInstance.current.applyOptions({
            width: chartContainerRef.current.clientWidth,
            height: chartContainerRef.current.clientHeight
          });
        }
      };

      window.addEventListener('resize', handleResize);
      return () => {
        window.removeEventListener('resize', handleResize);
        chart.remove();
        chartInstance.current = null;
        candleSeries.current = null;
      };
    }
  }, []);

  // Fetch candle data for selected global asset
  useEffect(() => {
    let isMounted = true;
    const loadCandles = async () => {
      try {
        const data = await api.getGlobalCandles(selectedAsset, timeframe, 120);
        if (isMounted && candleSeries.current && data.candles) {
          const formatted: CandlestickData[] = data.candles.map((c: any) => ({
            time: (c.timestamp) as any,
            open: c.open,
            high: c.high,
            low: c.low,
            close: c.close
          }));
          candleSeries.current.setData(formatted);
        }
      } catch (e) {
        console.error('Failed to load global candles:', e);
      }
    };

    loadCandles();
    const candleInterval = setInterval(loadCandles, 2500);
    return () => {
      isMounted = false;
      clearInterval(candleInterval);
    };
  }, [selectedAsset, timeframe]);

  // Account Switching (DEMO vs REAL)
  const handleSwitchAccount = async (mode: 'demo' | 'real') => {
    try {
      await api.switchOlympTradeAccount(mode);
      refreshOlympData();
    } catch (e) {
      console.error('Failed to switch account:', e);
    }
  };

  // Order Placement (CALL / PUT)
  const handlePlaceOrder = async (direction: 'CALL' | 'PUT') => {
    if (!account?.is_connected) {
      setIsCredsOpen(true);
      return;
    }

    try {
      setIsSubmitting(true);
      await api.placeOlympTradeOrder({
        asset: selectedAsset,
        direction,
        amount: tradeAmount,
        duration_minutes: duration
      });

      if (direction === 'CALL') {
        soundFx.playBuySignal();
      } else {
        soundFx.playSellSignal();
      }
      refreshOlympData();
    } catch (e: any) {
      alert(e.response?.data?.detail || e.message || 'Failed to place Olymp Trade order.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset Demo Account
  const handleResetDemo = async () => {
    if (window.confirm('Reset Olymp Trade Demo wallet back to $10,000?')) {
      await api.resetOlympTradeDemo(10000);
      refreshOlympData();
    }
  };

  const handleConnectAccount = async () => {
    setLoginError('');
    setIsSyncing(true);
    try {
      await api.connectOlympTrade({ 
        session_token: sessionToken, 
        user_id: userId,
        demo_balance: Number(inputDemoBal),
        real_balance: Number(inputRealBal)
      });
      setIsCredsOpen(false);
      refreshOlympData();
    } catch (e: any) {
      setLoginError(e.response?.data?.detail || 'Connection failed. Please verify your credentials.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDisconnectAccount = async () => {
    if (window.confirm('Are you sure you want to disconnect your Olymp Trade account?')) {
      try {
        await api.disconnectOlympTrade();
        refreshOlympData();
      } catch (e) {
        console.error('Failed to disconnect:', e);
      }
    }
  };

  const currentAssetInfo = assets.find((a) => a.key === selectedAsset) || {
    key: selectedAsset,
    name: selectedAsset,
    category: 'Forex',
    payout: 85,
    price: 1.0850
  };

  const isConnected = account?.is_connected ?? false;
  const isDemo = (account?.active_account ?? 'demo') === 'demo';
  const balance = isDemo ? (account?.demo_balance ?? 0) : (account?.real_balance ?? 0);
  const potentialProfit = tradeAmount * (currentAssetInfo.payout / 100);

  return (
    <div className="space-y-4 animate-fadeIn">
      
      {/* 1. 24/7 Global Market Banner & Account Type Controller */}
      <div className="bg-[#111827] border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-wrap items-center justify-between gap-4">
        
        {/* Left: Branding & 24/7 Status */}
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-tr from-cyan-600 to-blue-600 rounded-xl text-white shadow-lg shadow-cyan-600/20">
            <Globe2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white tracking-wide">
                Olymp Trade 24/7 Global Engine
              </h2>
              {isConnected ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                  CONNECTED ({account?.user_id || 'ACTIVE'})
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-amber-500/15 text-amber-400 border border-amber-500/30">
                  <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                  NOT LOGGED IN
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Fixed Time Trades (FTT) & Global CFD Execution • Always Active
            </p>
          </div>
        </div>

        {/* Right: Account Mode Toggle & Login Controller */}
        <div className="flex items-center gap-2.5">
          {isConnected ? (
            <>
              <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs font-bold font-mono">
                <button
                  onClick={() => handleSwitchAccount('demo')}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all ${
                    isDemo
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span>🧪 DEMO ACCOUNT (${account?.demo_balance?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? '0.00'})</span>
                </button>
                <button
                  onClick={() => handleSwitchAccount('real')}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all ${
                    !isDemo
                      ? 'bg-amber-600 text-white shadow-md animate-pulse'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span>⚡ REAL LIVE ACCOUNT (${account?.real_balance?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? '0.00'})</span>
                </button>
              </div>

              {isDemo && (
                <button
                  onClick={handleResetDemo}
                  title="Reset Demo Wallet to $10,000"
                  className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition-all"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              )}

              <button
                onClick={handleDisconnectAccount}
                title="Disconnect Olymp Trade account"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl text-xs font-semibold transition-all"
              >
                <span>Disconnect</span>
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsCredsOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold rounded-xl text-xs shadow-lg shadow-cyan-600/30 transition-all active:scale-98 animate-pulse"
            >
              <Key className="w-4 h-4 text-white" />
              <span>🔑 Login to Olymp Trade Account</span>
            </button>
          )}
        </div>

      </div>

      {/* 2. Top Account Metric Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        
        {/* Card 1: Active Balance */}
        <div className="bg-[#111827] border border-slate-800 rounded-xl p-4 shadow-md">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-1">
            <span className="flex items-center gap-1.5">
              <Wallet className="w-4 h-4 text-cyan-400" />
              {isDemo ? 'Olymp Demo Balance' : 'Olymp Real Balance'}
            </span>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${isDemo ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
              {isDemo ? 'DEMO' : 'LIVE'}
            </span>
          </div>
          <div className="text-2xl font-black text-white font-mono">
            ${balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        {/* Card 2: Available Cash */}
        <div className="bg-[#111827] border border-slate-800 rounded-xl p-4 shadow-md">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-1">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Available Margin
            </span>
          </div>
          <div className="text-2xl font-black text-emerald-400 font-mono">
            ${(account?.available_cash ?? balance).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
        </div>

        {/* Card 3: Active Invested Margin */}
        <div className="bg-[#111827] border border-slate-800 rounded-xl p-4 shadow-md">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-1">
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-purple-400" />
              Active Expiry Orders
            </span>
            <span className="text-[10px] text-slate-400">{activePositions.length} Running</span>
          </div>
          <div className="text-2xl font-black text-purple-300 font-mono">
            ${(account?.invested_margin ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
        </div>

        {/* Card 4: Win Rate & Realized Today */}
        <div className="bg-[#111827] border border-slate-800 rounded-xl p-4 shadow-md">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-1">
            <span className="flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-amber-400" />
              Today's Net Profit
            </span>
            <span className="text-[10px] text-amber-400 font-bold">{account?.win_rate ?? 0}% Win</span>
          </div>
          <div className={`text-2xl font-black font-mono ${
            (account?.realized_pnl_today ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400'
          }`}>
            {(account?.realized_pnl_today ?? 0) >= 0 ? '+' : ''}${account?.realized_pnl_today?.toFixed(2) ?? '0.00'}
          </div>
        </div>

      </div>

      {/* 3. Global 24/7 Asset Marquee Strip */}
      <div className="bg-[#0f172a] border border-slate-800/90 rounded-xl p-2 flex items-center gap-2 overflow-x-auto no-scrollbar shadow-inner">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2 shrink-0 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
          24/7 ASSETS:
        </span>
        {assets.map((asset) => {
          const isSelected = selectedAsset === asset.key;
          return (
            <button
              key={asset.key}
              onClick={() => setSelectedAsset(asset.key)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono transition-all shrink-0 border ${
                isSelected
                  ? 'bg-cyan-600/20 border-cyan-500 text-white shadow'
                  : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <span className="font-sans font-bold text-white">{asset.key}</span>
              <span className="text-cyan-400 font-bold font-mono">
                {asset.price > 100 ? `$${asset.price.toFixed(2)}` : asset.price.toFixed(4)}
              </span>
              <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400">
                {asset.payout}%
              </span>
            </button>
          );
        })}
      </div>

      {/* Disconnected Warning / Login Prompt Banner */}
      {!isConnected && (
        <div className="bg-gradient-to-r from-amber-950/40 via-blue-950/30 to-amber-950/40 border border-amber-500/40 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-lg animate-fadeIn">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-xl">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">Olymp Trade Account Connection Required</h4>
              <p className="text-xs text-slate-300">
                Log in to link your personal Olymp Trade account so paper trading and live orders utilize your actual platform balances.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsCredsOpen(true)}
            className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-xl text-xs shadow transition-all active:scale-98 flex items-center gap-1.5"
          >
            <Key className="w-3.5 h-3.5" />
            <span>Connect Account Now</span>
          </button>
        </div>
      )}

      {/* 4. Main Trading Workspace: Chart (Left) & 1-Click Order Pad (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* Left Column: 24/7 Pro Global Chart (8 cols) */}
        <div className="lg:col-span-8 bg-[#111827] border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3 flex flex-col">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <span className="text-base font-extrabold text-white font-sans">{currentAssetInfo.name}</span>
              <span className="text-xs px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 font-bold font-mono">{currentAssetInfo.category}</span>
              <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold font-mono">Payout: {currentAssetInfo.payout}%</span>
            </div>

            {/* Timeframe Selector */}
            <div className="flex bg-slate-900 p-0.5 rounded-lg border border-slate-800 text-xs font-bold font-mono">
              {['1m', '5m', '15m'].map((tf) => (
                <button
                  key={tf}
                  onClick={() => setTimeframe(tf)}
                  className={`px-2.5 py-1 rounded transition-all ${
                    timeframe === tf ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>
          </div>

          {/* Lightweight Chart Container */}
          <div ref={chartContainerRef} className="w-full h-[400px] rounded-xl overflow-hidden"></div>

          {/* Active Positions & Expiry Table under Chart */}
          <div className="pt-2">
            <h4 className="text-xs font-bold text-slate-300 mb-2 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-cyan-400" />
              Active Olymp Trade Positions ({activePositions.length})
            </h4>

            {activePositions.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-500 bg-slate-900/40 rounded-xl border border-slate-800/80">
                No active expiration trades running. Place a 1-click CALL (UP) or PUT (DOWN) order.
              </div>
            ) : (
              <div className="overflow-x-auto max-h-48 overflow-y-auto">
                <table className="w-full text-xs text-left font-mono">
                  <thead className="bg-slate-900 text-slate-400 text-[10px] uppercase sticky top-0">
                    <tr>
                      <th className="p-2">Asset</th>
                      <th className="p-2">Direction</th>
                      <th className="p-2">Amount</th>
                      <th className="p-2">Entry Price</th>
                      <th className="p-2">Live Price</th>
                      <th className="p-2">Payout</th>
                      <th className="p-2">Time Left</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {activePositions.map((pos) => {
                      const isCall = pos.direction === 'CALL';
                      const isWinning = isCall ? pos.current_price > pos.entry_price : pos.current_price < pos.entry_price;
                      return (
                        <tr key={pos.id} className="hover:bg-slate-800/40">
                          <td className="p-2 font-bold text-white">{pos.asset}</td>
                          <td className="p-2">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              isCall ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                            }`}>
                              {pos.direction} ({isCall ? 'HIGHER' : 'LOWER'})
                            </span>
                          </td>
                          <td className="p-2 text-white font-bold">${pos.amount}</td>
                          <td className="p-2 text-slate-300">{pos.entry_price}</td>
                          <td className={`p-2 font-bold ${isWinning ? 'text-emerald-400' : 'text-red-400'}`}>
                            {pos.current_price}
                          </td>
                          <td className="p-2 text-emerald-400 font-bold">+{pos.payout_pct}% (${(pos.amount * (pos.payout_pct / 100)).toFixed(1)})</td>
                          <td className="p-2 text-amber-400 font-bold">{pos.time_left_seconds}s left</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: 1-Click Fixed Time & CFD Execution Pad (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          
          <div className="bg-[#111827] border border-slate-800 rounded-2xl p-4 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-amber-400" />
                1-Click Execution Pad
              </span>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                isDemo ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
              }`}>
                {isDemo ? 'DEMO MODE ($10k)' : 'REAL LIVE TRADING'}
              </span>
            </div>

            {/* Trade Amount Selector */}
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">Investment Amount ($)</label>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setTradeAmount(Math.max(5, tradeAmount - 10))}
                  className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 rounded-xl"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <input
                  type="number"
                  value={tradeAmount}
                  onChange={(e) => setTradeAmount(Math.max(1, Number(e.target.value)))}
                  className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-center text-lg font-mono font-black text-white focus:outline-none focus:border-cyan-500"
                />
                <button
                  onClick={() => setTradeAmount(tradeAmount + 10)}
                  className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 rounded-xl"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Quick Amount Presets */}
              <div className="grid grid-cols-4 gap-1.5 mt-2">
                {[10, 25, 50, 100].map((amt) => (
                  <button
                    key={amt}
                    onClick={() => setTradeAmount(amt)}
                    className={`py-1 rounded-lg text-xs font-mono font-bold border ${
                      tradeAmount === amt 
                        ? 'bg-cyan-600 text-white border-cyan-500 shadow' 
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    ${amt}
                  </button>
                ))}
              </div>
            </div>

            {/* Expiry Duration Selector */}
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">Trade Duration / Expiry</label>
              <div className="grid grid-cols-4 gap-2">
                {[1, 2, 5, 15].map((d) => (
                  <button
                    key={d}
                    onClick={() => setDuration(d)}
                    className={`py-2 rounded-xl text-xs font-mono font-bold border transition-all ${
                      duration === d
                        ? 'bg-blue-600 text-white border-blue-500 shadow'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {d} min
                  </button>
                ))}
              </div>
            </div>

            {/* Potential Payout Return Banner */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400">Potential Return ({currentAssetInfo.payout}%):</span>
              <span className="text-emerald-400 font-bold text-sm">+${potentialProfit.toFixed(2)}</span>
            </div>

            {/* CALL (UP) and PUT (DOWN) Action Buttons */}
            <div className="space-y-2.5 pt-1">
              <button
                onClick={() => handlePlaceOrder('CALL')}
                disabled={isSubmitting || tradeAmount > balance}
                className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl font-bold flex items-center justify-between px-4 shadow-lg shadow-emerald-600/20 transition-all active:scale-98 disabled:opacity-50"
              >
                <div className="flex items-center gap-2">
                  <ArrowUpRight className="w-5 h-5 stroke-[3]" />
                  <span className="text-sm">CALL (HIGHER / UP)</span>
                </div>
                <span className="text-xs font-mono font-extrabold bg-emerald-950/80 px-2.5 py-1 rounded-lg border border-emerald-500/40">
                  +${potentialProfit.toFixed(1)}
                </span>
              </button>

              <button
                onClick={() => handlePlaceOrder('PUT')}
                disabled={isSubmitting || tradeAmount > balance}
                className="w-full py-3.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white rounded-xl font-bold flex items-center justify-between px-4 shadow-lg shadow-red-600/20 transition-all active:scale-98 disabled:opacity-50"
              >
                <div className="flex items-center gap-2">
                  <ArrowDownRight className="w-5 h-5 stroke-[3]" />
                  <span className="text-sm">PUT (LOWER / DOWN)</span>
                </div>
                <span className="text-xs font-mono font-extrabold bg-red-950/80 px-2.5 py-1 rounded-lg border border-red-500/40">
                  +${potentialProfit.toFixed(1)}
                </span>
              </button>
            </div>

          </div>

          {/* Past Trade History Log */}
          <div className="bg-[#111827] border border-slate-800 rounded-2xl p-4 shadow-xl space-y-2.5">
            <h4 className="text-xs font-bold text-slate-300 flex items-center justify-between">
              <span>Olymp Trade Journal</span>
              <span className="text-[10px] text-slate-500">{historyPositions.length} Closed</span>
            </h4>

            {historyPositions.length === 0 ? (
              <div className="text-center py-4 text-xs text-slate-500">No closed trades yet.</div>
            ) : (
              <div className="space-y-1.5 max-h-44 overflow-y-auto font-mono text-xs">
                {historyPositions.slice(0, 10).map((h) => {
                  const isWon = h.status === 'WON';
                  return (
                    <div key={h.id} className="flex items-center justify-between p-2 rounded-lg bg-slate-900/60 border border-slate-800/80">
                      <div>
                        <span className="font-bold text-white block">{h.asset}</span>
                        <span className="text-[10px] text-slate-400">{h.direction} • {h.duration_minutes}m</span>
                      </div>
                      <div className="text-right">
                        <span className={`font-bold block ${isWon ? 'text-emerald-400' : 'text-red-400'}`}>
                          {isWon ? `+$${h.pnl}` : `-$${h.amount}`}
                        </span>
                        <span className={`text-[9px] uppercase px-1.5 py-0.2 rounded font-bold ${
                          isWon ? 'bg-emerald-950 text-emerald-300' : 'bg-red-950 text-red-300'
                        }`}>
                          {h.status}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

      </div>

      {/* Credentials & Login Modal */}
      {isCredsOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#111827] border border-slate-700 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-scaleUp">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-gradient-to-tr from-cyan-600 to-blue-600 rounded-xl text-white shadow-md shadow-cyan-600/30">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Connect Olymp Trade Account</h3>
                  <p className="text-[11px] text-slate-400">Trade 24/7 with your personal Demo & Real funds</p>
                </div>
              </div>
              <button 
                onClick={() => setIsCredsOpen(false)} 
                className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-all text-sm"
              >
                ✕
              </button>
            </div>

            {/* Auth Mode Tabs: 1-Click Fast Connect (Default) vs 1-Click Token Grabber vs Manual */}
            <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs font-bold font-mono">
              <button
                type="button"
                onClick={() => setAuthMode('sync')}
                className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  authMode === 'sync' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                <span>🚀 1-Click Fast Connect</span>
              </button>
              <button
                type="button"
                onClick={() => setAuthMode('token')}
                className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  authMode === 'token' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Key className="w-3.5 h-3.5" />
                <span>🔑 Session Token</span>
              </button>
            </div>

            {loginError && (
              <div className="p-3 bg-red-950/60 border border-red-500/40 rounded-xl text-xs text-red-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            {/* Tab 1: 1-Click Fast Connect (Simplest & Recommended) */}
            {authMode === 'sync' && (
              <div className="space-y-3.5 text-xs">
                <div className="p-3 bg-cyan-950/30 border border-cyan-500/30 rounded-xl text-slate-300 text-[11px] leading-relaxed">
                  <span className="font-bold text-cyan-400 block mb-0.5">✨ Instant Zero-Setup Login:</span>
                  Enter your Olymp Trade registered email / username and your current wallet balance. The bot will immediately bind to your account funds.
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Olymp Trade Email / User ID</label>
                  <input
                    type="text"
                    placeholder="e.g. trader@gmail.com or User #981245"
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-cyan-500 font-sans text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-300 font-semibold block mb-1">
                      Olymp Demo Balance ($)
                    </label>
                    <input
                      type="number"
                      value={inputDemoBal}
                      onChange={(e) => setInputDemoBal(Number(e.target.value))}
                      placeholder="10000"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500 font-mono font-bold"
                    />
                    <span className="text-[10px] text-slate-500">Your Olymp Trade demo wallet</span>
                  </div>
                  <div>
                    <label className="text-slate-300 font-semibold block mb-1">
                      Olymp Real Balance ($)
                    </label>
                    <input
                      type="number"
                      value={inputRealBal}
                      onChange={(e) => setInputRealBal(Number(e.target.value))}
                      placeholder="0.00"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500 font-mono font-bold"
                    />
                    <span className="text-[10px] text-slate-500">Your Olymp Trade real wallet</span>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: Session Token with 1-Click Grabber */}
            {authMode === 'token' && (
              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Olymp Trade Email / User ID</label>
                  <input
                    type="text"
                    placeholder="e.g. trader@example.com"
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500 font-sans"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-slate-300 font-semibold">Olymp Trade Session Token</label>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const text = await navigator.clipboard.readText();
                          if (text) setSessionToken(text.trim());
                        } catch (e) {
                          // Clipboard permission
                        }
                      }}
                      className="text-[10px] text-cyan-400 hover:text-cyan-300 font-mono underline"
                    >
                      📋 Paste from Clipboard
                    </button>
                  </div>
                  <input
                    type="password"
                    placeholder="Paste session token here"
                    value={sessionToken}
                    onChange={(e) => setSessionToken(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500 font-mono text-xs"
                  />
                </div>

                {/* 1-Click Automated Token Grabber Script */}
                <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-400 text-[11px]">⚡ 1-Click Token Copy Script (No searching):</span>
                    <button
                      type="button"
                      onClick={() => {
                        const script = `copy(localStorage.getItem('token') || sessionStorage.getItem('token') || (document.cookie.split(';').find(c=>c.includes('token='))||'').split('=')[1] || '')`;
                        navigator.clipboard.writeText(script);
                        alert('✅ Script copied! Go to Olymp Trade, press F12 -> Console -> Paste & Press Enter.');
                      }}
                      className="px-2 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-lg text-[10px] font-bold transition-all"
                    >
                      📋 Copy 1-Click Script
                    </button>
                  </div>
                  <ol className="list-decimal list-inside space-y-0.5 text-[11px] text-slate-400">
                    <li>Click <strong>Copy 1-Click Script</strong> above.</li>
                    <li>Open <strong>olymptrade.com/platform</strong> $\rightarrow$ Press <strong>F12</strong> $\rightarrow$ <strong>Console</strong>.</li>
                    <li>Paste & Press <strong>Enter</strong> (your token is automatically copied).</li>
                    <li>Return here and click <strong>Paste from Clipboard</strong>.</li>
                  </ol>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsCredsOpen(false)}
                className="px-4 py-2 text-xs text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-all font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConnectAccount}
                disabled={isSyncing}
                className="px-5 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-cyan-600/20 transition-all flex items-center gap-2 disabled:opacity-50 active:scale-98"
              >
                {isSyncing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Connecting...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Connect & Start Trading</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default OlympTradeHub;
