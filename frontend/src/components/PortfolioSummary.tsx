import React from 'react';
import { 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  Percent, 
  Award, 
  Layers, 
  RotateCcw 
} from 'lucide-react';
import { PortfolioSummary as PortfolioType } from '../types';

interface PortfolioSummaryProps {
  portfolio: PortfolioType | null;
  onResetPaperAccount: () => void;
}

export const PortfolioSummary: React.FC<PortfolioSummaryProps> = ({
  portfolio,
  onResetPaperAccount
}) => {
  const equity = portfolio?.total_equity ?? 100000;
  const cash = portfolio?.cash_balance ?? 100000;
  const dailyPnl = portfolio?.daily_pnl ?? 0;
  const dailyPnlPct = portfolio?.daily_pnl_pct ?? 0;
  const unrealized = portfolio?.unrealized_pnl ?? 0;
  const realized = portfolio?.realized_pnl ?? 0;
  const winRate = portfolio?.win_rate ?? 0;
  const profitFactor = portfolio?.profit_factor ?? 0;
  const totalTrades = portfolio?.total_trades ?? 0;
  const openCount = portfolio?.open_positions_count ?? 0;

  const isPositiveDaily = dailyPnl >= 0;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      
      {/* 1. Account Equity */}
      <div className="bg-[#111827] border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between shadow-md">
        <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
          <span>Portfolio Value</span>
          <Wallet className="w-4 h-4 text-blue-400" />
        </div>
        <div>
          <div className="text-xl font-extrabold text-white font-mono tracking-tight">
            ₹{equity.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5 font-mono">
            Cash: ₹{cash.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
        </div>
      </div>

      {/* 2. Today's PnL */}
      <div className="bg-[#111827] border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between shadow-md">
        <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
          <span>Today's P&L</span>
          {isPositiveDaily ? (
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          ) : (
            <TrendingDown className="w-4 h-4 text-red-400" />
          )}
        </div>
        <div>
          <div className={`text-xl font-extrabold font-mono tracking-tight ${
            isPositiveDaily ? 'text-emerald-400' : 'text-red-400'
          }`}>
            {isPositiveDaily ? '+' : ''}₹{dailyPnl.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className={`text-[11px] font-semibold mt-0.5 font-mono ${
            isPositiveDaily ? 'text-emerald-500' : 'text-red-500'
          }`}>
            {isPositiveDaily ? '+' : ''}{dailyPnlPct.toFixed(2)}% Today
          </div>
        </div>
      </div>

      {/* 3. Floating Unrealized PnL */}
      <div className="bg-[#111827] border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between shadow-md">
        <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
          <span>Unrealized (Open)</span>
          <Layers className="w-4 h-4 text-purple-400" />
        </div>
        <div>
          <div className={`text-xl font-extrabold font-mono tracking-tight ${
            unrealized >= 0 ? 'text-emerald-400' : 'text-red-400'
          }`}>
            {unrealized >= 0 ? '+' : ''}₹{unrealized.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {openCount} Open Positions
          </div>
        </div>
      </div>

      {/* 4. Win Rate */}
      <div className="bg-[#111827] border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between shadow-md">
        <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
          <span>Win Rate</span>
          <Award className="w-4 h-4 text-amber-400" />
        </div>
        <div>
          <div className="text-xl font-extrabold text-white font-mono tracking-tight">
            {winRate > 0 ? `${winRate.toFixed(1)}%` : '—'}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {portfolio?.profitable_trades ?? 0}W / {portfolio?.losing_trades ?? 0}L
          </div>
        </div>
      </div>

      {/* 5. Profit Factor */}
      <div className="bg-[#111827] border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between shadow-md">
        <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
          <span>Profit Factor</span>
          <Percent className="w-4 h-4 text-teal-400" />
        </div>
        <div>
          <div className="text-xl font-extrabold text-white font-mono tracking-tight">
            {profitFactor > 0 ? profitFactor.toFixed(2) : '—'}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {totalTrades} Total Closed
          </div>
        </div>
      </div>

      {/* 6. Quick Reset Paper Wallet */}
      <div className="bg-[#111827] border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between shadow-md">
        <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
          <span>Paper Capital</span>
          <button
            onClick={onResetPaperAccount}
            title="Reset Paper Account to ₹1,00,000"
            className="text-slate-400 hover:text-blue-400 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="flex items-center justify-between">
          <div className="text-xs text-slate-400">
            Realized: <strong className={realized >= 0 ? 'text-emerald-400' : 'text-red-400'}>₹{realized.toFixed(0)}</strong>
          </div>
          <button
            onClick={onResetPaperAccount}
            className="text-[11px] px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-700 transition-all font-medium"
          >
            Reset ₹1L
          </button>
        </div>
      </div>

    </div>
  );
};
