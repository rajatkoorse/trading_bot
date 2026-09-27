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
  TrendingUp, 
  Key, 
  Activity,
  Server
} from 'lucide-react';
import { BotStatus } from '../types';
import { soundFx } from '../services/audio';

interface NavbarProps {
  activeView: 'INDIAN_NSE' | 'BACKTEST';
  onSelectView: (view: 'INDIAN_NSE' | 'BACKTEST') => void;
  botStatus: BotStatus | null;
  onToggleBot: () => void;
  onToggleKillSwitch: () => void;
  onOpenDiscordModal: () => void;
  onOpenRiskModal: () => void;
  onOpenBrokerModal: () => void;
  onOpenBackendModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeView,
  onSelectView,
  botStatus,
  onToggleBot,
  onToggleKillSwitch,
  onOpenDiscordModal,
  onOpenRiskModal,
  onOpenBrokerModal,
  onOpenBackendModal
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

  const isBacktest = activeView === 'BACKTEST';
  const isNseRunning = botStatus?.is_running ?? false;
  const isNseKillSwitch = botStatus?.kill_switch_active ?? false;
  const isNseCircuitBroken = botStatus?.circuit_breaker_tripped ?? false;

  return (
    <header className="bg-[#0f172a] border-b border-slate-800 px-4 py-2.5 sticky top-0 z-40 shadow-lg">
      <div className="max-w-[1700px] mx-auto flex flex-wrap items-center justify-between gap-3">
        
        {/* Left: Dynamic Brand & Market Badge */}
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-lg transition-all ${
            isBacktest
              ? 'bg-gradient-to-tr from-purple-600 to-indigo-600 shadow-purple-500/20'
              : 'bg-gradient-to-tr from-blue-600 via-indigo-600 to-emerald-500 shadow-blue-500/20'
          }`}>
            {isBacktest ? (
              <Activity className="w-5 h-5 text-white" />
            ) : (
              <TrendingUp className="w-5 h-5 text-white" />
            )}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold tracking-tight text-white flex items-center gap-1.5">
                {isBacktest ? 'Quant Backtest Studio' : 'AI Indian Equities Terminal'}
              </h1>

              {/* Market Status Pill */}
              {isBacktest ? (
                <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full flex items-center gap-1 border bg-purple-500/20 text-purple-300 border-purple-500/40">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
                  📊 HISTORICAL SIMULATION
                </span>
              ) : (
                <span className={`text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full flex items-center gap-1 border ${
                  botStatus?.market_is_open
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                    : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${botStatus?.market_is_open ? 'bg-emerald-400 animate-ping' : 'bg-rose-400'}`}></span>
                  {botStatus?.market_is_open ? 'NSE/BSE LIVE OPEN' : '🔴 NSE/BSE CLOSED (3:30 PM)'}
                </span>
              )}
            </div>

            <p className="text-[11px] text-slate-400 font-mono">
              {isBacktest
                ? 'High-Fidelity Quantitative Strategy Backtesting & Parameter Optimizer'
                : botStatus?.market_is_open
                ? 'Live Sub-Second Tick Stream • Zerodha / Dhan / Angel One Active'
                : 'Day Session Settled • 24/7 Cloud Ready & Mobile Enabled'}
            </p>
          </div>
        </div>

        {/* Center: View Switcher */}
        <div className="flex bg-[#111827] p-1 rounded-xl border border-slate-800 text-xs font-bold font-mono shadow-inner">
          <button
            onClick={() => onSelectView('INDIAN_NSE')}
            className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              activeView === 'INDIAN_NSE'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>🇮🇳 Indian Equities (NSE/BSE)</span>
          </button>

          <button
            onClick={() => onSelectView('BACKTEST')}
            className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              activeView === 'BACKTEST'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>📊 Backtest Studio</span>
          </button>
        </div>

        {/* Right: Actions & Status Badges */}
        <div className="flex items-center gap-2 flex-wrap">
          
          {/* Cloud Server Connector */}
          <button
            onClick={onOpenBackendModal}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs text-slate-300 hover:text-white transition-all shadow-sm"
            title="Configure Cloud Backend URL for GitHub Pages / Remote Hosting"
          >
            <Server className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden xl:inline text-[11px]">Server</span>
          </button>

          {/* Broker Badge / Trigger */}
          {!isBacktest && (
            <button
              onClick={onOpenBrokerModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs text-slate-200 transition-all shadow-sm"
              title="Connect Zerodha Kite, Dhan, Angel One or Paper Trading"
            >
              <Key className="w-3.5 h-3.5 text-blue-400" />
              <span className="font-semibold uppercase tracking-wider text-[11px] text-emerald-400">
                {botStatus?.mode === 'paper' ? 'Paper (₹1L)' : botStatus?.mode?.toUpperCase()}
              </span>
            </button>
          )}

          {/* Bot State Indicator */}
          {!isBacktest && (
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border ${
              isNseRunning 
                ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300' 
                : 'bg-slate-900 border-slate-800 text-slate-400'
            }`}>
              <Bot className={`w-3.5 h-3.5 ${isNseRunning ? 'text-emerald-400 animate-bounce' : 'text-slate-500'}`} />
              <span className="hidden sm:inline">{isNseRunning ? 'Real-Time Scanning' : 'Bot Idle'}</span>
            </div>
          )}

          {isNseCircuitBroken && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-950/60 border border-amber-600 text-amber-300 text-xs font-semibold animate-pulse">
              <span>⚠️ Circuit Breaker Active</span>
            </div>
          )}

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
          {!isBacktest && (
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
          )}

          {/* Risk Config Modal */}
          <button
            onClick={onOpenRiskModal}
            title="Risk Management & Limits"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/60 border border-slate-700 hover:border-slate-600 text-slate-300 hover:text-white text-xs font-medium transition-all"
          >
            <SettingsIcon className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Risk Rules</span>
          </button>

          {/* Bot Run / Pause Toggle */}
          {!isBacktest && (
            <button
              onClick={onToggleBot}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold shadow-md transition-all ${
                isNseRunning
                  ? 'bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-500 shadow-emerald-600/20'
              }`}
            >
              {isNseRunning ? <Square className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
              <span>{isNseRunning ? 'Pause Bot' : 'Start Bot'}</span>
            </button>
          )}

          {/* Emergency Kill Switch */}
          {!isBacktest && (
            <button
              onClick={onToggleKillSwitch}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                isNseKillSwitch
                  ? 'bg-red-600 text-white border-red-500 animate-glow-red'
                  : 'bg-red-950/40 hover:bg-red-900/60 text-red-400 border-red-900/80 hover:border-red-600'
              }`}
            >
              <ShieldAlert className="w-4 h-4" />
              <span className="hidden sm:inline">{isNseKillSwitch ? 'KILL SWITCH ON' : 'KILL SWITCH'}</span>
            </button>
          )}

        </div>

      </div>
    </header>
  );
};

export default Navbar;
