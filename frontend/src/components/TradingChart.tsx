import React, { useEffect, useRef, useState } from 'react';
import { createChart, IChartApi, ISeriesApi, CandlestickData, LineData } from 'lightweight-charts';
import { Play, Sparkles, RefreshCw, Layers, Activity } from 'lucide-react';
import { MarketCandlesResponse, AISignal, SignalType } from '../types';
import { api } from '../services/api';
import { soundFx } from '../services/audio';

interface TradingChartProps {
  symbol: string;
  onSelectSymbol: (sym: string) => void;
  watchlist: { symbol: string; name: string; price: number }[];
  latestSignal: AISignal | null;
}

const TIMEFRAMES = ['1m', '5m', '15m', '1h', '1d'];

export const TradingChart: React.FC<TradingChartProps> = ({
  symbol,
  onSelectSymbol,
  watchlist,
  latestSignal
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const ema9SeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const ema21SeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const ema50SeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const vwapSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);

  const [timeframe, setTimeframe] = useState<string>('5m');
  const [data, setData] = useState<MarketCandlesResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [showOverlays, setShowOverlays] = useState({
    ema9: true,
    ema21: true,
    ema50: false,
    vwap: true,
    supertrend: true
  });

  // Load candle data from API
  const loadChartData = async () => {
    try {
      setIsLoading(true);
      const res = await api.getCandles(symbol, timeframe, 180);
      setData(res);
    } catch (e) {
      console.error('Failed to load chart data:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadChartData();
    const interval = setInterval(loadChartData, 8000); // Polling refresh
    return () => clearInterval(interval);
  }, [symbol, timeframe]);

  // Initialize and update Lightweight Charts
  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Create chart if not initialized
    if (!chartRef.current) {
      const chart = createChart(chartContainerRef.current, {
        layout: {
          background: { color: '#0b0f19' },
          textColor: '#94a3b8',
        },
        grid: {
          vertLines: { color: '#1e293b' },
          horzLines: { color: '#1e293b' },
        },
        crosshair: {
          mode: 1,
        },
        rightPriceScale: {
          borderColor: '#334155',
          scaleMargins: {
            top: 0.1,
            bottom: 0.2,
          },
        },
        timeScale: {
          borderColor: '#334155',
          timeVisible: true,
          secondsVisible: false,
        },
      });

      const candleSeries = chart.addCandlestickSeries({
        upColor: '#10b981',
        downColor: '#ef4444',
        borderUpColor: '#10b981',
        borderDownColor: '#ef4444',
        wickUpColor: '#10b981',
        wickDownColor: '#ef4444',
      });

      const ema9Series = chart.addLineSeries({
        color: '#38bdf8',
        lineWidth: 1,
        title: 'EMA 9',
      });

      const ema21Series = chart.addLineSeries({
        color: '#fb923c',
        lineWidth: 1,
        title: 'EMA 21',
      });

      const ema50Series = chart.addLineSeries({
        color: '#c084fc',
        lineWidth: 1,
        title: 'EMA 50',
      });

      const vwapSeries = chart.addLineSeries({
        color: '#facc15',
        lineWidth: 2,
        title: 'VWAP',
      });

      chartRef.current = chart;
      candleSeriesRef.current = candleSeries;
      ema9SeriesRef.current = ema9Series;
      ema21SeriesRef.current = ema21Series;
      ema50SeriesRef.current = ema50Series;
      vwapSeriesRef.current = vwapSeries;

      const handleResize = () => {
        if (chartContainerRef.current && chartRef.current) {
          chartRef.current.applyOptions({
            width: chartContainerRef.current.clientWidth,
            height: chartContainerRef.current.clientHeight,
          });
        }
      };

      window.addEventListener('resize', handleResize);
      return () => {
        window.removeEventListener('resize', handleResize);
        chart.remove();
        chartRef.current = null;
      };
    }
  }, []);

  // Update chart series data when API response arrives
  useEffect(() => {
    if (!data || !candleSeriesRef.current || !data.candles || data.candles.length === 0) return;

    // Filter duplicate timestamps and sort ascending
    const candleData: CandlestickData[] = data.candles.map((c) => ({
      time: c.timestamp as any,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));

    candleSeriesRef.current.setData(candleData);

    // Indicators series
    if (showOverlays.ema9 && ema9SeriesRef.current && data.indicators.ema_9) {
      const lineData: LineData[] = data.candles.map((c, i) => ({
        time: c.timestamp as any,
        value: data.indicators.ema_9[i] || c.close,
      }));
      ema9SeriesRef.current.setData(lineData);
    } else if (ema9SeriesRef.current) {
      ema9SeriesRef.current.setData([]);
    }

    if (showOverlays.ema21 && ema21SeriesRef.current && data.indicators.ema_21) {
      const lineData: LineData[] = data.candles.map((c, i) => ({
        time: c.timestamp as any,
        value: data.indicators.ema_21[i] || c.close,
      }));
      ema21SeriesRef.current.setData(lineData);
    } else if (ema21SeriesRef.current) {
      ema21SeriesRef.current.setData([]);
    }

    if (showOverlays.ema50 && ema50SeriesRef.current && data.indicators.ema_50) {
      const lineData: LineData[] = data.candles.map((c, i) => ({
        time: c.timestamp as any,
        value: data.indicators.ema_50[i] || c.close,
      }));
      ema50SeriesRef.current.setData(lineData);
    } else if (ema50SeriesRef.current) {
      ema50SeriesRef.current.setData([]);
    }

    if (showOverlays.vwap && vwapSeriesRef.current && data.indicators.vwap) {
      const lineData: LineData[] = data.candles.map((c, i) => ({
        time: c.timestamp as any,
        value: data.indicators.vwap[i] || c.close,
      }));
      vwapSeriesRef.current.setData(lineData);
    } else if (vwapSeriesRef.current) {
      vwapSeriesRef.current.setData([]);
    }

    // Set Signal Markers on Chart if symbol matches
    if (latestSignal && latestSignal.symbol === symbol && candleSeriesRef.current) {
      const markers = [
        {
          time: latestSignal.timestamp as any,
          position: latestSignal.signal_type === 'BUY' ? 'belowBar' : 'aboveBar',
          color: latestSignal.signal_type === 'BUY' ? '#10b981' : '#ef4444',
          shape: latestSignal.signal_type === 'BUY' ? 'arrowUp' : 'arrowDown',
          text: `AI ${latestSignal.signal_type} (${latestSignal.confidence_score}%)`,
        } as any,
      ];
      candleSeriesRef.current.setMarkers(markers);
    }
  }, [data, showOverlays, latestSignal]);

  const handleTriggerManualScan = async () => {
    try {
      setIsScanning(true);
      const sig = await api.triggerScan(symbol);
      if (sig.signal_type === 'BUY') {
        soundFx.playBuySignal();
      } else if (sig.signal_type === 'SELL') {
        soundFx.playSellSignal();
      }
      loadChartData();
    } catch (e) {
      console.error('Scan failed:', e);
    } finally {
      setIsScanning(false);
    }
  };

  const currPrice = data?.latest_price || 0;
  const firstPrice = data?.candles?.[0]?.open || currPrice;
  const priceChange = currPrice - firstPrice;
  const priceChangePct = firstPrice > 0 ? (priceChange / firstPrice) * 100 : 0;

  return (
    <div className="bg-[#111827] border border-slate-800 rounded-xl overflow-hidden flex flex-col h-[520px] shadow-lg">
      
      {/* Chart Header Bar */}
      <div className="bg-[#0f172a] border-b border-slate-800 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
        
        {/* Symbol Selector & Price Stats */}
        <div className="flex items-center gap-3">
          <select
            value={symbol}
            onChange={(e) => onSelectSymbol(e.target.value)}
            className="bg-slate-900 border border-slate-700 text-white font-bold text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-500"
          >
            {watchlist.map((item) => (
              <option key={item.symbol} value={item.symbol}>
                {item.name} ({item.symbol})
              </option>
            ))}
          </select>

          <div className="flex items-baseline gap-2 font-mono">
            <span className="text-lg font-bold text-white">
              ₹{currPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
              priceChange >= 0 ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800' : 'bg-red-950/60 text-red-400 border border-red-800'
            }`}>
              {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)} ({priceChangePct.toFixed(2)}%)
            </span>
          </div>
        </div>

        {/* Timeframe Bar & Overlays & Scan Button */}
        <div className="flex items-center gap-2">
          {/* Timeframes */}
          <div className="flex bg-slate-900 rounded-lg p-0.5 border border-slate-800 text-xs">
            {TIMEFRAMES.map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                  timeframe === tf
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>

          {/* Indicator Toggles */}
          <div className="hidden lg:flex items-center gap-1.5 bg-slate-900 px-2 py-1 rounded-lg border border-slate-800 text-xs">
            <label className="flex items-center gap-1 cursor-pointer text-sky-400 font-medium">
              <input
                type="checkbox"
                checked={showOverlays.ema9}
                onChange={(e) => setShowOverlays({ ...showOverlays, ema9: e.target.checked })}
                className="rounded bg-slate-800 border-slate-700 w-3 h-3 text-sky-500"
              />
              EMA9
            </label>
            <label className="flex items-center gap-1 cursor-pointer text-orange-400 font-medium ml-1">
              <input
                type="checkbox"
                checked={showOverlays.ema21}
                onChange={(e) => setShowOverlays({ ...showOverlays, ema21: e.target.checked })}
                className="rounded bg-slate-800 border-slate-700 w-3 h-3 text-orange-500"
              />
              EMA21
            </label>
            <label className="flex items-center gap-1 cursor-pointer text-yellow-400 font-medium ml-1">
              <input
                type="checkbox"
                checked={showOverlays.vwap}
                onChange={(e) => setShowOverlays({ ...showOverlays, vwap: e.target.checked })}
                className="rounded bg-slate-800 border-slate-700 w-3 h-3 text-yellow-500"
              />
              VWAP
            </label>
          </div>

          {/* On-Demand Scan Now */}
          <button
            onClick={handleTriggerManualScan}
            disabled={isScanning}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium text-xs shadow-md transition-all disabled:opacity-50"
          >
            <Sparkles className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
            <span>{isScanning ? 'Analyzing...' : 'AI Scan Now'}</span>
          </button>
        </div>

      </div>

      {/* Chart Canvas */}
      <div className="flex-1 relative w-full h-full bg-[#0b0f19]">
        {isLoading && (
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-[1px] flex items-center justify-center z-10">
            <div className="flex items-center gap-2 text-blue-400 font-medium text-sm">
              <RefreshCw className="w-5 h-5 animate-spin" />
              <span>Fetching Indian Market Feeds...</span>
            </div>
          </div>
        )}
        <div ref={chartContainerRef} className="w-full h-full" />
      </div>

    </div>
  );
};
