from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum

class TransactionType(str, Enum):
    DEPOSIT = "deposit"
    WITHDRAWAL = "withdrawal"
    TRANSFER = "transfer"
    TRADING = "trading"
    REFUND = "refund"
    FEE = "fee"

class TransactionStatus(str, Enum):
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"

class TransferType(str, Enum):
    P2P = "p2p"  # User to User
    BANK = "bank"  # Bank transfer
    MPESA = "mpesa"  # M-Pesa
    AIRTEL_MONEY = "airtel_money"  # Airtel Money

class Wallet(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    user_id: str
    wallet_number: str  # Unique wallet number (e.g., TM0012345678)
    balance_kes: float = 0.0
    balance_usdt: float = 0.0
    status: str = "active"
    is_locked: bool = False
    daily_limit_kes: float = 100000.0  # 100K KES daily limit
    monthly_limit_kes: float = 1000000.0  # 1M KES monthly limit
    daily_transfer_count: int = 0
    monthly_transfer_count: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class WalletTransaction(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    transaction_id: str  # Unique transaction ID
    wallet_id: str
    user_id: str
    transaction_type: TransactionType
    transfer_type: Optional[TransferType] = None
    amount: float
    currency: str = "KES"
    fee: float = 0.0
    total_amount: float
    balance_before: float
    balance_after: float
    status: TransactionStatus = TransactionStatus.PENDING
    reference: Optional[str] = None
    description: Optional[str] = None
    
    # For transfers
    recipient_wallet_id: Optional[str] = None
    recipient_user_id: Optional[str] = None
    recipient_phone: Optional[str] = None
    
    # For external transfers
    external_reference: Optional[str] = None
    bank_code: Optional[str] = None
    bank_name: Optional[str] = None
    account_number: Optional[str] = None
    account_name: Optional[str] = None
    
    # Metadata
    metadata: dict = {}
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None

class P2PTransfer(BaseModel):
    sender_wallet_id: str
    recipient_phone: str  # Phone number to identify recipient
    amount: float
    currency: str = "KES"
    description: Optional[str] = None
    pin: str  # Wallet PIN for security

class BankTransfer(BaseModel):
    wallet_id: str
    bank_code: str
    account_number: str
    account_name: str
    amount: float
    currency: str = "KES"
    description: Optional[str] = None
    pin: str

class WalletPinUpdate(BaseModel):
    current_pin: str
    new_pin: str
    confirm_pin: str

class WalletLimitUpdate(BaseModel):
    daily_limit_kes: Optional[float] = None
    monthly_limit_kes: Optional[float] = None

class WalletResponse(BaseModel):
    id: str
    wallet_number: str
    balance_kes: float
    balance_usdt: float
    status: str
    is_locked: bool
    daily_limit_kes: float
    monthly_limit_kes: float
    daily_transfer_count: int
    monthly_transfer_count: int
    created_at: datetime

class TransactionResponse(BaseModel):
    id: str
    transaction_id: str
    transaction_type: TransactionType
    transfer_type: Optional[TransferType]
    amount: float
    currency: str
    fee: float
    total_amount: float
    status: TransactionStatus
    description: Optional[str]
    recipient_phone: Optional[str]
    created_at: datetime
    completed_at: Optional[datetime]
