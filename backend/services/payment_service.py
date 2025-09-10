import logging
import secrets
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
from bson import ObjectId

from database.mongodb import get_collection
from models.payment import (
    PaymentCreate, PaymentResponse, PaymentUpdate, PaymentFilter, 
    PaymentStats, PaymentType, PaymentStatus, PaymentMethod, PaymentChannel,
    BankAccountCreate, BankAccountResponse
)
from payments.paystack_service import paystack_service
from services.email_service import email_service

logger = logging.getLogger(__name__)

class PaymentService:
    def __init__(self):
        self.payments_collection = "payments"
        self.bank_accounts_collection = "bank_accounts"
    
    async def create_payment(self, user_id: str, payment_data: PaymentCreate) -> Dict[str, Any]:
        """Create a new payment transaction."""
        try:
            payments_collection = await get_collection(self.payments_collection)
            
            # Generate unique reference
            reference = f"TM_{secrets.token_hex(8).upper()}"
            
            # Calculate fees (2% for deposits, 1% for withdrawals)
            if payment_data.payment_type == PaymentType.DEPOSIT:
                fees = payment_data.amount * 0.02  # 2% fee
            elif payment_data.payment_type == PaymentType.WITHDRAWAL:
                fees = payment_data.amount * 0.01  # 1% fee
            else:
                fees = 0.0
            
            net_amount = payment_data.amount - fees
            
            # Create payment record
            payment_doc = {
                "_id": ObjectId(),
                "user_id": ObjectId(user_id),
                "amount": payment_data.amount,
                "payment_type": payment_data.payment_type.value,
                "payment_method": payment_data.payment_method.value,
                "payment_channel": PaymentChannel.PAYSTACK.value,
                "status": PaymentStatus.PENDING.value,
                "description": payment_data.description,
                "reference": reference,
                "gateway_reference": None,
                "recipient_account": payment_data.recipient_account,
                "recipient_bank": payment_data.recipient_bank,
                "recipient_name": payment_data.recipient_name,
                "fees": fees,
                "net_amount": net_amount,
                "authorization_url": None,
                "callback_url": None,
                "metadata": payment_data.metadata or {},
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow(),
                "completed_at": None
            }
            
            # Insert payment record
            result = await payments_collection.insert_one(payment_doc)
            payment_id = str(result.inserted_id)
            
            return {
                "success": True,
                "payment_id": payment_id,
                "reference": reference,
                "fees": fees,
                "net_amount": net_amount
            }
            
        except Exception as e:
            logger.error(f"Error creating payment: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def initialize_deposit(self, user_id: str, amount: float, email: str, payment_method: PaymentMethod = PaymentMethod.CARD) -> Dict[str, Any]:
        """Initialize a deposit transaction."""
        try:
            # Create payment record
            payment_data = PaymentCreate(
                amount=amount,
                payment_type=PaymentType.DEPOSIT,
                payment_method=payment_method,
                description=f"Wallet deposit of KES {amount:,.2f} via {payment_method.value.replace('_', ' ').title()}"
            )
            
            payment_result = await self.create_payment(user_id, payment_data)
            if not payment_result["success"]:
                return payment_result
            
            # Initialize Paystack transaction
            callback_url = f"https://trade-machine.vercel.app/payments/callback"
            
            # Handle mobile money payments differently
            if payment_method in [PaymentMethod.MPESA, PaymentMethod.AIRTEL_MONEY]:
                provider = "mpesa" if payment_method == PaymentMethod.MPESA else "airtel"
                paystack_result = await paystack_service.initialize_mobile_money_payment(
                    amount=amount,
                    phone_number=email,  # Using email field for phone number
                    reference=payment_result["reference"],
                    callback_url=callback_url,
                    provider=provider
                )
            else:
                paystack_result = await paystack_service.initialize_transaction(
                    amount=amount,
                    email=email,
                    reference=payment_result["reference"],
                    callback_url=callback_url,
                    payment_type=PaymentType.DEPOSIT,
                    payment_method=payment_method
                )
            
            if not paystack_result["success"]:
                # Update payment status to failed
                await self.update_payment_status(
                    payment_result["payment_id"], 
                    PaymentStatus.FAILED,
                    error_message=paystack_result.get("error")
                )
                return paystack_result
            
            # Update payment with authorization URL
            await self.update_payment(
                payment_result["payment_id"],
                PaymentUpdate(
                    authorization_url=paystack_result["authorization_url"],
                    callback_url=callback_url
                )
            )
            
            return {
                "success": True,
                "payment_id": payment_result["payment_id"],
                "reference": payment_result["reference"],
                "authorization_url": paystack_result["authorization_url"],
                "fees": payment_result["fees"],
                "net_amount": payment_result["net_amount"]
            }
            
        except Exception as e:
            logger.error(f"Error initializing deposit: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def initialize_withdrawal(self, user_id: str, amount: float, bank_account_id: str) -> Dict[str, Any]:
        """Initialize a withdrawal transaction."""
        try:
            # Get bank account details
            bank_accounts_collection = await get_collection(self.bank_accounts_collection)
            bank_account = await bank_accounts_collection.find_one({
                "_id": ObjectId(bank_account_id),
                "user_id": ObjectId(user_id)
            })
            
            if not bank_account:
                return {
                    "success": False,
                    "error": "Bank account not found"
                }
            
            # Create payment record
            payment_data = PaymentCreate(
                amount=amount,
                payment_type=PaymentType.WITHDRAWAL,
                payment_method=PaymentMethod.BANK_TRANSFER,
                description=f"Withdrawal to {bank_account['account_name']}",
                recipient_account=bank_account["account_number"],
                recipient_bank=bank_account["bank_code"],
                recipient_name=bank_account["account_name"]
            )
            
            payment_result = await self.create_payment(user_id, payment_data)
            if not payment_result["success"]:
                return payment_result
            
            # Create Paystack recipient if not exists
            if not bank_account.get("recipient_code"):
                recipient_result = await paystack_service.create_recipient(
                    account_number=bank_account["account_number"],
                    bank_code=bank_account["bank_code"],
                    account_name=bank_account["account_name"]
                )
                
                if recipient_result["success"]:
                    # Update bank account with recipient code
                    await bank_accounts_collection.update_one(
                        {"_id": ObjectId(bank_account_id)},
                        {"$set": {"recipient_code": recipient_result["recipient_code"]}}
                    )
                    bank_account["recipient_code"] = recipient_result["recipient_code"]
                else:
                    await self.update_payment_status(
                        payment_result["payment_id"], 
                        PaymentStatus.FAILED,
                        error_message=recipient_result.get("error")
                    )
                    return recipient_result
            
            # Initiate transfer
            transfer_result = await paystack_service.initiate_transfer(
                recipient_code=bank_account["recipient_code"],
                amount=amount,
                reference=payment_result["reference"],
                reason=f"Trade Machine withdrawal - {payment_result['reference']}"
            )
            
            if not transfer_result["success"]:
                await self.update_payment_status(
                    payment_result["payment_id"], 
                    PaymentStatus.FAILED,
                    error_message=transfer_result.get("error")
                )
                return transfer_result
            
            # Update payment with transfer details
            await self.update_payment(
                payment_result["payment_id"],
                PaymentUpdate(
                    gateway_reference=transfer_result["transfer_code"],
                    status=PaymentStatus.PROCESSING
                )
            )
            
            return {
                "success": True,
                "payment_id": payment_result["payment_id"],
                "reference": payment_result["reference"],
                "transfer_code": transfer_result["transfer_code"],
                "fees": payment_result["fees"],
                "net_amount": payment_result["net_amount"]
            }
            
        except Exception as e:
            logger.error(f"Error initializing withdrawal: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def verify_payment(self, reference: str) -> Dict[str, Any]:
        """Verify a payment transaction."""
        try:
            payments_collection = await get_collection(self.payments_collection)
            payment = await payments_collection.find_one({"reference": reference})
            
            if not payment:
                return {
                    "success": False,
                    "error": "Payment not found"
                }
            
            # Verify with Paystack
            verification_result = await paystack_service.verify_transaction(reference)
            
            if verification_result["success"]:
                # Update payment status
                await self.update_payment(
                    str(payment["_id"]),
                    PaymentUpdate(
                        status=PaymentStatus.COMPLETED,
                        gateway_reference=verification_result["gateway_ref"]
                    )
                )
                
                # Update user wallet balance for deposits
                if payment["payment_type"] == PaymentType.DEPOSIT.value:
                    await self._update_wallet_balance(
                        str(payment["user_id"]),
                        verification_result["amount_kes"]
                    )
                
                # Send notification email
                await self._send_payment_notification(payment, "completed")
                
                return {
                    "success": True,
                    "status": PaymentStatus.COMPLETED,
                    "amount": verification_result["amount_kes"]
                }
            else:
                # Update payment status to failed
                await self.update_payment(
                    str(payment["_id"]),
                    PaymentUpdate(status=PaymentStatus.FAILED)
                )
                
                return {
                    "success": False,
                    "error": verification_result.get("error", "Payment verification failed")
                }
                
        except Exception as e:
            logger.error(f"Error verifying payment: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def update_payment(self, payment_id: str, update_data: PaymentUpdate) -> bool:
        """Update payment record."""
        try:
            payments_collection = await get_collection(self.payments_collection)
            
            update_dict = {"updated_at": datetime.utcnow()}
            if update_data.status:
                update_dict["status"] = update_data.status.value
                if update_data.status == PaymentStatus.COMPLETED:
                    update_dict["completed_at"] = datetime.utcnow()
            if update_data.gateway_reference:
                update_dict["gateway_reference"] = update_data.gateway_reference
            if update_data.fees is not None:
                update_dict["fees"] = update_data.fees
            if update_data.metadata:
                update_dict["metadata"] = update_data.metadata
            
            result = await payments_collection.update_one(
                {"_id": ObjectId(payment_id)},
                {"$set": update_dict}
            )
            
            return result.modified_count > 0
            
        except Exception as e:
            logger.error(f"Error updating payment: {e}")
            return False
    
    async def update_payment_status(self, payment_id: str, status: PaymentStatus, error_message: str = None) -> bool:
        """Update payment status."""
        update_data = PaymentUpdate(status=status)
        if error_message:
            update_data.metadata = {"error": error_message}
        
        return await self.update_payment(payment_id, update_data)
    
    async def get_user_payments(self, user_id: str, filters: PaymentFilter = None, limit: int = 50, skip: int = 0) -> List[PaymentResponse]:
        """Get user payments with optional filters."""
        try:
            payments_collection = await get_collection(self.payments_collection)
            
            # Build query
            query = {"user_id": ObjectId(user_id)}
            
            if filters:
                if filters.payment_type:
                    query["payment_type"] = filters.payment_type.value
                if filters.payment_method:
                    query["payment_method"] = filters.payment_method.value
                if filters.payment_channel:
                    query["payment_channel"] = filters.payment_channel.value
                if filters.status:
                    query["status"] = filters.status.value
                if filters.start_date or filters.end_date:
                    date_query = {}
                    if filters.start_date:
                        date_query["$gte"] = filters.start_date
                    if filters.end_date:
                        date_query["$lte"] = filters.end_date
                    query["created_at"] = date_query
                if filters.min_amount or filters.max_amount:
                    amount_query = {}
                    if filters.min_amount:
                        amount_query["$gte"] = filters.min_amount
                    if filters.max_amount:
                        amount_query["$lte"] = filters.max_amount
                    query["amount"] = amount_query
            
            # Execute query
            cursor = payments_collection.find(query).sort("created_at", -1).skip(skip).limit(limit)
            payments = await cursor.to_list(length=limit)
            
            # Convert to response models
            result = []
            for payment in payments:
                payment["id"] = str(payment["_id"])
                del payment["_id"]
                result.append(PaymentResponse(**payment))
            
            return result
            
        except Exception as e:
            logger.error(f"Error getting user payments: {e}")
            return []
    
    async def get_payment_stats(self, user_id: str) -> PaymentStats:
        """Get payment statistics for user."""
        try:
            payments_collection = await get_collection(self.payments_collection)
            
            # Get current month date range
            now = datetime.utcnow()
            month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            
            # Aggregate statistics
            pipeline = [
                {"$match": {"user_id": ObjectId(user_id)}},
                {
                    "$group": {
                        "_id": None,
                        "total_deposits": {
                            "$sum": {
                                "$cond": [
                                    {"$eq": ["$payment_type", "deposit"]},
                                    "$amount",
                                    0
                                ]
                            }
                        },
                        "total_withdrawals": {
                            "$sum": {
                                "$cond": [
                                    {"$eq": ["$payment_type", "withdrawal"]},
                                    "$amount",
                                    0
                                ]
                            }
                        },
                        "total_fees": {"$sum": "$fees"},
                        "completed_count": {
                            "$sum": {
                                "$cond": [
                                    {"$eq": ["$status", "completed"]},
                                    1,
                                    0
                                ]
                            }
                        },
                        "failed_count": {
                            "$sum": {
                                "$cond": [
                                    {"$eq": ["$status", "failed"]},
                                    1,
                                    0
                                ]
                            }
                        }
                    }
                }
            ]
            
            result = await payments_collection.aggregate(pipeline).to_list(1)
            stats = result[0] if result else {}
            
            # Get monthly stats
            monthly_pipeline = [
                {
                    "$match": {
                        "user_id": ObjectId(user_id),
                        "created_at": {"$gte": month_start}
                    }
                },
                {
                    "$group": {
                        "_id": None,
                        "monthly_deposits": {
                            "$sum": {
                                "$cond": [
                                    {"$eq": ["$payment_type", "deposit"]},
                                    "$amount",
                                    0
                                ]
                            }
                        },
                        "monthly_withdrawals": {
                            "$sum": {
                                "$cond": [
                                    {"$eq": ["$payment_type", "withdrawal"]},
                                    "$amount",
                                    0
                                ]
                            }
                        }
                    }
                }
            ]
            
            monthly_result = await payments_collection.aggregate(monthly_pipeline).to_list(1)
            monthly_stats = monthly_result[0] if monthly_result else {}
            
            return PaymentStats(
                total_deposits=stats.get("total_deposits", 0.0),
                total_withdrawals=stats.get("total_withdrawals", 0.0),
                total_fees=stats.get("total_fees", 0.0),
                completed_transactions=stats.get("completed_count", 0),
                failed_transactions=stats.get("failed_count", 0),
                monthly_deposits=monthly_stats.get("monthly_deposits", 0.0),
                monthly_withdrawals=monthly_stats.get("monthly_withdrawals", 0.0)
            )
            
        except Exception as e:
            logger.error(f"Error getting payment stats: {e}")
            return PaymentStats()
    
    async def _update_wallet_balance(self, user_id: str, amount: float):
        """Update user wallet balance."""
        try:
            users_collection = await get_collection("users")
            await users_collection.update_one(
                {"_id": ObjectId(user_id)},
                {"$inc": {"wallet_balance_kes": amount}}
            )
        except Exception as e:
            logger.error(f"Error updating wallet balance: {e}")
    
    async def _send_payment_notification(self, payment: dict, status: str):
        """Send payment notification email."""
        try:
            # Get user details
            users_collection = await get_collection("users")
            user = await users_collection.find_one({"_id": payment["user_id"]})
            
            if user and user.get("email"):
                # Send notification email
                subject = f"Payment {status.title()} - Trade Machine"
                # You can implement email templates here
                logger.info(f"Payment {status} notification sent to {user['email']}")
        except Exception as e:
            logger.error(f"Error sending payment notification: {e}")

# Global instance
payment_service = PaymentService()
