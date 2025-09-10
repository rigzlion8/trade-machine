from pydantic import BaseModel, Field
from typing import Optional, Literal, Dict
from datetime import datetime
from enum import Enum

class PaymentType(str, Enum):
    DEPOSIT = "deposit"
    WITHDRAWAL = "withdrawal"
    TRANSFER = "transfer"
    FEE = "fee"
    REFUND = "refund"

class PaymentStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"
    REFUNDED = "refunded"

class PaymentMethod(str, Enum):
    BANK_TRANSFER = "bank_transfer"
    CARD = "card"
    MOBILE_MONEY = "mobile_money"
    MPESA = "mpesa"
    AIRTEL_MONEY = "airtel_money"
    CRYPTO = "crypto"
    WALLET = "wallet"

class PaymentChannel(str, Enum):
    PAYSTACK = "paystack"
    INTERNAL = "internal"
    CRYPTO = "crypto"

class PaymentCreate(BaseModel):
    amount: float = Field(..., gt=0, description="Payment amount in KES")
    payment_type: PaymentType
    payment_method: PaymentMethod
    description: Optional[str] = None
    recipient_account: Optional[str] = None
    recipient_bank: Optional[str] = None
    recipient_name: Optional[str] = None
    metadata: Optional[dict] = None

class PaymentResponse(BaseModel):
    id: str
    user_id: str
    amount: float
    payment_type: PaymentType
    payment_method: PaymentMethod
    payment_channel: PaymentChannel
    status: PaymentStatus
    description: Optional[str] = None
    reference: str
    gateway_reference: Optional[str] = None
    recipient_account: Optional[str] = None
    recipient_bank: Optional[str] = None
    recipient_name: Optional[str] = None
    fees: float = 0.0
    net_amount: float
    authorization_url: Optional[str] = None
    callback_url: Optional[str] = None
    metadata: Optional[dict] = None
    created_at: datetime
    updated_at: datetime
    completed_at: Optional[datetime] = None

class PaymentUpdate(BaseModel):
    status: Optional[PaymentStatus] = None
    gateway_reference: Optional[str] = None
    fees: Optional[float] = None
    metadata: Optional[dict] = None

class PaymentFilter(BaseModel):
    payment_type: Optional[PaymentType] = None
    payment_method: Optional[PaymentMethod] = None
    payment_channel: Optional[PaymentChannel] = None
    status: Optional[PaymentStatus] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    min_amount: Optional[float] = None
    max_amount: Optional[float] = None
    search: Optional[str] = None

class PaymentStats(BaseModel):
    total_deposits: float = 0.0
    total_withdrawals: float = 0.0
    total_fees: float = 0.0
    pending_deposits: float = 0.0
    pending_withdrawals: float = 0.0
    completed_transactions: int = 0
    failed_transactions: int = 0
    monthly_deposits: float = 0.0
    monthly_withdrawals: float = 0.0

class BankAccount(BaseModel):
    account_number: str
    bank_code: str
    bank_name: str
    account_name: str
    is_verified: bool = False

class BankAccountCreate(BaseModel):
    account_number: str = Field(..., min_length=10, max_length=10)
    bank_code: str = Field(..., min_length=3, max_length=3)
    account_name: str = Field(..., min_length=2, max_length=100)

class BankAccountResponse(BaseModel):
    id: str
    user_id: str
    account_number: str
    bank_code: str
    bank_name: str
    account_name: str
    is_verified: bool
    is_default: bool
    created_at: datetime
    updated_at: datetime

class PaymentWebhook(BaseModel):
    event: str
    data: dict
    reference: str

class ExchangeRate(BaseModel):
    base_currency: str = "KES"
    target_currency: str
    rate: float
    last_updated: datetime

class ExchangeRatesResponse(BaseModel):
    base: str = "KES"
    rates: Dict[str, float]
    last_updated: datetime
