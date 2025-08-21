from fastapi import APIRouter, HTTPException, status, Depends
from typing import Dict, Any
import logging
from datetime import datetime
from bson import ObjectId
import uuid

from models.user import User
from auth.jwt_handler import get_current_active_user
from database.mongodb import get_collection, TRANSACTIONS_COLLECTION, WALLETS_COLLECTION
from payments.paystack_service import paystack_service
from payments.mpesa_service import mpesa_service
from config.settings import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

router = APIRouter()

@router.post("/deposit/paystack")
async def initiate_paystack_deposit(
    amount: float,
    callback_url: str,
    current_user: User = Depends(get_current_active_user)
):
    """Initiate a Paystack deposit."""
    try:
        if amount < 100:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Minimum deposit amount is KES 100"
            )
        
        # Generate unique reference
        reference = f"DEP{datetime.utcnow().strftime('%Y%m%d')}{uuid.uuid4().hex[:8].upper()}"
        
        # Initialize Paystack transaction
        result = await paystack_service.initialize_transaction(
            amount=amount,
            email=current_user.email,
            reference=reference,
            callback_url=callback_url
        )
        
        if not result["success"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result["error"]
            )
        
        # Create pending transaction record
        transaction = {
            "_id": ObjectId(),
            "user_id": current_user.id,
            "transaction_type": "paystack_deposit",
            "amount": amount,
            "currency": "KES",
            "reference": reference,
            "status": "pending",
            "gateway": "paystack",
            "gateway_ref": result["reference"],
            "created_at": datetime.utcnow(),
            "metadata": {
                "authorization_url": result["authorization_url"],
                "access_code": result["access_code"]
            }
        }
        
        transactions_collection = await get_collection(TRANSACTIONS_COLLECTION)
        await transactions_collection.insert_one(transaction)
        
        return {
            "success": True,
            "authorization_url": result["authorization_url"],
            "reference": reference,
            "amount": amount
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error initiating Paystack deposit: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to initiate deposit"
        )

@router.post("/deposit/mpesa")
async def initiate_mpesa_deposit(
    amount: float,
    phone_number: str,
    current_user: User = Depends(get_current_active_user)
):
    """Initiate an M-Pesa deposit."""
    try:
        if amount < 10:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Minimum M-Pesa deposit amount is KES 10"
            )
        
        if amount > 70000:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Maximum M-Pesa deposit amount is KES 70,000"
            )
        
        # Generate unique reference
        reference = f"MPESA{datetime.utcnow().strftime('%Y%m%d')}{uuid.uuid4().hex[:8].upper()}"
        
        # Initiate M-Pesa STK push
        result = await mpesa_service.stk_push(
            phone_number=phone_number,
            amount=amount,
            reference=reference,
            description="Wallet deposit"
        )
        
        if not result["success"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result["error"]
            )
        
        # Create pending transaction record
        transaction = {
            "_id": ObjectId(),
            "user_id": current_user.id,
            "transaction_type": "mpesa_deposit",
            "amount": amount,
            "currency": "KES",
            "reference": reference,
            "status": "pending",
            "gateway": "mpesa",
            "gateway_ref": result["CheckoutRequestID"],
            "created_at": datetime.utcnow(),
            "metadata": {
                "phone_number": phone_number,
                "merchant_request_id": result["MerchantRequestID"]
            }
        }
        
        transactions_collection = await get_collection(TRANSACTIONS_COLLECTION)
        await transactions_collection.insert_one(transaction)
        
        return {
            "success": True,
            "reference": reference,
            "amount": amount,
            "message": "STK push sent to your phone. Please check and enter M-Pesa PIN to complete."
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error initiating M-Pesa deposit: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to initiate M-Pesa deposit"
        )

@router.post("/withdraw/mpesa")
async def initiate_mpesa_withdrawal(
    amount: float,
    phone_number: str,
    pin: str,
    current_user: User = Depends(get_current_active_user)
):
    """Initiate an M-Pesa withdrawal."""
    try:
        # Validate wallet PIN (you'd implement this)
        # if not verify_wallet_pin(current_user.id, pin):
        #     raise HTTPException(
        #         status_code=status.HTTP_400_BAD_REQUEST,
        #         detail="Invalid wallet PIN"
        #     )
        
        if amount < 10:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Minimum withdrawal amount is KES 10"
            )
        
        if amount > 70000:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Maximum withdrawal amount is KES 70,000"
            )
        
        # Check wallet balance
        wallets_collection = await get_collection(WALLETS_COLLECTION)
        wallet = await wallets_collection.find_one({"user_id": current_user.id})
        
        if not wallet or wallet.get("balance_kes", 0) < amount:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Insufficient wallet balance"
            )
        
        # Generate unique reference
        reference = f"WTH{datetime.utcnow().strftime('%Y%m%d')}{uuid.uuid4().hex[:8].upper()}"
        
        # Initiate M-Pesa B2C payment
        result = await mpesa_service.b2c_payment(
            phone_number=phone_number,
            amount=amount,
            reference=reference,
            description="Wallet withdrawal"
        )
        
        if not result["success"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result["error"]
            )
        
        # Create pending transaction record
        transaction = {
            "_id": ObjectId(),
            "user_id": current_user.id,
            "transaction_type": "mpesa_withdrawal",
            "amount": amount,
            "currency": "KES",
            "reference": reference,
            "status": "pending",
            "gateway": "mpesa",
            "gateway_ref": result["ConversationID"],
            "created_at": datetime.utcnow(),
            "metadata": {
                "phone_number": phone_number,
                "conversation_id": result["ConversationID"]
            }
        }
        
        transactions_collection = await get_collection(TRANSACTIONS_COLLECTION)
        await transactions_collection.insert_one(transaction)
        
        # Deduct amount from wallet (will be reversed if withdrawal fails)
        await wallets_collection.update_one(
            {"user_id": current_user.id},
            {
                "$inc": {"balance_kes": -amount},
                "$set": {"updated_at": datetime.utcnow()}
            }
        )
        
        return {
            "success": True,
            "reference": reference,
            "amount": amount,
            "message": "Withdrawal initiated. You will receive an SMS confirmation."
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error initiating M-Pesa withdrawal: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to initiate withdrawal"
        )

@router.get("/banks")
async def get_supported_banks():
    """Get list of supported banks for transfers."""
    try:
        result = await paystack_service.get_banks()
        
        if not result["success"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result["error"]
            )
        
        return {
            "success": True,
            "banks": result["banks"]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting banks: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get banks"
        )

@router.post("/verify/paystack")
async def verify_paystack_transaction(
    reference: str,
    current_user: User = Depends(get_current_active_user)
):
    """Verify a Paystack transaction."""
    try:
        # Verify with Paystack
        result = await paystack_service.verify_transaction(reference)
        
        if not result["success"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result["error"]
            )
        
        # Update transaction status
        transactions_collection = await get_collection(TRANSACTIONS_COLLECTION)
        transaction = await transactions_collection.find_one({"reference": reference})
        
        if not transaction:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Transaction not found"
            )
        
        if transaction["user_id"] != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to verify this transaction"
            )
        
        # Update transaction
        await transactions_collection.update_one(
            {"reference": reference},
            {
                "$set": {
                    "status": "completed",
                    "completed_at": datetime.utcnow(),
                    "gateway_ref": result["gateway_ref"]
                }
            }
        )
        
        # Credit user's wallet
        wallets_collection = await get_collection(WALLETS_COLLECTION)
        await wallets_collection.update_one(
            {"user_id": current_user.id},
            {
                "$inc": {"balance_kes": result["amount_kes"]},
                "$set": {"updated_at": datetime.utcnow()}
            }
        )
        
        return {
            "success": True,
            "message": "Deposit completed successfully",
            "amount_kes": result["amount_kes"],
            "reference": reference
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error verifying Paystack transaction: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to verify transaction"
        )

@router.post("/callback/mpesa")
async def mpesa_callback(callback_data: Dict[str, Any]):
    """Handle M-Pesa callback."""
    try:
        # This would handle M-Pesa webhook callbacks
        # For now, just log the data
        logger.info(f"M-Pesa callback received: {callback_data}")
        
        return {"success": True, "message": "Callback received"}
        
    except Exception as e:
        logger.error(f"Error processing M-Pesa callback: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process callback"
        )
