import React, { useState, useEffect } from 'react';
import { 
  X, 
  Key, 
  CheckCircle2, 
  AlertCircle, 
  Shield, 
  ExternalLink, 
  Sparkles, 
  Gift, 
  Smartphone, 
  Copy, 
  Check, 
  Info, 
  Zap, 
  BookOpen 
} from 'lucide-react';
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
  const [zerodhaTab, setZerodhaTab] = useState<'ENCTOKEN' | 'MOBILE_GUIDE' | 'KITE_CONNECT'>('ENCTOKEN');

  // Mobile detection
  const [isMobileDevice, setIsMobileDevice] = useState<boolean>(false);
  const [copiedBookmarklet, setCopiedBookmarklet] = useState<boolean>(false);

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

  useEffect(() => {
    const checkMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera || '';
      const isMobileUA = /android|avantgo|blackberry|iemobile|ipad|iphone|ipod|opera mini|webos|mobile/i.test(userAgent);
      const isSmallScreen = window.innerWidth <= 768;
      setIsMobileDevice(isMobileUA || isSmallScreen);
      if (isMobileUA || isSmallScreen) {
        // Default to mobile guide when on mobile
        setZerodhaTab('MOBILE_GUIDE');
      }
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  if (!isOpen) return null;

  const bookmarkletCode = `javascript:(function(){try{var m=document.cookie.match(/enctoken=([^;]+)/);if(m&&m[1]){prompt("Your Zerodha enctoken (Copy this):",decodeURIComponent(m[1]));}else{alert("enctoken cookie not found. Please make sure you are logged in to kite.zerodha.com");}}catch(e){alert("Error: "+e.message);}})();`;

  const copyBookmarklet = () => {
    navigator.clipboard.writeText(bookmarkletCode);
    setCopiedBookmarklet(true);
    setTimeout(() => setCopiedBookmarklet(false), 3000);
  };

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
        if (zerodhaTab === 'ENCTOKEN' || zerodhaTab === 'MOBILE_GUIDE') {
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
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
      <div className="bg-[#111827] border border-slate-700 rounded-2xl max-w-xl w-full overflow-hidden shadow-2xl animate-scaleUp max-h-[94vh] flex flex-col">
        
        {/* Header */}
        <div className="bg-[#0f172a] px-5 py-3.5 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center">
              <Key className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">Live Broker Connector</h3>
                {isMobileDevice && (
                  <span className="text-[10px] bg-blue-500/20 border border-blue-500/40 text-blue-300 px-2 py-0.5 rounded-full flex items-center gap-1 font-mono">
                    <Smartphone className="w-3 h-3" /> Mobile Detected
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400">Zero-cost official APIs & session connectors for 24/7 Cloud Trading</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1 text-slate-200">
          
          {/* Broker Selector Grid */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">Select Trading Engine / Broker</label>
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
                onClick={() => setSelectedBroker('zerodha')}
                className={`py-2 px-1 rounded-xl text-xs font-bold border transition-all ${
                  selectedBroker === 'zerodha'
                    ? 'bg-blue-600 text-white border-blue-500 shadow'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                Zerodha Kite
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
            </div>
          </div>

          {/* 1. ZERODHA KITE SECTION WITH MOBILE PHONE SPECIALIZED GUIDE */}
          {selectedBroker === 'zerodha' && (
            <div className="space-y-3 bg-slate-950/80 p-4 rounded-xl border border-slate-800 text-xs">
              
              {/* Zerodha Navigation Sub-Tabs */}
              <div className="flex bg-slate-900 p-1 rounded-lg border border-slate-800 gap-1 flex-wrap">
                <button
                  type="button"
                  onClick={() => setZerodhaTab('MOBILE_GUIDE')}
                  className={`flex-1 py-1 px-2 rounded text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                    zerodhaTab === 'MOBILE_GUIDE' ? 'bg-amber-600 text-white shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>📱 Phone Login Guide</span>
                </button>

                <button
                  type="button"
                  onClick={() => setZerodhaTab('ENCTOKEN')}
                  className={`flex-1 py-1 px-2 rounded text-xs font-bold transition-all ${
                    zerodhaTab === 'ENCTOKEN' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  ⭐ Desktop Enctoken
                </button>

                <button
                  type="button"
                  onClick={() => setZerodhaTab('KITE_CONNECT')}
                  className={`flex-1 py-1 px-2 rounded text-xs font-bold transition-all ${
                    zerodhaTab === 'KITE_CONNECT' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Kite Connect API
                </button>
              </div>

              {/* TAB 1: PHONE LOGIN GUIDE */}
              {zerodhaTab === 'MOBILE_GUIDE' && (
                <div className="space-y-3">
                  <div className="p-3 bg-amber-950/40 border border-amber-800/80 rounded-xl space-y-2">
                    <div className="flex items-center gap-1.5 text-amber-300 font-bold text-xs">
                      <Smartphone className="w-4 h-4" />
                      <span>How to Login to Zerodha Kite from your Phone (No Laptop Needed):</span>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      On phone browsers (Safari, Chrome Mobile), Developer Tools (F12) are hidden. Choose either of the 2 easy mobile methods below:
                    </p>
                  </div>

                  {/* Method A: Mobile 1-Tap Bookmarklet */}
                  <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5" />
                        Method A: 1-Tap Mobile URL Bookmarklet (Fastest)
                      </span>
                      <button
                        type="button"
                        onClick={copyBookmarklet}
                        className="flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[11px] font-bold transition-all"
                      >
                        {copiedBookmarklet ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedBookmarklet ? 'Copied!' : 'Copy Script'}</span>
                      </button>
                    </div>

                    <ol className="list-decimal list-inside text-[11px] text-slate-300 space-y-1 pl-1">
                      <li>Open Chrome/Safari on your phone and log in to <a href="https://kite.zerodha.com" target="_blank" rel="noreferrer" className="text-blue-400 underline font-mono">kite.zerodha.com</a>.</li>
                      <li>In your phone browser address bar, tap the URL bar, type <code className="text-amber-300">javascript:</code> then <strong>paste</strong> the script copied above and press <strong>Go / Enter</strong>.</li>
                      <li>A popup will display your <code className="text-emerald-300 font-bold">enctoken</code>. Copy it and paste it below!</li>
                    </ol>

                    <p className="text-[10px] text-slate-400 italic">
                      Tip: In Chrome mobile, if typing "javascript:" gets removed when pasting, manually type <code className="text-amber-300">javascript:</code> into the address bar first, then paste the remaining code after it.
                    </p>
                  </div>

                  {/* Method B: 24/7 Cloud Auto-Login Recommendation */}
                  <div className="p-3 bg-blue-950/30 border border-blue-800/60 rounded-xl space-y-1 text-[11px] text-slate-300">
                    <span className="font-bold text-blue-300 flex items-center gap-1">
                      <Shield className="w-3.5 h-3.5" />
                      Method B: Permanent 30-Day Token (DhanHQ - 100% Free Alternative)
                    </span>
                    <p className="text-slate-400">
                      If you want to trade 24/7 from your phone without ever copying tokens again, switch to <strong>DhanHQ</strong> above! You can generate a 30-day token directly inside the Dhan Mobile App with 1 tap.
                    </p>
                  </div>

                  {/* Input Form */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-slate-800">
                    <div>
                      <label className="text-slate-300 font-semibold block mb-1">Zerodha Client ID</label>
                      <input
                        type="text"
                        placeholder="e.g. AB1234"
                        value={clientCode}
                        onChange={(e) => setClientCode(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-slate-300 font-semibold block mb-1">Extracted Enctoken</label>
                      <input
                        type="password"
                        placeholder="Paste your enctoken here"
                        value={enctoken}
                        onChange={(e) => setEnctoken(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: DESKTOP ENCTOKEN */}
              {zerodhaTab === 'ENCTOKEN' && (
                <div className="space-y-2.5">
                  <div className="p-3 bg-emerald-950/40 border border-emerald-800/80 rounded-xl space-y-1">
                    <span className="font-bold text-emerald-400 block text-xs">How to get your Free Zerodha enctoken on Desktop (10 Seconds):</span>
                    <ol className="list-decimal list-inside text-[11px] text-slate-300 space-y-0.5">
                      <li>Log in to Kite Web on Chrome/Edge: <code className="text-white">kite.zerodha.com</code></li>
                      <li>Press <strong>F12</strong> (Developer Tools) → Go to <strong>Application</strong> tab → <strong>Cookies</strong> → <strong>kite.zerodha.com</strong></li>
                      <li>Find the cookie named <code className="text-amber-300 font-bold">enctoken</code> and copy its value.</li>
                    </ol>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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
              )}

              {/* TAB 3: KITE CONNECT API */}
              {zerodhaTab === 'KITE_CONNECT' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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

          {/* 2. DHAN HQ (100% FREE OFFICIAL API - BEST FOR MOBILE & CLOUD) */}
          {selectedBroker === 'dhan' && (
            <div className="space-y-3 bg-slate-950/80 p-4 rounded-xl border border-emerald-900/60 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                  <Gift className="w-4 h-4" />
                  DhanHQ API (100% Free & Mobile Friendly)
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
                Dhan has <strong>zero subscription fees</strong>. Generate your token directly in the <strong>Dhan Mobile App → Profile → DhanHQ APIs → Generate Access Token</strong> (valid for 30 days).
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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
                  <label className="text-slate-300 font-semibold block mb-1">Dhan 30-day Access Token</label>
                  <input
                    type="password"
                    placeholder="Paste Access Token from Dhan App"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 3. ANGEL ONE SMARTAPI (100% FREE OFFICIAL API) */}
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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

export default BrokerConnectModal;
