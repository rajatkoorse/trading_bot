import React, { useState } from 'react';
import { X, MessageSquare, Send, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
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
  const [webhookUrl, setWebhookUrl] = useState<string>('');
  const [enabled, setEnabled] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [testStatus, setTestStatus] = useState<{ success?: boolean; message?: string } | null>(null);

  if (!isOpen) return null;

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await api.updateDiscordSettings({
        webhook_url: webhookUrl,
        enabled: enabled
      });
      onUpdated();
      onClose();
    } catch (e) {
      console.error('Failed to save discord settings:', e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestPing = async () => {
    try {
      setIsTesting(true);
      setTestStatus(null);
      // Save temporarily to test
      await api.updateDiscordSettings({ webhook_url: webhookUrl, enabled: true });
      const res = await api.testDiscordWebhook();
      setTestStatus(res);
    } catch (e: any) {
      setTestStatus({ success: false, message: 'Failed to contact Discord server.' });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#111827] border border-slate-700 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl animate-scaleUp">
        
        {/* Header */}
        <div className="bg-[#0f172a] px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center">
              <MessageSquare className="w-4 h-4 text-indigo-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Discord Webhook Alert Center</h3>
              <p className="text-[11px] text-slate-400">Push instant Indian market signals to your Discord channels</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">
              Discord Channel Webhook URL
            </label>
            <input
              type="text"
              placeholder="https://discord.com/api/webhooks/..."
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-mono"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Go to Discord Server Settings → Integrations → Webhooks → Create Webhook & Copy URL.
            </p>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <div>
              <span className="text-xs font-semibold text-white block">Enable Real-Time Alerts</span>
              <span className="text-[11px] text-slate-400">Auto-post BUY/SELL setups & TP/SL hits</span>
            </div>
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="rounded bg-slate-800 border-slate-700 text-indigo-600 focus:ring-0 w-4 h-4"
            />
          </div>

          {/* Test Status feedback */}
          {testStatus && (
            <div className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
              testStatus.success 
                ? 'bg-emerald-950/60 border border-emerald-800 text-emerald-300' 
                : 'bg-red-950/60 border border-red-800 text-red-300'
            }`}>
              {testStatus.success ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertCircle className="w-4 h-4 text-red-400" />}
              <span>{testStatus.message}</span>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="bg-[#0f172a] px-5 py-3 border-t border-slate-800 flex items-center justify-between">
          <button
            onClick={handleTestPing}
            disabled={isTesting || !webhookUrl}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 disabled:opacity-50 transition-all"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{isTesting ? 'Sending...' : 'Send Test Alert'}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md"
            >
              {isSaving ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
