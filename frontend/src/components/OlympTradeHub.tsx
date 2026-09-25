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
  
  // Credentials modal
  const [isCredsOpen, setIsCredsOpen] = useState<boolean>(false);
  const [sessionToken, setSessionToken] = useState<string>('');
  const [userId, setUserId] = useState<string>('');

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
      alert(e.response?.data?.detail || 'Failed to place Olymp Trade order.');
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

  const handleConnectToken = async () => {
    try {
      await api.connectOlympTrade({ session_token: sessionToken, user_id: userId });
      setIsCredsOpen(false);
      refreshOlympData();
    } catch (e) {
      alert('Connection failed.');
    }
  };

  const currentAssetInfo = assets.find((a) => a.key === selectedAsset) || {
    key: selectedAsset,
    name: selectedAsset,
    category: 'Forex',
    payout: 85,
    price: 1.0850
  };

  const isDemo = (account?.active_account ?? 'demo') === 'demo';
  const balance = isDemo ? (account?.demo_balance ?? 10000) : (account?.real_balance ?? 0);
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
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                24/7 REALTIME (FOREX • CRYPTO • COMMODITIES)
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Fixed Time Trades (FTT) & Global CFD Execution • Always Active
            </p>
          </div>
        </div>

        {/* Right: Account Mode Toggle (Demo $10,000 vs Real Live) */}
        <div className="flex items-center gap-2.5">
          <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs font-bold font-mono">
            <button
              onClick={() => handleSwitchAccount('demo')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all ${
                isDemo
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>🧪 DEMO ACCOUNT (${account?.demo_balance?.toLocaleString('en-US') ?? '10,000'})</span>
            </button>
            <button
              onClick={() => handleSwitchAccount('real')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all ${
                !isDemo
                  ? 'bg-amber-600 text-white shadow-md animate-pulse'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>⚡ REAL LIVE ACCOUNT (${account?.real_balance?.toLocaleString('en-US') ?? '0.00'})</span>
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
            onClick={() => setIsCredsOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/40 rounded-xl text-xs font-semibold transition-all"
          >
            <Key className="w-3.5 h-3.5 text-blue-400" />
            <span>Session Token</span>
          </button>
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

      {/* Credentials Modal */}
      {isCredsOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111827] border border-slate-700 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Key className="w-4 h-4 text-cyan-400" />
                Connect Olymp Trade Account
              </h3>
              <button onClick={() => setIsCredsOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <p className="text-xs text-slate-400">
              Paste your Olymp Trade session token / API key to link your live account. By default, <strong>Olymp Trade Demo ($10,000)</strong> is 100% active and ready.
            </p>

            <div className="space-y-2">
              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1">User ID / Email</label>
                <input
                  type="text"
                  placeholder="e.g. user@example.com"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1">Olymp Trade Session Token</label>
                <input
                  type="password"
                  placeholder="Paste session token / API key"
                  value={sessionToken}
                  onChange={(e) => setSessionToken(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setIsCredsOpen(false)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleConnectToken}
                className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-bold shadow transition-all"
              >
                Save & Connect
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default OlympTradeHub;
