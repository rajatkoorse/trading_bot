import React, { useState } from 'react';
import { 
  BarChart3, 
  Play, 
  TrendingUp, 
  ShieldAlert, 
  Award, 
  Percent, 
  RotateCw, 
  CheckSquare, 
  Square 
} from 'lucide-react';
import { BacktestResult, BacktestTrade } from '../types';
import { api } from '../services/api';

const AVAILABLE_SYMBOLS = [
  { id: '^NSEI', name: 'NIFTY 50' },
  { id: '^NSEBANK', name: 'BANK NIFTY' },
  { id: 'RELIANCE.NS', name: 'Reliance Industries' },
  { id: 'HDFCBANK.NS', name: 'HDFC Bank' },
  { id: 'TCS.NS', name: 'TCS' },
  { id: 'INFY.NS', name: 'Infosys' },
  { id: 'TATAMOTORS.NS', name: 'Tata Motors' },
  { id: 'SBIN.NS', name: 'State Bank of India' },
  { id: 'BHARTIARTL.NS', name: 'Bharti Airtel' },
  { id: 'LT.NS', name: 'Larsen & Toubro' },
];

export const BacktestStudio: React.FC = () => {
  const [selectedSymbols, setSelectedSymbols] = useState<string[]>(['^NSEI', 'RELIANCE.NS', 'HDFCBANK.NS']);
  const [timeframe, setTimeframe] = useState<string>('15m');
  const [initialCapital, setInitialCapital] = useState<number>(100000);
  const [riskPerTrade, setRiskPerTrade] = useState<number>(1.5);
  const [minConfidence, setMinConfidence] = useState<number>(70);
  const [useTrailingStop, setUseTrailingStop] = useState<boolean>(true);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [result, setResult] = useState<BacktestResult | null>(null);

  const toggleSymbol = (sym: string) => {
    if (selectedSymbols.includes(sym)) {
      if (selectedSymbols.length > 1) {
        setSelectedSymbols(selectedSymbols.filter((s) => s !== sym));
      }
    } else {
      setSelectedSymbols([...selectedSymbols, sym]);
    }
  };

  const handleRunBacktest = async () => {
    try {
      setIsLoading(true);
      const res = await api.runBacktest({
        symbols: selectedSymbols,
        timeframe,
        initial_capital: initialCapital,
        risk_per_trade_pct: riskPerTrade,
        min_confidence_pct: minConfidence,
        use_trailing_stop: useTrailingStop
      });
      setResult(res);
    } catch (e) {
      console.error('Backtest failed:', e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-[#111827] border border-slate-800 rounded-xl overflow-hidden shadow-lg p-5">
      
      {/* Title */}
      <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <BarChart3 className="w-5 h-5 text-blue-400" />
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">
              AI Quantitative Strategy Backtesting Studio
            </h2>
            <p className="text-xs text-slate-400">
              Walk-forward historical simulation with Indian market taxes, slippage, and dynamic stops
            </p>
          </div>
        </div>

        <button
          onClick={handleRunBacktest}
          disabled={isLoading}
          className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50"
        >
          {isLoading ? (
            <>
              <RotateCw className="w-4 h-4 animate-spin" />
              <span>Simulating Engine...</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-current" />
              <span>Run Backtest</span>
            </>
          )}
        </button>
      </div>

      {/* Configuration Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
        
        {/* Symbol Selection */}
        <div className="md:col-span-2">
          <label className="text-xs font-semibold text-slate-300 block mb-1.5">
            Test Assets (NSE / BSE)
          </label>
          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
            {AVAILABLE_SYMBOLS.map((s) => {
              const isSelected = selectedSymbols.includes(s.id);
              return (
                <button
                  key={s.id}
                  onClick={() => toggleSymbol(s.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                    isSelected
                      ? 'bg-blue-600/30 border-blue-500 text-blue-300'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  {s.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Timeframe & Capital */}
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Timeframe</label>
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
            >
              <option value="5m">5 Minutes (Intraday)</option>
              <option value="15m">15 Minutes (Standard)</option>
              <option value="1h">1 Hour (Swing)</option>
              <option value="1d">1 Day (Positional)</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Initial Capital (₹)</label>
            <input
              type="number"
              value={initialCapital}
              onChange={(e) => setInitialCapital(Number(e.target.value))}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
            />
          </div>
        </div>

        {/* Risk % & Switches */}
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Risk Per Trade: <strong className="text-blue-400">{riskPerTrade}%</strong>
            </label>
            <input
              type="range"
              min="0.5"
              max="5.0"
              step="0.25"
              value={riskPerTrade}
              onChange={(e) => setRiskPerTrade(Number(e.target.value))}
              className="w-full accent-blue-500 cursor-pointer"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="trailing_stop_cb"
              checked={useTrailingStop}
              onChange={(e) => setUseTrailingStop(e.target.checked)}
              className="rounded bg-slate-800 border-slate-700 text-blue-600 focus:ring-0 w-3.5 h-3.5"
            />
            <label htmlFor="trailing_stop_cb" className="text-xs text-slate-300 cursor-pointer">
              Enable ATR Trailing Stop
            </label>
          </div>
        </div>

      </div>

      {/* Results Section */}
      {result && (
        <div className="space-y-5 animate-fadeIn">
          
          {/* Metrics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl">
              <span className="text-[10px] uppercase font-mono text-slate-400 block">Total Return</span>
              <span className={`text-lg font-bold font-mono ${
                result.total_return_pct >= 0 ? 'text-emerald-400' : 'text-red-400'
              }`}>
                {result.total_return_pct >= 0 ? '+' : ''}{result.total_return_pct}%
              </span>
              <span className="text-[10px] text-slate-500 block mt-0.5">₹{result.final_capital.toLocaleString('en-IN')}</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl">
              <span className="text-[10px] uppercase font-mono text-slate-400 block">Win Rate</span>
              <span className="text-lg font-bold font-mono text-amber-400">{result.win_rate_pct}%</span>
              <span className="text-[10px] text-slate-500 block mt-0.5">{result.profitable_trades}W / {result.losing_trades}L</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl">
              <span className="text-[10px] uppercase font-mono text-slate-400 block">Sharpe Ratio</span>
              <span className="text-lg font-bold font-mono text-blue-400">{result.sharpe_ratio}</span>
              <span className="text-[10px] text-slate-500 block mt-0.5">Risk-adjusted return</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl">
              <span className="text-[10px] uppercase font-mono text-slate-400 block">Max Drawdown</span>
              <span className="text-lg font-bold font-mono text-red-400">-{result.max_drawdown_pct}%</span>
              <span className="text-[10px] text-slate-500 block mt-0.5">Peak-to-trough drop</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl">
              <span className="text-[10px] uppercase font-mono text-slate-400 block">Profit Factor</span>
              <span className="text-lg font-bold font-mono text-teal-400">{result.profit_factor}</span>
              <span className="text-[10px] text-slate-500 block mt-0.5">Gross Win / Loss</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl">
              <span className="text-[10px] uppercase font-mono text-slate-400 block">Avg Trade P&L</span>
              <span className={`text-lg font-bold font-mono ${
                result.average_trade_pnl >= 0 ? 'text-emerald-400' : 'text-red-400'
              }`}>
                ₹{result.average_trade_pnl.toFixed(0)}
              </span>
              <span className="text-[10px] text-slate-500 block mt-0.5">{result.total_trades} Executed</span>
            </div>
          </div>

          {/* Equity Curve Simple Visualizer */}
          {result.equity_curve.length > 0 && (
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
              <div className="text-xs font-semibold text-slate-300 mb-3 flex items-center justify-between">
                <span>Account Growth Simulation (INR ₹)</span>
                <span className="text-emerald-400 font-mono font-bold">
                  Peak: ₹{Math.max(...result.equity_curve.map((e) => e.equity)).toLocaleString('en-IN')}
                </span>
              </div>
              <div className="h-32 flex items-end gap-1 overflow-hidden">
                {result.equity_curve.map((pt, i) => {
                  const minEq = Math.min(...result.equity_curve.map((e) => e.equity)) * 0.98;
                  const maxEq = Math.max(...result.equity_curve.map((e) => e.equity)) * 1.02;
                  const heightPct = Math.max(5, Math.min(100, ((pt.equity - minEq) / (maxEq - minEq)) * 100));
                  return (
                    <div
                      key={i}
                      style={{ height: `${heightPct}%` }}
                      title={`${pt.timestamp}: ₹${pt.equity.toLocaleString('en-IN')}`}
                      className="flex-1 bg-gradient-to-t from-blue-600/40 to-blue-400 rounded-t-sm hover:from-blue-500 hover:to-emerald-400 transition-all cursor-pointer min-w-[2px]"
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* Trade Logs Table */}
          <div className="overflow-x-auto max-h-56 overflow-y-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] sticky top-0">
                <tr>
                  <th className="py-2 px-3">Symbol</th>
                  <th className="py-2 px-3">Side</th>
                  <th className="py-2 px-3">Entry Time</th>
                  <th className="py-2 px-3">Exit Time</th>
                  <th className="py-2 px-3">Entry (₹)</th>
                  <th className="py-2 px-3">Exit (₹)</th>
                  <th className="py-2 px-3">Net P&L (₹)</th>
                  <th className="py-2 px-3">Return</th>
                  <th className="py-2 px-3">Exit Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {result.trades.map((t, i) => (
                  <tr key={i} className="hover:bg-slate-800/40">
                    <td className="py-1.5 px-3 font-sans font-bold text-white">{t.symbol}</td>
                    <td className="py-1.5 px-3">
                      <span className={t.side === 'BUY' ? 'text-emerald-400' : 'text-red-400'}>
                        {t.side}
                      </span>
                    </td>
                    <td className="py-1.5 px-3 text-slate-400">{t.entry_time.split(' ')[0]}</td>
                    <td className="py-1.5 px-3 text-slate-400">{t.exit_time.split(' ')[0]}</td>
                    <td className="py-1.5 px-3 text-slate-300">₹{t.entry_price.toFixed(1)}</td>
                    <td className="py-1.5 px-3 text-slate-300">₹{t.exit_price.toFixed(1)}</td>
                    <td className={`py-1.5 px-3 font-bold ${t.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {t.pnl >= 0 ? '+' : ''}₹{t.pnl.toFixed(1)}
                    </td>
                    <td className={`py-1.5 px-3 ${t.pnl_pct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {t.pnl_pct >= 0 ? '+' : ''}{t.pnl_pct.toFixed(2)}%
                    </td>
                    <td className="py-1.5 px-3 font-sans text-slate-400 text-[11px]">{t.exit_reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>
      )}

    </div>
  );
};
