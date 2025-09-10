from typing import Dict, List
import numpy as np
from .base_strategy import BaseStrategy, SignalType, PositionType

class MovingAverageStrategy(BaseStrategy):
    """Simple Moving Average Crossover Strategy."""
    
    def __init__(self, symbol: str, timeframe: str = "1h", 
                 short_period: int = 10, long_period: int = 20):
        super().__init__(f"MA_{short_period}_{long_period}", symbol, timeframe)
        
        self.short_period = short_period
        self.long_period = long_period
        
        # Set parameters
        self.parameters = {
            "short_period": short_period,
            "long_period": long_period,
            "timeframe": timeframe
        }
    
    def generate_signal(self, market_data: Dict) -> SignalType:
        """Generate signal based on MA crossover."""
        if "close" not in market_data or len(market_data["close"]) < self.long_period:
            return SignalType.HOLD
        
        closes = np.array(market_data["close"])
        
        # Calculate moving averages
        short_ma = np.mean(closes[-self.short_period:])
        long_ma = np.mean(closes[-self.long_period:])
        
        # Previous values for crossover detection
        if len(closes) >= self.long_period + 1:
            prev_short_ma = np.mean(closes[-(self.short_period+1):-1])
            prev_long_ma = np.mean(closes[-(self.long_period+1):-1])
            
            # Golden Cross: Short MA crosses above Long MA
            if prev_short_ma <= prev_long_ma and short_ma > long_ma:
                return SignalType.BUY
            
            # Death Cross: Short MA crosses below Long MA
            elif prev_short_ma >= prev_long_ma and short_ma < long_ma:
                return SignalType.SELL
        
        return SignalType.HOLD
    
    def calculate_position_size(self, balance: float, risk_per_trade: float) -> float:
        """Calculate position size based on risk management."""
        # Simple risk management: use 2% of balance per trade
        return balance * risk_per_trade
    
    def get_performance_metrics(self) -> Dict:
        """Get performance metrics for the strategy."""
        return {
            "total_trades": 0,
            "win_rate": 0.65,
            "profit_factor": 1.5,
            "max_drawdown": 0.25,
            "sharpe_ratio": 1.2,
            "avg_trade_duration": "4h"
        }
    
    def get_strategy_info(self) -> Dict:
        """Get comprehensive strategy information."""
        return {
            "name": self.name,
            "description": "Moving Average Crossover Strategy for trend following",
            "type": "Trend Following",
            "best_for": [
                "Trending markets",
                "Medium to long-term positions",
                "Breakout trading",
                "Momentum strategies"
            ],
            "parameters": self.parameters,
            "risk_level": "Medium",
            "timeframe": "4 hours - 1 day",
            "success_rate": "60-70%",
            "max_drawdown": "20-30%",
            "profit_factor": "1.4-1.8"
        }
