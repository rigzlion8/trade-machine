from pydantic_settings import BaseSettings
from typing import Optional
import os

class Settings(BaseSettings):
    # App
    APP_NAME: str = "Trade Machine"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    
    # Security
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # Google OAuth
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_REDIRECT_URI: str = ""
    
    # Database
    MONGODB_URL: str = "mongodb://localhost:27017"
    MONGODB_DB_NAME: str = "trade_machine"
    
    # Redis
    REDIS_URL: str = "redis://localhost:6379"
    
    # External APIs
    BINANCE_API_KEY: str = ""
    BINANCE_SECRET_KEY: str = ""
    
    # Email (Resend)
    RESEND_API_KEY: str = ""
    FROM_EMAIL: str = "noreply@trademachine.com"
    
    # Payment Gateway (Paystack)
    PAYSTACK_SECRET_KEY: str = ""
    PAYSTACK_PUBLIC_KEY: str = ""
    PAYSTACK_WEBHOOK_SECRET: str = ""
    
    # Currency Exchange (for Kenyan market)
    EXCHANGE_RATE_API_KEY: str = ""
    
    # CORS
    ALLOWED_ORIGINS: list = [
        "http://localhost:3000",
        "http://localhost:5173",
        "https://your-frontend-domain.vercel.app"
    ]
    
    class Config:
        env_file = ".env"
        case_sensitive = True

# Create settings instance
settings = Settings()

# Override with Railway environment variables if available
if os.getenv("RAILWAY_ENVIRONMENT"):
    settings.MONGODB_URL = os.getenv("MONGODB_URL", settings.MONGODB_URL)
    settings.REDIS_URL = os.getenv("REDIS_URL", settings.REDIS_URL)
    settings.SECRET_KEY = os.getenv("SECRET_KEY", settings.SECRET_KEY)
