from datetime import datetime, timedelta
from typing import Optional, TYPE_CHECKING
from jose import JWTError, jwt
from fastapi import HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from config.settings import get_settings
from database.mongodb import get_collection, USERS_COLLECTION
from bson import ObjectId
import logging

if TYPE_CHECKING:
    from models.user import User

logger = logging.getLogger(__name__)
settings = get_settings()

# Security scheme
security = HTTPBearer()

# JWT Configuration
SECRET_KEY = settings.jwt_secret_key
ALGORITHM = settings.jwt_algorithm
ACCESS_TOKEN_EXPIRE_MINUTES = settings.jwt_access_token_expire_minutes

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create a new JWT access token."""
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_token(token: str) -> dict:
    """Verify and decode a JWT token."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError as e:
        logger.error(f"JWT verification failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get the current authenticated user from JWT token."""
    try:
        token = credentials.credentials
        payload = verify_token(token)
        user_id: str = payload.get("sub")
        
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Get user from database
        users_collection = await get_collection(USERS_COLLECTION)
        user_data = await users_collection.find_one({"_id": ObjectId(user_id)})
        
        if user_data is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Convert MongoDB document to User model
        user_data["id"] = str(user_data["_id"])
        del user_data["_id"]
        
        # Import User here to avoid circular imports
        from models.user import User
        return User(**user_data)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting current user: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

async def get_current_active_user(current_user = Depends(get_current_user)):
    """Get the current active user."""
    # Check if status is active (handle both string and enum)
    user_status = str(current_user.status) if hasattr(current_user.status, 'value') else str(current_user.status)
    if user_status.lower() != "active":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Inactive user (status: {user_status})"
        )
    return current_user

async def get_current_user_from_token(token: str):
    """Get user from JWT token string (for WebSocket authentication)."""
    try:
        payload = verify_token(token)
        user_id: str = payload.get("sub")
        
        if user_id is None:
            return None
        
        # Get user from database
        users_collection = await get_collection(USERS_COLLECTION)
        user_data = await users_collection.find_one({"_id": ObjectId(user_id)})
        
        if user_data is None:
            return None
        
        # Convert MongoDB document to User model
        user_data["id"] = str(user_data["_id"])
        del user_data["_id"]
        
        # Import User here to avoid circular imports
        from models.user import User
        return User(**user_data)
        
    except Exception as e:
        logger.error(f"Error getting user from token: {e}")
        return None

def create_user_token(user_id: str, email: str) -> str:
    """Create a JWT token for a user."""
    data = {
        "sub": user_id,
        "email": email,
        "type": "access"
    }
    return create_access_token(data)

def create_refresh_token(user_id: str) -> str:
    """Create a refresh token for a user."""
    data = {
        "sub": user_id,
        "type": "refresh"
    }
    expires_delta = timedelta(days=7)  # Refresh tokens last 7 days
    return create_access_token(data, expires_delta)
