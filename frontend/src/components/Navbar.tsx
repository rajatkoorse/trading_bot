import React, { useState } from 'react';
import { 
  ShieldAlert, 
  Volume2, 
  VolumeX, 
  Settings as SettingsIcon, 
  MessageSquare, 
  Bot, 
  Play, 
  Square,
  Zap,
  TrendingUp,
  Key,
  Flame
} from 'lucide-react';
import { BotStatus } from '../types';
import { soundFx } from '../services/audio';

interface NavbarProps {
  botStatus: BotStatus | null;
  onToggleBot: () => void;
  onToggleKillSwitch: () => void;
  onOpenDiscordModal: () => void;
  onOpenRiskModal: () => void;
  onOpenBrokerModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  botStatus,
  onToggleBot,
  onToggleKillSwitch,
  onOpenDiscordModal,
  onOpenRiskModal,
  onOpenBrokerModal
}) => {
  const [isMuted, setIsMuted] = useState(soundFx.isMuted);

  const toggleAudio = () => {
    const next = !isMuted;
    setIsMuted(next);
    soundFx.setMuted(next);
    if (!next) {
      soundFx.playTakeProfit();
    }
  };

  const isRunning = botStatus?.is_running ?? false;
  const isKillSwitch = botStatus?.kill_switch_active ?? false;
  const isCircuitBroken = botStatus?.circuit_breaker_tripped ?? false;

  return (
    <header className="bg-[#0f172a] border-b border-slate-800 px-4 py-2.5 sticky top-0 z-40">
      <div className="max-w-[1700px] mx-auto flex flex-wrap items-center justify-between gap-3">
        
        {/* Brand & Market Badges */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-emerald-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold tracking-tight text-white flex items-center gap-1.5">
                AI Real-Time Trader
              </h1>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                NSE / BSE REALTIME
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono">
              Hybrid Quant + XGBoost ML • Minimal-Loss Engine
            </p>
          </div>
        </div>

        {/* Real-time Status Badges */}
        <div className="flex items-center gap-2">
          {/* Broker Mode Switcher / Modal Trigger */}
          <button
            onClick={onOpenBrokerModal}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs text-slate-200 transition-all"
          >
            <Key className="w-3.5 h-3.5 text-blue-400" />
            <span className="font-semibold uppercase tracking-wider text-[11px] text-emerald-400">
              {botStatus?.mode === 'paper' ? 'Paper (₹1L)' : botStatus?.mode?.toUpperCase()}
            </span>
          </button>

          {/* Bot State Indicator */}
          <div className={`flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-medium border ${
            isRunning 
              ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300' 
              : 'bg-slate-900 border-slate-800 text-slate-400'
          }`}>
            <Bot className={`w-3.5 h-3.5 ${isRunning ? 'text-emerald-400 animate-bounce' : 'text-slate-500'}`} />
            <span>{isRunning ? 'Real-Time Scanning' : 'Bot Idle'}</span>
          </div>

          {isCircuitBroken && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-950/60 border border-amber-600 text-amber-300 text-xs font-semibold animate-pulse">
              <span>⚠️ Circuit Breaker Active</span>
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Audio Chime Toggle */}
          <button
            onClick={toggleAudio}
            title={isMuted ? "Unmute Live Audio Chimes" : "Mute Audio Chimes"}
            className={`p-2 rounded-lg border transition-all ${
              isMuted 
                ? 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-slate-200' 
                : 'bg-blue-600/20 border-blue-500/40 text-blue-400 hover:bg-blue-600/30'
            }`}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {/* Discord Webhook Button */}
          <button
            onClick={onOpenDiscordModal}
            title="Configure Discord Webhook Alerts"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
              botStatus?.discord_alerts_enabled
                ? 'bg-indigo-600/20 border-indigo-500/40 text-indigo-300 hover:bg-indigo-600/30'
                : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:text-white'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Discord</span>
            {botStatus?.discord_alerts_enabled && (
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
            )}
          </button>

          {/* Risk Config Modal */}
          <button
            onClick={onOpenRiskModal}
            title="Risk Management & Limits"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/60 border border-slate-700 hover:border-slate-600 text-slate-300 hover:text-white text-xs font-medium transition-all"
          >
            <SettingsIcon className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Risk Rules</span>
          </button>

          {/* Bot Run / Stop Toggle */}
          <button
            onClick={onToggleBot}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold shadow-md transition-all ${
              isRunning
                ? 'bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-500 shadow-emerald-600/20'
            }`}
          >
            {isRunning ? <Square className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            <span>{isRunning ? 'Pause Bot' : 'Start Bot'}</span>
          </button>

          {/* Emergency Kill Switch */}
          <button
            onClick={onToggleKillSwitch}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all border ${
              isKillSwitch
                ? 'bg-red-600 text-white border-red-500 animate-glow-red'
                : 'bg-red-950/40 hover:bg-red-900/60 text-red-400 border-red-900/80 hover:border-red-600'
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            <span>{isKillSwitch ? 'KILL SWITCH ON' : 'KILL SWITCH'}</span>
          </button>
        </div>

      </div>
    </header>
  );
};
