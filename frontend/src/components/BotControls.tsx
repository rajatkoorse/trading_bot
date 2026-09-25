import React from 'react';
import { 
  Bot, 
  Play, 
  Square, 
  Zap, 
  ShieldAlert, 
  Cpu, 
  SlidersHorizontal,
  CheckCircle2
} from 'lucide-react';
import { BotStatus } from '../types';

interface BotControlsProps {
  botStatus: BotStatus | null;
  onToggleBot: () => void;
  onToggleAutoTrade: (enable: boolean) => void;
  onToggleKillSwitch: () => void;
  onSetMode: (mode: string) => void;
}

export const BotControls: React.FC<BotControlsProps> = ({
  botStatus,
  onToggleBot,
  onToggleAutoTrade,
  onToggleKillSwitch,
  onSetMode
}) => {
  const isRunning = botStatus?.is_running ?? false;
  const isKillSwitch = botStatus?.kill_switch_active ?? false;
  const mode = botStatus?.mode ?? 'paper';

  return (
    <div className="bg-[#111827] border border-slate-800 rounded-xl p-4 shadow-lg flex flex-wrap items-center justify-between gap-4">
      
      {/* Bot Engine Master Status */}
      <div className="flex items-center gap-3">
        <div className={`p-2.5 rounded-xl border ${
          isRunning 
            ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400 animate-pulse' 
            : 'bg-slate-800 border-slate-700 text-slate-400'
        }`}>
          <Bot className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-white">Autonomous Bot Core</h3>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
              isRunning ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'
            }`}>
              {isRunning ? 'RUNNING' : 'PAUSED'}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Last scan: <span className="font-mono text-slate-300">{botStatus?.last_scan_time || 'Just now'}</span>
          </p>
        </div>
      </div>

      {/* Mode Switcher */}
      <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
        <span className="text-slate-500 text-[11px] px-2 font-medium">EXECUTION:</span>
        <button
          onClick={() => onSetMode('paper')}
          className={`px-3 py-1 rounded-lg font-bold transition-all ${
            mode === 'paper'
              ? 'bg-blue-600 text-white shadow'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Paper Trading (₹)
        </button>
        <button
          onClick={() => onSetMode('angel_one')}
          className={`px-3 py-1 rounded-lg font-bold transition-all ${
            mode === 'angel_one'
              ? 'bg-blue-600 text-white shadow'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Angel One
        </button>
        <button
          onClick={() => onSetMode('zerodha')}
          className={`px-3 py-1 rounded-lg font-bold transition-all ${
            mode === 'zerodha'
              ? 'bg-blue-600 text-white shadow'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Zerodha Kite
        </button>
      </div>

      {/* Action Toggles */}
      <div className="flex items-center gap-2.5">
        <button
          onClick={onToggleBot}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md ${
            isRunning
              ? 'bg-amber-600/20 text-amber-300 border border-amber-500/40 hover:bg-amber-600/30'
              : 'bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-500 shadow-emerald-600/20'
          }`}
        >
          {isRunning ? <Square className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
          <span>{isRunning ? 'Pause Loop' : 'Start Auto-Scan'}</span>
        </button>

        <button
          onClick={onToggleKillSwitch}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition-all border ${
            isKillSwitch
              ? 'bg-red-600 text-white border-red-500 animate-glow-red'
              : 'bg-red-950/40 hover:bg-red-900/60 text-red-400 border-red-900 hover:border-red-600'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          <span>{isKillSwitch ? 'KILL SWITCH ACTIVE' : 'EMERGENCY KILL SWITCH'}</span>
        </button>
      </div>

    </div>
  );
};
