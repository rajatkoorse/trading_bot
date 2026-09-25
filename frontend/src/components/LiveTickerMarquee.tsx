import React, { useState } from 'react';
import { TrendingUp, TrendingDown, Activity, Plus, Search } from 'lucide-react';
import { WatchlistItem } from '../types';
import { api } from '../services/api';

interface LiveTickerMarqueeProps {
  watchlist: WatchlistItem[];
  selectedSymbol: string;
  onSelectSymbol: (symbol: string) => void;
  ticks: Record<string, number>;
  onWatchlistUpdated?: () => void;
}

export const LiveTickerMarquee: React.FC<LiveTickerMarqueeProps> = ({
  watchlist,
  selectedSymbol,
  onSelectSymbol,
  ticks,
  onWatchlistUpdated
}) => {
  const [newSymbol, setNewSymbol] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const handleAddSymbol = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSymbol.trim()) return;
    try {
      setIsAdding(true);
      const res = await api.addToWatchlist(newSymbol.trim().toUpperCase());
      setNewSymbol('');
      if (res.symbol) {
        onSelectSymbol(res.symbol);
      }
      if (onWatchlistUpdated) {
        onWatchlistUpdated();
      }
    } catch (err) {
      console.error('Failed to add symbol:', err);
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="bg-[#0f172a] border-b border-slate-800/80 px-3 py-1.5 overflow-x-auto flex items-center gap-3 no-scrollbar shadow-inner">
      <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider pl-1 shrink-0">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
        <span className="hidden sm:inline">LIVE NSE ({watchlist.length})</span>
      </div>

      <div className="flex items-center gap-2">
        {watchlist.map((item) => {
          const livePrice = ticks[item.symbol] || item.price || 0;
          const isSelected = selectedSymbol === item.symbol;
          const isIndex = item.symbol.startsWith('^');

          return (
            <button
              key={item.symbol}
              onClick={() => onSelectSymbol(item.symbol)}
              className={`flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-mono transition-all shrink-0 border ${
                isSelected
                  ? 'bg-blue-600/20 border-blue-500 text-white shadow-sm'
                  : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <span className={`font-sans font-bold text-[11px] ${isSelected ? 'text-blue-400' : 'text-slate-300'}`}>
                {item.name.replace('Industries', '').replace('Consultancy Services', '').trim()}
              </span>
              <span className="font-bold text-white">
                ₹{livePrice.toLocaleString('en-IN', { minimumFractionDigits: isIndex ? 1 : 2, maximumFractionDigits: 2 })}
              </span>
            </button>
          );
        })}

        {/* Quick Add Any Indian Stock to Live Scanner */}
        <form onSubmit={handleAddSymbol} className="flex items-center shrink-0">
          <div className="flex items-center bg-slate-900 border border-slate-700/80 rounded-lg px-2 py-0.5 text-xs">
            <Search className="w-3 h-3 text-slate-500 mr-1.5" />
            <input
              type="text"
              placeholder="+ Add Indian Stock (e.g. ZOMATO)"
              value={newSymbol}
              onChange={(e) => setNewSymbol(e.target.value)}
              className="bg-transparent text-white font-mono text-xs focus:outline-none w-36 placeholder:text-slate-500"
            />
            <button
              type="submit"
              disabled={isAdding || !newSymbol.trim()}
              className="px-1.5 py-0.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-[10px] font-bold font-sans transition-all disabled:opacity-40"
            >
              Add
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

