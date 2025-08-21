import httpx
import logging
import base64
import json
from typing import Optional, Dict, Any
from datetime import datetime
from config.settings import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

class MPESAService:
    def __init__(self):
        # M-Pesa API credentials (these would come from environment variables)
        self.consumer_key = "your_mpesa_consumer_key"
        self.consumer_secret = "your_mpesa_consumer_secret"
        self.business_shortcode = "your_business_shortcode"
        self.passkey = "your_mpesa_passkey"
        self.base_url = "https://sandbox.safaricom.co.ke"  # Use production URL for live
        
        if not all([self.consumer_key, self.consumer_secret, self.business_shortcode, self.passkey]):
            logger.warning("M-Pesa credentials not fully configured")
    
    def _get_access_token(self) -> Optional[str]:
        """Get M-Pesa access token."""
        try:
            # Encode consumer key and secret
            credentials = f"{self.consumer_key}:{self.consumer_secret}"
            encoded_credentials = base64.b64encode(credentials.encode()).decode()
            
            headers = {
                "Authorization": f"Basic {encoded_credentials}",
                "Content-Type": "application/json"
            }
            
            url = f"{self.base_url}/oauth/v1/generate?grant_type=client_credentials"
            
            # For now, return a mock token since we don't have real credentials
            # In production, you'd make the actual HTTP request
            return "mock_access_token"
            
        except Exception as e:
            logger.error(f"Error getting M-Pesa access token: {e}")
            return None
    
    def _generate_timestamp(self) -> str:
        """Generate timestamp in M-Pesa format."""
        return datetime.now().strftime("%Y%m%d%H%M%S")
    
    def _generate_password(self) -> str:
        """Generate M-Pesa password."""
        timestamp = self._generate_timestamp()
        password_string = f"{self.business_shortcode}{self.passkey}{timestamp}"
        return base64.b64encode(password_string.encode()).decode()
    
    async def stk_push(self, phone_number: str, amount: float, reference: str, description: str = "Wallet deposit") -> Dict[str, Any]:
        """Initiate STK push for mobile money deposit."""
        try:
            if not all([self.consumer_key, self.consumer_secret, self.business_shortcode, self.passkey]):
                return {
                    "success": False,
                    "error": "M-Pesa not configured"
                }
            
            access_token = self._get_access_token()
            if not access_token:
                return {
                    "success": False,
                    "error": "Failed to get access token"
                }
            
            # Format phone number (remove +254 and add 254)
            if phone_number.startswith('+254'):
                phone_number = phone_number[1:]
            elif phone_number.startswith('0'):
                phone_number = '254' + phone_number[1:]
            elif not phone_number.startswith('254'):
                phone_number = '254' + phone_number
            
            url = f"{self.base_url}/mpesa/stkpush/v1/processrequest"
            headers = {
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json"
            }
            
            data = {
                "BusinessShortCode": self.business_shortcode,
                "Password": self._generate_password(),
                "Timestamp": self._generate_timestamp(),
                "TransactionType": "CustomerPayBillOnline",
                "Amount": int(amount),
                "PartyA": phone_number,
                "PartyB": self.business_shortcode,
                "PhoneNumber": phone_number,
                "CallBackURL": f"https://yourdomain.com/api/mpesa/callback",
                "AccountReference": reference,
                "TransactionDesc": description
            }
            
            # For now, return mock response since we don't have real credentials
            # In production, you'd make the actual HTTP request
            return {
                "success": True,
                "CheckoutRequestID": f"ws_CO_{reference}_{int(datetime.now().timestamp())}",
                "MerchantRequestID": f"mock_merchant_{reference}",
                "ResponseCode": "0",
                "ResponseDescription": "Success. Request accepted for processing",
                "CustomerMessage": "Success. Request accepted for processing"
            }
            
        except Exception as e:
            logger.error(f"Error initiating M-Pesa STK push: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def c2b_register_urls(self) -> Dict[str, Any]:
        """Register C2B URLs for callbacks."""
        try:
            if not all([self.consumer_key, self.consumer_secret]):
                return {
                    "success": False,
                    "error": "M-Pesa not configured"
                }
            
            access_token = self._get_access_token()
            if not access_token:
                return {
                    "success": False,
                    "error": "Failed to get access token"
                }
            
            url = f"{self.base_url}/mpesa/c2b/v1/registerurl"
            headers = {
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json"
            }
            
            data = {
                "ShortCode": self.business_shortcode,
                "ResponseType": "Completed",
                "ConfirmationURL": "https://yourdomain.com/api/mpesa/confirmation",
                "ValidationURL": "https://yourdomain.com/api/mpesa/validation"
            }
            
            # For now, return mock response
            return {
                "success": True,
                "ResponseCode": "0",
                "ResponseDescription": "Success"
            }
            
        except Exception as e:
            logger.error(f"Error registering M-Pesa C2B URLs: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def b2c_payment(self, phone_number: str, amount: float, reference: str, description: str = "Wallet withdrawal") -> Dict[str, Any]:
        """Initiate B2C payment (withdrawal to mobile money)."""
        try:
            if not all([self.consumer_key, self.consumer_secret, self.business_shortcode]):
                return {
                    "success": False,
                    "error": "M-Pesa not configured"
                }
            
            access_token = self._get_access_token()
            if not access_token:
                return {
                    "success": False,
                    "error": "Failed to get access token"
                }
            
            # Format phone number
            if phone_number.startswith('+254'):
                phone_number = phone_number[1:]
            elif phone_number.startswith('0'):
                phone_number = '254' + phone_number[1:]
            elif not phone_number.startswith('254'):
                phone_number = '254' + phone_number
            
            url = f"{self.base_url}/mpesa/b2c/v1/paymentrequest"
            headers = {
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json"
            }
            
            data = {
                "InitiatorName": "your_initiator_name",
                "SecurityCredential": "your_security_credential",
                "CommandID": "BusinessPayment",
                "Amount": int(amount),
                "PartyA": self.business_shortcode,
                "PartyB": phone_number,
                "Remarks": description,
                "QueueTimeOutURL": "https://yourdomain.com/api/mpesa/timeout",
                "ResultURL": "https://yourdomain.com/api/mpesa/result",
                "Occasion": reference
            }
            
            # For now, return mock response
            return {
                "success": True,
                "ConversationID": f"mock_conversation_{reference}",
                "OriginatorConversationID": f"mock_originator_{reference}",
                "ResponseCode": "0",
                "ResponseDescription": "The service request is processed successfully."
            }
            
        except Exception as e:
            logger.error(f"Error initiating M-Pesa B2C payment: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def check_transaction_status(self, checkout_request_id: str) -> Dict[str, Any]:
        """Check the status of an STK push transaction."""
        try:
            if not all([self.consumer_key, self.consumer_secret]):
                return {
                    "success": False,
                    "error": "M-Pesa not configured"
                }
            
            access_token = self._get_access_token()
            if not access_token:
                return {
                    "success": False,
                    "error": "Failed to get access token"
                }
            
            url = f"{self.base_url}/mpesa/stkpushquery/v1/query"
            headers = {
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json"
            }
            
            data = {
                "BusinessShortCode": self.business_shortcode,
                "Password": self._generate_password(),
                "Timestamp": self._generate_timestamp(),
                "CheckoutRequestID": checkout_request_id
            }
            
            # For now, return mock response
            return {
                "success": True,
                "CheckoutRequestID": checkout_request_id,
                "MerchantRequestID": f"mock_merchant_{checkout_request_id}",
                "ResultCode": "0",
                "ResultDesc": "The service request is processed successfully.",
                "Amount": 100,
                "MpesaReceiptNumber": f"mock_receipt_{checkout_request_id}",
                "TransactionDate": datetime.now().strftime("%Y%m%d%H%M%S")
            }
            
        except Exception as e:
            logger.error(f"Error checking M-Pesa transaction status: {e}")
            return {
                "success": False,
                "error": str(e)
            }

# Global instance
mpesa_service = MPESAService()
