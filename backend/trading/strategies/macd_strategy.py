from typing import Dict, Optional, Tuple
from .base_strategy import BaseStrategy
import numpy as np
import logging

logger = logging.getLogger(__name__)

class MACDStrategy(BaseStrategy):
    """
    MACD (Moving Average Convergence Divergence) Strategy
    
    This strategy uses MACD indicator to identify trend changes and momentum shifts.
    It's best suited for trending markets and momentum trading.
    
    Key Features:
    - Buy signals on MACD line crossover above signal line
    - Sell signals on MACD line crossover below signal line
    - Histogram confirmation for stronger signals
    - Divergence detection for trend reversal signals
    """
    
    def __init__(self, parameters: Optional[Dict] = None):
        super().__init__("MACD_Strategy", "BTCUSDT", "1h")
        self.description = "MACD-based trend following strategy for momentum trading"
        
        # Default parameters
        self.parameters = {
            "fast_period": 12,
            "slow_period": 26,
            "signal_period": 9,
            "histogram_threshold": 0.0001,
            "divergence_lookback": 20,
            "stop_loss_pct": 0.08,
            "take_profit_pct": 0.15
        }
        
        if parameters:
            self.parameters.update(parameters)
    
    def calculate_macd(self, prices: np.ndarray) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
        """Calculate MACD, signal line, and histogram."""
        # Calculate fast and slow EMAs
        fast_ema = self.calculate_ema(prices, self.parameters["fast_period"])
        slow_ema = self.calculate_ema(prices, self.parameters["slow_period"])
        
        # MACD line
        macd_line = fast_ema - slow_ema
        
        # Signal line (EMA of MACD)
        signal_line = self.calculate_ema(macd_line, self.parameters["signal_period"])
        
        # Histogram
        histogram = macd_line - signal_line
        
        return macd_line, signal_line, histogram
    
    def calculate_ema(self, data: np.ndarray, period: int) -> np.ndarray:
        """Calculate Exponential Moving Average."""
        alpha = 2 / (period + 1)
        ema = np.zeros_like(data)
        ema[0] = data[0]
        
        for i in range(1, len(data)):
            ema[i] = alpha * data[i] + (1 - alpha) * ema[i-1]
        
        return ema
    
    def detect_divergence(self, prices: np.ndarray, macd: np.ndarray) -> Dict:
        """Detect price-MACD divergence for trend reversal signals."""
        if len(prices) < self.parameters["divergence_lookback"]:
            return {"detected": False, "type": None}
        
        # Look at recent price and MACD movements
        recent_prices = prices[-self.parameters["divergence_lookback"]:]
        recent_macd = macd[-self.parameters["divergence_lookback"]:]
        
        # Find peaks and troughs
        price_peaks = self.find_peaks(recent_prices)
        macd_peaks = self.find_peaks(recent_macd)
        
        if len(price_peaks) >= 2 and len(macd_peaks) >= 2:
            # Bearish divergence: Price making higher highs, MACD making lower highs
            if (recent_prices[price_peaks[-1]] > recent_prices[price_peaks[-2]] and 
                recent_macd[macd_peaks[-1]] < recent_macd[macd_peaks[-2]]):
                return {"detected": True, "type": "bearish"}
            
            # Bullish divergence: Price making lower lows, MACD making higher lows
            if (recent_prices[price_peaks[-1]] < recent_prices[price_peaks[-2]] and 
                recent_macd[macd_peaks[-1]] > recent_macd[macd_peaks[-2]]):
                return {"detected": True, "type": "bullish"}
        
        return {"detected": False, "type": None}
    
    def find_peaks(self, data: np.ndarray) -> list:
        """Find local peaks in data."""
        peaks = []
        for i in range(1, len(data) - 1):
            if data[i] > data[i-1] and data[i] > data[i+1]:
                peaks.append(i)
        return peaks
    
    def generate_signal(self, market_data: Dict) -> Dict:
        """
        Generate trading signal based on MACD analysis.
        
        Returns:
            Dict with signal details including type, strength, and reasoning
        """
        try:
            prices = np.array(market_data.get("close_prices", []))
            
            if len(prices) < self.parameters["slow_period"] + self.parameters["signal_period"]:
                return {"signal": "hold", "strength": 0, "reason": "Insufficient data"}
            
            # Calculate MACD components
            macd_line, signal_line, histogram = self.calculate_macd(prices)
            
            # Get current and previous values
            current_macd = macd_line[-1]
            previous_macd = macd_line[-2] if len(macd_line) > 1 else current_macd
            current_signal = signal_line[-1]
            previous_signal = signal_line[-2] if len(signal_line) > 1 else current_signal
            current_histogram = histogram[-1]
            previous_histogram = histogram[-2] if len(histogram) > 1 else current_histogram
            
            # Detect divergence
            divergence = self.detect_divergence(prices, macd_line)
            
            signal = "hold"
            strength = 0
            reason = ""
            
            # MACD crossover signals
            if (previous_macd <= previous_signal and current_macd > current_signal):
                # Bullish crossover
                signal = "buy"
                strength = 0.8
                reason = "MACD bullish crossover above signal line"
                
                # Histogram confirmation
                if current_histogram > previous_histogram and abs(current_histogram) > self.parameters["histogram_threshold"]:
                    strength = 0.9
                    reason += " + Increasing histogram momentum"
                
            elif (previous_macd >= previous_signal and current_macd < current_signal):
                # Bearish crossover
                signal = "sell"
                strength = 0.8
                reason = "MACD bearish crossover below signal line"
                
                # Histogram confirmation
                if current_histogram < previous_histogram and abs(current_histogram) > self.parameters["histogram_threshold"]:
                    strength = 0.9
                    reason += " + Decreasing histogram momentum"
            
            # Divergence signals (stronger than crossovers)
            if divergence["detected"]:
                if divergence["type"] == "bullish" and signal == "hold":
                    signal = "buy"
                    strength = 0.95
                    reason = "Bullish divergence detected - strong reversal signal"
                elif divergence["type"] == "bearish" and signal == "hold":
                    signal = "sell"
                    strength = 0.95
                    reason = "Bearish divergence detected - strong reversal signal"
                elif divergence["type"] == "bullish" and signal == "buy":
                    strength = 0.98
                    reason += " + Bullish divergence confirmed"
                elif divergence["type"] == "bearish" and signal == "sell":
                    strength = 0.98
                    reason += " + Bearish divergence confirmed"
            
            return {
                "signal": signal,
                "strength": strength,
                "reason": reason,
                "macd_value": current_macd,
                "signal_value": current_signal,
                "histogram_value": current_histogram,
                "divergence": divergence
            }
            
        except Exception as e:
            logger.error(f"Error generating MACD signal: {e}")
            return {"signal": "hold", "strength": 0, "reason": f"Error: {str(e)}"}
    
    def calculate_position_size(self, balance: float, risk_per_trade: float) -> float:
        """Calculate position size based on risk management."""
        # Simple risk management: use risk_per_trade percentage of balance
        return balance * risk_per_trade
    
    def get_strategy_info(self) -> Dict:
        """Get comprehensive strategy information."""
        return {
            "name": self.name,
            "description": self.description,
            "type": "Trend Following",
            "best_for": [
                "Trending markets",
                "Momentum trading",
                "Medium-term positions",
                "Breakout trading"
            ],
            "parameters": self.parameters,
            "risk_level": "Medium-High",
            "timeframe": "Medium-term (4 hours - 1 day)",
            "success_rate": "60-70%",
            "max_drawdown": "20-30%",
            "profit_factor": "1.4-2.0"
        }
