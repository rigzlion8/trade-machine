from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException, status
from typing import Optional
import logging
import json
from datetime import datetime

from realtime.websocket_manager import manager, WebSocketMessage
from auth.jwt_handler import get_current_user_from_token
from database.mongodb import get_collection, WALLETS_COLLECTION, TRANSACTIONS_COLLECTION

logger = logging.getLogger(__name__)

router = APIRouter()

async def get_user_from_websocket(websocket: WebSocket) -> Optional[str]:
    """Extract user ID from WebSocket query parameters or headers."""
    try:
        # Try to get token from query parameters
        token = websocket.query_params.get("token")
        if not token:
            # Try to get from headers
            token = websocket.headers.get("authorization", "").replace("Bearer ", "")
        
        if not token:
            return None
        
        # Verify token and get user
        user = await get_current_user_from_token(token)
        return user.id if user else None
        
    except Exception as e:
        logger.error(f"Error authenticating WebSocket connection: {e}")
        return None

@router.websocket("/ws/wallet/{user_id}")
async def wallet_websocket(websocket: WebSocket, user_id: str):
    """WebSocket endpoint for wallet updates."""
    try:
        # Authenticate the connection
        authenticated_user_id = await get_user_from_websocket(websocket)
        if not authenticated_user_id or authenticated_user_id != user_id:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return
        
        # Connect to WebSocket manager
        await manager.connect(websocket, user_id, "wallet")
        
        try:
            # Send initial wallet data
            wallets_collection = await get_collection(WALLETS_COLLECTION)
            wallet = await wallets_collection.find_one({"user_id": user_id})
            
            if wallet:
                initial_message = WebSocketMessage.balance_update(
                    user_id=user_id,
                    balance_kes=wallet.get("balance_kes", 0.0),
                    balance_usdt=wallet.get("balance_usdt", 0.0)
                )
                await manager.send_personal_message(initial_message, websocket)
            
            # Keep connection alive and handle incoming messages
            while True:
                try:
                    # Wait for messages from client
                    data = await websocket.receive_text()
                    message = json.loads(data)
                    
                    # Handle different message types
                    if message.get("type") == "ping":
                        await manager.send_personal_message({
                            "type": "pong",
                            "timestamp": datetime.utcnow().isoformat()
                        }, websocket)
                    
                    elif message.get("type") == "subscribe_transactions":
                        # Send recent transactions
                        transactions_collection = await get_collection(TRANSACTIONS_COLLECTION)
                        transactions = await transactions_collection.find(
                            {"user_id": user_id}
                        ).sort("created_at", -1).limit(10).to_list(length=10)
                        
                        await manager.send_personal_message({
                            "type": "transaction_history",
                            "data": {
                                "transactions": transactions,
                                "timestamp": datetime.utcnow().isoformat()
                            }
                        }, websocket)
                    
                    elif message.get("type") == "get_wallet_status":
                        # Send current wallet status
                        wallets_collection = await get_collection(WALLETS_COLLECTION)
                        wallet = await wallets_collection.find_one({"user_id": user_id})
                        
                        if wallet:
                            status_message = {
                                "type": "wallet_status",
                                "data": {
                                    "balance_kes": wallet.get("balance_kes", 0.0),
                                    "balance_usdt": wallet.get("balance_usdt", 0.0),
                                    "total_received": wallet.get("total_received", 0.0),
                                    "total_sent": wallet.get("total_sent", 0.0),
                                    "daily_transfer_count": wallet.get("daily_transfer_count", 0),
                                    "timestamp": datetime.utcnow().isoformat()
                                }
                            }
                            await manager.send_personal_message(status_message, websocket)
                
                except WebSocketDisconnect:
                    break
                except Exception as e:
                    logger.error(f"Error handling WebSocket message: {e}")
                    await manager.send_personal_message(
                        WebSocketMessage.error_notification(user_id, "Message processing error"),
                        websocket
                    )
        
        except WebSocketDisconnect:
            logger.info(f"WebSocket disconnected for user {user_id}")
        finally:
            manager.disconnect(websocket)
    
    except Exception as e:
        logger.error(f"Error in wallet WebSocket: {e}")
        try:
            await websocket.close(code=status.WS_1011_INTERNAL_ERROR)
        except:
            pass

@router.websocket("/ws/bots/{user_id}")
async def bots_websocket(websocket: WebSocket, user_id: str):
    """WebSocket endpoint for trading bot updates."""
    try:
        # Authenticate the connection
        authenticated_user_id = await get_user_from_websocket(websocket)
        if not authenticated_user_id or authenticated_user_id != user_id:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return
        
        # Connect to WebSocket manager
        await manager.connect(websocket, user_id, "bots")
        
        try:
            # Send initial bot status
            bots_collection = await get_collection("bots")
            bots = await bots_collection.find({"user_id": user_id}).to_list(length=50)
            
            if bots:
                initial_message = {
                    "type": "bot_status_initial",
                    "data": {
                        "bots": bots,
                        "timestamp": datetime.utcnow().isoformat()
                    }
                }
                await manager.send_personal_message(initial_message, websocket)
            
            # Keep connection alive and handle incoming messages
            while True:
                try:
                    # Wait for messages from client
                    data = await websocket.receive_text()
                    message = json.loads(data)
                    
                    # Handle different message types
                    if message.get("type") == "ping":
                        await manager.send_personal_message({
                            "type": "pong",
                            "timestamp": datetime.utcnow().isoformat()
                        }, websocket)
                    
                    elif message.get("type") == "subscribe_bot_updates":
                        bot_id = message.get("bot_id")
                        if bot_id:
                            # Subscribe to specific bot updates
                            await manager.send_personal_message({
                                "type": "bot_subscription_confirmed",
                                "data": {
                                    "bot_id": bot_id,
                                    "message": "Subscribed to bot updates",
                                    "timestamp": datetime.utcnow().isoformat()
                                }
                            }, websocket)
                
                except WebSocketDisconnect:
                    break
                except Exception as e:
                    logger.error(f"Error handling bot WebSocket message: {e}")
                    await manager.send_personal_message(
                        WebSocketMessage.error_notification(user_id, "Bot message processing error"),
                        websocket
                    )
        
        except WebSocketDisconnect:
            logger.info(f"Bot WebSocket disconnected for user {user_id}")
        finally:
            manager.disconnect(websocket)
    
    except Exception as e:
        logger.error(f"Error in bot WebSocket: {e}")
        try:
            await websocket.close(code=status.WS_1011_INTERNAL_ERROR)
        except:
            pass

@router.websocket("/ws/notifications/{user_id}")
async def notifications_websocket(websocket: WebSocket, user_id: str):
    """WebSocket endpoint for general notifications."""
    try:
        # Authenticate the connection
        authenticated_user_id = await get_user_from_websocket(websocket)
        if not authenticated_user_id or authenticated_user_id != user_id:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return
        
        # Connect to WebSocket manager
        await manager.connect(websocket, user_id, "notifications")
        
        try:
            # Send welcome notification
            welcome_message = WebSocketMessage.system_notification(
                user_id=user_id,
                message="Notifications WebSocket connected successfully",
                level="info"
            )
            await manager.send_personal_message(welcome_message, websocket)
            
            # Keep connection alive
            while True:
                try:
                    # Wait for ping messages
                    data = await websocket.receive_text()
                    message = json.loads(data)
                    
                    if message.get("type") == "ping":
                        await manager.send_personal_message({
                            "type": "pong",
                            "timestamp": datetime.utcnow().isoformat()
                        }, websocket)
                
                except WebSocketDisconnect:
                    break
                except Exception as e:
                    logger.error(f"Error handling notification WebSocket message: {e}")
                    break
        
        except WebSocketDisconnect:
            logger.info(f"Notification WebSocket disconnected for user {user_id}")
        finally:
            manager.disconnect(websocket)
    
    except Exception as e:
        logger.error(f"Error in notification WebSocket: {e}")
        try:
            await websocket.close(code=status.WS_1011_INTERNAL_ERROR)
        except:
            pass

@router.get("/websocket/status")
async def get_websocket_status():
    """Get WebSocket connection statistics."""
    return manager.get_connection_info()
