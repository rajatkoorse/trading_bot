import asyncio
import logging
from typing import Dict, List, Optional
import pandas as pd

from app.config import settings
from app.data.nse_fetcher import fetch_candles, normalize_indian_symbol, df_to_candle_list
from app.models.schemas import Candle

logger = logging.getLogger("feed_manager")

class FeedManager:
    """
    Coordinates real-time data streaming and candle cache for watchlist symbols.
    """
    def __init__(self):
        self.watchlist: List[str] = list(settings.default_watchlist)
        self.active_timeframe: str = settings.default_timeframe
        self.latest_prices: Dict[str, float] = {}
        self.candle_cache: Dict[str, pd.DataFrame] = {}
        
    def add_symbol(self, symbol: str):
        norm = normalize_indian_symbol(symbol)
        if norm not in self.watchlist:
            self.watchlist.append(norm)

    def remove_symbol(self, symbol: str):
        norm = normalize_indian_symbol(symbol)
        if norm in self.watchlist:
            self.watchlist.remove(norm)

    def get_candles(self, symbol: str, timeframe: Optional[str] = None, limit: int = 150) -> pd.DataFrame:
        tf = timeframe or self.active_timeframe
        df = fetch_candles(symbol, timeframe=tf, limit=limit)
        if not df.empty:
            self.latest_prices[normalize_indian_symbol(symbol)] = float(df['close'].iloc[-1])
            self.candle_cache[f"{normalize_indian_symbol(symbol)}_{tf}"] = df
        return df

    def get_latest_price(self, symbol: str) -> float:
        norm = normalize_indian_symbol(symbol)
        if norm in self.latest_prices:
            return self.latest_prices[norm]
        df = self.get_candles(norm, limit=20)
        if not df.empty:
            p = float(df['close'].iloc[-1])
            self.latest_prices[norm] = p
            return p
        return 0.0

feed_manager = FeedManager()
