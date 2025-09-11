from fastapi import APIRouter, HTTPException, status, Depends, Query
from typing import Optional, List
import logging
from datetime import datetime

from models.payment import (
    PaymentCreate, PaymentResponse, PaymentUpdate, PaymentFilter, 
    PaymentStats, BankAccountCreate, BankAccountResponse,
    DepositInitializeRequest
)
from services.payment_service import payment_service
from payments.paystack_service import paystack_service
from services.exchange_rate_service import exchange_rate_service
from auth.jwt_handler import get_current_active_user
from models.user import User
from models.payment import PaymentMethod

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/deposit/initialize", response_model=dict)
async def initialize_deposit(
    request: DepositInitializeRequest,
    current_user: User = Depends(get_current_active_user)
):
    """Initialize a deposit transaction."""
    try:
        if request.amount <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Amount must be greater than 0"
            )
        
        if request.amount < 100:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Minimum deposit amount is KES 100"
            )
        
        # Validate payment method specific requirements
        if request.payment_method in ["mpesa", "airtel_money"]:
            if not request.phone_number:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Phone number is required for mobile money payments"
                )
            if not request.provider:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Provider is required for mobile money payments"
                )
        elif request.payment_method == "ussd":
            if not request.bank_code:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Bank code is required for USSD payments"
                )
        
        result = await payment_service.initialize_deposit(
            user_id=str(current_user.id),
            amount=request.amount,
            email=current_user.email,
            payment_method=PaymentMethod(request.payment_method),
            phone_number=request.phone_number,
            provider=request.provider,
            bank_code=request.bank_code
        )
        
        if not result["success"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result["error"]
            )
        
        response_data = {
            "message": "Deposit initialized successfully",
            "payment_id": result["payment_id"],
            "reference": result["reference"],
            "fees": result["fees"],
            "net_amount": result["net_amount"]
        }
        
        # Add method-specific response data
        if result.get("authorization_url"):
            response_data["authorization_url"] = result["authorization_url"]
        if result.get("ussd_code"):
            response_data["ussd_code"] = result["ussd_code"]
            response_data["display_text"] = result.get("display_text")
        if result.get("message"):
            response_data["message"] = result["message"]
        
        return response_data
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error initializing deposit: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to initialize deposit"
        )

@router.post("/withdrawal/initialize", response_model=dict)
async def initialize_withdrawal(
    amount: float,
    bank_account_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """Initialize a withdrawal transaction."""
    try:
        if amount <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Amount must be greater than 0"
            )
        
        if amount < 500:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Minimum withdrawal amount is KES 500"
            )
        
        # Check if user has sufficient balance
        if current_user.wallet_balance_kes < amount:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Insufficient wallet balance"
            )
        
        result = await payment_service.initialize_withdrawal(
            user_id=str(current_user.id),
            amount=amount,
            bank_account_id=bank_account_id
        )
        
        if not result["success"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result["error"]
            )
        
        return {
            "message": "Withdrawal initialized successfully",
            "payment_id": result["payment_id"],
            "reference": result["reference"],
            "transfer_code": result["transfer_code"],
            "fees": result["fees"],
            "net_amount": result["net_amount"]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error initializing withdrawal: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to initialize withdrawal"
        )

@router.post("/verify/{reference}")
async def verify_payment(reference: str):
    """Verify a payment transaction."""
    try:
        result = await payment_service.verify_payment(reference)
        
        if not result["success"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result["error"]
        )
        
        return {
            "message": "Payment verified successfully",
            "status": result["status"],
            "amount": result["amount"]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error verifying payment: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to verify payment"
        )

@router.get("/history", response_model=List[PaymentResponse])
async def get_payment_history(
    payment_type: Optional[str] = Query(None),
    payment_method: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    min_amount: Optional[float] = Query(None),
    max_amount: Optional[float] = Query(None),
    search: Optional[str] = Query(None),
    limit: int = Query(50, le=100),
    skip: int = Query(0, ge=0),
    current_user: User = Depends(get_current_active_user)
):
    """Get user payment history with filters."""
    try:
        filters = PaymentFilter(
            payment_type=payment_type,
            payment_method=payment_method,
            status=status,
            start_date=start_date,
            end_date=end_date,
            min_amount=min_amount,
            max_amount=max_amount,
            search=search
        )
        
        payments = await payment_service.get_user_payments(
            user_id=str(current_user.id),
            filters=filters,
            limit=limit,
            skip=skip
        )
        
        return payments
        
    except Exception as e:
        logger.error(f"Error getting payment history: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get payment history"
        )

@router.get("/stats", response_model=PaymentStats)
async def get_payment_stats(
    current_user: User = Depends(get_current_active_user)
):
    """Get payment statistics for user."""
    try:
        stats = await payment_service.get_payment_stats(str(current_user.id))
        return stats
        
    except Exception as e:
        logger.error(f"Error getting payment stats: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get payment statistics"
        )

@router.get("/banks")
async def get_supported_banks():
    """Get list of supported banks."""
    try:
        result = await paystack_service.get_banks()
        
        if not result["success"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result["error"]
            )
        
        return {
            "banks": result["banks"]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting banks: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get supported banks"
        )

@router.get("/mobile-money-providers")
async def get_mobile_money_providers():
    """Get list of supported mobile money providers."""
    try:
        result = await paystack_service.get_mobile_money_providers()
        
        if not result["success"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result["error"]
            )
        
        return {
            "providers": result["providers"]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting mobile money providers: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get mobile money providers"
        )

@router.get("/ussd-codes")
async def get_ussd_codes():
    """Get list of available USSD codes for payments."""
    try:
        result = await paystack_service.get_ussd_codes()
        
        if not result["success"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result["error"]
            )
        
        return {
            "ussd_codes": result["ussd_codes"]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting USSD codes: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get USSD codes"
        )

@router.post("/banks/resolve")
async def resolve_account_number(
    account_number: str,
    bank_code: str
):
    """Resolve account number to get account name."""
    try:
        result = await paystack_service.resolve_account_number(account_number, bank_code)
        
        if not result["success"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result["error"]
            )
        
        return {
            "account_number": result["account_number"],
            "account_name": result["account_name"],
            "bank_id": result["bank_id"]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error resolving account: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to resolve account number"
        )

@router.post("/bank-accounts", response_model=BankAccountResponse)
async def add_bank_account(
    bank_account: BankAccountCreate,
    current_user: User = Depends(get_current_active_user)
):
    """Add a bank account for withdrawals."""
    try:
        # Resolve account number first
        resolve_result = await paystack_service.resolve_account_number(
            bank_account.account_number,
            bank_account.bank_code
        )
        
        if not resolve_result["success"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=resolve_result["error"]
            )
        
        # Get bank name
        banks_result = await paystack_service.get_banks()
        bank_name = "Unknown Bank"
        if banks_result["success"]:
            for bank in banks_result["banks"]:
                if bank["code"] == bank_account.bank_code:
                    bank_name = bank["name"]
                    break
        
        # Create bank account record
        from database.mongodb import get_collection
        from bson import ObjectId
        
        bank_accounts_collection = await get_collection("bank_accounts")
        
        # Check if account already exists
        existing = await bank_accounts_collection.find_one({
            "user_id": ObjectId(current_user.id),
            "account_number": bank_account.account_number,
            "bank_code": bank_account.bank_code
        })
        
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Bank account already exists"
            )
        
        # Create new bank account
        bank_account_doc = {
            "_id": ObjectId(),
            "user_id": ObjectId(current_user.id),
            "account_number": bank_account.account_number,
            "bank_code": bank_account.bank_code,
            "bank_name": bank_name,
            "account_name": resolve_result["account_name"],
            "is_verified": True,
            "is_default": False,
            "recipient_code": None,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        result = await bank_accounts_collection.insert_one(bank_account_doc)
        
        # Convert to response
        bank_account_doc["id"] = str(bank_account_doc["_id"])
        del bank_account_doc["_id"]
        del bank_account_doc["recipient_code"]
        
        return BankAccountResponse(**bank_account_doc)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error adding bank account: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to add bank account"
        )

@router.get("/bank-accounts", response_model=List[BankAccountResponse])
async def get_bank_accounts(
    current_user: User = Depends(get_current_active_user)
):
    """Get user's bank accounts."""
    try:
        from database.mongodb import get_collection
        from bson import ObjectId
        
        bank_accounts_collection = await get_collection("bank_accounts")
        cursor = bank_accounts_collection.find({
            "user_id": ObjectId(current_user.id)
        }).sort("created_at", -1)
        
        bank_accounts = await cursor.to_list(length=None)
        
        result = []
        for account in bank_accounts:
            account["id"] = str(account["_id"])
            del account["_id"]
            if "recipient_code" in account:
                del account["recipient_code"]
            result.append(BankAccountResponse(**account))
        
        return result
        
    except Exception as e:
        logger.error(f"Error getting bank accounts: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get bank accounts"
        )

@router.delete("/bank-accounts/{account_id}")
async def delete_bank_account(
    account_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """Delete a bank account."""
    try:
        from database.mongodb import get_collection
        from bson import ObjectId
        
        bank_accounts_collection = await get_collection("bank_accounts")
        
        result = await bank_accounts_collection.delete_one({
            "_id": ObjectId(account_id),
            "user_id": ObjectId(current_user.id)
        })
        
        if result.deleted_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Bank account not found"
            )
        
        return {"message": "Bank account deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting bank account: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete bank account"
        )

@router.post("/webhook")
async def handle_payment_webhook(webhook_data: dict):
    """Handle Paystack webhook notifications."""
    try:
        event = webhook_data.get("event")
        data = webhook_data.get("data", {})
        
        if event == "charge.success":
            reference = data.get("reference")
            if reference:
                await payment_service.verify_payment(reference)
        
        elif event == "transfer.success":
            transfer_code = data.get("transfer_code")
            if transfer_code:
                # Update withdrawal status
                from database.mongodb import get_collection
                payments_collection = await get_collection("payments")
                await payments_collection.update_one(
                    {"gateway_reference": transfer_code},
                    {"$set": {"status": "completed", "completed_at": datetime.utcnow()}}
                )
        
        return {"status": "success"}
        
    except Exception as e:
        logger.error(f"Error handling webhook: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Webhook processing failed"
        )

@router.get("/exchange-rates")
async def get_exchange_rates():
    """Get current exchange rates."""
    try:
        rates = await exchange_rate_service.get_exchange_rates()
        
        if not rates:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Exchange rates service unavailable"
            )
        
        return {
            "base": rates.base,
            "rates": rates.rates,
            "last_updated": rates.last_updated
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting exchange rates: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get exchange rates"
        )

@router.get("/mobile-money-providers")
async def get_mobile_money_providers():
    """Get available mobile money providers."""
    try:
        result = await paystack_service.get_mobile_money_providers()
        
        if not result["success"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result["error"]
        )
        
        return {
            "providers": result["providers"]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting mobile money providers: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get mobile money providers"
        )

@router.post("/convert-currency")
async def convert_currency(
    amount: float,
    from_currency: str = "KES",
    to_currency: str = "USD"
):
    """Convert amount from one currency to another."""
    try:
        if amount <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Amount must be greater than 0"
            )
        
        converted_amount = await exchange_rate_service.convert_amount(
            amount, from_currency, to_currency
        )
        
        if converted_amount is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Currency conversion failed"
            )
        
        return {
            "original_amount": amount,
            "original_currency": from_currency,
            "converted_amount": converted_amount,
            "target_currency": to_currency,
            "rate": converted_amount / amount if amount > 0 else 0
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error converting currency: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to convert currency"
        )