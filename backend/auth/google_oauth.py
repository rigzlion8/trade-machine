from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.responses import RedirectResponse
from google.oauth2 import id_token
from google.auth.transport import requests
import httpx
import asyncio
from typing import Optional
import logging
from datetime import datetime
from bson import ObjectId

from models.user import UserCreate, UserResponse, GoogleAuthRequest
from auth.jwt_handler import create_user_token, create_refresh_token
from database.mongodb import get_collection, USERS_COLLECTION, WALLETS_COLLECTION
from config.settings import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

router = APIRouter()

# Request deduplication to prevent multiple simultaneous calls
_ongoing_requests = {}

async def verify_google_token(token: str) -> dict:
    """Verify Google ID token and return user info."""
    try:
        # Verify the token with Google
        idinfo = id_token.verify_oauth2_token(
            token, 
            requests.Request(), 
            settings.google_client_id
        )
        
        # Check if token is expired
        if idinfo['exp'] < datetime.utcnow().timestamp():
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token expired"
            )
        
        return idinfo
        
    except Exception as e:
        logger.error(f"Google token verification failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Google token"
        )

async def get_or_create_user(google_user_info: dict) -> UserResponse:
    """Get existing user or create new one from Google info."""
    try:
        logger.info(f"Processing user info: {google_user_info}")
        
        # Validate required fields
        if "sub" not in google_user_info:
            logger.error(f"Missing 'sub' field in google_user_info: {google_user_info}")
            raise ValueError("Missing 'sub' field in Google user info")
        
        if "email" not in google_user_info:
            logger.error(f"Missing 'email' field in google_user_info: {google_user_info}")
            raise ValueError("Missing 'email' field in Google user info")
        
        users_collection = await get_collection(USERS_COLLECTION)
        wallets_collection = await get_collection(WALLETS_COLLECTION)
        
        # Check if user exists by Google ID
        existing_user = await users_collection.find_one({
            "google_id": google_user_info["sub"]
        })
        
        if existing_user:
            # Update last login
            await users_collection.update_one(
                {"_id": existing_user["_id"]},
                {"$set": {"updated_at": datetime.utcnow()}}
            )
            
            # Convert to response model
            existing_user["id"] = str(existing_user["_id"])
            del existing_user["_id"]
            return UserResponse(**existing_user)
        
        # Check if user exists by email
        existing_user = await users_collection.find_one({
            "email": google_user_info["email"]
        })
        
        if existing_user:
            # Link Google account to existing user
            await users_collection.update_one(
                {"_id": existing_user["_id"]},
                {
                    "$set": {
                        "google_id": google_user_info["sub"],
                        "updated_at": datetime.utcnow()
                    }
                }
            )
            
            existing_user["id"] = str(existing_user["_id"])
            del existing_user["_id"]
            return UserResponse(**existing_user)
        
        # Create new user
        new_user = {
            "_id": ObjectId(),
            "email": google_user_info["email"],
            "full_name": google_user_info.get("name", ""),
            "google_id": google_user_info["sub"],
            "profile_picture": google_user_info.get("picture"),
            "role": "user",
            "status": "active",
            "wallet_balance_kes": 0.0,
            "wallet_balance_usdt": 0.0,
            "is_phone_verified": False,
            "is_email_verified": True,  # Google emails are verified
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        # Insert user
        await users_collection.insert_one(new_user)
        
        # Create wallet for new user
        new_wallet = {
            "_id": ObjectId(),
            "user_id": str(new_user["_id"]),
            "balance_kes": 0.0,
            "balance_usdt": 0.0,
            "total_received": 0.0,
            "total_sent": 0.0,
            "total_fees": 0.0,
            "daily_transfer_count": 0,
            "daily_transfer_amount": 0.0,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        await wallets_collection.insert_one(new_wallet)
        
        # Convert to response model
        new_user["id"] = str(new_user["_id"])
        del new_user["_id"]
        return UserResponse(**new_user)
        
    except Exception as e:
        logger.error(f"Error creating/getting user: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error processing user authentication"
        )

@router.get("/google/login")
async def google_login():
    """Redirect to Google OAuth login."""
    google_auth_url = f"https://accounts.google.com/o/oauth2/v2/auth?" \
                      f"client_id={settings.google_client_id}&" \
                      f"redirect_uri={settings.google_redirect_uri}&" \
                      f"response_type=code&" \
                      f"scope=openid email profile&" \
                      f"access_type=offline"
    
    return RedirectResponse(url=google_auth_url)

@router.post("/google")
async def google_auth(request: GoogleAuthRequest):
    """Exchange Google authorization code for tokens."""
    # Request deduplication - prevent multiple simultaneous calls with same code
    request_key = f"{request.code[:20]}_{request.redirect_uri}"
    
    if request_key in _ongoing_requests:
        logger.warning(f"Duplicate request detected for code: {request.code[:10]}...")
        # Wait for the ongoing request to complete
        try:
            result = await _ongoing_requests[request_key]
            logger.info(f"Returning result from ongoing request for code: {request.code[:10]}...")
            return result
        except Exception as e:
            logger.error(f"Ongoing request failed: {e}")
            # Remove failed request and continue with new one
            del _ongoing_requests[request_key]
    
    # Create a future for this request
    future = asyncio.Future()
    _ongoing_requests[request_key] = future
    
    try:
        # Debug logging
        logger.info(f"Google auth request received - code: {request.code[:10]}..., redirect_uri: {request.redirect_uri}")
        logger.info(f"Backend config - client_id: {settings.google_client_id[:10]}..., redirect_uri: {settings.google_redirect_uri}")
        
        # Validate redirect_uri matches
        if request.redirect_uri != settings.google_redirect_uri:
            logger.error(f"Redirect URI mismatch: frontend={request.redirect_uri}, backend={settings.google_redirect_uri}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Redirect URI mismatch"
            )
        
        # Exchange code for tokens
        token_url = "https://oauth2.googleapis.com/token"
        token_data = {
            "client_id": settings.google_client_id,
            "client_secret": settings.google_client_secret,
            "code": request.code,
            "grant_type": "authorization_code",
            "redirect_uri": request.redirect_uri
        }
        
        logger.info(f"Token exchange data: {token_data}")
        
        async with httpx.AsyncClient() as client:
            response = await client.post(token_url, data=token_data)
            logger.info(f"Google token response status: {response.status_code}")
            
            if response.status_code != 200:
                error_text = response.text
                logger.error(f"Google token response error: {error_text}")
                
                # Parse error response for better error messages
                try:
                    error_data = response.json()
                    if error_data.get("error") == "invalid_grant":
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail="Authorization code expired or invalid. Please try logging in again."
                        )
                    else:
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail=f"Google authentication failed: {error_data.get('error_description', 'Unknown error')}"
                        )
                except:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Google authentication failed: {error_text}"
                    )
            
            token_response = response.json()
        
        # Get user info using access token
        user_info_url = "https://www.googleapis.com/oauth2/v2/userinfo"
        headers = {"Authorization": f"Bearer {token_response['access_token']}"}
        
        logger.info(f"Getting user info from: {user_info_url}")
        
        async with httpx.AsyncClient() as client:
            response = await client.get(user_info_url, headers=headers)
            logger.info(f"User info response status: {response.status_code}")
            
            if response.status_code != 200:
                logger.error(f"User info response error: {response.text}")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Failed to get user information from Google"
                )
            
            user_info = response.json()
            logger.info(f"User info received: {user_info}")
            
            # Validate required fields and normalize field names
            if 'sub' not in user_info and 'id' not in user_info:
                logger.error(f"Missing 'sub' or 'id' field in user info: {user_info}")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid user information from Google"
                )
            
            # Normalize field names - Google sometimes uses 'id' instead of 'sub'
            if 'sub' not in user_info and 'id' in user_info:
                user_info['sub'] = user_info['id']
                logger.info(f"Normalized 'id' to 'sub': {user_info['sub']}")
        
        # Get or create user
        user = await get_or_create_user(user_info)
        
        # Create JWT tokens
        access_token = create_user_token(user.id, user.email)
        refresh_token = create_refresh_token(user.id)
        
        result = {
            "user": user,
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer"
        }
        
        # Set the future result for other waiting requests
        future.set_result(result)
        
        # Clean up the request tracking
        del _ongoing_requests[request_key]
        
        return result
        
    except Exception as e:
        logger.error(f"Google auth error: {e}")
        # Set the future exception for other waiting requests
        future.set_exception(e)
        
        # Clean up the request tracking
        del _ongoing_requests[request_key]
        
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Google authentication failed: {str(e)}"
        )

@router.get("/google/callback")
async def google_callback(code: str):
    """Handle Google OAuth callback."""
    try:
        # Exchange code for tokens
        token_url = "https://oauth2.googleapis.com/token"
        token_data = {
            "client_id": settings.google_client_id,
            "client_secret": settings.google_client_secret,
            "code": code,
            "grant_type": "authorization_code",
            "redirect_uri": settings.google_redirect_uri
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(token_url, data=token_data)
            response.raise_for_status()
            token_response = response.json()
        
        # Get user info using access token
        user_info_url = "https://www.googleapis.com/oauth2/v2/userinfo"
        headers = {"Authorization": f"Bearer {token_response['access_token']}"}
        
        async with httpx.AsyncClient() as client:
            response = await client.get(user_info_url, headers=headers)
            response.raise_for_status()
            user_info = response.json()
        
        # Get or create user
        user = await get_or_create_user(user_info)
        
        # Create JWT tokens
        access_token = create_user_token(user.id, user.email)
        refresh_token = create_refresh_token(user.id)
        
        # Redirect to frontend with tokens
        frontend_url = f"http://localhost:5173/auth/google/callback?" \
                      f"access_token={access_token}&" \
                      f"refresh_token={refresh_token}&" \
                      f"user_id={user.id}"
        
        return RedirectResponse(url=frontend_url)
        
    except Exception as e:
        logger.error(f"Google callback error: {e}")
        # Redirect to frontend with error
        error_url = f"http://localhost:5173/auth/error?message=Authentication failed"
        return RedirectResponse(url=error_url)

@router.post("/refresh")
async def refresh_token(refresh_token: str):
    """Refresh access token using refresh token."""
    try:
        # Verify refresh token
        payload = verify_token(refresh_token)
        
        if payload.get("type") != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token type"
            )
        
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token"
            )
        
        # Get user info
        users_collection = await get_collection(USERS_COLLECTION)
        user_data = await users_collection.find_one({"_id": ObjectId(user_id)})
        
        if not user_data:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found"
            )
        
        # Create new access token
        new_access_token = create_user_token(str(user_data["_id"]), user_data["email"])
        
        return {
            "access_token": new_access_token,
            "token_type": "bearer"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Token refresh error: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token refresh failed"
        )
