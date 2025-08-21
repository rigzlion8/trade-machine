import httpx
from typing import Dict, Optional
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

class PaystackService:
    def __init__(self):
        self.secret_key = settings.PAYSTACK_SECRET_KEY
        self.public_key = settings.PAYSTACK_PUBLIC_KEY
        self.base_url = "https://api.paystack.co"
        self.headers = {
            "Authorization": f"Bearer {self.secret_key}",
            "Content-Type": "application/json"
        }
    
    async def initialize_transaction(
        self, 
        email: str, 
        amount: float, 
        reference: str,
        callback_url: str,
        metadata: Optional[Dict] = None
    ) -> Dict:
        """
        Initialize a Paystack transaction
        Amount should be in KES (Kobo - multiply by 100)
        """
        try:
            # Convert KES to Kobo (Paystack expects amount in smallest currency unit)
            amount_kobo = int(amount * 100)
            
            payload = {
                "email": email,
                "amount": amount_kobo,
                "reference": reference,
                "callback_url": callback_url,
                "currency": "NGN",  # Paystack uses NGN but we'll handle KES conversion
                "metadata": metadata or {}
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/transaction/initialize",
                    json=payload,
                    headers=self.headers
                )
                
                if response.status_code == 200:
                    data = response.json()
                    return {
                        "success": True,
                        "authorization_url": data["data"]["authorization_url"],
                        "reference": data["data"]["reference"],
                        "access_code": data["data"]["access_code"]
                    }
                else:
                    logger.error(f"Paystack initialization failed: {response.text}")
                    return {"success": False, "error": "Failed to initialize transaction"}
                    
        except Exception as e:
            logger.error(f"Error initializing Paystack transaction: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def verify_transaction(self, reference: str) -> Dict:
        """Verify a Paystack transaction"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/transaction/verify/{reference}",
                    headers=self.headers
                )
                
                if response.status_code == 200:
                    data = response.json()
                    transaction_data = data["data"]
                    
                    return {
                        "success": True,
                        "status": transaction_data["status"],
                        "amount": transaction_data["amount"] / 100,  # Convert from Kobo to KES
                        "currency": transaction_data["currency"],
                        "reference": transaction_data["reference"],
                        "gateway_response": transaction_data["gateway_response"],
                        "paid_at": transaction_data.get("paid_at"),
                        "metadata": transaction_data.get("metadata", {})
                    }
                else:
                    logger.error(f"Paystack verification failed: {response.text}")
                    return {"success": False, "error": "Failed to verify transaction"}
                    
        except Exception as e:
            logger.error(f"Error verifying Paystack transaction: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def create_subscription(
        self, 
        customer_email: str, 
        plan_code: str,
        start_date: Optional[str] = None
    ) -> Dict:
        """Create a subscription for premium features"""
        try:
            payload = {
                "customer": customer_email,
                "plan": plan_code,
                "start_date": start_date
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/subscription",
                    json=payload,
                    headers=self.headers
                )
                
                if response.status_code == 200:
                    data = response.json()
                    return {
                        "success": True,
                        "subscription_code": data["data"]["subscription_code"],
                        "status": data["data"]["status"]
                    }
                else:
                    logger.error(f"Paystack subscription creation failed: {response.text}")
                    return {"success": False, "error": "Failed to create subscription"}
                    
        except Exception as e:
            logger.error(f"Error creating Paystack subscription: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def list_banks(self) -> Dict:
        """List available banks for bank transfer"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/bank",
                    headers=self.headers
                )
                
                if response.status_code == 200:
                    data = response.json()
                    return {
                        "success": True,
                        "banks": data["data"]
                    }
                else:
                    logger.error(f"Failed to fetch banks: {response.text}")
                    return {"success": False, "error": "Failed to fetch banks"}
                    
        except Exception as e:
            logger.error(f"Error fetching banks: {str(e)}")
            return {"success": False, "error": str(e)}
    
    def get_public_key(self) -> str:
        """Get Paystack public key for frontend"""
        return self.public_key

# Create service instance
paystack_service = PaystackService()
