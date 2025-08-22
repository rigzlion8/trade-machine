from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from typing import Dict, List, Optional
from pydantic import BaseModel
from datetime import datetime, timedelta
import json
import logging

from auth.jwt_handler import get_current_active_user
from models.user import User
from .trading_service import TradingService
from .strategies.moving_average_strategy import MovingAverageStrategy
from .exchanges.binance_client import BinanceClient
from config.settings import get_settings
from database.mongodb import get_collection
from bson import ObjectId

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

# Bot collection name
BOTS_COLLECTION = "trading_bots"

# Add basic logging to see if the router is loaded
logger.info("=== TRADING ROUTER LOADED ===")

async def save_bot_to_db(bot_data: dict):
    """Save bot data to MongoDB."""
    try:
        bots_collection = await get_collection(BOTS_COLLECTION)
        bot_data["created_at"] = datetime.utcnow()
        bot_data["updated_at"] = datetime.utcnow()
        result = await bots_collection.insert_one(bot_data)
        logger.info(f"Bot saved to database with ID: {result.inserted_id}")
        return str(result.inserted_id)
    except Exception as e:
        logger.error(f"Error saving bot to database: {e}")
        raise

async def get_bots_from_db(user_id: str) -> List[dict]:
    """Get all bots for a user from MongoDB."""
    try:
        bots_collection = await get_collection(BOTS_COLLECTION)
        cursor = bots_collection.find({"user_id": user_id})
        bots = await cursor.to_list(length=None)
        logger.info(f"Retrieved {len(bots)} bots from database for user {user_id}")
        return bots
    except Exception as e:
        logger.error(f"Error getting bots from database: {e}")
        return []

async def update_bot_in_db(bot_id: str, update_data: dict):
    """Update bot data in MongoDB."""
    try:
        bots_collection = await get_collection(BOTS_COLLECTION)
        update_data["updated_at"] = datetime.utcnow()
        result = await bots_collection.update_one(
            {"_id": ObjectId(bot_id)},
            {"$set": update_data}
        )
        logger.info(f"Bot {bot_id} updated in database")
        return result.modified_count > 0
    except Exception as e:
        logger.error(f"Error updating bot in database: {e}")
        return False

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
            try:
                from .trading_service import TradingService
                from .exchanges.binance_client import BinanceClient
                from .strategies.moving_average_strategy import MovingAverageStrategy
                
                dummy_client = BinanceClient("", "", testnet=True)
                trading_service = TradingService(dummy_client)
                
                # Add a default strategy to the fallback service
                ma_strategy = MovingAverageStrategy("BTCUSDT", "1h", 10, 20)
                trading_service.add_strategy(ma_strategy)
                logger.info("Default strategy added to fallback service")
                
            except Exception as fallback_error:
                logger.error(f"Failed to create fallback trading service: {fallback_error}")
                # Create a minimal service without strategies
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
        
        # Create bot data for database
        bot_db_data = {
            "user_id": str(current_user.id),
            "name": bot_data.name,
            "strategy": bot_data.strategy,
            "symbol": bot_data.symbol,
            "balance": bot_data.balance,
            "risk_per_trade": bot_data.risk_per_trade,
            "status": "stopped",  # Start as stopped
            "started_at": None,
            "total_trades": 0,
            "total_pnl": 0.0,
            "last_signal": None,
            "parameters": bot_data.parameters
        }
        
        # Save bot to database
        db_bot_id = await save_bot_to_db(bot_db_data)
        
        # Start the bot in trading service
        bot = await trading_service.start_bot(
            bot_id=bot_id,
            strategy_name=bot_data.strategy,
            symbol=bot_data.symbol,
            balance=bot_data.balance,
            risk_per_trade=bot_data.risk_per_trade
        )
        
        # Update database with trading service data
        await update_bot_in_db(db_bot_id, {
            "trading_bot_id": bot["id"],
            "status": bot["status"],
            "started_at": bot["started_at"]
        })
        
        return BotResponse(
            id=db_bot_id,  # Use database ID
            name=bot_data.name,
            strategy=bot_data.strategy,
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
        
        # Get bots from database
        db_bots = await get_bots_from_db(str(current_user.id))
        logger.info(f"Found {len(db_bots)} bots in database")
        
        user_bots = []
        for db_bot in db_bots:
            try:
                logger.info(f"Processing database bot: {db_bot}")
                
                # Get live status from trading service if available
                live_status = None
                if "trading_bot_id" in db_bot:
                    try:
                        live_status = trading_service.get_bot_status(db_bot["trading_bot_id"])
                    except Exception as e:
                        logger.warning(f"Could not get live status for bot {db_bot['_id']}: {e}")
                
                # Use live data if available, otherwise use database data
                if live_status:
                    status = live_status["status"]
                    started_at = live_status["started_at"]
                    total_trades = live_status["total_trades"]
                    total_pnl = live_status["total_pnl"]
                    last_signal = live_status["last_signal"]
                else:
                    status = db_bot.get("status", "stopped")
                    started_at = db_bot.get("started_at") or datetime.utcnow()  # Use current time if None
                    total_trades = db_bot.get("total_trades", 0)
                    total_pnl = db_bot.get("total_pnl", 0.0)
                    last_signal = db_bot.get("last_signal")
                
                user_bots.append(BotResponse(
                    id=str(db_bot["_id"]),
                    name=db_bot["name"],
                    strategy=db_bot["strategy"],
                    symbol=db_bot["symbol"],
                    balance=db_bot["balance"],
                    risk_per_trade=db_bot["risk_per_trade"],
                    status=status,
                    started_at=started_at,
                    total_trades=total_trades,
                    total_pnl=total_pnl,
                    last_signal=last_signal
                ))
                logger.info(f"Successfully added bot: {db_bot['name']}")
                
            except Exception as bot_error:
                logger.error(f"Error processing database bot {db_bot.get('_id', 'unknown')}: {bot_error}")
                logger.error(f"Bot data: {db_bot}")
                continue
        
        logger.info(f"Returning {len(user_bots)} bots for user {current_user.id}")
        return user_bots
        
    except Exception as e:
        logger.error(f"Error getting user bots: {e}")
        logger.error(f"Exception type: {type(e)}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail="Failed to get bots")

@router.get("/bots/{bot_id}", response_model=Dict)
async def get_bot_detail(
    bot_id: str,
    current_user: User = Depends(get_current_active_user),
    trading_service: TradingService = Depends(get_trading_service)
):
    """Get detailed information about a specific bot."""
    try:
        logger.info(f"Getting bot detail for bot {bot_id} and user {current_user.id}")
        
        # Get bot from database
        bots_collection = await get_collection(BOTS_COLLECTION)
        db_bot = await bots_collection.find_one({"_id": ObjectId(bot_id)})
        
        if not db_bot:
            raise HTTPException(status_code=404, detail="Bot not found")
        
        # Verify bot belongs to user
        if db_bot["user_id"] != str(current_user.id):
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Get live status from trading service if available
        live_status = None
        if "trading_bot_id" in db_bot:
            try:
                live_status = trading_service.get_bot_status(db_bot["trading_bot_id"])
            except Exception as e:
                logger.warning(f"Could not get live status for bot {bot_id}: {e}")
        
        # Use live data if available, otherwise use database data
        if live_status:
            status = live_status["status"]
            started_at = live_status["started_at"]
            total_trades = live_status["total_trades"]
            total_pnl = live_status["total_pnl"]
            last_signal = live_status["last_signal"]
        else:
            status = db_bot.get("status", "stopped")
            started_at = db_bot.get("started_at") or datetime.utcnow()
            total_trades = db_bot.get("total_trades", 0)
            total_pnl = db_bot.get("total_pnl", 0.0)
            last_signal = db_bot.get("last_signal")
        
        # Get bot performance metrics
        performance = {}
        if "trading_bot_id" in db_bot:
            try:
                performance = trading_service.get_bot_performance(db_bot["trading_bot_id"])
            except Exception as e:
                logger.warning(f"Could not get performance for bot {bot_id}: {e}")
        
        # Get recent trades (mock data for now)
        recent_trades = [
            {
                "id": f"trade_{i}",
                "timestamp": (datetime.utcnow() - timedelta(hours=i)).isoformat(),
                "type": "buy" if i % 2 == 0 else "sell",
                "symbol": db_bot["symbol"],
                "amount": 0.001 * (i + 1),
                "price": 45000 + (i * 100),
                "pnl": 10.5 * (i + 1) if i % 2 == 1 else 0
            }
            for i in range(5)
        ]
        
        # Get current market data
        market_data = {}
        try:
            market_data = await trading_service.get_market_data(db_bot["symbol"], "1h", 24)
        except Exception as e:
            logger.warning(f"Could not get market data for {db_bot['symbol']}: {e}")
        
        bot_detail = {
            "id": str(db_bot["_id"]),
            "name": db_bot["name"],
            "strategy": db_bot["strategy"],
            "symbol": db_bot["symbol"],
            "balance": db_bot["balance"],
            "risk_per_trade": db_bot["risk_per_trade"],
            "status": status,
            "started_at": started_at,
            "total_trades": total_trades,
            "total_pnl": total_pnl,
            "last_signal": last_signal,
            "performance": performance,
            "recent_trades": recent_trades,
            "market_data": market_data,
            "created_at": db_bot["created_at"],
            "updated_at": db_bot["updated_at"]
        }
        
        logger.info(f"Returning bot detail for {bot_id}")
        return bot_detail
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting bot detail: {e}")
        raise HTTPException(status_code=500, detail="Failed to get bot detail")

@router.get("/bots/{bot_id}/activity")
async def get_bot_activity(
    bot_id: str,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    activity_type: Optional[str] = None,  # "trades", "signals", "performance"
    current_user: User = Depends(get_current_active_user),
    trading_service: TradingService = Depends(get_trading_service)
):
    """Get bot activity within a specific time range."""
    try:
        logger.info(f"Getting bot activity for bot {bot_id} and user {current_user.id}")
        
        # Get bot from database
        bots_collection = await get_collection(BOTS_COLLECTION)
        db_bot = await bots_collection.find_one({"_id": ObjectId(bot_id)})
        
        if not db_bot:
            raise HTTPException(status_code=404, detail="Bot not found")
        
        # Verify bot belongs to user
        if db_bot["user_id"] != str(current_user.id):
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Parse date range
        start_dt = None
        end_dt = None
        
        if start_date:
            try:
                start_dt = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid start_date format. Use ISO format (YYYY-MM-DDTHH:MM:SS)")
        
        if end_date:
            try:
                end_dt = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid end_date format. Use ISO format (YYYY-MM-DDTHH:MM:SS)")
        
        # Default to last 7 days if no dates provided
        if not start_dt:
            start_dt = datetime.utcnow() - timedelta(days=7)
        if not end_dt:
            end_dt = datetime.utcnow()
        
        # Generate activity data based on type
        activity_data = {}
        
        if activity_type == "trades" or not activity_type:
            # Mock trade data within date range
            trades = []
            current_dt = start_dt
            while current_dt <= end_dt:
                if current_dt.hour % 4 == 0:  # Simulate trades every 4 hours
                    trades.append({
                        "id": f"trade_{len(trades)}",
                        "timestamp": current_dt.isoformat(),
                        "type": "buy" if len(trades) % 2 == 0 else "sell",
                        "symbol": db_bot["symbol"],
                        "amount": 0.001 * (len(trades) + 1),
                        "price": 45000 + (len(trades) * 100),
                        "pnl": 10.5 * (len(trades) + 1) if len(trades) % 2 == 1 else 0
                    })
                current_dt += timedelta(hours=1)
            activity_data["trades"] = trades
        
        if activity_type == "signals" or not activity_type:
            # Mock signal data
            signals = []
            current_dt = start_dt
            while current_dt <= end_dt:
                if current_dt.hour % 6 == 0:  # Simulate signals every 6 hours
                    signals.append({
                        "id": f"signal_{len(signals)}",
                        "timestamp": current_dt.isoformat(),
                        "type": "buy" if len(signals) % 2 == 0 else "sell",
                        "strength": 0.7 + (len(signals) * 0.1),
                        "reason": "Moving average crossover" if len(signals) % 2 == 0 else "RSI oversold"
                    })
                current_dt += timedelta(hours=1)
            activity_data["signals"] = signals
        
        if activity_type == "performance" or not activity_type:
            # Mock performance data
            performance = {
                "total_trades": len(activity_data.get("trades", [])),
                "winning_trades": len([t for t in activity_data.get("trades", []) if t.get("pnl", 0) > 0]),
                "total_pnl": sum([t.get("pnl", 0) for t in activity_data.get("trades", [])]),
                "win_rate": 0.65,
                "avg_trade_pnl": 15.5,
                "max_drawdown": -25.0,
                "sharpe_ratio": 1.2
            }
            activity_data["performance"] = performance
        
        # Add metadata
        activity_data["metadata"] = {
            "bot_id": bot_id,
            "bot_name": db_bot["name"],
            "start_date": start_dt.isoformat(),
            "end_date": end_dt.isoformat(),
            "activity_type": activity_type or "all",
            "total_records": sum(len(v) if isinstance(v, list) else 1 for v in activity_data.values() if v != "metadata")
        }
        
        logger.info(f"Returning activity data for bot {bot_id}")
        return activity_data
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting bot activity: {e}")
        raise HTTPException(status_code=500, detail="Failed to get bot activity")

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
