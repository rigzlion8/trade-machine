import numpy as np
from typing import Dict, List, Tuple

def calculate_sma(prices: List[float], period: int) -> List[float]:
    """Calculate Simple Moving Average."""
    if len(prices) < period:
        return []
    
    sma = []
    for i in range(period - 1, len(prices)):
        sma.append(np.mean(prices[i - period + 1:i + 1]))
    
    return sma

def calculate_ema(prices: List[float], period: int) -> List[float]:
    """Calculate Exponential Moving Average."""
    if len(prices) < period:
        return []
    
    ema = [prices[0]]  # First EMA is SMA
    multiplier = 2 / (period + 1)
    
    for i in range(1, len(prices)):
        ema.append((prices[i] * multiplier) + (ema[i-1] * (1 - multiplier)))
    
    return ema

def calculate_rsi(prices: List[float], period: int = 14) -> List[float]:
    """Calculate Relative Strength Index."""
    if len(prices) < period + 1:
        return []
    
    deltas = np.diff(prices)
    gains = np.where(deltas > 0, deltas, 0)
    losses = np.where(deltas < 0, -deltas, 0)
    
    avg_gains = []
    avg_losses = []
    
    # First average
    avg_gains.append(np.mean(gains[:period]))
    avg_losses.append(np.mean(losses[:period]))
    
    # Subsequent averages using smoothing
    for i in range(period, len(gains)):
        avg_gains.append((avg_gains[-1] * (period - 1) + gains[i]) / period)
        avg_losses.append((avg_losses[-1] * (period - 1) + losses[i]) / period)
    
    rsi = []
    for i in range(len(avg_gains)):
        if avg_losses[i] == 0:
            rsi.append(100)
        else:
            rs = avg_gains[i] / avg_losses[i]
            rsi.append(100 - (100 / (1 + rs)))
    
    return rsi

def calculate_macd(prices: List[float], fast_period: int = 12, 
                   slow_period: int = 26, signal_period: int = 9) -> Dict[str, List[float]]:
    """Calculate MACD (Moving Average Convergence Divergence)."""
    if len(prices) < slow_period:
        return {"macd": [], "signal": [], "histogram": []}
    
    fast_ema = calculate_ema(prices, fast_period)
    slow_ema = calculate_ema(prices, slow_period)
    
    # MACD line
    macd_line = []
    for i in range(len(slow_ema)):
        if i < len(fast_ema):
            macd_line.append(fast_ema[i] - slow_ema[i])
    
    # Signal line
    signal_line = calculate_ema(macd_line, signal_period)
    
    # Histogram
    histogram = []
    for i in range(len(signal_line)):
        if i < len(macd_line):
            histogram.append(macd_line[i] - signal_line[i])
    
    return {
        "macd": macd_line,
        "signal": signal_line,
        "histogram": histogram
    }

def calculate_bollinger_bands(prices: List[float], period: int = 20, 
                             std_dev: float = 2) -> Dict[str, List[float]]:
    """Calculate Bollinger Bands."""
    if len(prices) < period:
        return {"upper": [], "middle": [], "lower": []}
    
    sma = calculate_sma(prices, period)
    upper_band = []
    lower_band = []
    
    for i in range(len(sma)):
        start_idx = i
        end_idx = start_idx + period
        if end_idx <= len(prices):
            std = np.std(prices[start_idx:end_idx])
            upper_band.append(sma[i] + (std_dev * std))
            lower_band.append(sma[i] - (std_dev * std))
    
    return {
        "upper": upper_band,
        "middle": sma,
        "lower": lower_band
    }

def calculate_atr(highs: List[float], lows: List[float], 
                  closes: List[float], period: int = 14) -> List[float]:
    """Calculate Average True Range."""
    if len(highs) < period + 1:
        return []
    
    true_ranges = []
    for i in range(1, len(highs)):
        high_low = highs[i] - lows[i]
        high_close = abs(highs[i] - closes[i-1])
        low_close = abs(lows[i] - closes[i-1])
        true_ranges.append(max(high_low, high_close, low_close))
    
    atr = [np.mean(true_ranges[:period])]
    
    for i in range(period, len(true_ranges)):
        atr.append((atr[-1] * (period - 1) + true_ranges[i]) / period)
    
    return atr
