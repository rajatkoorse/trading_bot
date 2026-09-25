import React from 'react';
import { Brain, Activity, Gauge, Check, X } from 'lucide-react';
import { AISignal, IndicatorSnapshot } from '../types';

interface ConfluenceRadarProps {
  latestSignal: AISignal | null;
  symbol: string;
}

export const ConfluenceRadar: React.FC<ConfluenceRadarProps> = ({
  latestSignal,
  symbol
}) => {
  const ind: IndicatorSnapshot = latestSignal?.indicators || {};
  const confScore = latestSignal?.confidence_score || 50;
  const mlProb = latestSignal?.ml_probability ? (latestSignal.ml_probability * 100).toFixed(1) : '50.0';

  const isSupertrendBull = ind.supertrend_direction === 1;
  const isEmaBull = (ind.ema_9 || 0) > (ind.ema_21 || 0);
  const isVwapBull = (latestSignal?.entry_price || 0) >= (ind.vwap || 0);
  const isRsiBull = (ind.rsi || 50) >= 50;
  const isMacdBull = (ind.macd_hist || 0) > 0;

  return (
    <div className="bg-[#111827] border border-slate-800 rounded-xl p-3.5 shadow-lg space-y-3">
      
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-blue-400" />
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">AI Confluence Radar</h3>
        </div>
        <span className="text-[10px] font-mono text-slate-400 font-bold bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
          {symbol}
        </span>
      </div>

      {/* Confidence & ML Probability Gauges */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800 flex flex-col justify-between">
          <span className="text-[10px] uppercase font-mono text-slate-400 block">AI Confidence</span>
          <div className="flex items-baseline gap-1 my-1">
            <span className={`text-xl font-extrabold font-mono ${
              confScore >= 75 ? 'text-emerald-400' : 'text-blue-400'
            }`}>
              {confScore}%
            </span>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div
              style={{ width: `${confScore}%` }}
              className={`h-full rounded-full ${
                confScore >= 75 ? 'bg-emerald-500' : 'bg-blue-500'
              }`}
            />
          </div>
        </div>

        <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800 flex flex-col justify-between">
          <span className="text-[10px] uppercase font-mono text-slate-400 block">ML Probability</span>
          <div className="flex items-baseline gap-1 my-1">
            <span className="text-xl font-extrabold font-mono text-indigo-400">
              {mlProb}%
            </span>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div
              style={{ width: `${mlProb}%` }}
              className="h-full rounded-full bg-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Real-time Indicator Checklist */}
      <div className="space-y-1.5 text-xs">
        <div className="flex items-center justify-between p-1.5 rounded-lg bg-slate-950/40 border border-slate-800/60">
          <span className="text-slate-300 text-[11px]">SuperTrend (10, 3)</span>
          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
            isSupertrendBull ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
          }`}>
            {isSupertrendBull ? 'BULLISH' : 'BEARISH'}
          </span>
        </div>

        <div className="flex items-center justify-between p-1.5 rounded-lg bg-slate-950/40 border border-slate-800/60">
          <span className="text-slate-300 text-[11px]">EMA 9 / 21 Ribbon</span>
          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
            isEmaBull ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
          }`}>
            {isEmaBull ? 'EMA9 > EMA21' : 'EMA9 < EMA21'}
          </span>
        </div>

        <div className="flex items-center justify-between p-1.5 rounded-lg bg-slate-950/40 border border-slate-800/60">
          <span className="text-slate-300 text-[11px]">Intraday VWAP</span>
          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
            isVwapBull ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
          }`}>
            {isVwapBull ? 'ABOVE VWAP' : 'BELOW VWAP'}
          </span>
        </div>

        <div className="flex items-center justify-between p-1.5 rounded-lg bg-slate-950/40 border border-slate-800/60">
          <span className="text-slate-300 text-[11px]">RSI (14) Momentum</span>
          <span className="font-mono text-slate-200 text-[11px] font-bold">
            {ind.rsi ? ind.rsi.toFixed(1) : '50.0'}
          </span>
        </div>
      </div>

    </div>
  );
};
