import asyncio
import logging
from typing import Dict, List, Optional
from datetime import datetime, timedelta
from .strategies.base_strategy import BaseStrategy, SignalType
from .exchanges.binance_client import BinanceClient
from .indicators.technical_indicators import calculate_sma, calculate_ema

logger = logging.getLogger(__name__)

class TradingService:
    """Main trading service that manages strategies and executes trades."""
    
    def __init__(self, binance_client: BinanceClient):
        self.binance_client = binance_client
        self.strategies: Dict[str, BaseStrategy] = {}
        self.active_bots: Dict[str, Dict] = {}
        self.is_running = False
        
    def add_strategy(self, strategy: BaseStrategy):
        """Add a trading strategy to the service."""
        self.strategies[strategy.name] = strategy
        logger.info(f"Added strategy: {strategy.name}")
    
    def remove_strategy(self, strategy_name: str):
        """Remove a trading strategy from the service."""
        if strategy_name in self.strategies:
            del self.strategies[strategy_name]
            logger.info(f"Removed strategy: {strategy_name}")
    
    async def start_bot(self, bot_id: str, strategy_name: str, symbol: str, 
                        balance: float, risk_per_trade: float = 0.02):
        """Start a trading bot with specified parameters."""
        if strategy_name not in self.strategies:
            raise ValueError(f"Strategy {strategy_name} not found")
        
        strategy = self.strategies[strategy_name]
        
        # Create bot instance
        bot = {
            "id": bot_id,
            "strategy": strategy,
            "symbol": symbol,
            "balance": balance,
            "risk_per_trade": risk_per_trade,
            "status": "running",
            "started_at": datetime.utcnow(),
            "last_signal": None,
            "total_trades": 0,
            "total_pnl": 0.0
        }
        
        self.active_bots[bot_id] = bot
        logger.info(f"Started bot {bot_id} with strategy {strategy_name}")
        
        return bot
    
    async def stop_bot(self, bot_id: str):
        """Stop a trading bot."""
        if bot_id in self.active_bots:
            bot = self.active_bots[bot_id]
            bot["status"] = "stopped"
            bot["strategy"].deactivate()
            logger.info(f"Stopped bot {bot_id}")
            return True
        return False
    
    async def get_market_data(self, symbol: str, interval: str = "1h", 
                             limit: int = 100) -> Dict:
        """Get market data for analysis."""
        try:
            klines = await self.binance_client.get_klines(symbol, interval, limit)
            
            # Parse kline data
            market_data = {
                "open": [],
                "high": [],
                "low": [],
                "close": [],
                "volume": [],
                "timestamp": []
            }
            
            for kline in klines:
                market_data["timestamp"].append(kline[0])
                market_data["open"].append(float(kline[1]))
                market_data["high"].append(float(kline[2]))
                market_data["low"].append(float(kline[3]))
                market_data["close"].append(float(kline[4]))
                market_data["volume"].append(float(kline[5]))
            
            return market_data
            
        except Exception as e:
            logger.error(f"Failed to get market data: {e}")
            return {}
    
    async def execute_signal(self, bot_id: str, signal: SignalType, 
                           current_price: float) -> Dict:
        """Execute trading signal for a bot."""
        if bot_id not in self.active_bots:
            return {"error": "Bot not found"}
        
        bot = self.active_bots[bot_id]
        strategy = bot["strategy"]
        
        # Update position based on signal
        result = strategy.update_position(
            signal, current_price, bot["balance"], bot["risk_per_trade"]
        )
        
        if result["action"] != "none":
            # Record the trade
            bot["total_trades"] += 1
            bot["last_signal"] = {
                "signal": signal.value,
                "price": current_price,
                "action": result["action"],
                "timestamp": datetime.utcnow()
            }
            
            logger.info(f"Bot {bot_id} executed {result['action']}: {result['reason']}")
        
        return result
    
    async def run_bot_cycle(self, bot_id: str):
        """Run one cycle of bot analysis and signal generation."""
        if bot_id not in self.active_bots:
            return
        
        bot = self.active_bots[bot_id]
        if bot["status"] != "running":
            return
        
        try:
            # Get market data
            market_data = await self.get_market_data(bot["symbol"])
            if not market_data:
                return
            
            # Generate signal
            strategy = bot["strategy"]
            signal = strategy.generate_signal(market_data)
            
            if signal != SignalType.HOLD:
                # Get current price
                ticker = await self.binance_client.get_ticker_price(bot["symbol"])
                current_price = float(ticker["price"])
                
                # Execute signal
                result = await self.execute_signal(bot_id, signal, current_price)
                
                # Update bot performance
                if "pnl" in result:
                    bot["total_pnl"] += result["pnl"]
        
        except Exception as e:
            logger.error(f"Error in bot cycle for {bot_id}: {e}")
    
    async def run_all_bots(self):
        """Run analysis cycle for all active bots."""
        tasks = []
        for bot_id in self.active_bots:
            if self.active_bots[bot_id]["status"] == "running":
                tasks.append(self.run_bot_cycle(bot_id))
        
        if tasks:
            await asyncio.gather(*tasks, return_exceptions=True)
    
    async def start_trading_service(self, interval_seconds: int = 60):
        """Start the trading service with periodic bot execution."""
        self.is_running = True
        logger.info("Trading service started")
        
        while self.is_running:
            try:
                await self.run_all_bots()
                await asyncio.sleep(interval_seconds)
            except Exception as e:
                logger.error(f"Error in trading service: {e}")
                await asyncio.sleep(interval_seconds)
    
    def stop_trading_service(self):
        """Stop the trading service."""
        self.is_running = False
        logger.info("Trading service stopped")
    
    def get_bot_status(self, bot_id: str) -> Optional[Dict]:
        """Get status of a specific bot."""
        if bot_id in self.active_bots:
            bot = self.active_bots[bot_id].copy()
            bot["strategy"] = bot["strategy"].get_performance_metrics()
            return bot
        return None
    
    def get_all_bots_status(self) -> List[Dict]:
        """Get status of all bots."""
        bot_statuses = []
        for bot_id in self.active_bots:
            try:
                bot_status = self.get_bot_status(bot_id)
                if bot_status:
                    bot_statuses.append(bot_status)
            except Exception as e:
                logger.warning(f"Error getting status for bot {bot_id}: {e}")
                continue
        return bot_statuses
    
    def get_strategy_performance(self, strategy_name: str) -> Optional[Dict]:
        """Get performance metrics for a strategy."""
        if strategy_name in self.strategies:
            return self.strategies[strategy_name].get_performance_metrics()
        return None
