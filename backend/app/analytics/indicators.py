import numpy as np
import pandas as pd
from typing import Dict, Any, Tuple, Optional

def calculate_ema(series: pd.Series, span: int) -> pd.Series:
    """Exponential Moving Average."""
    return series.ewm(span=span, adjust=False).mean()

def calculate_sma(series: pd.Series, period: int) -> pd.Series:
    """Simple Moving Average."""
    return series.rolling(window=period).mean()

def calculate_rsi(close: pd.Series, period: int = 14) -> pd.Series:
    """Relative Strength Index with Wilder's smoothing."""
    delta = close.diff()
    gain = delta.clip(lower=0)
    loss = -1 * delta.clip(upper=0)
    
    avg_gain = gain.ewm(alpha=1/period, min_periods=period, adjust=False).mean()
    avg_loss = loss.ewm(alpha=1/period, min_periods=period, adjust=False).mean()
    
    rs = avg_gain / avg_loss.replace(0, np.nan)
    rsi = 100 - (100 / (1 + rs))
    return rsi.fillna(50.0)

def calculate_macd(close: pd.Series, fast: int = 12, slow: int = 26, signal: int = 9) -> Tuple[pd.Series, pd.Series, pd.Series]:
    """MACD Line, Signal Line, Histogram."""
    ema_fast = calculate_ema(close, fast)
    ema_slow = calculate_ema(close, slow)
    macd_line = ema_fast - ema_slow
    signal_line = calculate_ema(macd_line, signal)
    histogram = macd_line - signal_line
    return macd_line, signal_line, histogram

def calculate_atr(high: pd.Series, low: pd.Series, close: pd.Series, period: int = 14) -> pd.Series:
    """Average True Range using Wilder's smoothing."""
    prev_close = close.shift(1)
    tr1 = high - low
    tr2 = (high - prev_close).abs()
    tr3 = (low - prev_close).abs()
    tr = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)
    atr = tr.ewm(alpha=1/period, min_periods=period, adjust=False).mean()
    return atr.bfill().fillna(0.0)

def calculate_supertrend(high: pd.Series, low: pd.Series, close: pd.Series, period: int = 10, multiplier: float = 3.0) -> Tuple[pd.Series, pd.Series]:
    """
    SuperTrend indicator:
    Returns (supertrend_value_series, direction_series where 1=Bullish, -1=Bearish)
    """
    atr = calculate_atr(high, low, close, period=period)
    hl2 = (high + low) / 2.0
    
    upper_band = hl2 + (multiplier * atr)
    lower_band = hl2 - (multiplier * atr)
    
    st_val = np.zeros(len(close))
    direction = np.zeros(len(close)) # 1: Bullish, -1: Bearish
    
    for i in range(1, len(close)):
        curr_close = close.iloc[i]
        prev_close = close.iloc[i-1]
        
        # Upper band adjustment
        if upper_band.iloc[i] < upper_band.iloc[i-1] or prev_close > upper_band.iloc[i-1]:
            upper_band.iloc[i] = upper_band.iloc[i]
        else:
            upper_band.iloc[i] = upper_band.iloc[i-1]
            
        # Lower band adjustment
        if lower_band.iloc[i] > lower_band.iloc[i-1] or prev_close < lower_band.iloc[i-1]:
            lower_band.iloc[i] = lower_band.iloc[i]
        else:
            lower_band.iloc[i] = lower_band.iloc[i-1]
            
        # Trend direction logic
        if i == 1:
            direction[i] = 1 if curr_close > upper_band.iloc[i] else -1
        else:
            prev_dir = direction[i-1]
            if prev_dir == 1:
                direction[i] = -1 if curr_close < lower_band.iloc[i] else 1
            else:
                direction[i] = 1 if curr_close > upper_band.iloc[i] else -1
                
        st_val[i] = lower_band.iloc[i] if direction[i] == 1 else upper_band.iloc[i]
        
    st_series = pd.Series(st_val, index=close.index)
    dir_series = pd.Series(direction, index=close.index)
    return st_series, dir_series

def calculate_vwap(df: pd.DataFrame) -> Tuple[pd.Series, pd.Series, pd.Series]:
    """
    Volume-Weighted Average Price with Upper (+1.5 std) & Lower (-1.5 std) deviation bands.
    Resets daily for intraday precision or calculates expanding across session.
    """
    typical_price = (df['high'] + df['low'] + df['close']) / 3.0
    vp = typical_price * df['volume']
    
    # Try grouping by date if datetime column/index exists
    if 'datetime' in df.columns:
        date_series = pd.to_datetime(df['datetime'], errors='coerce').dt.date
        cum_vp = vp.groupby(date_series).cumsum()
        cum_vol = df['volume'].groupby(date_series).cumsum()
    else:
        cum_vp = vp.cumsum()
        cum_vol = df['volume'].cumsum()
        
    vwap = cum_vp / cum_vol.replace(0, np.nan)
    vwap = vwap.ffill().bfill()
    
    # Standard deviation band
    sq_diff = (typical_price - vwap) ** 2
    if 'datetime' in df.columns:
        cum_sq_diff = (sq_diff * df['volume']).groupby(date_series).cumsum()
        std = np.sqrt(cum_sq_diff / cum_vol.replace(0, np.nan)).fillna(0.0)
    else:
        std = (typical_price - vwap).rolling(window=20).std().fillna(0.0)
        
    vwap_upper = vwap + (1.5 * std)
    vwap_lower = vwap - (1.5 * std)
    return vwap, vwap_upper, vwap_lower

def calculate_bollinger_bands(close: pd.Series, period: int = 20, std_dev: float = 2.0) -> Tuple[pd.Series, pd.Series, pd.Series]:
    """Bollinger Bands: Middle (SMA 20), Upper (+2 std), Lower (-2 std)."""
    middle = calculate_sma(close, period)
    std = close.rolling(window=period).std()
    upper = middle + (std_dev * std)
    lower = middle - (std_dev * std)
    return upper, middle, lower

def calculate_adx(high: pd.Series, low: pd.Series, close: pd.Series, period: int = 14) -> Tuple[pd.Series, pd.Series, pd.Series]:
    """Average Directional Index (ADX), +DI, -DI."""
    tr = calculate_atr(high, low, close, period=1) # 1-period true range
    up_move = high.diff()
    down_move = -low.diff()
    
    plus_dm = np.where((up_move > down_move) & (up_move > 0), up_move, 0.0)
    minus_dm = np.where((down_move > up_move) & (down_move > 0), down_move, 0.0)
    
    plus_dm_s = pd.Series(plus_dm, index=high.index).ewm(alpha=1/period, adjust=False).mean()
    minus_dm_s = pd.Series(minus_dm, index=high.index).ewm(alpha=1/period, adjust=False).mean()
    tr_s = tr.ewm(alpha=1/period, adjust=False).mean()
    
    plus_di = 100 * (plus_dm_s / tr_s.replace(0, np.nan)).fillna(0)
    minus_di = 100 * (minus_dm_s / tr_s.replace(0, np.nan)).fillna(0)
    
    dx = 100 * ((plus_di - minus_di).abs() / (plus_di + minus_di).replace(0, np.nan)).fillna(0)
    adx = dx.ewm(alpha=1/period, adjust=False).mean().fillna(0)
    return adx, plus_di, minus_di

def detect_market_structure(df: pd.DataFrame) -> Dict[str, Any]:
    """Detect Recent Swing Highs, Swing Lows, and Fair Value Gaps (FVG)."""
    if len(df) < 5:
        return {"swing_high": None, "swing_low": None, "fvg_bullish": False, "fvg_bearish": False}
    
    highs = df['high'].values
    lows = df['low'].values
    
    # 5-candle swing pivot
    swing_high = float(highs[-3]) if (highs[-3] > highs[-1] and highs[-3] > highs[-2] and highs[-3] > highs[-4] and highs[-3] > highs[-5]) else None
    swing_low = float(lows[-3]) if (lows[-3] < lows[-1] and lows[-3] < lows[-2] and lows[-3] < lows[-4] and lows[-3] < lows[-5]) else None
    
    # Fair value gap (FVG)
    # Bullish FVG: Low of candle 3 is greater than High of candle 1
    # Bearish FVG: High of candle 3 is lower than Low of candle 1
    fvg_bullish = bool(lows[-1] > highs[-3])
    fvg_bearish = bool(highs[-1] < lows[-3])
    
    return {
        "swing_high": swing_high,
        "swing_low": swing_low,
        "fvg_bullish": fvg_bullish,
        "fvg_bearish": fvg_bearish
    }

def enrich_dataframe_with_indicators(df: pd.DataFrame) -> pd.DataFrame:
    """Enrich raw OHLCV DataFrame with complete quantitative technical indicators."""
    df = df.copy()
    if df.empty or len(df) < 20:
        return df

    # EMAs
    df['ema_9'] = calculate_ema(df['close'], 9)
    df['ema_21'] = calculate_ema(df['close'], 21)
    df['ema_50'] = calculate_ema(df['close'], 50)
    df['ema_200'] = calculate_ema(df['close'], min(200, len(df)))
    
    # RSI
    df['rsi'] = calculate_rsi(df['close'], 14)
    
    # MACD
    df['macd'], df['macd_signal'], df['macd_hist'] = calculate_macd(df['close'], 12, 26, 9)
    
    # ATR
    df['atr'] = calculate_atr(df['high'], df['low'], df['close'], 14)
    
    # SuperTrend
    df['supertrend'], df['supertrend_dir'] = calculate_supertrend(df['high'], df['low'], df['close'], period=10, multiplier=3.0)
    
    # VWAP
    df['vwap'], df['vwap_upper'], df['vwap_lower'] = calculate_vwap(df)
    
    # Bollinger Bands
    df['bb_upper'], df['bb_mid'], df['bb_lower'] = calculate_bollinger_bands(df['close'], 20, 2.0)
    
    # ADX
    df['adx'], df['plus_di'], df['minus_di'] = calculate_adx(df['high'], df['low'], df['close'], 14)

    return df
