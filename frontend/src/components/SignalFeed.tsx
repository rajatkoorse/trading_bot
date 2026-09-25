import React, { useState } from 'react';
import { 
  Zap, 
  ArrowUpRight, 
  ArrowDownRight, 
  Target, 
  Shield, 
  BrainCircuit, 
  Clock, 
  CheckCircle2,
  Filter
} from 'lucide-react';
import { AISignal, SignalType, SignalStatus } from '../types';

interface SignalFeedProps {
  signals: AISignal[];
  onSelectSymbol: (symbol: string) => void;
  onExecuteSignal?: (signal: AISignal) => void;
}

export const SignalFeed: React.FC<SignalFeedProps> = ({
  signals,
  onSelectSymbol,
  onExecuteSignal
}) => {
  const [filter, setFilter] = useState<'ALL' | 'BUY' | 'SELL'>('ALL');

  const filtered = signals.filter((s) => {
    if (filter === 'ALL') return true;
    return s.signal_type === filter;
  });

  return (
    <div className="bg-[#111827] border border-slate-800 rounded-xl overflow-hidden flex flex-col h-[520px] shadow-lg">
      
      {/* Header */}
      <div className="bg-[#0f172a] border-b border-slate-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BrainCircuit className="w-5 h-5 text-blue-400" />
          <h2 className="text-sm font-bold text-white tracking-wide">Live AI Signals Feed</h2>
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 font-mono font-bold">
            {signals.length}
          </span>
        </div>

        {/* Filter buttons */}
        <div className="flex bg-slate-900 rounded-lg p-0.5 border border-slate-800 text-xs">
          {(['ALL', 'BUY', 'SELL'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                filter === t
                  ? t === 'BUY' 
                    ? 'bg-emerald-600 text-white' 
                    : t === 'SELL' 
                    ? 'bg-red-600 text-white' 
                    : 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Signal Cards List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {filtered.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs text-center p-4">
            <Zap className="w-8 h-8 text-slate-600 mb-2 stroke-[1.5]" />
            <p className="font-semibold text-slate-400">Scanning Indian Markets for Confluence...</p>
            <p className="text-[11px] text-slate-500 mt-1">High-probability setups (≥70% AI confidence) will stream here automatically.</p>
          </div>
        ) : (
          filtered.map((sig) => {
            const isBuy = sig.signal_type === 'BUY';
            return (
              <div
                key={sig.id}
                onClick={() => onSelectSymbol(sig.symbol)}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer hover:border-blue-500/50 relative overflow-hidden group ${
                  isBuy 
                    ? 'bg-gradient-to-br from-[#0c1a1a] to-[#111e25] border-emerald-900/60 hover:shadow-emerald-950/30' 
                    : 'bg-gradient-to-br from-[#1a0f14] to-[#251319] border-red-900/60 hover:shadow-red-950/30'
                }`}
              >
                {/* Top Row: Symbol, Time, Direction Badge */}
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-sm tracking-tight hover:underline">
                      {sig.symbol}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400 bg-slate-800/80 px-1.5 py-0.5 rounded">
                      {sig.timeframe}
                    </span>
                    <span className="text-[10px] text-slate-500 flex items-center gap-1 font-mono">
                      <Clock className="w-3 h-3" />
                      {sig.datetime.split(' ')[1] || sig.created_at.split(' ')[1]}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Confidence Meter Badge */}
                    <div className={`px-2 py-0.5 rounded-full text-[11px] font-bold font-mono border ${
                      sig.confidence_score >= 80 
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' 
                        : 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                    }`}>
                      {sig.confidence_score}% AI Conf
                    </div>

                    {/* Signal Direction Pill */}
                    <div className={`flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-bold ${
                      isBuy ? 'bg-emerald-500 text-slate-950' : 'bg-red-500 text-white'
                    }`}>
                      {isBuy ? <ArrowUpRight className="w-3.5 h-3.5 stroke-[3]" /> : <ArrowDownRight className="w-3.5 h-3.5 stroke-[3]" />}
                      <span>{sig.signal_type}</span>
                    </div>
                  </div>
                </div>

                {/* Price Levels Grid */}
                <div className="grid grid-cols-4 gap-2 bg-slate-950/60 p-2 rounded-lg border border-slate-800/60 text-xs font-mono mb-2.5">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-sans">ENTRY</span>
                    <span className="font-bold text-white">₹{sig.entry_price.toLocaleString('en-IN')}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-red-400 block font-sans">STOP LOSS</span>
                    <span className="font-semibold text-red-400">₹{sig.stop_loss.toLocaleString('en-IN')}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-emerald-400 block font-sans">TARGET 1</span>
                    <span className="font-semibold text-emerald-400">₹{sig.target_1.toLocaleString('en-IN')}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-emerald-300 block font-sans">TARGET 2</span>
                    <span className="font-semibold text-emerald-300">₹{sig.target_2.toLocaleString('en-IN')}</span>
                  </div>
                </div>

                {/* AI Confluence Reasoning Tags */}
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {sig.reasons.slice(0, 3).map((r, i) => (
                    <span
                      key={i}
                      className="text-[10px] px-2 py-0.5 rounded bg-slate-800/80 text-slate-300 border border-slate-700/60"
                    >
                      ✓ {r}
                    </span>
                  ))}
                  {sig.reasons.length > 3 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                      +{sig.reasons.length - 3} more
                    </span>
                  )}
                </div>

                {/* Footer details & Action */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-800/50 text-[11px]">
                  <div className="flex items-center gap-3 text-slate-400 font-mono">
                    <span>RRR: <strong className="text-white">1:{sig.rrr}</strong></span>
                    <span>ML Prob: <strong className="text-blue-400">{(sig.ml_probability * 100).toFixed(1)}%</strong></span>
                  </div>

                  {sig.executed ? (
                    <span className="flex items-center gap-1 text-emerald-400 font-medium text-[11px]">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Executed
                    </span>
                  ) : (
                    <span className="text-slate-400 text-[10px]">
                      Auto-routed by Bot
                    </span>
                  )}
                </div>

              </div>
            );
          })
        )}
      </div>

    </div>
  );
};
