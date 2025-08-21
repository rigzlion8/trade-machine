from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime
from enum import Enum

class TransactionType(str, Enum):
    P2P_SEND = "p2p_send"
    P2P_RECEIVE = "p2p_receive"
    BANK_TRANSFER = "bank_transfer"
    BANK_RECEIVE = "bank_receive"
    MPESA_SEND = "mpesa_send"
    MPESA_RECEIVE = "mpesa_receive"
    CRYPTO_DEPOSIT = "crypto_deposit"
    CRYPTO_WITHDRAWAL = "crypto_withdrawal"
    TRADING_PROFIT = "trading_profit"
    TRADING_LOSS = "trading_loss"
    FEE = "fee"

class TransactionStatus(str, Enum):
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"

class Transaction(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: str
    user_id: str
    transaction_type: TransactionType
    amount: float
    currency: str = "KES"
    recipient_phone: Optional[str] = None
    recipient_bank: Optional[str] = None
    recipient_account: Optional[str] = None
    description: Optional[str] = None
    fee: float = 0.0
    total_amount: float
    status: TransactionStatus = TransactionStatus.PENDING
    reference: str
    created_at: datetime
    completed_at: Optional[datetime] = None
    failure_reason: Optional[str] = None

class TransactionCreate(BaseModel):
    transaction_type: TransactionType
    amount: float
    currency: str = "KES"
    recipient_phone: Optional[str] = None
    recipient_bank: Optional[str] = None
    recipient_account: Optional[str] = None
    description: Optional[str] = None

class TransactionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: str
    transaction_type: TransactionType
    amount: float
    currency: str
    recipient_phone: Optional[str] = None
    recipient_bank: Optional[str] = None
    recipient_account: Optional[str] = None
    description: Optional[str] = None
    fee: float
    total_amount: float
    status: TransactionStatus
    reference: str
    created_at: datetime
    completed_at: Optional[datetime] = None

class Wallet(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: str
    user_id: str
    balance_kes: float = 0.0
    balance_usdt: float = 0.0
    total_received: float = 0.0
    total_sent: float = 0.0
    total_fees: float = 0.0
    daily_transfer_count: int = 0
    daily_transfer_amount: float = 0.0
    last_transfer_date: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

class WalletCreate(BaseModel):
    user_id: str

class WalletUpdate(BaseModel):
    balance_kes: Optional[float] = None
    balance_usdt: Optional[float] = None
    total_received: Optional[float] = None
    total_sent: Optional[float] = None
    total_fees: Optional[float] = None

class WalletResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: str
    balance_kes: float
    balance_usdt: float
    total_received: float
    total_sent: float
    total_fees: float
    daily_transfer_count: int
    daily_transfer_amount: float
    last_transfer_date: Optional[datetime] = None

class TransferRequest(BaseModel):
    recipient_phone: Optional[str] = None
    recipient_bank: Optional[str] = None
    recipient_account: Optional[str] = None
    amount: float = Field(..., gt=0)
    description: Optional[str] = None
    pin: str = Field(..., min_length=4, max_length=4)

class TransferResponse(BaseModel):
    transaction_id: str
    reference: str
    status: TransactionStatus
    message: str

class BankTransferRequest(BaseModel):
    bank_code: str
    account_number: str
    account_name: str
    amount: float = Field(..., gt=0)
    description: Optional[str] = None
    pin: str = Field(..., min_length=4, max_length=4)

class P2PTransferRequest(BaseModel):
    recipient_phone: str
    amount: float = Field(..., gt=0)
    description: Optional[str] = None
    pin: str = Field(..., min_length=4, max_length=4)
