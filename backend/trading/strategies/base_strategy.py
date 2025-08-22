from abc import ABC, abstractmethod
from typing import Dict, List, Optional, Tuple
from datetime import datetime
from enum import Enum
import logging

logger = logging.getLogger(__name__)

class SignalType(Enum):
    """Trading signal types."""
    BUY = "buy"
    SELL = "sell"
    HOLD = "hold"

class PositionType(Enum):
    """Position types."""
    LONG = "long"
    SHORT = "short"
    NONE = "none"

class BaseStrategy(ABC):
    """Base class for all trading strategies."""
    
    def __init__(self, name: str, symbol: str, timeframe: str = "1h"):
        self.name = name
        self.symbol = symbol
        self.timeframe = timeframe
        self.position = PositionType.NONE
        self.entry_price = 0.0
        self.entry_time = None
        self.position_size = 0.0
        self.is_active = True
        
        # Strategy parameters
        self.parameters: Dict = {}
        
        # Performance tracking
        self.total_trades = 0
        self.winning_trades = 0
        self.losing_trades = 0
        self.total_pnl = 0.0
        self.max_drawdown = 0.0
        
    @abstractmethod
    def generate_signal(self, market_data: Dict) -> SignalType:
        """Generate trading signal based on market data."""
        pass
    
    @abstractmethod
    def calculate_position_size(self, balance: float, risk_per_trade: float) -> float:
        """Calculate position size based on risk management rules."""
        pass
    
    def update_position(self, signal: SignalType, current_price: float, 
                       balance: float, risk_per_trade: float = 0.02) -> Dict:
        """Update position based on signal."""
        if not self.is_active:
            return {"action": "none", "reason": "Strategy inactive"}
        
        action = "none"
        reason = ""
        
        if signal == SignalType.BUY and self.position == PositionType.NONE:
            # Open long position
            self.position = PositionType.LONG
            self.entry_price = current_price
            self.entry_time = datetime.utcnow()
            self.position_size = self.calculate_position_size(balance, risk_per_trade)
            action = "open_long"
            reason = f"BUY signal at {current_price}"
            
        elif signal == SignalType.SELL and self.position == PositionType.LONG:
            # Close long position
            pnl = (current_price - self.entry_price) * self.position_size
            self._record_trade(pnl)
            
            self.position = PositionType.NONE
            self.entry_price = 0.0
            self.entry_time = None
            self.position_size = 0.0
            action = "close_long"
            reason = f"SELL signal at {current_price}, PnL: {pnl:.2f}"
            
        elif signal == SignalType.SELL and self.position == PositionType.NONE:
            # Open short position (if supported)
            self.position = PositionType.SHORT
            self.entry_price = current_price
            self.entry_time = datetime.utcnow()
            self.position_size = self.calculate_position_size(balance, risk_per_trade)
            action = "open_short"
            reason = f"SELL signal at {current_price}"
            
        elif signal == SignalType.BUY and self.position == PositionType.SHORT:
            # Close short position
            pnl = (self.entry_price - current_price) * self.position_size
            self._record_trade(pnl)
            
            self.position = PositionType.NONE
            self.entry_price = 0.0
            self.entry_time = None
            self.position_size = 0.0
            action = "close_short"
            reason = f"BUY signal at {current_price}, PnL: {pnl:.2f}"
        
        return {
            "action": action,
            "reason": reason,
            "position": self.position.value,
            "position_size": self.position_size,
            "entry_price": self.entry_price,
            "current_price": current_price
        }
    
    def _record_trade(self, pnl: float):
        """Record trade results for performance tracking."""
        self.total_trades += 1
        self.total_pnl += pnl
        
        if pnl > 0:
            self.winning_trades += 1
        else:
            self.losing_trades += 1
            
        # Update max drawdown
        if pnl < 0 and abs(pnl) > self.max_drawdown:
            self.max_drawdown = abs(pnl)
    
    def get_performance_metrics(self) -> Dict:
        """Get strategy performance metrics."""
        win_rate = (self.winning_trades / self.total_trades * 100) if self.total_trades > 0 else 0
        
        return {
            "name": self.name,
            "symbol": self.symbol,
            "timeframe": self.timeframe,
            "total_trades": self.total_trades,
            "winning_trades": self.winning_trades,
            "losing_trades": self.losing_trades,
            "win_rate": round(win_rate, 2),
            "total_pnl": round(self.total_pnl, 2),
            "max_drawdown": round(self.max_drawdown, 2),
            "current_position": self.position.value,
            "is_active": self.is_active
        }
    
    def reset(self):
        """Reset strategy state."""
        self.position = PositionType.NONE
        self.entry_price = 0.0
        self.entry_time = None
        self.position_size = 0.0
        self.total_trades = 0
        self.winning_trades = 0
        self.losing_trades = 0
        self.total_pnl = 0.0
        self.max_drawdown = 0.0
    
    def set_parameters(self, parameters: Dict):
        """Set strategy parameters."""
        self.parameters.update(parameters)
        logger.info(f"Updated parameters for {self.name}: {parameters}")
    
    def activate(self):
        """Activate the strategy."""
        self.is_active = True
        logger.info(f"Strategy {self.name} activated")
    
    def deactivate(self):
        """Deactivate the strategy."""
        self.is_active = False
        logger.info(f"Strategy {self.name} deactivated")
