import React, { useState } from 'react';
import { 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  Layers, 
  RotateCcw, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Lock, 
  Sliders, 
  Sparkles,
  Landmark,
  Shield,
  ArrowUpRight
} from 'lucide-react';
import { PortfolioSummary, BotStatus } from '../types';
import { api } from '../services/api';

interface RealtimeFundsHubProps {
  portfolio: PortfolioSummary | null;
  botStatus: BotStatus | null;
  onRefresh: () => void;
  onOpenBrokerModal: () => void;
}

export const RealtimeFundsHub: React.FC<RealtimeFundsHubProps> = ({
  portfolio,
  botStatus,
  onRefresh,
  onOpenBrokerModal
}) => {
  const [isEditingCapital, setIsEditingCapital] = useState(false);
  const [customCapital, setCustomCapital] = useState<string>('100000');
  const [isSyncing, setIsSyncing] = useState(false);

  // Funds and equity figures
  const totalEquity = portfolio?.total_equity ?? 100000;
  const cashBalance = portfolio?.cash_balance ?? 100000;
  const investedCapital = portfolio?.invested_capital ?? portfolio?.allocated_margin ?? 0;
  const initialEquity = portfolio?.initial_equity ?? 100000;
  const unrealizedPnl = portfolio?.unrealized_pnl ?? 0;
  const realizedPnl = portfolio?.realized_pnl ?? 0;
  const dailyPnl = portfolio?.daily_pnl ?? 0;
  const dailyPnlPct = portfolio?.daily_pnl_pct ?? 0;
  const openCount = portfolio?.open_positions_count ?? 0;
  const winRate = portfolio?.win_rate ?? 0;
  const profitFactor = portfolio?.profit_factor ?? 0;
  const isLive = portfolio?.is_live ?? (botStatus?.mode === 'live');
  const brokerName = portfolio?.broker_name || (isLive ? 'Live Broker (Active)' : 'Paper Trading Simulator');

  // Computed percentages
  const investedPct = totalEquity > 0 ? Math.min(100, Math.max(0, (investedCapital / totalEquity) * 100)) : 0;
  const cashPct = totalEquity > 0 ? Math.min(100, Math.max(0, (cashBalance / totalEquity) * 100)) : 100;
  const netGrowth = totalEquity - initialEquity;
  const netGrowthPct = initialEquity > 0 ? (netGrowth / initialEquity) * 100 : 0;
  const roiOnInvested = investedCapital > 0 ? (unrealizedPnl / investedCapital) * 100 : 0;

  const handleManualSync = async () => {
    setIsSyncing(true);
    await onRefresh();
    setTimeout(() => setIsSyncing(false), 600);
  };

  const handleApplyCustomCapital = async (amount: number) => {
    try {
      await api.setAccountCapital(amount);
      setIsEditingCapital(false);
      onRefresh();
    } catch (err) {
      console.error('Failed to set capital:', err);
    }
  };

  const handleResetPaper = async (amount: number = 100000) => {
    if (window.confirm(`Reset Paper Account to ₹${amount.toLocaleString('en-IN')} and clear open trades?`)) {
      await api.resetPaperAccount(amount);
      setIsEditingCapital(false);
      onRefresh();
    }
  };

  return (
    <div className="bg-[#111827] border border-slate-800/90 rounded-2xl p-5 shadow-2xl space-y-4">
      
      {/* 1. Header with Live Broker State Badge & Mode Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl ${
            isLive 
              ? 'bg-amber-500/10 border border-amber-500/30 text-amber-400' 
              : 'bg-blue-500/10 border border-blue-500/30 text-blue-400'
          }`}>
            <Landmark className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white tracking-wide">
                Real-Time Funds & Capital Management Hub
              </h2>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wider ${
                isLive
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse'
                  : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
              }`}>
                <span className={`w-2 h-2 rounded-full ${isLive ? 'bg-amber-400' : 'bg-emerald-400'} animate-ping`}></span>
                {isLive ? '● LIVE BROKER ACCOUNT' : '✓ REALTIME PAPER TRADING'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5 font-mono">
              <span>Broker Stream:</span>
              <strong className="text-slate-200">{brokerName}</strong>
              <span className="text-slate-600">•</span>
              <span className="text-slate-400">Institutional Exchange Accounting</span>
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleManualSync}
            disabled={isSyncing}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold border border-slate-700 transition-all shadow-sm active:scale-95"
            title="Fetch latest broker margin & live tick valuation"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-blue-400' : ''}`} />
            <span>{isSyncing ? 'Syncing...' : 'Sync Funds'}</span>
          </button>

          {!isLive && (
            <button
              onClick={() => setIsEditingCapital(!isEditingCapital)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/40 rounded-lg text-xs font-semibold transition-all shadow-sm active:scale-95"
            >
              <Sliders className="w-3.5 h-3.5 text-blue-400" />
              <span>{isEditingCapital ? 'Close Capital Editor' : 'Adjust Paper Capital'}</span>
            </button>
          )}

          <button
            onClick={onOpenBrokerModal}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-lg text-xs font-bold transition-all shadow-md active:scale-95"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isLive ? 'Broker Settings' : 'Connect Zerodha / Dhan'}</span>
          </button>
        </div>
      </div>

      {/* 2. Paper Capital Editor Drawer (Conditional) */}
      {isEditingCapital && !isLive && (
        <div className="bg-[#0b111e] border border-blue-500/30 rounded-xl p-4 space-y-3 animate-fadeIn">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-blue-300 flex items-center gap-1.5">
              <Sliders className="w-4 h-4 text-blue-400" />
              Configure Virtual Starting Capital for Realistic Simulation
            </span>
            <span className="text-slate-400">Current Initial Benchmark: ₹{initialEquity.toLocaleString('en-IN')}</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-400 font-medium">Quick Presets:</span>
            {[25000, 50000, 100000, 200000, 500000, 1000000].map((amt) => (
              <button
                key={amt}
                onClick={() => handleResetPaper(amt)}
                className={`px-3 py-1 rounded-lg text-xs font-bold font-mono transition-all border ${
                  initialEquity === amt 
                    ? 'bg-blue-600 text-white border-blue-500 shadow-sm' 
                    : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border-slate-700'
                }`}
              >
                ₹{(amt / 100000 >= 1 ? `${amt / 100000} Lakh` : `${amt / 1000}k`)}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 pt-2">
            <div className="relative flex-1 max-w-xs">
              <span className="absolute left-3 top-2 text-slate-400 text-sm font-bold">₹</span>
              <input
                type="number"
                value={customCapital}
                onChange={(e) => setCustomCapital(e.target.value)}
                placeholder="Enter custom starting amount"
                className="w-full pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-blue-500"
              />
            </div>
            <button
              onClick={() => {
                const val = parseFloat(customCapital);
                if (val > 0) handleResetPaper(val);
              }}
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-sm transition-all"
            >
              Set & Reset Wallet
            </button>
            <button
              onClick={() => handleResetPaper(100000)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-red-500/20 text-slate-300 hover:text-red-300 border border-slate-700 hover:border-red-500/40 rounded-lg text-xs font-semibold transition-all ml-auto"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Full Reset (₹1 Lakh Default)</span>
            </button>
          </div>
        </div>
      )}

      {/* 3. Primary Real-Time Rupee Balance Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        
        {/* Card 1: Total Real-Time Portfolio Value (Net Equity) */}
        <div className="bg-[#0f172a]/90 border border-blue-500/20 rounded-xl p-4 flex flex-col justify-between shadow-lg relative overflow-hidden group hover:border-blue-500/40 transition-all">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-xl group-hover:bg-blue-500/10 transition-all"></div>
          <div>
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-1.5">
              <span className="flex items-center gap-1.5">
                <Wallet className="w-4 h-4 text-blue-400" />
                Total Net Equity
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 bg-blue-500/10 text-blue-400 rounded">
                Realtime
              </span>
            </div>
            <div className="text-2xl font-black text-white font-mono tracking-tight">
              ₹{totalEquity.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-xs">
            <span className="text-slate-400 text-[11px]">Net Growth:</span>
            <span className={`font-mono font-bold text-[11px] flex items-center gap-0.5 ${
              netGrowth >= 0 ? 'text-emerald-400' : 'text-red-400'
            }`}>
              {netGrowth >= 0 ? '+' : ''}₹{netGrowth.toLocaleString('en-IN', { maximumFractionDigits: 1 })}
              <span className="text-[10px]">({netGrowth >= 0 ? '+' : ''}{netGrowthPct.toFixed(2)}%)</span>
            </span>
          </div>
        </div>

        {/* Card 2: Available Free Cash (Liquid Buying Power) */}
        <div className="bg-[#0f172a]/90 border border-emerald-500/20 rounded-xl p-4 flex flex-col justify-between shadow-lg relative overflow-hidden group hover:border-emerald-500/40 transition-all">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl group-hover:bg-emerald-500/10 transition-all"></div>
          <div>
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-1.5">
              <span className="flex items-center gap-1.5 text-emerald-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Available Free Cash
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 rounded">
                {cashPct.toFixed(0)}% Free
              </span>
            </div>
            <div className="text-2xl font-black text-emerald-400 font-mono tracking-tight">
              ₹{cashBalance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 font-mono">
            <span>Buying Power:</span>
            <span className="text-slate-200 font-bold">100% Ready</span>
          </div>
        </div>

        {/* Card 3: Invested Capital (Utilized Margin Locked in Trades) */}
        <div className="bg-[#0f172a]/90 border border-indigo-500/20 rounded-xl p-4 flex flex-col justify-between shadow-lg relative overflow-hidden group hover:border-indigo-500/40 transition-all">
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-xl group-hover:bg-indigo-500/10 transition-all"></div>
          <div>
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-1.5">
              <span className="flex items-center gap-1.5 text-indigo-300">
                <Lock className="w-4 h-4 text-indigo-400" />
                Invested Capital
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 bg-indigo-500/10 text-indigo-400 rounded">
                {openCount} Trades
              </span>
            </div>
            <div className="text-2xl font-black text-indigo-300 font-mono tracking-tight">
              ₹{investedCapital.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 font-mono">
            <span>Utilized Margin:</span>
            <span className="text-indigo-400 font-bold">{investedPct.toFixed(1)}% of Capital</span>
          </div>
        </div>

        {/* Card 4: Floating Live Unrealized P&L */}
        <div className={`bg-[#0f172a]/90 border rounded-xl p-4 flex flex-col justify-between shadow-lg relative overflow-hidden transition-all ${
          unrealizedPnl >= 0 ? 'border-emerald-500/30 hover:border-emerald-500/50' : 'border-red-500/30 hover:border-red-500/50'
        }`}>
          <div>
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-1.5">
              <span className="flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-purple-400" />
                Live Floating P&L
              </span>
              {unrealizedPnl >= 0 ? (
                <TrendingUp className="w-4 h-4 text-emerald-400" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-400" />
              )}
            </div>
            <div className={`text-2xl font-black font-mono tracking-tight ${
              unrealizedPnl >= 0 ? 'text-emerald-400' : 'text-red-400'
            }`}>
              {unrealizedPnl >= 0 ? '+' : ''}₹{unrealizedPnl.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">ROI on Invested:</span>
            <span className={`font-mono font-bold ${roiOnInvested >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {investedCapital > 0 ? `${roiOnInvested >= 0 ? '+' : ''}${roiOnInvested.toFixed(2)}%` : '0.00%'}
            </span>
          </div>
        </div>

        {/* Card 5: Realized P&L Settled Today */}
        <div className="bg-[#0f172a]/90 border border-slate-800 rounded-xl p-4 flex flex-col justify-between shadow-lg relative overflow-hidden group hover:border-slate-700 transition-all">
          <div>
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-1.5">
              <span className="flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-amber-400" />
                Realized Closed P&L
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 bg-slate-800 text-slate-300 rounded">
                Today
              </span>
            </div>
            <div className={`text-2xl font-black font-mono tracking-tight ${
              realizedPnl >= 0 ? 'text-emerald-400' : 'text-red-400'
            }`}>
              {realizedPnl >= 0 ? '+' : ''}₹{realizedPnl.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
            <span>Win Rate:</span>
            <span className="font-mono font-bold text-amber-400">{winRate > 0 ? `${winRate.toFixed(1)}%` : '—'}</span>
          </div>
        </div>

      </div>

      {/* 4. Visual Capital Deployment Bar (Available Cash vs Invested Margin) */}
      <div className="bg-[#0b111e]/90 border border-slate-800/80 rounded-xl p-3.5 space-y-2">
        <div className="flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-4">
            <span className="text-slate-300 font-bold flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-emerald-500"></span>
              Free Cash Margin: <strong className="text-emerald-400">₹{cashBalance.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</strong> ({cashPct.toFixed(1)}%)
            </span>
            <span className="text-slate-300 font-bold flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-indigo-500"></span>
              Invested in Active Trades: <strong className="text-indigo-400">₹{investedCapital.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</strong> ({investedPct.toFixed(1)}%)
            </span>
          </div>
          <div className="text-slate-400 text-[11px] hidden sm:block">
            Max Risk Allowed per Trade: <strong className="text-slate-200">1.0% (₹{(totalEquity * 0.01).toFixed(0)})</strong>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden flex border border-slate-800">
          <div 
            className="h-full bg-emerald-500 transition-all duration-500 ease-out" 
            style={{ width: `${cashPct}%` }}
            title={`Free Cash: ₹${cashBalance.toFixed(2)} (${cashPct.toFixed(1)}%)`}
          ></div>
          <div 
            className="h-full bg-indigo-500 transition-all duration-500 ease-out" 
            style={{ width: `${investedPct}%` }}
            title={`Invested Margin: ₹${investedCapital.toFixed(2)} (${investedPct.toFixed(1)}%)`}
          ></div>
        </div>
      </div>

    </div>
  );
};

export default RealtimeFundsHub;
