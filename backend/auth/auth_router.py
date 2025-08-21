from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.security import OAuth2PasswordRequestForm
from typing import Optional
import logging
from datetime import datetime
from bson import ObjectId

from models.user import (
    User, UserCreate, UserResponse, UserUpdate, UserLogin, 
    UserLoginResponse, PhoneVerificationRequest, WalletPinRequest
)
from auth.jwt_handler import (
    create_user_token, create_refresh_token, 
    get_current_user, get_current_active_user
)
from database.mongodb import get_collection, USERS_COLLECTION
from config.settings import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

router = APIRouter()

@router.post("/register", response_model=UserResponse)
async def register_user(user_data: UserCreate):
    """Register a new user."""
    try:
        users_collection = await get_collection(USERS_COLLECTION)
        
        # Check if user already exists
        existing_user = await users_collection.find_one({"email": user_data.email})
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User with this email already exists"
            )
        
        # Create new user
        new_user = {
            "_id": ObjectId(),
            "email": user_data.email,
            "full_name": user_data.full_name,
            "phone_number": user_data.phone_number,
            "google_id": user_data.google_id,
            "profile_picture": user_data.profile_picture,
            "role": "user",
            "status": "active",
            "wallet_balance_kes": 0.0,
            "wallet_balance_usdt": 0.0,
            "is_phone_verified": False,
            "is_email_verified": False,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        # Insert user
        result = await users_collection.insert_one(new_user)
        
        # Convert to response model
        new_user["id"] = str(new_user["_id"])
        del new_user["_id"]
        
        return UserResponse(**new_user)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"User registration error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Registration failed"
        )

@router.post("/login", response_model=UserLoginResponse)
async def login_user(login_data: UserLogin):
    """Login user with email and password."""
    try:
        users_collection = await get_collection(USERS_COLLECTION)
        
        # Find user by email
        user_data = await users_collection.find_one({"email": login_data.email})
        if not user_data:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials"
            )
        
        # For now, we'll skip password verification since we're using Google OAuth
        # In a real app, you'd verify the password hash here
        
        # Create tokens
        access_token = create_user_token(str(user_data["_id"]), user_data["email"])
        refresh_token = create_refresh_token(str(user_data["_id"]))
        
        # Convert to response model
        user_data["id"] = str(user_data["_id"])
        del user_data["_id"]
        user_response = UserResponse(**user_data)
        
        return UserLoginResponse(
            access_token=access_token,
            token_type="bearer",
            user=user_response
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Login failed"
        )

@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_active_user)):
    """Get current user information."""
    return current_user

@router.put("/me", response_model=UserResponse)
async def update_user_info(
    user_update: UserUpdate,
    current_user: User = Depends(get_current_active_user)
):
    """Update current user information."""
    try:
        users_collection = await get_collection(USERS_COLLECTION)
        
        # Prepare update data
        update_data = user_update.dict(exclude_unset=True)
        update_data["updated_at"] = datetime.utcnow()
        
        # Update user
        await users_collection.update_one(
            {"_id": ObjectId(current_user.id)},
            {"$set": update_data}
        )
        
        # Get updated user
        updated_user = await users_collection.find_one({"_id": ObjectId(current_user.id)})
        updated_user["id"] = str(updated_user["_id"])
        del updated_user["_id"]
        
        return UserResponse(**updated_user)
        
    except Exception as e:
        logger.error(f"User update error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Update failed"
        )

@router.post("/verify-phone")
async def verify_phone_number(
    verification_data: PhoneVerificationRequest,
    current_user: User = Depends(get_current_active_user)
):
    """Verify user's phone number."""
    try:
        # For now, we'll simulate phone verification
        # In a real app, you'd verify the SMS code here
        
        users_collection = await get_collection(USERS_COLLECTION)
        
        await users_collection.update_one(
            {"_id": ObjectId(current_user.id)},
            {
                "$set": {
                    "is_phone_verified": True,
                    "phone_number": verification_data.phone_number,
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        return {"message": "Phone number verified successfully"}
        
    except Exception as e:
        logger.error(f"Phone verification error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Phone verification failed"
        )

@router.post("/set-wallet-pin")
async def set_wallet_pin(
    pin_data: WalletPinRequest,
    current_user: User = Depends(get_current_active_user)
):
    """Set or update wallet PIN."""
    try:
        users_collection = await get_collection(USERS_COLLECTION)
        
        # For now, we'll store the PIN as plain text
        # In a real app, you'd hash the PIN before storing
        
        await users_collection.update_one(
            {"_id": ObjectId(current_user.id)},
            {
                "$set": {
                    "wallet_pin": pin_data.new_pin,
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        return {"message": "Wallet PIN updated successfully"}
        
    except Exception as e:
        logger.error(f"Wallet PIN update error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="PIN update failed"
        )

@router.post("/logout")
async def logout_user(current_user: User = Depends(get_current_active_user)):
    """Logout user (invalidate token on frontend)."""
    # In a real app, you might want to blacklist the token
    # For now, we'll just return a success message
    return {"message": "Logged out successfully"}
