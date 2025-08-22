from pydantic_settings import BaseSettings
from typing import Optional
import os

class Settings(BaseSettings):
    # App settings
    app_name: str = "Trade Machine API"
    app_version: str = "1.0.0"
    debug: bool = False
    
    # Server settings
    host: str = "0.0.0.0"
    port: int = 8000
    
    # Database settings
    mongodb_url: str = "mongodb://localhost:27017"
    mongodb_database: str = "trade_machine"
    
    # Redis settings
    redis_url: str = "redis://localhost:6379"
    
    # JWT settings
    jwt_secret_key: str = "your-secret-key-change-in-production"
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 30
    
    # Google OAuth settings
    google_client_id: str = ""
    google_client_secret: str = ""
    google_redirect_uri: str = "http://localhost:5173/auth/google/callback"
    
    # Paystack settings
    paystack_secret_key: str = ""
    paystack_public_key: str = ""
    
    # Crypto API settings
    BINANCE_API_KEY: str = ""
    BINANCE_SECRET_KEY: str = ""
    coinbase_api_key: str = ""
    coinbase_secret_key: str = ""
    
    # Email settings
    resend_api_key: str = ""
    sender_email: str = "noreply@trademachine.com"
    
    # Security settings
    cors_origins: list = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:5174",
        "https://yourdomain.com"
    ]
    
    # Rate limiting
    rate_limit_per_minute: int = 60
    
    class Config:
        env_file = ".env"
        case_sensitive = False

# Global settings instance
settings = Settings()

def get_settings() -> Settings:
    return settings
