import pytest
import numpy as np
import pandas as pd
from app.analytics.indicators import (
    calculate_ema, calculate_rsi, calculate_macd,
    calculate_atr, calculate_supertrend, calculate_vwap,
    enrich_dataframe_with_indicators
)
from app.analytics.features import extract_features, prepare_training_dataset

def generate_mock_ohlcv(n: int = 100) -> pd.DataFrame:
    np.random.seed(42)
    prices = 1000.0 + np.cumsum(np.random.randn(n) * 5)
    highs = prices + np.abs(np.random.randn(n) * 3)
    lows = prices - np.abs(np.random.randn(n) * 3)
    volumes = np.random.randint(50000, 200000, size=n)
    
    dates = pd.date_range("2024-01-01 09:15:00", periods=n, freq="5min")
    df = pd.DataFrame({
        'timestamp': [int(d.timestamp()) for d in dates],
        'datetime': [d.strftime('%Y-%m-%d %H:%M:%S') for d in dates],
        'open': prices - 1,
        'high': highs,
        'low': lows,
        'close': prices,
        'volume': volumes
    })
    return df

def test_indicators_math():
    df = generate_mock_ohlcv(100)
    enriched = enrich_dataframe_with_indicators(df)
    
    # Check that all indicators are computed
    assert 'ema_9' in enriched.columns
    assert 'ema_21' in enriched.columns
    assert 'rsi' in enriched.columns
    assert 'supertrend' in enriched.columns
    assert 'supertrend_dir' in enriched.columns
    assert 'vwap' in enriched.columns
    assert 'atr' in enriched.columns
    
    # Check RSI bounds
    assert (enriched['rsi'] >= 0).all() and (enriched['rsi'] <= 100).all()
    # Check SuperTrend direction
    assert set(enriched['supertrend_dir'].unique()).issubset({1.0, -1.0, 0.0, 1, -1})
    # Check ATR is positive
    assert (enriched['atr'] >= 0).all()

def test_feature_extraction():
    df = generate_mock_ohlcv(100)
    feats = extract_features(df)
    
    assert 'return_1' in feats.columns
    assert 'dist_ema9' in feats.columns
    assert 'rsi_norm' in feats.columns
    assert 'volume_ratio' in feats.columns
    assert not feats.isna().any().any() # No NaNs

def test_dataset_preparation():
    df = generate_mock_ohlcv(120)
    X, y = prepare_training_dataset(df, future_horizon=5, profit_threshold=0.005)
    assert len(X) == len(y)
    assert len(X) > 50
    assert set(np.unique(y)).issubset({0, 1})
