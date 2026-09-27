import React, { useState } from 'react';
import { X, Server, CheckCircle2, AlertCircle, RefreshCw, ExternalLink, Globe } from 'lucide-react';
import { getBackendBaseUrl, setBackendBaseUrl, api } from '../services/api';

interface BackendConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdated: () => void;
}

export const BackendConfigModal: React.FC<BackendConfigModalProps> = ({
  isOpen,
  onClose,
  onUpdated
}) => {
  const [url, setUrl] = useState<string>(getBackendBaseUrl() || '');
  const [testing, setTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    try {
      setTesting(true);
      setTestResult(null);
      // Temporarily set to test
      setBackendBaseUrl(url);
      const status = await api.getBotStatus();
      setTestResult({
        success: true,
        message: `Successfully connected to Trading Engine! (Mode: ${status.mode || 'Active'})`
      });
      onUpdated();
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Could not connect to backend server. Make sure CORS is enabled and server is running.'
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = () => {
    setBackendBaseUrl(url);
    onUpdated();
    onClose();
  };

  const isGithubPages = typeof window !== 'undefined' && window.location.hostname.includes('github.io');

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
      <div className="bg-[#111827] border border-slate-700 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl animate-scaleUp flex flex-col">
        
        {/* Header */}
        <div className="bg-[#0f172a] px-5 py-3.5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center">
              <Server className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Cloud Backend Connection</h3>
              <p className="text-[11px] text-slate-400">Connect GitHub Pages to your 24/7 Trading Engine</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-xs text-slate-300">
          
          {isGithubPages && (
            <div className="p-3 bg-blue-950/40 border border-blue-800/80 rounded-xl space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-blue-300">
                <Globe className="w-4 h-4" />
                <span>Running on GitHub Pages (github.io)</span>
              </div>
              <p className="text-[11px] text-slate-300">
                GitHub Pages hosts this website interface for free. Paste your 24/7 backend cloud URL (e.g. from Render or Railway) below so this page can stream live ticks and execute trades with Kite.
              </p>
            </div>
          )}

          <div>
            <label className="text-slate-300 font-semibold block mb-1.5">
              Backend Cloud Server URL
            </label>
            <input
              type="text"
              placeholder="e.g. https://your-app.onrender.com or http://127.0.0.1:8000"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono placeholder:text-slate-500"
            />
            <p className="text-[10px] text-slate-500 mt-1">
              Leave blank to use the same host domain (default when deploying full-stack container).
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testing}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 rounded-lg font-bold transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
              <span>{testing ? 'Testing...' : 'Test Connection'}</span>
            </button>
            <span className="text-[11px] text-slate-400">Verifies /health and /bot/status</span>
          </div>

          {testResult && (
            <div className={`p-3 rounded-xl flex items-center gap-2 ${
              testResult.success 
                ? 'bg-emerald-950/60 border border-emerald-800 text-emerald-300' 
                : 'bg-red-950/60 border border-red-800 text-red-300'
            }`}>
              {testResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> : <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />}
              <span>{testResult.message}</span>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="bg-[#0f172a] px-5 py-3 border-t border-slate-800 flex items-center justify-end gap-2">
          <button onClick={onClose} className="px-3 py-1.5 text-xs text-slate-400 hover:text-white">
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-md"
          >
            Save & Connect
          </button>
        </div>

      </div>
    </div>
  );
};
