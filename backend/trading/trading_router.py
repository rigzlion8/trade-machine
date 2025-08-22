from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from typing import Dict, List, Optional
from pydantic import BaseModel
from datetime import datetime
import json
import logging

from auth.jwt_handler import get_current_active_user
from models.user import User
from .trading_service import TradingService
from .strategies.moving_average_strategy import MovingAverageStrategy
from .exchanges.binance_client import BinanceClient
from config.settings import get_settings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/trading", tags=["trading"])

# Pydantic models
class BotCreate(BaseModel):
    name: str
    strategy: str
    symbol: str
    balance: float
    risk_per_trade: float = 0.02
    parameters: Optional[Dict] = {}

class BotResponse(BaseModel):
    id: str
    name: str
    strategy: str
    symbol: str
    balance: float
    risk_per_trade: float
    status: str
    started_at: datetime
    total_trades: int
    total_pnl: float
    last_signal: Optional[Dict] = None

class StrategyResponse(BaseModel):
    name: str
    symbol: str
    timeframe: str
    parameters: Dict
    performance: Dict

# Global trading service instance
trading_service: Optional[TradingService] = None

# Add basic logging to see if the router is loaded
logger.info("=== TRADING ROUTER LOADED ===")

@router.get("/test")
async def test_endpoint():
    """Test endpoint to verify router is working."""
    logger.info("=== TEST ENDPOINT CALLED ===")
    return {"message": "Trading router is working"}

def get_trading_service() -> TradingService:
    """Get or create trading service instance."""
    logger.info("=== GET_TRADING_SERVICE CALLED ===")
    global trading_service
    logger.info(f"get_trading_service called, current instance: {trading_service is not None}")
    
    if trading_service is None:
        try:
            logger.info("Initializing trading service...")
            settings = get_settings()
            logger.info(f"Settings loaded: BINANCE_API_KEY length={len(settings.BINANCE_API_KEY) if settings.BINANCE_API_KEY else 0}")
            
            # Initialize Binance client
            binance_client = BinanceClient(
                api_key=settings.BINANCE_API_KEY,
                api_secret=settings.BINANCE_SECRET_KEY,
                testnet=True  # Use testnet for safety
            )
            logger.info("Binance client created successfully")
            
            # Initialize trading service
            trading_service = TradingService(binance_client)
            logger.info("TradingService instance created")
            
            # Add default strategies
            ma_strategy = MovingAverageStrategy("BTCUSDT", "1h", 10, 20)
            trading_service.add_strategy(ma_strategy)
            logger.info("Default strategy added")
            
            logger.info("Trading service initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize trading service: {e}")
            logger.error(f"Exception type: {type(e)}")
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")
            # Return a minimal trading service to prevent crashes
            from .trading_service import TradingService
            from .exchanges.binance_client import BinanceClient
            dummy_client = BinanceClient("", "", testnet=True)
            trading_service = TradingService(dummy_client)
            logger.warning("Using fallback trading service")
    else:
        logger.info("Using existing trading service instance")
    
    logger.info(f"Returning trading service: {type(trading_service)}")
    return trading_service

@router.post("/bots", response_model=BotResponse)
async def create_bot(
    bot_data: BotCreate,
    current_user: User = Depends(get_current_active_user),
    trading_service: TradingService = Depends(get_trading_service)
):
    """Create a new trading bot."""
    try:
        # Generate unique bot ID
        bot_id = f"bot_{current_user.id}_{int(datetime.utcnow().timestamp())}"
        
        # Start the bot
        bot = await trading_service.start_bot(
            bot_id=bot_id,
            strategy_name=bot_data.strategy,
            symbol=bot_data.symbol,
            balance=bot_data.balance,
            risk_per_trade=bot_data.risk_per_trade
        )
        
        return BotResponse(
            id=bot["id"],
            name=bot_data.name,
            strategy=bot["strategy"].name,
            symbol=bot["symbol"],
            balance=bot["balance"],
            risk_per_trade=bot["risk_per_trade"],
            status=bot["status"],
            started_at=bot["started_at"],
            total_trades=bot["total_trades"],
            total_pnl=bot["total_pnl"],
            last_signal=bot["last_signal"]
        )
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating bot: {e}")
        raise HTTPException(status_code=500, detail="Failed to create bot")

@router.get("/bots", response_model=List[BotResponse])
async def get_user_bots(
    current_user: User = Depends(get_current_active_user),
    trading_service: TradingService = Depends(get_trading_service)
):
    """Get all bots for the current user."""
    logger.info("=== BOTS ENDPOINT CALLED ===")
    try:
        logger.info(f"Getting bots for user {current_user.id}")
        
        # Filter bots by user ID
        user_bots = []
        all_bots = trading_service.get_all_bots_status()
        logger.info(f"Found {len(all_bots)} total bots")
        logger.info(f"All bots data: {all_bots}")
        
        for bot in all_bots:
            if bot and bot["id"].startswith(f"bot_{current_user.id}_"):
                try:
                    logger.info(f"Processing bot: {bot}")
                    strategy_name = bot["strategy"]["name"] if isinstance(bot["strategy"], dict) else bot["strategy"].name
                    logger.info(f"Strategy name: {strategy_name}")
                    
                    user_bots.append(BotResponse(
                        id=bot["id"],
                        name=bot["id"],  # Use ID as name for now
                        strategy=strategy_name,
                        symbol=bot["symbol"],
                        balance=bot["balance"],
                        risk_per_trade=bot["risk_per_trade"],
                        status=bot["status"],
                        started_at=bot["started_at"],
                        total_trades=bot["total_trades"],
                        total_pnl=bot["total_pnl"],
                        last_signal=bot["last_signal"]
                    ))
                    logger.info(f"Successfully added bot: {bot['id']}")
                except Exception as bot_error:
                    logger.error(f"Error processing bot {bot.get('id', 'unknown')}: {bot_error}")
                    logger.error(f"Bot data: {bot}")
                    continue
        
        logger.info(f"Returning {len(user_bots)} bots for user {current_user.id}")
        return user_bots
        
    except Exception as e:
        logger.error(f"Error getting user bots: {e}")
        logger.error(f"Exception type: {type(e)}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail="Failed to get bots")

@router.get("/bots/{bot_id}", response_model=BotResponse)
async def get_bot(
    bot_id: str,
    current_user: User = Depends(get_current_active_user),
    trading_service: TradingService = Depends(get_trading_service)
):
    """Get specific bot details."""
    try:
        # Verify bot belongs to user
        if not bot_id.startswith(f"bot_{current_user.id}_"):
            raise HTTPException(status_code=403, detail="Access denied")
        
        bot = trading_service.get_bot_status(bot_id)
        if not bot:
            raise HTTPException(status_code=404, detail="Bot not found")
        
        return BotResponse(
            id=bot["id"],
            name=bot["id"],
            strategy=bot["strategy"]["name"],
            symbol=bot["symbol"],
            balance=bot["balance"],
            risk_per_trade=bot["risk_per_trade"],
            status=bot["status"],
            started_at=bot["started_at"],
            total_trades=bot["total_trades"],
            total_pnl=bot["total_pnl"],
            last_signal=bot["last_signal"]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting bot: {e}")
        raise HTTPException(status_code=500, detail="Failed to get bot")

@router.post("/bots/{bot_id}/start")
async def start_bot(
    bot_id: str,
    current_user: User = Depends(get_current_active_user),
    trading_service: TradingService = Depends(get_trading_service)
):
    """Start a stopped bot."""
    try:
        if not bot_id.startswith(f"bot_{current_user.id}_"):
            raise HTTPException(status_code=403, detail="Access denied")
        
        bot = trading_service.get_bot_status(bot_id)
        if not bot:
            raise HTTPException(status_code=404, detail="Bot not found")
        
        # Reactivate the bot
        bot["strategy"].activate()
        bot["status"] = "running"
        
        return {"message": f"Bot {bot_id} started successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error starting bot: {e}")
        raise HTTPException(status_code=500, detail="Failed to start bot")

@router.post("/bots/{bot_id}/stop")
async def stop_bot(
    bot_id: str,
    current_user: User = Depends(get_current_active_user),
    trading_service: TradingService = Depends(get_trading_service)
):
    """Stop a running bot."""
    try:
        if not bot_id.startswith(f"bot_{current_user.id}_"):
            raise HTTPException(status_code=403, detail="Access denied")
        
        success = await trading_service.stop_bot(bot_id)
        if not success:
            raise HTTPException(status_code=404, detail="Bot not found")
        
        return {"message": f"Bot {bot_id} stopped successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error stopping bot: {e}")
        raise HTTPException(status_code=500, detail="Failed to stop bot")

@router.delete("/bots/{bot_id}")
async def delete_bot(
    bot_id: str,
    current_user: User = Depends(get_current_active_user),
    trading_service: TradingService = Depends(get_trading_service)
):
    """Delete a bot."""
    try:
        if not bot_id.startswith(f"bot_{current_user.id}_"):
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Stop the bot first
        await trading_service.stop_bot(bot_id)
        
        # Remove from active bots
        if bot_id in trading_service.active_bots:
            del trading_service.active_bots[bot_id]
        
        return {"message": f"Bot {bot_id} deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting bot: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete bot")

@router.get("/strategies", response_model=List[StrategyResponse])
async def get_available_strategies(
    current_user: User = Depends(get_current_active_user),
    trading_service: TradingService = Depends(get_trading_service)
):
    """Get available trading strategies."""
    logger.info("=== STRATEGIES ENDPOINT CALLED ===")
    try:
        logger.info(f"Getting strategies for user {current_user.id}")
        logger.info(f"Trading service type: {type(trading_service)}")
        logger.info(f"Trading service strategies: {list(trading_service.strategies.keys())}")
        
        strategies = []
        for strategy_name, strategy in trading_service.strategies.items():
            try:
                logger.info(f"Processing strategy: {strategy_name}")
                performance = strategy.get_performance_metrics()
                logger.info(f"Strategy performance: {performance}")
                
                strategies.append(StrategyResponse(
                    name=strategy.name,
                    symbol=strategy.symbol,
                    timeframe=strategy.timeframe,
                    parameters=strategy.parameters,
                    performance=performance
                ))
                logger.info(f"Successfully added strategy: {strategy.name}")
            except Exception as strategy_error:
                logger.error(f"Error processing strategy {strategy_name}: {strategy_error}")
                logger.error(f"Strategy object: {strategy}")
                continue
        
        logger.info(f"Returning {len(strategies)} strategies")
        return strategies
        
    except Exception as e:
        logger.error(f"Error getting strategies: {e}")
        logger.error(f"Exception type: {type(e)}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail="Failed to get strategies")

@router.get("/market-data/{symbol}")
async def get_market_data(
    symbol: str,
    interval: str = "1h",
    limit: int = 100,
    current_user: User = Depends(get_current_active_user),
    trading_service: TradingService = Depends(get_trading_service)
):
    """Get market data for a symbol."""
    try:
        market_data = await trading_service.get_market_data(symbol, interval, limit)
        if not market_data:
            raise HTTPException(status_code=404, detail="Market data not available")
        
        return market_data
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting market data: {e}")
        raise HTTPException(status_code=500, detail="Failed to get market data")
