import asyncio
import json
import logging
from typing import Dict, Set, Any, Optional
from fastapi import WebSocket, WebSocketDisconnect
from datetime import datetime
import uuid

logger = logging.getLogger(__name__)

class ConnectionManager:
    def __init__(self):
        # Store active connections by user_id
        self.active_connections: Dict[str, Set[WebSocket]] = {}
        # Store connection metadata
        self.connection_metadata: Dict[WebSocket, Dict[str, Any]] = {}
        
    async def connect(self, websocket: WebSocket, user_id: str, connection_type: str = "general"):
        """Accept a new WebSocket connection."""
        await websocket.accept()
        
        # Store connection
        if user_id not in self.active_connections:
            self.active_connections[user_id] = set()
        self.active_connections[user_id].add(websocket)
        
        # Store metadata
        self.connection_metadata[websocket] = {
            "user_id": user_id,
            "connection_type": connection_type,
            "connected_at": datetime.utcnow(),
            "connection_id": str(uuid.uuid4())
        }
        
        logger.info(f"User {user_id} connected via {connection_type} WebSocket")
        
        # Send welcome message
        await self.send_personal_message({
            "type": "connection_established",
            "message": "WebSocket connection established",
            "timestamp": datetime.utcnow().isoformat(),
            "connection_id": self.connection_metadata[websocket]["connection_id"]
        }, websocket)
    
    def disconnect(self, websocket: WebSocket):
        """Remove a WebSocket connection."""
        user_id = None
        for uid, connections in self.active_connections.items():
            if websocket in connections:
                connections.remove(websocket)
                user_id = uid
                break
        
        if user_id and not self.active_connections[user_id]:
            del self.active_connections[user_id]
        
        if websocket in self.connection_metadata:
            del self.connection_metadata[websocket]
        
        if user_id:
            logger.info(f"User {user_id} disconnected from WebSocket")
    
    async def send_personal_message(self, message: Dict[str, Any], websocket: WebSocket):
        """Send a message to a specific WebSocket connection."""
        try:
            await websocket.send_text(json.dumps(message))
        except Exception as e:
            logger.error(f"Error sending personal message: {e}")
            self.disconnect(websocket)
    
    async def broadcast_to_user(self, user_id: str, message: Dict[str, Any]):
        """Broadcast a message to all connections of a specific user."""
        if user_id in self.active_connections:
            disconnected = set()
            for websocket in self.active_connections[user_id]:
                try:
                    await websocket.send_text(json.dumps(message))
                except Exception as e:
                    logger.error(f"Error broadcasting to user {user_id}: {e}")
                    disconnected.add(websocket)
            
            # Clean up disconnected websockets
            for websocket in disconnected:
                self.disconnect(websocket)
    
    async def broadcast_to_all(self, message: Dict[str, Any]):
        """Broadcast a message to all connected users."""
        all_websockets = set()
        for connections in self.active_connections.values():
            all_websockets.update(connections)
        
        disconnected = set()
        for websocket in all_websockets:
            try:
                await websocket.send_text(json.dumps(message))
            except Exception as e:
                logger.error(f"Error broadcasting to all: {e}")
                disconnected.add(websocket)
        
        # Clean up disconnected websockets
        for websocket in disconnected:
            self.disconnect(websocket)
    
    async def broadcast_to_type(self, connection_type: str, message: Dict[str, Any]):
        """Broadcast a message to all connections of a specific type."""
        target_websockets = set()
        for websocket, metadata in self.connection_metadata.items():
            if metadata.get("connection_type") == connection_type:
                target_websockets.add(websocket)
        
        disconnected = set()
        for websocket in target_websockets:
            try:
                await websocket.send_text(json.dumps(message))
            except Exception as e:
                logger.error(f"Error broadcasting to type {connection_type}: {e}")
                disconnected.add(websocket)
        
        # Clean up disconnected websockets
        for websocket in disconnected:
            self.disconnect(websocket)
    
    def get_user_connections(self, user_id: str) -> Set[WebSocket]:
        """Get all active connections for a user."""
        return self.active_connections.get(user_id, set())
    
    def get_connection_count(self) -> int:
        """Get total number of active connections."""
        return sum(len(connections) for connections in self.active_connections.values())
    
    def get_user_count(self) -> int:
        """Get total number of connected users."""
        return len(self.active_connections)
    
    def get_connection_info(self) -> Dict[str, Any]:
        """Get connection statistics."""
        return {
            "total_connections": self.get_connection_count(),
            "total_users": self.get_user_count(),
            "users": list(self.active_connections.keys()),
            "timestamp": datetime.utcnow().isoformat()
        }

# Global connection manager instance
manager = ConnectionManager()

class WebSocketMessage:
    """Helper class for creating standardized WebSocket messages."""
    
    @staticmethod
    def balance_update(user_id: str, balance_kes: float, balance_usdt: float):
        return {
            "type": "balance_update",
            "user_id": user_id,
            "data": {
                "balance_kes": balance_kes,
                "balance_usdt": balance_usdt,
                "timestamp": datetime.utcnow().isoformat()
            }
        }
    
    @staticmethod
    def transaction_notification(user_id: str, transaction: Dict[str, Any]):
        return {
            "type": "transaction_notification",
            "user_id": user_id,
            "data": {
                "transaction": transaction,
                "timestamp": datetime.utcnow().isoformat()
            }
        }
    
    @staticmethod
    def bot_status_update(user_id: str, bot_id: str, status: str, performance: Dict[str, Any]):
        return {
            "type": "bot_status_update",
            "user_id": user_id,
            "data": {
                "bot_id": bot_id,
                "status": status,
                "performance": performance,
                "timestamp": datetime.utcnow().isoformat()
            }
        }
    
    @staticmethod
    def system_notification(user_id: str, message: str, level: str = "info"):
        return {
            "type": "system_notification",
            "user_id": user_id,
            "data": {
                "message": message,
                "level": level,
                "timestamp": datetime.utcnow().isoformat()
            }
        }
    
    @staticmethod
    def error_notification(user_id: str, error: str, details: Optional[Dict[str, Any]] = None):
        return {
            "type": "error_notification",
            "user_id": user_id,
            "data": {
                "error": error,
                "details": details,
                "timestamp": datetime.utcnow().isoformat()
            }
        }
