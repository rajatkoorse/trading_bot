import React, { useState } from 'react';
import { Zap, ArrowUpRight, ArrowDownRight, Shield, Target, Plus, Minus } from 'lucide-react';
import { api } from '../services/api';
import { soundFx } from '../services/audio';

interface QuickTradePadProps {
  symbol: string;
  currentPrice: number;
  onOrderPlaced: () => void;
}

export const QuickTradePad: React.FC<QuickTradePadProps> = ({
  symbol,
  currentPrice,
  onOrderPlaced
}) => {
  const [quantity, setQuantity] = useState<number>(25);
  const [slPoints, setSlPoints] = useState<number>(15);
  const [tpPoints, setTpPoints] = useState<number>(30);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const estRiskAmount = quantity * slPoints;
  const estRewardAmount = quantity * tpPoints;
  const rrr = slPoints > 0 ? (tpPoints / slPoints).toFixed(1) : '2.0';

  const handleExecute = async (side: 'BUY' | 'SELL') => {
    try {
      setIsSubmitting(true);
      await api.executeQuickOrder({
        symbol,
        side,
        quantity,
        stop_loss_pts: slPoints,
        target_pts: tpPoints
      });
      if (side === 'BUY') {
        soundFx.playBuySignal();
      } else {
        soundFx.playSellSignal();
      }
      onOrderPlaced();
    } catch (e: any) {
      alert(e.response?.data?.detail || 'Order execution failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-[#111827] border border-slate-800 rounded-xl p-3.5 shadow-lg space-y-3">
      
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-400" />
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">Quick Trade Pad</h3>
        </div>
        <span className="text-[11px] font-mono text-slate-400">
          Price: <strong className="text-white">₹{currentPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
        </span>
      </div>

      {/* Quantity & Sizing */}
      <div>
        <div className="flex justify-between items-center text-[11px] text-slate-400 mb-1">
          <span>Shares / Lot Qty</span>
          <span className="font-mono text-slate-300">Turnover: ₹{(quantity * currentPrice).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setQuantity(Math.max(1, quantity - 5))}
            className="p-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-lg"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <input
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
            className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono text-center font-bold"
          />
          <button
            onClick={() => setQuantity(quantity + 5)}
            className="p-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-lg"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Stop-Loss & Target Points */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <span className="text-[10px] text-red-400 block font-semibold mb-0.5">SL Points (₹)</span>
          <input
            type="number"
            value={slPoints}
            onChange={(e) => setSlPoints(Math.max(1, Number(e.target.value)))}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs text-red-300 font-mono text-center font-bold"
          />
        </div>
        <div>
          <span className="text-[10px] text-emerald-400 block font-semibold mb-0.5">Target Points (₹)</span>
          <input
            type="number"
            value={tpPoints}
            onChange={(e) => setTpPoints(Math.max(1, Number(e.target.value)))}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs text-emerald-300 font-mono text-center font-bold"
          />
        </div>
      </div>

      {/* Risk / Reward Estimate Bar */}
      <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-slate-950/80 border border-slate-800/80 text-[11px] font-mono">
        <span className="text-red-400">Max Risk: <strong>₹{estRiskAmount.toLocaleString('en-IN')}</strong></span>
        <span className="text-slate-500">1:{rrr} RRR</span>
        <span className="text-emerald-400">Target: <strong>₹{estRewardAmount.toLocaleString('en-IN')}</strong></span>
      </div>

      {/* Instant Action Execution Buttons */}
      <div className="grid grid-cols-2 gap-2 pt-1">
        <button
          onClick={() => handleExecute('BUY')}
          disabled={isSubmitting}
          className="flex items-center justify-center gap-1.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all disabled:opacity-50"
        >
          <ArrowUpRight className="w-4 h-4 stroke-[3]" />
          <span>BUY MARKET</span>
        </button>

        <button
          onClick={() => handleExecute('SELL')}
          disabled={isSubmitting}
          className="flex items-center justify-center gap-1.5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-md shadow-red-600/20 transition-all disabled:opacity-50"
        >
          <ArrowDownRight className="w-4 h-4 stroke-[3]" />
          <span>SELL MARKET</span>
        </button>
      </div>

    </div>
  );
};
