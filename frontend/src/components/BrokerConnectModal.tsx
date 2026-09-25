import React, { useState } from 'react';
import { X, Key, CheckCircle2, AlertCircle, Shield, ExternalLink, Sparkles, HelpCircle, Gift } from 'lucide-react';
import { api } from '../services/api';

interface BrokerConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdated: () => void;
  activeBroker: string;
}

export const BrokerConnectModal: React.FC<BrokerConnectModalProps> = ({
  isOpen,
  onClose,
  onUpdated,
  activeBroker
}) => {
  const [selectedBroker, setSelectedBroker] = useState<string>(activeBroker || 'dhan');
  const [zerodhaTab, setZerodhaTab] = useState<'ENCTOKEN' | 'KITE_CONNECT'>('ENCTOKEN');

  // Input states
  const [apiKey, setApiKey] = useState<string>('');
  const [apiSecret, setApiSecret] = useState<string>('');
  const [clientCode, setClientCode] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [totp, setTotp] = useState<string>('');
  const [requestToken, setRequestToken] = useState<string>('');
  const [enctoken, setEnctoken] = useState<string>('');

  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [status, setStatus] = useState<{ success?: boolean; message?: string } | null>(null);

  if (!isOpen) return null;

  const handleOpenZerodhaLogin = async () => {
    if (!apiKey) {
      alert('Please enter your Zerodha API Key first.');
      return;
    }
    const loginUrl = await api.getZerodhaLoginUrl(apiKey);
    if (loginUrl) {
      window.open(loginUrl, '_blank');
    }
  };

  const handleGenerateZerodhaToken = async () => {
    if (!apiKey || !apiSecret || !requestToken) {
      alert('Please enter API Key, API Secret, and the Request Token from your browser redirect URL.');
      return;
    }
    try {
      setIsConnecting(true);
      setStatus(null);
      const res = await api.generateZerodhaToken({
        api_key: apiKey,
        api_secret: apiSecret,
        request_token: requestToken
      });
      setStatus(res);
      if (res.success) {
        onUpdated();
      }
    } catch (e: any) {
      setStatus({ success: false, message: e.response?.data?.message || 'Token exchange failed.' });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleConnect = async () => {
    try {
      setIsConnecting(true);
      setStatus(null);

      let creds: Record<string, string> = {};

      if (selectedBroker === 'dhan') {
        creds = { client_id: clientCode, access_token: password };
      } else if (selectedBroker === 'angel_one') {
        creds = { api_key: apiKey, client_code: clientCode, password: password, totp_token: totp };
      } else if (selectedBroker === 'zerodha') {
        if (zerodhaTab === 'ENCTOKEN') {
          creds = { user_id: clientCode, enctoken: enctoken };
        } else {
          creds = { api_key: apiKey, api_secret: apiSecret, access_token: password };
        }
      }

      const res = await api.connectBroker(selectedBroker, creds);
      setStatus(res);
      if (res.success) {
        onUpdated();
      }
    } catch (e: any) {
      setStatus({ success: false, message: e.response?.data?.detail || 'Broker connection failed.' });
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#111827] border border-slate-700 rounded-2xl max-w-xl w-full overflow-hidden shadow-2xl animate-scaleUp max-h-[92vh] flex flex-col">
        
        {/* Header */}
        <div className="bg-[#0f172a] px-5 py-4 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center">
              <Key className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Live Broker Connector</h3>
              <p className="text-[11px] text-slate-400">Zero-cost official APIs & direct session connectors</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          
          {/* Broker Selector Grid */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">Select Trading Engine</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setSelectedBroker('paper')}
                className={`py-2 px-1 rounded-xl text-xs font-bold border transition-all ${
                  selectedBroker === 'paper'
                    ? 'bg-blue-600 text-white border-blue-500 shadow'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                Paper (₹1L)
              </button>

              <button
                type="button"
                onClick={() => setSelectedBroker('dhan')}
                className={`py-2 px-1 rounded-xl text-xs font-bold border transition-all relative ${
                  selectedBroker === 'dhan'
                    ? 'bg-emerald-600 text-white border-emerald-500 shadow'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <span className="text-[9px] font-bold bg-amber-500 text-slate-950 px-1 rounded absolute -top-2 right-1 uppercase">100% Free</span>
                DhanHQ API
              </button>

              <button
                type="button"
                onClick={() => setSelectedBroker('angel_one')}
                className={`py-2 px-1 rounded-xl text-xs font-bold border transition-all relative ${
                  selectedBroker === 'angel_one'
                    ? 'bg-emerald-600 text-white border-emerald-500 shadow'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <span className="text-[9px] font-bold bg-amber-500 text-slate-950 px-1 rounded absolute -top-2 right-1 uppercase">100% Free</span>
                Angel One
              </button>

              <button
                type="button"
                onClick={() => setSelectedBroker('zerodha')}
                className={`py-2 px-1 rounded-xl text-xs font-bold border transition-all ${
                  selectedBroker === 'zerodha'
                    ? 'bg-blue-600 text-white border-blue-500 shadow'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                Zerodha
              </button>
            </div>
          </div>

          {/* 1. DHAN HQ (100% FREE OFFICIAL API - RECOMMENDED) */}
          {selectedBroker === 'dhan' && (
            <div className="space-y-3 bg-slate-950/80 p-4 rounded-xl border border-emerald-900/60 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                  <Gift className="w-4 h-4" />
                  DhanHQ API (100% Free for All Dhan Users)
                </span>
                <a
                  href="https://dhanhq.co"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] text-blue-400 hover:underline flex items-center gap-1"
                >
                  <span>Dhan Developer Portal</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <p className="text-[11px] text-slate-400">
                Dhan offers <strong>zero monthly subscription fees</strong> forever. Generate your free token instantly inside the <strong>Dhan App → Profile → DhanHQ APIs → Generate Access Token</strong>.
              </p>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Dhan Client ID</label>
                  <input
                    type="text"
                    placeholder="e.g. 1000123456"
                    value={clientCode}
                    onChange={(e) => setClientCode(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Dhan Access Token</label>
                  <input
                    type="password"
                    placeholder="Paste 30-day Access Token"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 2. ANGEL ONE SMARTAPI (100% FREE OFFICIAL API) */}
          {selectedBroker === 'angel_one' && (
            <div className="space-y-3 bg-slate-950/80 p-4 rounded-xl border border-emerald-900/60 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                  <Gift className="w-4 h-4" />
                  Angel One SmartAPI (100% Free Official API)
                </span>
                <a
                  href="https://smartapi.angelbroking.com"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] text-blue-400 hover:underline flex items-center gap-1"
                >
                  <span>SmartAPI Portal</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">SmartAPI Key</label>
                <input
                  type="text"
                  placeholder="Free API key from smartapi.angelbroking.com"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Client Code</label>
                  <input
                    type="text"
                    placeholder="e.g. A12345"
                    value={clientCode}
                    onChange={(e) => setClientCode(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">MPIN / Password</label>
                  <input
                    type="password"
                    placeholder="••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">TOTP Secret Key (For Automated Login)</label>
                <input
                  type="text"
                  placeholder="Authenticator TOTP Secret"
                  value={totp}
                  onChange={(e) => setTotp(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                />
              </div>
            </div>
          )}

          {/* 3. ZERODHA (TWO OPTIONS: FREE ENCTOKEN VS OFFICIAL PAID API) */}
          {selectedBroker === 'zerodha' && (
            <div className="space-y-3 bg-slate-950/80 p-4 rounded-xl border border-slate-800 text-xs">
              {/* Zerodha Sub-Tabs */}
              <div className="flex bg-slate-900 p-1 rounded-lg border border-slate-800">
                <button
                  type="button"
                  onClick={() => setZerodhaTab('ENCTOKEN')}
                  className={`flex-1 py-1 rounded text-xs font-bold transition-all ${
                    zerodhaTab === 'ENCTOKEN' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  ⭐ Free Direct Login (Zero ₹2,000 Fee)
                </button>
                <button
                  type="button"
                  onClick={() => setZerodhaTab('KITE_CONNECT')}
                  className={`flex-1 py-1 rounded text-xs font-bold transition-all ${
                    zerodhaTab === 'KITE_CONNECT' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Official Kite Connect API
                </button>
              </div>

              {zerodhaTab === 'ENCTOKEN' ? (
                <div className="space-y-2.5">
                  <div className="p-3 bg-emerald-950/40 border border-emerald-800/80 rounded-xl space-y-1">
                    <span className="font-bold text-emerald-400 block text-xs">How to get your Free Zerodha enctoken (10 Seconds):</span>
                    <ol className="list-decimal list-inside text-[11px] text-slate-300 space-y-0.5">
                      <li>Log in to Kite Web in your browser (Chrome/Edge): <code className="text-white">kite.zerodha.com</code></li>
                      <li>Press <strong>F12</strong> (Developer Tools) → Go to <strong>Application</strong> tab → <strong>Cookies</strong> → <strong>kite.zerodha.com</strong></li>
                      <li>Find the cookie named <code className="text-amber-300 font-bold">enctoken</code> and copy its value.</li>
                    </ol>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-slate-300 font-semibold block mb-1">Zerodha User ID</label>
                      <input
                        type="text"
                        placeholder="e.g. AB1234"
                        value={clientCode}
                        onChange={(e) => setClientCode(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-slate-300 font-semibold block mb-1">Enctoken Cookie Value</label>
                      <input
                        type="password"
                        placeholder="Paste enctoken cookie here"
                        value={enctoken}
                        onChange={(e) => setEnctoken(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-slate-300 font-semibold block mb-1">Kite API Key</label>
                      <input
                        type="text"
                        placeholder="API Key"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-slate-300 font-semibold block mb-1">Kite API Secret</label>
                      <input
                        type="password"
                        placeholder="API Secret"
                        value={apiSecret}
                        onChange={(e) => setApiSecret(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                      />
                    </div>
                  </div>

                  <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300 font-semibold">Authorize Session</span>
                      <button
                        type="button"
                        onClick={handleOpenZerodhaLogin}
                        className="flex items-center gap-1.5 px-3 py-1 bg-amber-600 hover:bg-amber-500 text-slate-950 rounded-lg text-xs font-bold transition-all"
                      >
                        <span>Login to Kite</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Paste request_token from redirect URL"
                        value={requestToken}
                        onChange={(e) => setRequestToken(e.target.value)}
                        className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                      />
                      <button
                        type="button"
                        onClick={handleGenerateZerodhaToken}
                        disabled={isConnecting || !requestToken}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-all disabled:opacity-50"
                      >
                        Exchange
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 4. PAPER MODE */}
          {selectedBroker === 'paper' && (
            <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 text-xs text-slate-300 space-y-2">
              <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                <Shield className="w-4 h-4" />
                <span>Paper Trading Simulator is Active</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Pre-loaded with virtual ₹1,00,000 capital. Tests AI signals with sub-second fills and realistic STT/brokerage calculations with zero risk.
              </p>
            </div>
          )}

          {/* Feedback Status */}
          {status && (
            <div className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
              status.success 
                ? 'bg-emerald-950/60 border border-emerald-800 text-emerald-300' 
                : 'bg-red-950/60 border border-red-800 text-red-300'
            }`}>
              {status.success ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> : <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />}
              <span>{status.message}</span>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="bg-[#0f172a] px-5 py-3 border-t border-slate-800 flex items-center justify-end gap-2 shrink-0">
          <button onClick={onClose} className="px-3 py-1.5 text-xs text-slate-400 hover:text-white">
            Cancel
          </button>
          <button
            onClick={handleConnect}
            disabled={isConnecting}
            className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md disabled:opacity-50"
          >
            {isConnecting ? 'Connecting...' : selectedBroker === 'paper' ? 'Select Paper Mode' : `Connect ${selectedBroker.toUpperCase()}`}
          </button>
        </div>

      </div>
    </div>
  );
};
