import React, { useState } from 'react';
import { 
  X, 
  MessageSquare, 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  Bell, 
  ChevronDown, 
  ChevronUp, 
  Zap, 
  ShieldCheck 
} from 'lucide-react';
import { api } from '../services/api';

interface DiscordSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdated: () => void;
}

export const DiscordSettingsModal: React.FC<DiscordSettingsModalProps> = ({
  isOpen,
  onClose,
  onUpdated
}) => {
  const [enabled, setEnabled] = useState<boolean>(true);
  const [showAdvancedUrl, setShowAdvancedUrl] = useState<boolean>(false);
  const [customWebhookUrl, setCustomWebhookUrl] = useState<string>('');
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [testStatus, setTestStatus] = useState<{ success?: boolean; message?: string } | null>(null);

  if (!isOpen) return null;

  const handleTestPing = async () => {
    try {
      setIsTesting(true);
      setTestStatus(null);
      if (customWebhookUrl.trim()) {
        await api.updateDiscordSettings({ webhook_url: customWebhookUrl.trim(), enabled: true });
      }
      const res = await api.testDiscordWebhook();
      setTestStatus(res);
      onUpdated();
    } catch (e: any) {
      setTestStatus({ success: false, message: 'Failed to contact Discord webhook.' });
    } finally {
      setIsTesting(false);
    }
  };

  const handleToggleEnable = async (nextState: boolean) => {
    try {
      setEnabled(nextState);
      await api.updateDiscordSettings({ enabled: nextState, ...(customWebhookUrl ? { webhook_url: customWebhookUrl } : {}) });
      onUpdated();
    } catch (e) {
      console.error('Failed to toggle discord alert status:', e);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
      <div className="bg-[#111827] border border-slate-700 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl animate-scaleUp flex flex-col">
        
        {/* Header */}
        <div className="bg-[#0f172a] px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center">
              <MessageSquare className="w-4 h-4 text-indigo-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Discord Alert Hub</h3>
              <p className="text-[11px] text-slate-400">Live 24/7 trade & signal broadcasts to your phone</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-xs text-slate-300">
          
          {/* Permanent Active Status Card */}
          <div className="p-4 bg-gradient-to-r from-indigo-950/40 via-purple-950/30 to-slate-900 border border-indigo-500/30 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-indigo-300 text-sm">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
                <span>Permanent Discord Channel Connected</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold">
                ACTIVE
              </span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Your personal Discord channel is permanently saved on the server. All NSE/BSE Buy & Sell setups, entry prices, Take-Profits, and Stop-Loss executions will ping your phone instantly.
            </p>
          </div>

          {/* Test Alert Button */}
          <div>
            <button
              type="button"
              onClick={handleTestPing}
              disabled={isTesting}
              className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 active:scale-[0.99] text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 transition-all disabled:opacity-50"
            >
              <Send className={`w-4 h-4 ${isTesting ? 'animate-bounce' : ''}`} />
              <span>{isTesting ? 'Dispatching Live Ping...' : '🚀 Send Live Test Alert to Discord'}</span>
            </button>
          </div>

          {/* Test Status Feedback */}
          {testStatus && (
            <div className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
              testStatus.success 
                ? 'bg-emerald-950/60 border border-emerald-800 text-emerald-300' 
                : 'bg-red-950/60 border border-red-800 text-red-300'
            }`}>
              {testStatus.success ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> : <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />}
              <span>{testStatus.message}</span>
            </div>
          )}

          {/* Alert Type Breakdown */}
          <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-1.5">
            <span className="text-slate-400 font-bold block text-[11px]">Auto-Dispatched Alerts:</span>
            <div className="grid grid-cols-2 gap-1.5 text-[11px] text-slate-300">
              <span className="flex items-center gap-1.5">🟢 Strong BUY / SELL Setups</span>
              <span className="flex items-center gap-1.5">⚡ Live Order Executions</span>
              <span className="flex items-center gap-1.5">🎯 Target 1 (50% Profit Lock)</span>
              <span className="flex items-center gap-1.5">💎 Target 2 (Max Profit Hit)</span>
              <span className="flex items-center gap-1.5">🛡️ Break-Even SL Shifts</span>
              <span className="flex items-center gap-1.5">🛑 Minimal-Loss Protection Exits</span>
            </div>
          </div>

          {/* Real-time Toggle */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <div>
              <span className="text-xs font-semibold text-white block">Real-Time Dispatch</span>
              <span className="text-[11px] text-slate-400">Stream notifications when signals trigger</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => handleToggleEnable(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>

          {/* Optional Collapsed Custom Webhook Override */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setShowAdvancedUrl(!showAdvancedUrl)}
              className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1 font-semibold"
            >
              <span>Advanced: Change Webhook Channel</span>
              {showAdvancedUrl ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>

            {showAdvancedUrl && (
              <div className="mt-2 p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2 animate-fadeIn">
                <label className="text-[11px] text-slate-400 block font-semibold">
                  Custom Webhook URL (Overrides Permanent Default)
                </label>
                <input
                  type="text"
                  placeholder="https://discord.com/api/webhooks/..."
                  value={customWebhookUrl}
                  onChange={(e) => setCustomWebhookUrl(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono placeholder:text-slate-600"
                />
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="bg-[#0f172a] px-5 py-3 border-t border-slate-800 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-all"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};

export default DiscordSettingsModal;
