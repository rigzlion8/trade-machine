from fastapi import APIRouter, HTTPException, status, Depends
from typing import List, Optional
import logging
from datetime import datetime, timedelta
from bson import ObjectId
import uuid

from models.wallet import (
    WalletResponse, TransactionResponse, TransferRequest, 
    BankTransferRequest, P2PTransferRequest, TransferResponse
)
from models.user import User
from auth.jwt_handler import get_current_active_user
from database.mongodb import get_collection, USERS_COLLECTION, WALLETS_COLLECTION, TRANSACTIONS_COLLECTION
from config.settings import get_settings
from realtime.websocket_manager import manager, WebSocketMessage

logger = logging.getLogger(__name__)
settings = get_settings()

router = APIRouter()

@router.get("/balance", response_model=WalletResponse)
async def get_wallet_balance(current_user: User = Depends(get_current_active_user)):
    """Get current user's wallet balance."""
    try:
        wallets_collection = await get_collection(WALLETS_COLLECTION)
        
        wallet = await wallets_collection.find_one({"user_id": current_user.id})
        if not wallet:
            # Create wallet if it doesn't exist
            new_wallet = {
                "_id": ObjectId(),
                "user_id": current_user.id,
                "balance_kes": 0.0,
                "balance_usdt": 0.0,
                "total_received": 0.0,
                "total_sent": 0.0,
                "total_fees": 0.0,
                "daily_transfer_count": 0,
                "daily_transfer_amount": 0.0,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
            
            await wallets_collection.insert_one(new_wallet)
            wallet = new_wallet
        
        # Convert to response model
        wallet["id"] = str(wallet["_id"])
        del wallet["_id"]
        
        return WalletResponse(**wallet)
        
    except Exception as e:
        logger.error(f"Error getting wallet balance: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get wallet balance"
        )

@router.get("/transactions", response_model=List[TransactionResponse])
async def get_transactions(
    limit: int = 20,
    offset: int = 0,
    current_user: User = Depends(get_current_active_user)
):
    """Get user's transaction history."""
    try:
        transactions_collection = await get_collection(TRANSACTIONS_COLLECTION)
        
        # Get transactions for current user
        cursor = transactions_collection.find({"user_id": current_user.id})
        cursor = cursor.sort("created_at", -1).skip(offset).limit(limit)
        
        transactions = []
        async for transaction in cursor:
            transaction["id"] = str(transaction["_id"])
            del transaction["_id"]
            transactions.append(TransactionResponse(**transaction))
        
        return transactions
        
    except Exception as e:
        logger.error(f"Error getting transactions: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get transactions"
        )

@router.post("/p2p-transfer", response_model=TransferResponse)
async def p2p_transfer(
    transfer_data: P2PTransferRequest,
    current_user: User = Depends(get_current_active_user)
):
    """Send money via P2P transfer."""
    try:
        # Validate wallet PIN
        if not await _verify_wallet_pin(current_user.id, transfer_data.pin):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid wallet PIN"
            )
        
        # Check daily limits
        if not await _check_daily_limits(current_user.id, transfer_data.amount):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Daily transfer limit exceeded"
            )
        
        # Calculate fee (0.5% for P2P)
        fee = transfer_data.amount * 0.005
        total_amount = transfer_data.amount + fee
        
        # Check if user has sufficient balance
        if not await _check_sufficient_balance(current_user.id, total_amount):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Insufficient balance"
            )
        
        # Create transaction
        transaction_id = str(ObjectId())
        reference = f"P2P{datetime.utcnow().strftime('%Y%m%d')}{uuid.uuid4().hex[:8].upper()}"
        
        transaction = {
            "_id": ObjectId(transaction_id),
            "user_id": current_user.id,
            "transaction_type": "p2p_send",
            "amount": transfer_data.amount,
            "currency": "KES",
            "recipient_phone": transfer_data.recipient_phone,
            "description": transfer_data.description,
            "fee": fee,
            "total_amount": total_amount,
            "status": "completed",
            "reference": reference,
            "created_at": datetime.utcnow(),
            "completed_at": datetime.utcnow()
        }
        
        # Insert transaction
        transactions_collection = await get_collection(TRANSACTIONS_COLLECTION)
        await transactions_collection.insert_one(transaction)
        
        # Update wallet balance
        await _update_wallet_balance(
            current_user.id, 
            -total_amount, 
            fee, 
            transfer_data.amount
        )
        
        # Check if recipient exists and credit their wallet
        recipient_user = await _find_user_by_phone(transfer_data.recipient_phone)
        if recipient_user:
            await _credit_recipient_wallet(
                recipient_user["id"], 
                transfer_data.amount, 
                reference
            )
        
        # Broadcast real-time updates via WebSocket
        try:
            # Get updated wallet balances
            wallets_collection = await get_collection(WALLETS_COLLECTION)
            sender_wallet = await wallets_collection.find_one({"user_id": current_user.id})
            recipient_wallet = await wallets_collection.find_one({"user_id": recipient_user["id"]}) if recipient_user else None
            
            # Broadcast to sender
            if sender_wallet:
                await manager.broadcast_to_user(
                    current_user.id,
                    WebSocketMessage.balance_update(
                        user_id=current_user.id,
                        balance_kes=sender_wallet.get("balance_kes", 0.0),
                        balance_usdt=sender_wallet.get("balance_usdt", 0.0)
                    )
                )
                
                await manager.broadcast_to_user(
                    current_user.id,
                    WebSocketMessage.transaction_notification(
                        user_id=current_user.id,
                        transaction=transaction
                    )
                )
            
            # Broadcast to recipient
            if recipient_user and recipient_wallet:
                await manager.broadcast_to_user(
                    recipient_user["id"],
                    WebSocketMessage.balance_update(
                        user_id=recipient_user["id"],
                        balance_kes=recipient_wallet.get("balance_kes", 0.0),
                        balance_usdt=recipient_wallet.get("balance_usdt", 0.0)
                    )
                )
                
                await manager.broadcast_to_user(
                    recipient_user["id"],
                    WebSocketMessage.transaction_notification(
                        user_id=recipient_user["id"],
                        transaction={
                            **transaction,
                            "transaction_type": "p2p_receive",
                            "user_id": recipient_user["id"]
                        }
                    )
                )
        except Exception as e:
            logger.error(f"Error broadcasting WebSocket updates: {e}")
            # Don't fail the transfer if WebSocket fails
        
        return TransferResponse(
            transaction_id=transaction_id,
            reference=reference,
            status="completed",
            message="P2P transfer completed successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"P2P transfer error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Transfer failed"
        )

@router.post("/bank-transfer", response_model=TransferResponse)
async def bank_transfer(
    transfer_data: BankTransferRequest,
    current_user: User = Depends(get_current_active_user)
):
    """Send money via bank transfer."""
    try:
        # Validate wallet PIN
        if not await _verify_wallet_pin(current_user.id, transfer_data.pin):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid wallet PIN"
            )
        
        # Check daily limits
        if not await _check_daily_limits(current_user.id, transfer_data.amount):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Daily transfer limit exceeded"
            )
        
        # Calculate fee (1% for bank transfers)
        fee = transfer_data.amount * 0.01
        total_amount = transfer_data.amount + fee
        
        # Check if user has sufficient balance
        if not await _check_sufficient_balance(current_user.id, total_amount):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Insufficient balance"
            )
        
        # Create transaction
        transaction_id = str(ObjectId())
        reference = f"BANK{datetime.utcnow().strftime('%Y%m%d')}{uuid.uuid4().hex[:8].upper()}"
        
        transaction = {
            "_id": ObjectId(transaction_id),
            "user_id": current_user.id,
            "transaction_type": "bank_transfer",
            "amount": transfer_data.amount,
            "currency": "KES",
            "recipient_bank": transfer_data.bank_code,
            "recipient_account": transfer_data.account_number,
            "description": transfer_data.description,
            "fee": fee,
            "total_amount": total_amount,
            "status": "pending",  # Bank transfers are pending until processed
            "reference": reference,
            "created_at": datetime.utcnow()
        }
        
        # Insert transaction
        transactions_collection = await get_collection(TRANSACTIONS_COLLECTION)
        await transactions_collection.insert_one(transaction)
        
        # Update wallet balance
        await _update_wallet_balance(
            current_user.id, 
            -total_amount, 
            fee, 
            transfer_data.amount
        )
        
        return TransferResponse(
            transaction_id=transaction_id,
            reference=reference,
            status="pending",
            message="Bank transfer initiated successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Bank transfer error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Transfer failed"
        )

# Helper functions
async def _verify_wallet_pin(user_id: str, pin: str) -> bool:
    """Verify user's wallet PIN."""
    try:
        users_collection = await get_collection(USERS_COLLECTION)
        user = await users_collection.find_one({"_id": ObjectId(user_id)})
        
        if not user or not user.get("wallet_pin"):
            return False
        
        return user["wallet_pin"] == pin
        
    except Exception as e:
        logger.error(f"Error verifying wallet PIN: {e}")
        return False

async def _check_daily_limits(user_id: str, amount: float) -> bool:
    """Check if user has exceeded daily transfer limits."""
    try:
        wallets_collection = await get_collection(WALLETS_COLLECTION)
        wallet = await wallets_collection.find_one({"user_id": user_id})
        
        if not wallet:
            return True  # New wallet, no limits yet
        
        today = datetime.utcnow().date()
        last_transfer_date = wallet.get("last_transfer_date")
        
        # Reset daily limits if it's a new day
        if not last_transfer_date or last_transfer_date.date() < today:
            await wallets_collection.update_one(
                {"user_id": user_id},
                {
                    "$set": {
                        "daily_transfer_count": 0,
                        "daily_transfer_amount": 0.0
                    }
                }
            )
            return True
        
        # Check limits
        daily_count = wallet.get("daily_transfer_count", 0)
        daily_amount = wallet.get("daily_transfer_amount", 0.0)
        
        if daily_count >= 10:  # Max 10 transfers per day
            return False
        
        if daily_amount + amount > 100000:  # Max KES 100,000 per day
            return False
        
        return True
        
    except Exception as e:
        logger.error(f"Error checking daily limits: {e}")
        return False

async def _check_sufficient_balance(user_id: str, amount: float) -> bool:
    """Check if user has sufficient balance."""
    try:
        wallets_collection = await get_collection(WALLETS_COLLECTION)
        wallet = await wallets_collection.find_one({"user_id": user_id})
        
        if not wallet:
            return False
        
        return wallet.get("balance_kes", 0.0) >= amount
        
    except Exception as e:
        logger.error(f"Error checking balance: {e}")
        return False

async def _update_wallet_balance(user_id: str, amount_change: float, fee: float, transfer_amount: float):
    """Update user's wallet balance and transfer statistics."""
    try:
        wallets_collection = await get_collection(WALLETS_COLLECTION)
        
        update_data = {
            "$inc": {
                "balance_kes": amount_change,
                "total_fees": fee,
                "daily_transfer_count": 1,
                "daily_transfer_amount": transfer_amount
            },
            "$set": {
                "last_transfer_date": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
        }
        
        if amount_change < 0:
            update_data["$inc"]["total_sent"] = abs(amount_change)
        else:
            update_data["$inc"]["total_received"] = amount_change
        
        await wallets_collection.update_one(
            {"user_id": user_id},
            update_data
        )
        
    except Exception as e:
        logger.error(f"Error updating wallet balance: {e}")
        raise

async def _find_user_by_phone(phone_number: str):
    """Find user by phone number."""
    try:
        users_collection = await get_collection(USERS_COLLECTION)
        return await users_collection.find_one({"phone_number": phone_number})
    except Exception as e:
        logger.error(f"Error finding user by phone: {e}")
        return None

async def _credit_recipient_wallet(user_id: str, amount: float, reference: str):
    """Credit recipient's wallet for P2P transfers."""
    try:
        # Update recipient's wallet balance
        await _update_wallet_balance(user_id, amount, 0.0, 0.0)
        
        # Create transaction record for recipient
        transaction = {
            "_id": ObjectId(),
            "user_id": user_id,
            "transaction_type": "p2p_receive",
            "amount": amount,
            "currency": "KES",
            "description": f"Received from P2P transfer - {reference}",
            "fee": 0.0,
            "total_amount": amount,
            "status": "completed",
            "reference": reference,
            "created_at": datetime.utcnow(),
            "completed_at": datetime.utcnow()
        }
        
        transactions_collection = await get_collection(TRANSACTIONS_COLLECTION)
        await transactions_collection.insert_one(transaction)
        
    except Exception as e:
        logger.error(f"Error crediting recipient wallet: {e}")
        # Don't raise here as the sender's transaction is already completed
