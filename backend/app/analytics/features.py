import numpy as np
import pandas as pd
from typing import List, Tuple
from app.analytics.indicators import enrich_dataframe_with_indicators

FEATURE_COLUMNS: List[str] = [
    'return_1', 'return_3', 'return_5', 'return_10',
    'dist_ema9', 'dist_ema21', 'dist_ema50', 'dist_ema200',
    'dist_vwap',
    'rsi_norm',
    'macd_norm',
    'macd_hist_diff',
    'atr_pct',
    'bb_position',
    'volume_ratio',
    'candle_body_ratio',
    'upper_wick_ratio',
    'lower_wick_ratio',
    'supertrend_state',
    'adx_strength'
]

def extract_features(df: pd.DataFrame) -> pd.DataFrame:
    """Transform enriched OHLCV data into clean, normalized ML feature vectors."""
    if 'ema_9' not in df.columns:
        df = enrich_dataframe_with_indicators(df)
        
    df = df.copy()
    close = df['close']
    
    # Returns
    df['return_1'] = close.pct_change(1)
    df['return_3'] = close.pct_change(3)
    df['return_5'] = close.pct_change(5)
    df['return_10'] = close.pct_change(10)
    
    # Distance to EMAs
    df['dist_ema9'] = (close - df['ema_9']) / df['ema_9']
    df['dist_ema21'] = (close - df['ema_21']) / df['ema_21']
    df['dist_ema50'] = (close - df['ema_50']) / df['ema_50']
    df['dist_ema200'] = (close - df['ema_200']) / df['ema_200']
    
    # Distance to VWAP
    df['dist_vwap'] = (close - df['vwap']) / df['vwap']
    
    # Normalized Oscillators
    df['rsi_norm'] = (df['rsi'] - 50.0) / 50.0
    df['macd_norm'] = df['macd_hist'] / close
    df['macd_hist_diff'] = df['macd_hist'].diff() / close
    
    # Volatility
    df['atr_pct'] = df['atr'] / close
    bb_range = (df['bb_upper'] - df['bb_lower']).replace(0, np.nan)
    df['bb_position'] = (close - df['bb_lower']) / bb_range
    df['bb_position'] = df['bb_position'].clip(lower=-0.5, upper=1.5)
    
    # Volume Anomaly
    vol_sma20 = df['volume'].rolling(window=20).mean().replace(0, np.nan)
    df['volume_ratio'] = (df['volume'] / vol_sma20).fillna(1.0).clip(upper=5.0)
    
    # Candlestick anatomy
    candle_range = (df['high'] - df['low']).replace(0, 1e-6)
    candle_body = (close - df['open']).abs()
    df['candle_body_ratio'] = candle_body / candle_range
    
    upper_bound = df[['open', 'close']].max(axis=1)
    lower_bound = df[['open', 'close']].min(axis=1)
    df['upper_wick_ratio'] = (df['high'] - upper_bound) / candle_range
    df['lower_wick_ratio'] = (lower_bound - df['low']) / candle_range
    
    # Trend & Strength
    df['supertrend_state'] = np.where(df['supertrend_dir'] == 1, 1.0, 0.0)
    df['adx_strength'] = (df['adx'] / 100.0).clip(lower=0.0, upper=1.0)
    
    # Fill NAs
    df = df.replace([np.inf, -np.inf], np.nan).bfill().ffill().fillna(0.0)
    return df

def prepare_training_dataset(df: pd.DataFrame, future_horizon: int = 5, profit_threshold: float = 0.006) -> Tuple[np.ndarray, np.ndarray]:
    """
    Generate Feature Matrix X and Binary Label y for Supervised Learning.
    Label 1 = Forward return >= +profit_threshold within future_horizon bars.
    Label 0 = Forward return <= -profit_threshold or non-profitable.
    """
    feats_df = extract_features(df)
    close = feats_df['close']
    
    # Future forward max return
    future_max = close.shift(-future_horizon).rolling(window=future_horizon).max()
    future_return = (future_max - close) / close
    
    # Binary classification target: 1 = Profitable Long Setup
    target = np.where(future_return >= profit_threshold, 1, 0)
    
    # Exclude last horizon rows where future label is unknown
    valid_idx = len(df) - future_horizon
    X = feats_df[FEATURE_COLUMNS].iloc[:valid_idx].values
    y = target[:valid_idx]
    
    return X, y
