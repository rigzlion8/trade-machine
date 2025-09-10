import httpx
import logging
from typing import Optional, Dict, Any, List
from datetime import datetime
from config.settings import get_settings
from models.payment import PaymentType, PaymentMethod, PaymentStatus

logger = logging.getLogger(__name__)
settings = get_settings()

class PaystackService:
    def __init__(self):
        self.secret_key = settings.paystack_secret_key
        self.public_key = settings.paystack_public_key
        self.base_url = "https://api.paystack.co"
        
        if not self.secret_key:
            logger.warning("Paystack secret key not configured")
    
    async def initialize_transaction(self, amount: float, email: str, reference: str, callback_url: str, payment_type: PaymentType = PaymentType.DEPOSIT) -> Dict[str, Any]:
        """Initialize a Paystack transaction for deposit."""
        try:
            if not self.secret_key:
                raise ValueError("Paystack not configured")
            
            url = f"{self.base_url}/transaction/initialize"
            headers = {
                "Authorization": f"Bearer {self.secret_key}",
                "Content-Type": "application/json"
            }
            
            # Convert KES to NGN (approximate rate: 1 KES = 6.67 NGN)
            amount_ngn = amount * 6.67
            
            data = {
                "amount": int(amount_ngn * 100),  # Convert to kobo (smallest currency unit)
                "email": email,
                "reference": reference,
                "callback_url": callback_url,
                "currency": "NGN",
                "metadata": {
                    "type": payment_type.value,
                    "amount_kes": amount,
                    "amount_ngn": amount_ngn
                }
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.post(url, json=data, headers=headers)
                response.raise_for_status()
                
                result = response.json()
                if result.get("status"):
                    return {
                        "success": True,
                        "authorization_url": result["data"]["authorization_url"],
                        "reference": result["data"]["reference"],
                        "access_code": result["data"]["access_code"],
                        "amount_ngn": amount_ngn
                    }
                else:
                    raise Exception(f"Paystack error: {result.get('message', 'Unknown error')}")
                    
        except Exception as e:
            logger.error(f"Error initializing Paystack transaction: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def verify_transaction(self, reference: str) -> Dict[str, Any]:
        """Verify a Paystack transaction."""
        try:
            if not self.secret_key:
                raise ValueError("Paystack not configured")
            
            url = f"{self.base_url}/transaction/verify/{reference}"
            headers = {
                "Authorization": f"Bearer {self.secret_key}"
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.get(url, headers=headers)
                response.raise_for_status()
                
                result = response.json()
                if result.get("status") and result["data"]["status"] == "success":
                    # Convert from kobo to NGN, then to KES (approximate conversion)
                    amount_ngn = result["data"]["amount"] / 100
                    amount_kes = amount_ngn / 6.67  # Convert NGN to KES
                    
                    return {
                        "success": True,
                        "amount_ngn": amount_ngn,
                        "amount_kes": amount_kes,
                        "reference": result["data"]["reference"],
                        "gateway_ref": result["data"]["id"],
                        "paid_at": result["data"]["paid_at"],
                        "channel": result["data"]["channel"],
                        "customer_email": result["data"]["customer"]["email"],
                        "status": PaymentStatus.COMPLETED
                    }
                else:
                    return {
                        "success": False,
                        "error": "Transaction not successful",
                        "status": result["data"]["status"]
                    }
                    
        except Exception as e:
            logger.error(f"Error verifying Paystack transaction: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def create_recipient(self, account_number: str, bank_code: str, account_name: str) -> Dict[str, Any]:
        """Create a recipient for bank transfers."""
        try:
            if not self.secret_key:
                raise ValueError("Paystack not configured")
            
            url = f"{self.base_url}/transferrecipient"
            headers = {
                "Authorization": f"Bearer {self.secret_key}",
                "Content-Type": "application/json"
            }
            
            data = {
                "type": "nuban",
                "name": account_name,
                "account_number": account_number,
                "bank_code": bank_code,
                "currency": "NGN"
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.post(url, json=data, headers=headers)
                response.raise_for_status()
                
                result = response.json()
                if result.get("status"):
                    return {
                        "success": True,
                        "recipient_code": result["data"]["recipient_code"],
                        "account_number": result["data"]["details"]["account_number"],
                        "account_name": result["data"]["details"]["account_name"],
                        "bank_name": result["data"]["details"]["bank_name"]
                    }
                else:
                    raise Exception(f"Paystack error: {result.get('message', 'Unknown error')}")
                    
        except Exception as e:
            logger.error(f"Error creating Paystack recipient: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def initiate_transfer(self, recipient_code: str, amount: float, reference: str, reason: str = "Wallet withdrawal") -> Dict[str, Any]:
        """Initiate a bank transfer via Paystack."""
        try:
            if not self.secret_key:
                raise ValueError("Paystack not configured")
            
            url = f"{self.base_url}/transfer"
            headers = {
                "Authorization": f"Bearer {self.secret_key}",
                "Content-Type": "application/json"
            }
            
            data = {
                "source": "balance",
                "amount": int(amount * 100),  # Convert to kobo
                "recipient": recipient_code,
                "reference": reference,
                "reason": reason,
                "currency": "NGN"
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.post(url, json=data, headers=headers)
                response.raise_for_status()
                
                result = response.json()
                if result.get("status"):
                    return {
                        "success": True,
                        "transfer_code": result["data"]["transfer_code"],
                        "reference": result["data"]["reference"],
                        "amount": result["data"]["amount"] / 100,
                        "status": result["data"]["status"]
                    }
                else:
                    raise Exception(f"Paystack error: {result.get('message', 'Unknown error')}")
                    
        except Exception as e:
            logger.error(f"Error initiating Paystack transfer: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def get_banks(self) -> Dict[str, Any]:
        """Get list of supported banks."""
        try:
            if not self.secret_key:
                raise ValueError("Paystack not configured")
            
            url = f"{self.base_url}/bank"
            headers = {
                "Authorization": f"Bearer {self.secret_key}"
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.get(url, headers=headers)
                response.raise_for_status()
                
                result = response.json()
                if result.get("status"):
                    return {
                        "success": True,
                        "banks": result["data"]
                    }
                else:
                    raise Exception(f"Paystack error: {result.get('message', 'Unknown error')}")
                    
        except Exception as e:
            logger.error(f"Error getting banks from Paystack: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def get_transaction_status(self, reference: str) -> Dict[str, Any]:
        """Get transaction status without full verification."""
        try:
            if not self.secret_key:
                raise ValueError("Paystack not configured")
            
            url = f"{self.base_url}/transaction/verify/{reference}"
            headers = {
                "Authorization": f"Bearer {self.secret_key}"
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.get(url, headers=headers)
                response.raise_for_status()
                
                result = response.json()
                if result.get("status"):
                    return {
                        "success": True,
                        "status": result["data"]["status"],
                        "amount": result["data"]["amount"] / 100,
                        "currency": result["data"]["currency"],
                        "reference": result["data"]["reference"],
                        "gateway_ref": result["data"]["id"]
                    }
                else:
                    return {
                        "success": False,
                        "error": "Transaction not found"
                    }
                    
        except Exception as e:
            logger.error(f"Error getting transaction status: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def get_transfer_status(self, transfer_code: str) -> Dict[str, Any]:
        """Get transfer status."""
        try:
            if not self.secret_key:
                raise ValueError("Paystack not configured")
            
            url = f"{self.base_url}/transfer/{transfer_code}"
            headers = {
                "Authorization": f"Bearer {self.secret_key}"
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.get(url, headers=headers)
                response.raise_for_status()
                
                result = response.json()
                if result.get("status"):
                    return {
                        "success": True,
                        "status": result["data"]["status"],
                        "amount": result["data"]["amount"] / 100,
                        "reference": result["data"]["reference"],
                        "transfer_code": result["data"]["transfer_code"],
                        "recipient": result["data"]["recipient"]
                    }
                else:
                    return {
                        "success": False,
                        "error": "Transfer not found"
                    }
                    
        except Exception as e:
            logger.error(f"Error getting transfer status: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def resolve_account_number(self, account_number: str, bank_code: str) -> Dict[str, Any]:
        """Resolve account number to get account name."""
        try:
            if not self.secret_key:
                raise ValueError("Paystack not configured")
            
            url = f"{self.base_url}/bank/resolve"
            headers = {
                "Authorization": f"Bearer {self.secret_key}"
            }
            
            params = {
                "account_number": account_number,
                "bank_code": bank_code
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.get(url, headers=headers, params=params)
                response.raise_for_status()
                
                result = response.json()
                if result.get("status"):
                    return {
                        "success": True,
                        "account_number": result["data"]["account_number"],
                        "account_name": result["data"]["account_name"],
                        "bank_id": result["data"]["bank_id"]
                    }
                else:
                    return {
                        "success": False,
                        "error": result.get("message", "Account resolution failed")
                    }
                    
        except Exception as e:
            logger.error(f"Error resolving account number: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def get_balance(self) -> Dict[str, Any]:
        """Get Paystack account balance."""
        try:
            if not self.secret_key:
                raise ValueError("Paystack not configured")
            
            url = f"{self.base_url}/balance"
            headers = {
                "Authorization": f"Bearer {self.secret_key}"
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.get(url, headers=headers)
                response.raise_for_status()
                
                result = response.json()
                if result.get("status"):
                    return {
                        "success": True,
                        "balance": result["data"][0]["balance"] / 100,  # Convert from kobo
                        "currency": result["data"][0]["currency"]
                    }
                else:
                    return {
                        "success": False,
                        "error": "Failed to get balance"
                    }
                    
        except Exception as e:
            logger.error(f"Error getting Paystack balance: {e}")
            return {
                "success": False,
                "error": str(e)
            }

# Global instance
paystack_service = PaystackService()
