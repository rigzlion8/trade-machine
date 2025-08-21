from fastapi import APIRouter, HTTPException, status, Depends
from typing import List, Optional
import logging
from datetime import datetime
from bson import ObjectId
from pydantic import BaseModel, ConfigDict

from models.user import User
from auth.jwt_handler import get_current_active_user
from database.mongodb import get_collection, BOTS_COLLECTION
from config.settings import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

router = APIRouter()

# Basic bot models for now

class BotCreate(BaseModel):
    name: str
    strategy: str
    initial_capital: float

class BotResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: str
    name: str
    strategy: str
    status: str
    created_at: datetime

@router.get("/", response_model=List[BotResponse])
async def get_user_bots(current_user: User = Depends(get_current_active_user)):
    """Get all bots for the current user."""
    try:
        bots_collection = await get_collection(BOTS_COLLECTION)
        
        cursor = bots_collection.find({"user_id": current_user.id})
        bots = []
        
        async for bot in cursor:
            bot["id"] = str(bot["_id"])
            del bot["_id"]
            bots.append(BotResponse(**bot))
        
        return bots
        
    except Exception as e:
        logger.error(f"Error getting user bots: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get bots"
        )

@router.post("/", response_model=BotResponse)
async def create_bot(
    bot_data: BotCreate,
    current_user: User = Depends(get_current_active_user)
):
    """Create a new trading bot."""
    try:
        bots_collection = await get_collection(BOTS_COLLECTION)
        
        new_bot = {
            "_id": ObjectId(),
            "user_id": current_user.id,
            "name": bot_data.name,
            "strategy": bot_data.strategy,
            "status": "inactive",
            "initial_capital": bot_data.initial_capital,
            "current_capital": bot_data.initial_capital,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        result = await bots_collection.insert_one(new_bot)
        
        new_bot["id"] = str(new_bot["_id"])
        del new_bot["_id"]
        
        return BotResponse(**new_bot)
        
    except Exception as e:
        logger.error(f"Error creating bot: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create bot"
        )

@router.get("/{bot_id}", response_model=BotResponse)
async def get_bot(
    bot_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """Get a specific bot by ID."""
    try:
        bots_collection = await get_collection(BOTS_COLLECTION)
        
        bot = await bots_collection.find_one({
            "_id": ObjectId(bot_id),
            "user_id": current_user.id
        })
        
        if not bot:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Bot not found"
            )
        
        bot["id"] = str(bot["_id"])
        del bot["_id"]
        
        return BotResponse(**bot)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting bot: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get bot"
        )

@router.put("/{bot_id}/start")
async def start_bot(
    bot_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """Start a trading bot."""
    try:
        bots_collection = await get_collection(BOTS_COLLECTION)
        
        result = await bots_collection.update_one(
            {
                "_id": ObjectId(bot_id),
                "user_id": current_user.id
            },
            {
                "$set": {
                    "status": "active",
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        if result.matched_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Bot not found"
            )
        
        return {"message": "Bot started successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error starting bot: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to start bot"
        )

@router.put("/{bot_id}/stop")
async def stop_bot(
    bot_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """Stop a trading bot."""
    try:
        bots_collection = await get_collection(BOTS_COLLECTION)
        
        result = await bots_collection.update_one(
            {
                "_id": ObjectId(bot_id),
                "user_id": current_user.id
            },
            {
                "$set": {
                    "status": "inactive",
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        if result.matched_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Bot not found"
            )
        
        return {"message": "Bot stopped successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error stopping bot: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to stop bot"
        )

@router.delete("/{bot_id}")
async def delete_bot(
    bot_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """Delete a trading bot."""
    try:
        bots_collection = await get_collection(BOTS_COLLECTION)
        
        result = await bots_collection.delete_one({
            "_id": ObjectId(bot_id),
            "user_id": current_user.id
        })
        
        if result.deleted_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Bot not found"
            )
        
        return {"message": "Bot deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting bot: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete bot"
        )
