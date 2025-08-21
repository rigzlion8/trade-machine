from pydantic import BaseModel, EmailStr, Field, ConfigDict
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

class UserCreate(BaseModel):
    email: EmailStr
    full_name: str
    phone_number: Optional[str] = None
    google_id: Optional[str] = None
    profile_picture: Optional[str] = None

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    phone_number: Optional[str] = None
    profile_picture: Optional[str] = None
    wallet_pin: Optional[str] = None

class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: str
    email: str
    full_name: str
    phone_number: Optional[str] = None
    profile_picture: Optional[str] = None
    role: UserRole = UserRole.USER
    status: UserStatus = UserStatus.ACTIVE
    wallet_balance_kes: float = 0.0
    wallet_balance_usdt: float = 0.0
    is_phone_verified: bool = False
    is_email_verified: bool = False
    created_at: datetime
    updated_at: datetime

class User(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: str
    email: str
    full_name: str
    phone_number: Optional[str] = None
    google_id: Optional[str] = None
    profile_picture: Optional[str] = None
    role: UserRole = UserRole.USER
    status: UserStatus = UserStatus.ACTIVE
    wallet_balance_kes: float = 0.0
    wallet_balance_usdt: float = 0.0
    wallet_pin: Optional[str] = None
    is_phone_verified: bool = False
    is_email_verified: bool = False
    created_at: datetime
    updated_at: datetime

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserLoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class GoogleAuthRequest(BaseModel):
    code: str
    redirect_uri: str

class PhoneVerificationRequest(BaseModel):
    phone_number: str
    verification_code: str

class WalletPinRequest(BaseModel):
    current_pin: Optional[str] = None
    new_pin: str = Field(..., min_length=4, max_length=4)

class PasswordResetRequest(BaseModel):
    email: EmailStr

class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str = Field(..., min_length=8)
