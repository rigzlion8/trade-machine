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
    
    async def initialize_transaction(self, amount: float, email: str, reference: str, callback_url: str, payment_type: PaymentType = PaymentType.DEPOSIT, payment_method: PaymentMethod = PaymentMethod.CARD) -> Dict[str, Any]:
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
                    "payment_method": payment_method.value,
                    "amount_kes": amount,
                    "amount_ngn": amount_ngn
                }
            }
            
            # Add mobile money specific parameters
            if payment_method in [PaymentMethod.MPESA, PaymentMethod.AIRTEL_MONEY]:
                # For mobile money, we need to specify the channel
                if payment_method == PaymentMethod.MPESA:
                    data["channels"] = ["mobile_money"]
                    data["mobile_money"] = {
                        "phone": email,  # Using email field for phone number
                        "provider": "mpesa"
                    }
                elif payment_method == PaymentMethod.AIRTEL_MONEY:
                    data["channels"] = ["mobile_money"]
                    data["mobile_money"] = {
                        "phone": email,  # Using email field for phone number
                        "provider": "airtel"
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
            # For Kenya, we'll return a curated list of major Kenyan banks
            # since Paystack's API returns Nigerian banks by default
            kenyan_banks = [
                {
                    "id": 1,
                    "name": "Equity Bank Kenya",
                    "code": "EQBL",
                    "longcode": "EQBLKEN",
                    "gateway": "equity",
                    "pay_with_bank": True,
                    "active": True,
                    "is_deleted": False,
                    "country": "Kenya",
                    "currency": "KES",
                    "type": "nuban"
                },
                {
                    "id": 2,
                    "name": "KCB Bank Kenya",
                    "code": "KCBK",
                    "longcode": "KCBKKEN",
                    "gateway": "kcb",
                    "pay_with_bank": True,
                    "active": True,
                    "is_deleted": False,
                    "country": "Kenya",
                    "currency": "KES",
                    "type": "nuban"
                },
                {
                    "id": 3,
                    "name": "Cooperative Bank of Kenya",
                    "code": "COOP",
                    "longcode": "COOPKEN",
                    "gateway": "coop",
                    "pay_with_bank": True,
                    "active": True,
                    "is_deleted": False,
                    "country": "Kenya",
                    "currency": "KES",
                    "type": "nuban"
                },
                {
                    "id": 4,
                    "name": "Absa Bank Kenya",
                    "code": "ABSA",
                    "longcode": "ABSAKEN",
                    "gateway": "absa",
                    "pay_with_bank": True,
                    "active": True,
                    "is_deleted": False,
                    "country": "Kenya",
                    "currency": "KES",
                    "type": "nuban"
                },
                {
                    "id": 5,
                    "name": "NCBA Bank Kenya",
                    "code": "NCBA",
                    "longcode": "NCBAKEN",
                    "gateway": "ncba",
                    "pay_with_bank": True,
                    "active": True,
                    "is_deleted": False,
                    "country": "Kenya",
                    "currency": "KES",
                    "type": "nuban"
                },
                {
                    "id": 6,
                    "name": "Standard Chartered Bank Kenya",
                    "code": "SCBK",
                    "longcode": "SCBKKEN",
                    "gateway": "scb",
                    "pay_with_bank": True,
                    "active": True,
                    "is_deleted": False,
                    "country": "Kenya",
                    "currency": "KES",
                    "type": "nuban"
                },
                {
                    "id": 7,
                    "name": "Diamond Trust Bank Kenya",
                    "code": "DTBK",
                    "longcode": "DTBKKEN",
                    "gateway": "dtb",
                    "pay_with_bank": True,
                    "active": True,
                    "is_deleted": False,
                    "country": "Kenya",
                    "currency": "KES",
                    "type": "nuban"
                },
                {
                    "id": 8,
                    "name": "I&M Bank Kenya",
                    "code": "IMBK",
                    "longcode": "IMBKKEN",
                    "gateway": "imb",
                    "pay_with_bank": True,
                    "active": True,
                    "is_deleted": False,
                    "country": "Kenya",
                    "currency": "KES",
                    "type": "nuban"
                },
                {
                    "id": 9,
                    "name": "Stanbic Bank Kenya",
                    "code": "STBK",
                    "longcode": "STBKKEN",
                    "gateway": "stanbic",
                    "pay_with_bank": True,
                    "active": True,
                    "is_deleted": False,
                    "country": "Kenya",
                    "currency": "KES",
                    "type": "nuban"
                },
                {
                    "id": 10,
                    "name": "Family Bank Kenya",
                    "code": "FAMK",
                    "longcode": "FAMKKEN",
                    "gateway": "family",
                    "pay_with_bank": True,
                    "active": True,
                    "is_deleted": False,
                    "country": "Kenya",
                    "currency": "KES",
                    "type": "nuban"
                },
                {
                    "id": 11,
                    "name": "Sidian Bank Kenya",
                    "code": "SIDK",
                    "longcode": "SIDKKEN",
                    "gateway": "sidian",
                    "pay_with_bank": True,
                    "active": True,
                    "is_deleted": False,
                    "country": "Kenya",
                    "currency": "KES",
                    "type": "nuban"
                },
                {
                    "id": 12,
                    "name": "Bank of Africa Kenya",
                    "code": "BOAK",
                    "longcode": "BOAKKEN",
                    "gateway": "boa",
                    "pay_with_bank": True,
                    "active": True,
                    "is_deleted": False,
                    "country": "Kenya",
                    "currency": "KES",
                    "type": "nuban"
                },
                {
                    "id": 13,
                    "name": "Housing Finance Bank Kenya",
                    "code": "HFBK",
                    "longcode": "HFBKKEN",
                    "gateway": "hfb",
                    "pay_with_bank": True,
                    "active": True,
                    "is_deleted": False,
                    "country": "Kenya",
                    "currency": "KES",
                    "type": "nuban"
                },
                {
                    "id": 14,
                    "name": "Prime Bank Kenya",
                    "code": "PRBK",
                    "longcode": "PRBKKEN",
                    "gateway": "prime",
                    "pay_with_bank": True,
                    "active": True,
                    "is_deleted": False,
                    "country": "Kenya",
                    "currency": "KES",
                    "type": "nuban"
                },
                {
                    "id": 15,
                    "name": "Credit Bank Kenya",
                    "code": "CRBK",
                    "longcode": "CRBKKEN",
                    "gateway": "credit",
                    "pay_with_bank": True,
                    "active": True,
                    "is_deleted": False,
                    "country": "Kenya",
                    "currency": "KES",
                    "type": "nuban"
                }
            ]
            
            return {
                "success": True,
                "banks": kenyan_banks
            }
                    
        except Exception as e:
            logger.error(f"Error getting Kenyan banks: {e}")
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
            # For Kenyan banks, we'll simulate account resolution
            # In a real implementation, you would integrate with Kenyan bank APIs
            # or use a service like Pesapal, Cellulant, or direct bank APIs
            
            # Validate account number format (Kenyan account numbers are typically 10-15 digits)
            if not account_number.isdigit() or len(account_number) < 10 or len(account_number) > 15:
                return {
                    "success": False,
                    "error": "Invalid account number format. Kenyan account numbers should be 10-15 digits."
                }
            
            # Get bank name from our Kenyan banks list
            kenyan_banks = await self.get_banks()
            bank_name = "Unknown Bank"
            if kenyan_banks["success"]:
                for bank in kenyan_banks["banks"]:
                    if bank["code"] == bank_code:
                        bank_name = bank["name"]
                        break
            
            # Simulate account name resolution
            # In production, this would call the actual bank API
            account_name = f"Account Holder - {account_number[-4:]}"  # Last 4 digits for demo
            
            return {
                "success": True,
                "account_number": account_number,
                "account_name": account_name,
                "bank_id": bank_code,
                "bank_name": bank_name
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
    
    async def initialize_mobile_money_payment(self, amount: float, phone_number: str, reference: str, callback_url: str, provider: str = "mpesa") -> Dict[str, Any]:
        """Initialize a mobile money payment (M-Pesa or Airtel Money)."""
        try:
            logger.info(f"Paystack initialize_mobile_money_payment called with: amount={amount}, phone_number={phone_number}, reference={reference}, callback_url={callback_url}, provider={provider}")
            if not self.secret_key:
                raise ValueError("Paystack not configured")
            
            url = f"{self.base_url}/transaction/initialize"
            headers = {
                "Authorization": f"Bearer {self.secret_key}",
                "Content-Type": "application/json"
            }
            
            # Convert KES to NGN
            amount_ngn = amount * 6.67
            
            data = {
                "amount": int(amount_ngn * 100),
                "email": phone_number,  # Using email field for phone number
                "reference": reference,
                "callback_url": callback_url,
                "currency": "NGN",
                "channels": ["mobile_money"],
                "mobile_money": {
                    "phone": phone_number,
                    "provider": provider
                },
                "metadata": {
                    "type": "deposit",
                    "payment_method": provider,
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
                        "amount_ngn": amount_ngn,
                        "provider": provider
                    }
                else:
                    raise Exception(f"Paystack error: {result.get('message', 'Unknown error')}")
                    
        except Exception as e:
            logger.error(f"Error initializing mobile money payment: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def get_mobile_money_providers(self) -> Dict[str, Any]:
        """Get available mobile money providers."""
        try:
            # This would typically come from Paystack's API
            # For now, we'll return the providers we support
            return {
                "success": True,
                "providers": [
                    {
                        "code": "mpesa",
                        "name": "M-Pesa",
                        "country": "Kenya",
                        "currency": "KES",
                        "logo": "https://via.placeholder.com/50x50/00A651/FFFFFF?text=M"
                    },
                    {
                        "code": "airtel",
                        "name": "Airtel Money",
                        "country": "Kenya", 
                        "currency": "KES",
                        "logo": "https://via.placeholder.com/50x50/E60012/FFFFFF?text=A"
                    }
                ]
            }
        except Exception as e:
            logger.error(f"Error getting mobile money providers: {e}")
            return {
                "success": False,
                "error": str(e)
            }

# Global instance
paystack_service = PaystackService()
