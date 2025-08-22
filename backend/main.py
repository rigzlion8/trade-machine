from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.responses import JSONResponse
import uvicorn
from datetime import datetime, timedelta
import os
from typing import Optional

# Import our modules
from auth.google_oauth import router as google_router
from auth.auth_router import router as auth_router
from wallet.wallet_router import router as wallet_router
from bots.bot_router import router as bot_router
from payments.payment_router import router as payment_router
from realtime.websocket_router import router as websocket_router
from trading.trading_router import router as trading_router
from auth.jwt_handler import create_access_token, get_current_user
from models.user import User, UserCreate, UserResponse
from models.wallet import Wallet, WalletCreate
from database.mongodb import get_database
from config.settings import get_settings

# Initialize FastAPI app
app = FastAPI(
    title="Trade Machine API",
    description="Crypto Trading Bot Platform with Mobile Wallet",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS middleware for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],  # React dev servers
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(google_router, prefix="/auth", tags=["Authentication"])
app.include_router(auth_router, prefix="/auth", tags=["Authentication"])
app.include_router(wallet_router, prefix="/wallet", tags=["Wallet"])
app.include_router(bot_router, prefix="/bots", tags=["Trading Bots"])
app.include_router(payment_router, prefix="/payments", tags=["Payments"])
app.include_router(websocket_router, tags=["WebSockets"])
app.include_router(trading_router, tags=["Trading"])

# Health check endpoint
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "version": "1.0.0"
    }

# Root endpoint
@app.get("/")
async def root():
    return {
        "message": "Trade Machine API",
        "version": "1.0.0",
        "docs": "/docs"
    }

# Debug endpoint to test authentication
@app.get("/debug/auth")
async def debug_auth(current_user = Depends(get_current_user)):
    return {
        "message": "Authentication successful",
        "user_id": current_user.id,
        "email": current_user.email,
        "status": current_user.status
    }

# Error handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail}
    )

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
