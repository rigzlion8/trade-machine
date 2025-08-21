from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum

class UserRole(str, Enum):
    USER = "user"
    PREMIUM = "premium"
    ADMIN = "admin"

class UserStatus(str, Enum):
    ACTIVE = "active"
    SUSPENDED = "suspended"
    PENDING_VERIFICATION = "pending_verification"

class WalletStatus(str, Enum):
    ACTIVE = "active"
    SUSPENDED = "suspended"
    PENDING_VERIFICATION = "pending_verification"

class User(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    email: EmailStr
    full_name: str
    google_id: Optional[str] = None
    profile_picture: Optional[str] = None
    
    # Kenyan market specific
    phone_number: Optional[str] = None
    country: str = "Kenya"
    currency: str = "KES"
    timezone: str = "Africa/Nairobi"
    
    # Trading preferences
    risk_tolerance: str = "medium"  # low, medium, high
    preferred_pairs: List[str] = ["BTC/USDT", "ETH/USDT"]
    
    # Account details
    role: UserRole = UserRole.USER
    status: UserStatus = UserStatus.PENDING_VERIFICATION
    is_verified: bool = False
    
    # Mobile Wallet
    wallet_id: Optional[str] = None
    wallet_status: WalletStatus = WalletStatus.PENDING_VERIFICATION
    wallet_pin: Optional[str] = None  # Hashed PIN for wallet access
    wallet_balance_kes: float = 0.0
    wallet_balance_usdt: float = 0.0
    
    # Financial
    balance_usdt: float = 0.0
    balance_kes: float = 0.0
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    last_login: Optional[datetime] = None
    
    class Config:
        allow_population_by_field_name = True
        schema_extra = {
            "example": {
                "email": "user@example.com",
                "full_name": "John Doe",
                "phone_number": "+254700000000",
                "country": "Kenya",
                "currency": "KES",
                "risk_tolerance": "medium"
            }
        }

class UserCreate(BaseModel):
    email: EmailStr
    full_name: str
    google_id: Optional[str] = None
    profile_picture: Optional[str] = None
    phone_number: Optional[str] = None

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    phone_number: Optional[str] = None
    risk_tolerance: Optional[str] = None
    preferred_pairs: Optional[List[str]] = None

class UserResponse(BaseModel):
    id: str
    email: EmailStr
    full_name: str
    profile_picture: Optional[str] = None
    phone_number: Optional[str] = None
    country: str
    currency: str
    role: UserRole
    status: UserStatus
    is_verified: bool
    balance_usdt: float
    balance_kes: float
    wallet_balance_kes: float
    wallet_balance_usdt: float
    wallet_status: WalletStatus
    created_at: datetime
    last_login: Optional[datetime] = None
