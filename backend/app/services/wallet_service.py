import uuid
import hashlib
from typing import Dict, List, Optional
from datetime import datetime, timedelta
from app.models.wallet import (
    Wallet, WalletTransaction, P2PTransfer, BankTransfer,
    TransactionType, TransactionStatus, TransferType
)
from app.core.database import get_database
from app.services.paystack_service import paystack_service
import logging

logger = logging.getLogger(__name__)

class WalletService:
    def __init__(self):
        self.db = get_database()
        self.wallets_collection = self.db.wallets
        self.transactions_collection = self.db.wallet_transactions
        self.users_collection = self.db.users
    
    def _generate_wallet_number(self) -> str:
        """Generate unique wallet number"""
        timestamp = str(int(datetime.utcnow().timestamp()))[-8:]
        random_suffix = str(uuid.uuid4().hex)[:6].upper()
        return f"TM{timestamp}{random_suffix}"
    
    def _hash_pin(self, pin: str) -> str:
        """Hash wallet PIN for security"""
        return hashlib.sha256(pin.encode()).hexdigest()
    
    def _verify_pin(self, pin: str, hashed_pin: str) -> bool:
        """Verify wallet PIN"""
        return self._hash_pin(pin) == hashed_pin
    
    async def create_wallet(self, user_id: str) -> Dict:
        """Create a new wallet for user"""
        try:
            # Check if wallet already exists
            existing_wallet = await self.wallets_collection.find_one({"user_id": user_id})
            if existing_wallet:
                return {"success": False, "error": "Wallet already exists"}
            
            wallet_data = Wallet(
                user_id=user_id,
                wallet_number=self._generate_wallet_number()
            )
            
            # Insert wallet
            result = await self.wallets_collection.insert_one(wallet_data.dict())
            
            # Update user with wallet info
            await self.users_collection.update_one(
                {"_id": user_id},
                {
                    "$set": {
                        "wallet_id": str(result.inserted_id),
                        "wallet_status": "active"
                    }
                }
            )
            
            return {
                "success": True,
                "wallet_id": str(result.inserted_id),
                "wallet_number": wallet_data.wallet_number
            }
            
        except Exception as e:
            logger.error(f"Error creating wallet: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def get_wallet(self, user_id: str) -> Optional[Wallet]:
        """Get user's wallet"""
        try:
            wallet_data = await self.wallets_collection.find_one({"user_id": user_id})
            if wallet_data:
                return Wallet(**wallet_data)
            return None
        except Exception as e:
            logger.error(f"Error getting wallet: {str(e)}")
            return None
    
    async def get_wallet_by_number(self, wallet_number: str) -> Optional[Wallet]:
        """Get wallet by wallet number"""
        try:
            wallet_data = await self.wallets_collection.find_one({"wallet_number": wallet_number})
            if wallet_data:
                return Wallet(**wallet_data)
            return None
        except Exception as e:
            logger.error(f"Error getting wallet by number: {str(e)}")
            return None
    
    async def p2p_transfer(self, transfer_data: P2PTransfer, sender_user_id: str) -> Dict:
        """Process P2P transfer between users"""
        try:
            # Get sender wallet
            sender_wallet = await self.get_wallet(sender_user_id)
            if not sender_wallet:
                return {"success": False, "error": "Sender wallet not found"}
            
            # Verify PIN
            if not self._verify_pin(transfer_data.pin, sender_wallet.wallet_pin or ""):
                return {"success": False, "error": "Invalid PIN"}
            
            # Check balance
            if sender_wallet.balance_kes < transfer_data.amount:
                return {"success": False, "error": "Insufficient balance"}
            
            # Check daily limits
            if sender_wallet.daily_transfer_count >= 10:  # Max 10 transfers per day
                return {"success": False, "error": "Daily transfer limit reached"}
            
            if sender_wallet.daily_transfer_count * transfer_data.amount > sender_wallet.daily_limit_kes:
                return {"success": False, "error": "Daily amount limit exceeded"}
            
            # Find recipient by phone number
            recipient_user = await self.users_collection.find_one({"phone_number": transfer_data.recipient_phone})
            if not recipient_user:
                return {"success": False, "error": "Recipient not found"}
            
            recipient_wallet = await self.get_wallet(recipient_user["_id"])
            if not recipient_wallet:
                return {"success": False, "error": "Recipient wallet not found"}
            
            # Calculate fee (0.5% for P2P transfers)
            fee = transfer_data.amount * 0.005
            total_amount = transfer_data.amount + fee
            
            # Create transaction record
            transaction = WalletTransaction(
                transaction_id=str(uuid.uuid4()),
                wallet_id=str(sender_wallet.id),
                user_id=sender_user_id,
                transaction_type=TransactionType.TRANSFER,
                transfer_type=TransferType.P2P,
                amount=transfer_data.amount,
                currency=transfer_data.currency,
                fee=fee,
                total_amount=total_amount,
                balance_before=sender_wallet.balance_kes,
                balance_after=sender_wallet.balance_kes - total_amount,
                status=TransactionStatus.PENDING,
                description=transfer_data.description,
                recipient_wallet_id=str(recipient_wallet.id),
                recipient_user_id=str(recipient_user["_id"]),
                recipient_phone=transfer_data.recipient_phone
            )
            
            # Insert transaction
            await self.transactions_collection.insert_one(transaction.dict())
            
            # Update sender wallet
            await self.wallets_collection.update_one(
                {"_id": sender_wallet.id},
                {
                    "$inc": {
                        "balance_kes": -total_amount,
                        "daily_transfer_count": 1
                    }
                }
            )
            
            # Update recipient wallet
            await self.wallets_collection.update_one(
                {"_id": recipient_wallet.id},
                {
                    "$inc": {"balance_kes": transfer_data.amount}
                }
            )
            
            # Create recipient transaction record
            recipient_transaction = WalletTransaction(
                transaction_id=str(uuid.uuid4()),
                wallet_id=str(recipient_wallet.id),
                user_id=str(recipient_user["_id"]),
                transaction_type=TransactionType.DEPOSIT,
                transfer_type=TransferType.P2P,
                amount=transfer_data.amount,
                currency=transfer_data.currency,
                fee=0.0,
                total_amount=transfer_data.amount,
                balance_before=recipient_wallet.balance_kes,
                balance_after=recipient_wallet.balance_kes + transfer_data.amount,
                status=TransactionStatus.COMPLETED,
                description=f"Received from {sender_wallet.wallet_number}",
                recipient_wallet_id=str(sender_wallet.id),
                recipient_user_id=sender_user_id,
                recipient_phone=transfer_data.recipient_phone
            )
            
            await self.transactions_collection.insert_one(recipient_transaction.dict())
            
            # Update transaction status to completed
            await self.transactions_collection.update_one(
                {"transaction_id": transaction.transaction_id},
                {
                    "$set": {
                        "status": TransactionStatus.COMPLETED,
                        "completed_at": datetime.utcnow()
                    }
                }
            )
            
            return {
                "success": True,
                "transaction_id": transaction.transaction_id,
                "amount": transfer_data.amount,
                "fee": fee,
                "total_amount": total_amount,
                "recipient_phone": transfer_data.recipient_phone
            }
            
        except Exception as e:
            logger.error(f"Error processing P2P transfer: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def bank_transfer(self, transfer_data: BankTransfer, user_id: str) -> Dict:
        """Process bank transfer"""
        try:
            # Get user wallet
            wallet = await self.get_wallet(user_id)
            if not wallet:
                return {"success": False, "error": "Wallet not found"}
            
            # Verify PIN
            if not self._verify_pin(transfer_data.pin, wallet.wallet_pin or ""):
                return {"success": False, "error": "Invalid PIN"}
            
            # Check balance
            if wallet.balance_kes < transfer_data.amount:
                return {"success": False, "error": "Insufficient balance"}
            
            # Calculate fee (1% for bank transfers)
            fee = transfer_data.amount * 0.01
            total_amount = transfer_data.amount + fee
            
            # Create transaction record
            transaction = WalletTransaction(
                transaction_id=str(uuid.uuid4()),
                wallet_id=str(wallet.id),
                user_id=user_id,
                transaction_type=TransactionType.TRANSFER,
                transfer_type=TransferType.BANK,
                amount=transfer_data.amount,
                currency=transfer_data.currency,
                fee=fee,
                total_amount=total_amount,
                balance_before=wallet.balance_kes,
                balance_after=wallet.balance_kes - total_amount,
                status=TransactionStatus.PENDING,
                description=transfer_data.description,
                bank_code=transfer_data.bank_code,
                bank_name=transfer_data.bank_name,
                account_number=transfer_data.account_number,
                account_name=transfer_data.account_name
            )
            
            # Insert transaction
            await self.transactions_collection.insert_one(transaction.dict())
            
            # Update wallet balance
            await self.wallets_collection.update_one(
                {"_id": wallet.id},
                {"$inc": {"balance_kes": -total_amount}}
            )
            
            # Here you would integrate with Paystack for bank transfer
            # For now, we'll mark it as pending and process it asynchronously
            
            return {
                "success": True,
                "transaction_id": transaction.transaction_id,
                "amount": transfer_data.amount,
                "fee": fee,
                "total_amount": total_amount,
                "status": "pending"
            }
            
        except Exception as e:
            logger.error(f"Error processing bank transfer: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def get_transaction_history(self, user_id: str, limit: int = 50) -> List[Dict]:
        """Get user's transaction history"""
        try:
            cursor = self.transactions_collection.find(
                {"user_id": user_id}
            ).sort("created_at", -1).limit(limit)
            
            transactions = []
            async for doc in cursor:
                transactions.append(doc)
            
            return transactions
            
        except Exception as e:
            logger.error(f"Error getting transaction history: {str(e)}")
            return []
    
    async def set_wallet_pin(self, user_id: str, pin: str) -> Dict:
        """Set or update wallet PIN"""
        try:
            wallet = await self.get_wallet(user_id)
            if not wallet:
                return {"success": False, "error": "Wallet not found"}
            
            hashed_pin = self._hash_pin(pin)
            
            await self.wallets_collection.update_one(
                {"_id": wallet.id},
                {"$set": {"wallet_pin": hashed_pin}}
            )
            
            return {"success": True, "message": "PIN set successfully"}
            
        except Exception as e:
            logger.error(f"Error setting wallet PIN: {str(e)}")
            return {"success": False, "error": str(e)}

# Create service instance
wallet_service = WalletService()
