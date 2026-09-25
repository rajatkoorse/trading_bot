import React, { useState } from 'react';
import { X, Shield, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';

interface RiskSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdated: () => void;
}

export const RiskSettingsModal: React.FC<RiskSettingsModalProps> = ({
  isOpen,
  onClose,
  onUpdated
}) => {
  const [riskPerTrade, setRiskPerTrade] = useState<number>(1.5);
  const [maxDailyLoss, setMaxDailyLoss] = useState<number>(3.0);
  const [maxPositions, setMaxPositions] = useState<number>(4);
  const [minConfidence, setMinConfidence] = useState<number>(70.0);
  const [useTrailingStop, setUseTrailingStop] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await api.updateRiskSettings({
        risk_per_trade_pct: riskPerTrade,
        max_daily_loss_pct: maxDailyLoss,
        max_open_positions: maxPositions,
        min_confidence_pct: minConfidence,
        use_trailing_stop: useTrailingStop
      });
      onUpdated();
      onClose();
    } catch (e) {
      console.error('Failed to update risk settings:', e);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#111827] border border-slate-700 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl animate-scaleUp">
        
        {/* Header */}
        <div className="bg-[#0f172a] px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center">
              <Shield className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Risk Management & Capital Rules</h3>
              <p className="text-[11px] text-slate-400">Institutional capital preservation parameters</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sliders & Fields */}
        <div className="p-5 space-y-4">
          
          {/* Risk Per Trade */}
          <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-semibold text-slate-200">Max Risk Per Trade</label>
              <span className="text-xs font-mono font-bold text-emerald-400">{riskPerTrade}% Equity</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="4.0"
              step="0.25"
              value={riskPerTrade}
              onChange={(e) => setRiskPerTrade(Number(e.target.value))}
              className="w-full accent-emerald-500 cursor-pointer"
            />
            <p className="text-[10px] text-slate-500 mt-1">Calculates share size: Risk Amount / |Entry - StopLoss|</p>
          </div>

          {/* Max Daily Drawdown */}
          <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-semibold text-slate-200">Daily Max Loss Circuit Breaker</label>
              <span className="text-xs font-mono font-bold text-red-400">{maxDailyLoss}% Portfolio</span>
            </div>
            <input
              type="range"
              min="1.0"
              max="8.0"
              step="0.5"
              value={maxDailyLoss}
              onChange={(e) => setMaxDailyLoss(Number(e.target.value))}
              className="w-full accent-red-500 cursor-pointer"
            />
            <p className="text-[10px] text-slate-500 mt-1">If daily loss reaches this limit, all new trade execution is halted.</p>
          </div>

          {/* Min Confidence & Max Open Positions */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
              <label className="text-xs font-semibold text-slate-200 block mb-1">
                Min AI Confidence: <strong className="text-blue-400">{minConfidence}%</strong>
              </label>
              <input
                type="range"
                min="60"
                max="90"
                step="5"
                value={minConfidence}
                onChange={(e) => setMinConfidence(Number(e.target.value))}
                className="w-full accent-blue-500 cursor-pointer"
              />
            </div>

            <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
              <label className="text-xs font-semibold text-slate-200 block mb-1">
                Max Open Positions: <strong className="text-amber-400">{maxPositions}</strong>
              </label>
              <input
                type="range"
                min="1"
                max="8"
                step="1"
                value={maxPositions}
                onChange={(e) => setMaxPositions(Number(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer"
              />
            </div>
          </div>

          {/* Trailing Stop */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <div>
              <span className="text-xs font-semibold text-white block">Dynamic Trailing Stop-Loss</span>
              <span className="text-[11px] text-slate-400">Lock in profits when price hits Target 1</span>
            </div>
            <input
              type="checkbox"
              checked={useTrailingStop}
              onChange={(e) => setUseTrailingStop(e.target.checked)}
              className="rounded bg-slate-800 border-slate-700 text-emerald-600 focus:ring-0 w-4 h-4"
            />
          </div>

        </div>

        {/* Footer */}
        <div className="bg-[#0f172a] px-5 py-3 border-t border-slate-800 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md"
          >
            {isSaving ? 'Saving...' : 'Apply Rules'}
          </button>
        </div>

      </div>
    </div>
  );
};
