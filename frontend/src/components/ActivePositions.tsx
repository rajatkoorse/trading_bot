import React, { useState } from 'react';
import { 
  Briefcase, 
  History, 
  XCircle, 
  ArrowUpRight, 
  ArrowDownRight, 
  ShieldCheck, 
  ReceiptIndianRupee,
  CheckCircle2,
  Lock,
  Coins
} from 'lucide-react';
import { TradePosition } from '../types';
import { api } from '../services/api';

interface ActivePositionsProps {
  positions: TradePosition[];
  history: TradePosition[];
  onClosePosition: (posId: string) => void;
  onSelectSymbol: (symbol: string) => void;
  onRefresh: () => void;
}

export const ActivePositions: React.FC<ActivePositionsProps> = ({
  positions,
  history,
  onClosePosition,
  onSelectSymbol,
  onRefresh
}) => {
  const [activeTab, setActiveTab] = useState<'OPEN' | 'HISTORY'>('OPEN');

  const handleLockBreakeven = async (posId: string) => {
    try {
      await api.lockBreakevenTrade(posId);
      onRefresh();
    } catch (e) {
      console.error('Failed to lock break-even:', e);
    }
  };

  const handlePartialClose = async (pos: TradePosition) => {
    const halfQty = Math.floor(pos.quantity / 2);
    if (halfQty <= 0) {
      alert('Quantity too small to split.');
      return;
    }
    try {
      await api.partialCloseTrade(pos.id, halfQty);
      onRefresh();
    } catch (e) {
      console.error('Failed partial close:', e);
    }
  };

  return (
    <div className="bg-[#111827] border border-slate-800 rounded-xl overflow-hidden shadow-lg">
      
      {/* Header Tabs */}
      <div className="bg-[#0f172a] border-b border-slate-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setActiveTab('OPEN')}
            className={`flex items-center gap-2 text-xs font-bold transition-colors pb-1 border-b-2 ${
              activeTab === 'OPEN'
                ? 'border-blue-500 text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Briefcase className="w-4 h-4 text-blue-400" />
            <span>Open Real-Time Positions ({positions.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('HISTORY')}
            className={`flex items-center gap-2 text-xs font-bold transition-colors pb-1 border-b-2 ${
              activeTab === 'HISTORY'
                ? 'border-blue-500 text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <History className="w-4 h-4 text-slate-400" />
            <span>Real-Time Trade Journal ({history.length})</span>
          </button>
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto min-h-[160px] max-h-[320px] overflow-y-auto">
        {activeTab === 'OPEN' ? (
          positions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-slate-500 text-xs">
              <Briefcase className="w-7 h-7 text-slate-600 mb-1.5" />
              <span>No open positions currently. Bot is monitoring live tick confluence.</span>
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/80 text-slate-400 uppercase font-mono text-[10px] sticky top-0 border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Symbol</th>
                  <th className="py-2.5 px-3">Side</th>
                  <th className="py-2.5 px-3">Qty</th>
                  <th className="py-2.5 px-3">Entry (₹)</th>
                  <th className="py-2.5 px-3">Invested Margin</th>
                  <th className="py-2.5 px-3">Current (₹)</th>
                  <th className="py-2.5 px-3">Stop Loss</th>
                  <th className="py-2.5 px-3">Trailing SL</th>
                  <th className="py-2.5 px-3">Target 1 / 2</th>
                  <th className="py-2.5 px-3">Floating P&L</th>
                  <th className="py-2.5 px-3 text-right">Protection Controls</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {positions.map((pos) => {
                  const isBuy = pos.side === 'BUY';
                  const isProfit = pos.pnl >= 0;
                  const tradeMargin = pos.entry_price * pos.quantity;
                  return (
                    <tr key={pos.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-2.5 px-3 font-sans font-bold text-white cursor-pointer hover:text-blue-400" onClick={() => onSelectSymbol(pos.symbol)}>
                        {pos.symbol}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[11px] font-bold ${
                          isBuy ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                        }`}>
                          {isBuy ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                          {pos.side}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-300 font-semibold">{pos.quantity}</td>
                      <td className="py-2.5 px-3 text-slate-300">₹{pos.entry_price.toFixed(2)}</td>
                      <td className="py-2.5 px-3 font-bold text-indigo-300">₹{tradeMargin.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td className="py-2.5 px-3 text-white font-bold">₹{pos.current_price.toFixed(2)}</td>
                      <td className="py-2.5 px-3 text-red-400 font-semibold">₹{pos.stop_loss.toFixed(2)}</td>
                      <td className="py-2.5 px-3 text-amber-400">
                        {pos.trailing_stop ? `₹${pos.trailing_stop.toFixed(2)}` : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-slate-300 text-[11px]">
                        <span className="text-emerald-400">₹{pos.target_1.toFixed(0)}</span> / <span className="text-emerald-300">₹{pos.target_2.toFixed(0)}</span>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className={`font-bold ${isProfit ? 'text-emerald-400' : 'text-red-400'}`}>
                          {isProfit ? '+' : ''}₹{pos.pnl.toFixed(2)} ({isProfit ? '+' : ''}{pos.pnl_pct.toFixed(2)}%)
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Break-even Lock Button */}
                          <button
                            onClick={() => handleLockBreakeven(pos.id)}
                            title="Lock Stop Loss to Break-Even (Zero Risk)"
                            className="flex items-center gap-1 px-2 py-1 bg-amber-950/60 hover:bg-amber-900 border border-amber-800 text-amber-300 rounded text-[10px] font-sans font-semibold transition-all"
                          >
                            <Lock className="w-3 h-3" />
                            <span>Break-Even</span>
                          </button>

                          {/* 50% Profit Take Button */}
                          {pos.quantity > 1 && (
                            <button
                              onClick={() => handlePartialClose(pos)}
                              title="Book 50% Partial Profit now"
                              className="flex items-center gap-1 px-2 py-1 bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-800 text-emerald-300 rounded text-[10px] font-sans font-semibold transition-all"
                            >
                              <Coins className="w-3 h-3" />
                              <span>50% TP</span>
                            </button>
                          )}

                          {/* Close Position Button */}
                          <button
                            onClick={() => onClosePosition(pos.id)}
                            className="px-2.5 py-1 bg-red-950/60 hover:bg-red-900 border border-red-800 text-red-300 rounded text-[10px] font-sans font-medium transition-all"
                          >
                            Close
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )
        ) : (
          history.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-slate-500 text-xs">
              <History className="w-7 h-7 text-slate-600 mb-1.5" />
              <span>No trade history recorded yet.</span>
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/80 text-slate-400 uppercase font-mono text-[10px] sticky top-0 border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Symbol</th>
                  <th className="py-2.5 px-3">Side</th>
                  <th className="py-2.5 px-3">Qty</th>
                  <th className="py-2.5 px-3">Entry / Exit</th>
                  <th className="py-2.5 px-3">Net P&L (₹)</th>
                  <th className="py-2.5 px-3">Return %</th>
                  <th className="py-2.5 px-3">Taxes & STT</th>
                  <th className="py-2.5 px-3">Exit Reason</th>
                  <th className="py-2.5 px-3">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {history.map((t) => {
                  const isProfit = t.pnl >= 0;
                  return (
                    <tr key={t.id} className="hover:bg-slate-800/30">
                      <td className="py-2 px-3 font-sans font-bold text-white">{t.symbol}</td>
                      <td className="py-2 px-3">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          t.side === 'BUY' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                        }`}>
                          {t.side}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-slate-300">{t.quantity}</td>
                      <td className="py-2 px-3 text-slate-300">
                        ₹{t.entry_price.toFixed(2)} → ₹{(t.exit_price || 0).toFixed(2)}
                      </td>
                      <td className="py-2 px-3">
                        <span className={`font-bold ${isProfit ? 'text-emerald-400' : 'text-red-400'}`}>
                          {isProfit ? '+' : ''}₹{t.pnl.toFixed(2)}
                        </span>
                      </td>
                      <td className="py-2 px-3">
                        <span className={isProfit ? 'text-emerald-400' : 'text-red-400'}>
                          {isProfit ? '+' : ''}{t.pnl_pct.toFixed(2)}%
                        </span>
                      </td>
                      <td className="py-2 px-3 text-slate-400 text-[11px]">
                        ₹{t.fees_incurred.toFixed(2)}
                      </td>
                      <td className="py-2 px-3 text-slate-300 font-sans text-[11px]">
                        <span className={`px-2 py-0.5 rounded ${
                          t.exit_reason?.includes('TP') ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' :
                          t.exit_reason?.includes('BREAKEVEN') ? 'bg-amber-950 text-amber-300 border border-amber-800' :
                          t.exit_reason?.includes('SL') ? 'bg-red-950 text-red-300 border border-red-800' : 'bg-slate-800 text-slate-300'
                        }`}>
                          {t.exit_reason || 'CLOSED'}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-slate-500 text-[10px]">{t.exit_time || t.entry_time}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )
        )}
      </div>

    </div>
  );
};
