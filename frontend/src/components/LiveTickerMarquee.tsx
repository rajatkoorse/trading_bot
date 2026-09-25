import React from 'react';
import { TrendingUp, TrendingDown, Activity } from 'lucide-react';
import { WatchlistItem } from '../types';

interface LiveTickerMarqueeProps {
  watchlist: WatchlistItem[];
  selectedSymbol: string;
  onSelectSymbol: (symbol: string) => void;
  ticks: Record<string, number>;
}

export const LiveTickerMarquee: React.FC<LiveTickerMarqueeProps> = ({
  watchlist,
  selectedSymbol,
  onSelectSymbol,
  ticks
}) => {
  return (
    <div className="bg-[#0f172a] border-b border-slate-800/80 px-3 py-1.5 overflow-x-auto flex items-center gap-3 no-scrollbar shadow-inner">
      <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider pl-1 shrink-0">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
        <span className="hidden sm:inline">LIVE NSE</span>
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
      </div>
    </div>
  );
};
