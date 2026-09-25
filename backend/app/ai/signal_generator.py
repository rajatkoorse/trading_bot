import math
import uuid
import numpy as np
import pandas as pd
from datetime import datetime
from typing import Optional, List, Dict, Any

from app.models.schemas import AISignal, SignalType, SignalStatus, IndicatorSnapshot
from app.analytics.indicators import enrich_dataframe_with_indicators, detect_market_structure
from app.analytics.features import extract_features
from app.ai.model import ai_model
from app.config import settings

def clean_float(val: Any, default: float = 0.0, decimals: int = 2) -> float:
    """Safely sanitizes float values to prevent NaN / Infinity JSON serialization crashes."""
    try:
        if val is None:
            return default
        f = float(val)
        if math.isnan(f) or math.isinf(f):
            return default
        return round(f, decimals)
    except Exception:
        return default

def generate_ai_signal(
    symbol: str,
    df: pd.DataFrame,
    timeframe: str = "5m",
    min_confidence: float = 70.0,
    force_evaluation: bool = False
) -> Optional[AISignal]:
    """
    Evaluates market conditions across Quantitative indicators + ML model to generate a high-probability trade signal.
    """
    if df.empty or len(df) < 30:
        return None

    # Enrich data
    df_enriched = enrich_dataframe_with_indicators(df)
    feats_df = extract_features(df_enriched)
    
    latest = df_enriched.iloc[-1]
    prev = df_enriched.iloc[-2]
    
    close = clean_float(latest['close'], default=100.0)
    atr = clean_float(latest.get('atr'), default=(close * 0.008))
    if atr <= 0:
        atr = close * 0.008
    
    # ML probabilities
    prob_bullish, prob_bearish = ai_model.predict_probability(feats_df)
    prob_bullish = clean_float(prob_bullish, default=0.5, decimals=3)
    prob_bearish = clean_float(prob_bearish, default=0.5, decimals=3)
    
    # Indicator values
    ema_9 = clean_float(latest.get('ema_9'), default=close)
    ema_21 = clean_float(latest.get('ema_21'), default=close)
    ema_50 = clean_float(latest.get('ema_50'), default=close)
    ema_200 = clean_float(latest.get('ema_200'), default=close)
    rsi = clean_float(latest.get('rsi'), default=50.0, decimals=1)
    macd_hist = clean_float(latest.get('macd_hist'), default=0.0)
    prev_macd_hist = clean_float(prev.get('macd_hist'), default=0.0)
    supertrend = clean_float(latest.get('supertrend'), default=close)
    supertrend_dir = int(latest.get('supertrend_dir', 1)) # 1 = Bullish, -1 = Bearish
    vwap = clean_float(latest.get('vwap'), default=close)
    bb_upper = clean_float(latest.get('bb_upper'), default=close * 1.02)
    bb_lower = clean_float(latest.get('bb_lower'), default=close * 0.98)
    
    structure = detect_market_structure(df_enriched)
    
    # -------------------------------------------------------------
    # 1. EVALUATE BULLISH CONFLUENCE
    # -------------------------------------------------------------
    bull_score = 0.0
    bull_reasons: List[str] = []
    
    if supertrend_dir == 1:
        bull_score += 20.0
        bull_reasons.append("SuperTrend Bullish (10, 3)")
        
    if ema_9 > ema_21:
        bull_score += 15.0
        bull_reasons.append("EMA 9 > EMA 21 Momentum Crossover")
    if close > ema_50:
        bull_score += 10.0
        bull_reasons.append("Price holding above 50 EMA")
        
    if close >= vwap:
        bull_score += 15.0
        bull_reasons.append("Price trading above Intraday VWAP")
        
    if 50.0 <= rsi <= 72.0:
        bull_score += 15.0
        bull_reasons.append(f"RSI in Bullish Expansion Zone ({rsi:.1f})")
    elif rsi < 35.0:
        bull_score += 10.0
        bull_reasons.append(f"RSI Oversold Mean-Reversion Zone ({rsi:.1f})")
        
    if macd_hist > 0 and macd_hist > prev_macd_hist:
        bull_score += 10.0
        bull_reasons.append("MACD Histogram expanding positive")
        
    if prob_bullish >= 0.65:
        bull_score += 15.0
        bull_reasons.append(f"AI ML Prob: {prob_bullish*100:.1f}% Bullish")
        
    if structure.get("fvg_bullish"):
        bull_score += 5.0
        bull_reasons.append("Bullish Fair Value Gap (FVG) formed")

    # -------------------------------------------------------------
    # 2. EVALUATE BEARISH CONFLUENCE
    # -------------------------------------------------------------
    bear_score = 0.0
    bear_reasons: List[str] = []
    
    if supertrend_dir == -1:
        bear_score += 20.0
        bear_reasons.append("SuperTrend Bearish (10, 3)")
        
    if ema_9 < ema_21:
        bear_score += 15.0
        bear_reasons.append("EMA 9 < EMA 21 Bearish Crossover")
    if close < ema_50:
        bear_score += 10.0
        bear_reasons.append("Price below 50 EMA")
        
    if close <= vwap:
        bear_score += 15.0
        bear_reasons.append("Price trading below Intraday VWAP")
        
    if 28.0 <= rsi <= 50.0:
        bear_score += 15.0
        bear_reasons.append(f"RSI in Bearish Breakdown Zone ({rsi:.1f})")
    elif rsi > 70.0:
        bear_score += 10.0
        bear_reasons.append(f"RSI Overbought Pullback Zone ({rsi:.1f})")
        
    if macd_hist < 0 and macd_hist < prev_macd_hist:
        bear_score += 10.0
        bear_reasons.append("MACD Histogram expanding negative")
        
    if prob_bearish >= 0.65:
        bear_score += 15.0
        bear_reasons.append(f"AI ML Prob: {prob_bearish*100:.1f}% Bearish")
        
    if structure.get("fvg_bearish"):
        bear_score += 5.0
        bear_reasons.append("Bearish Fair Value Gap (FVG) formed")

    # -------------------------------------------------------------
    # 3. SIGNAL DECISION & RISK TARGETS
    # -------------------------------------------------------------
    signal_type = SignalType.HOLD
    confidence_score = 50.0
    reasons = []
    
    sl_multiplier = settings.risk.trailing_atr_multiplier
    sl_distance = max(atr * sl_multiplier, close * 0.0035)
    
    if bull_score >= min_confidence and bull_score > bear_score:
        signal_type = SignalType.BUY
        confidence_score = min(bull_score, 98.5)
        reasons = bull_reasons
        entry_price = clean_float(close)
        stop_loss = clean_float(entry_price - sl_distance)
        target_1 = clean_float(entry_price + (1.5 * sl_distance))
        target_2 = clean_float(entry_price + (2.5 * sl_distance))
        rrr = clean_float((target_1 - entry_price) / max((entry_price - stop_loss), 0.01))
        ml_prob = prob_bullish
        
    elif bear_score >= min_confidence and bear_score > bull_score:
        signal_type = SignalType.SELL
        confidence_score = min(bear_score, 98.5)
        reasons = bear_reasons
        entry_price = clean_float(close)
        stop_loss = clean_float(entry_price + sl_distance)
        target_1 = clean_float(entry_price - (1.5 * sl_distance))
        target_2 = clean_float(entry_price - (2.5 * sl_distance))
        rrr = clean_float((entry_price - target_1) / max((stop_loss - entry_price), 0.01))
        ml_prob = prob_bearish
        
    else:
        if not force_evaluation:
            return None
        entry_price = clean_float(close)
        stop_loss = clean_float(close - sl_distance)
        target_1 = clean_float(close + (1.5 * sl_distance))
        target_2 = clean_float(close + (2.5 * sl_distance))
        rrr = 1.5
        ml_prob = 0.50
        reasons = ["Consolidating / Neutral market structure"]

    timestamp = int(latest.get('timestamp', int(datetime.utcnow().timestamp())))
    dt_str = str(latest.get('datetime', datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')))

    indicators_snapshot = IndicatorSnapshot(
        ema_9=clean_float(ema_9),
        ema_21=clean_float(ema_21),
        ema_50=clean_float(ema_50),
        ema_200=clean_float(ema_200),
        rsi=clean_float(rsi, decimals=1),
        macd=clean_float(latest.get('macd')),
        macd_signal=clean_float(latest.get('macd_signal')),
        macd_hist=clean_float(macd_hist),
        supertrend=clean_float(supertrend),
        supertrend_direction=supertrend_dir,
        vwap=clean_float(vwap),
        atr=clean_float(atr),
        bb_upper=clean_float(bb_upper),
        bb_lower=clean_float(bb_lower)
    )

    signal = AISignal(
        id=f"sig_{uuid.uuid4().hex[:10]}",
        symbol=symbol,
        timeframe=timeframe,
        timestamp=timestamp,
        datetime=dt_str,
        signal_type=signal_type,
        entry_price=entry_price,
        stop_loss=stop_loss,
        target_1=target_1,
        target_2=target_2,
        rrr=rrr,
        confidence_score=clean_float(confidence_score, decimals=1),
        ml_probability=clean_float(ml_prob, decimals=3),
        indicators=indicators_snapshot,
        reasons=reasons,
        status=SignalStatus.ACTIVE,
        executed=False,
        created_at=datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')
    )
    
    return signal
