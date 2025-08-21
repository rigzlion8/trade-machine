from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
from typing import Dict
import json
import hmac
import hashlib

from app.services.paystack_service import paystack_service
from app.core.security import get_current_user
from app.models.user import User

router = APIRouter()

@router.post("/initialize")
async def initialize_payment(
    amount: float,
    email: str,
    reference: str,
    callback_url: str,
    current_user: User = Depends(get_current_user)
):
    """Initialize a Paystack payment"""
    try:
        # Validate amount (minimum 100 KES)
        if amount < 100:
            raise HTTPException(status_code=400, detail="Minimum amount is 100 KES")
        
        # Initialize transaction
        result = await paystack_service.initialize_transaction(
            email=email,
            amount=amount,
            reference=reference,
            callback_url=callback_url,
            metadata={
                "user_id": str(current_user.id),
                "user_email": current_user.email,
                "currency": "KES"
            }
        )
        
        if result["success"]:
            return {
                "success": True,
                "authorization_url": result["authorization_url"],
                "reference": result["reference"]
            }
        else:
            raise HTTPException(status_code=400, detail=result["error"])
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/verify/{reference}")
async def verify_payment(reference: str, current_user: User = Depends(get_current_user)):
    """Verify a Paystack payment"""
    try:
        result = await paystack_service.verify_transaction(reference)
        
        if result["success"]:
            # Here you would typically:
            # 1. Update user balance
            # 2. Create transaction record
            # 3. Send confirmation email
            
            return {
                "success": True,
                "transaction": result
            }
        else:
            raise HTTPException(status_code=400, detail=result["error"])
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/webhook")
async def paystack_webhook(request: Request):
    """Handle Paystack webhook notifications"""
    try:
        # Get the request body
        body = await request.body()
        signature = request.headers.get("X-Paystack-Signature")
        
        # Verify webhook signature
        if not signature:
            raise HTTPException(status_code=400, detail="Missing signature")
        
        # Verify webhook (you should implement proper signature verification)
        # This is a simplified version - implement proper verification in production
        
        # Parse the webhook data
        webhook_data = json.loads(body)
        event = webhook_data.get("event")
        data = webhook_data.get("data", {})
        
        if event == "charge.success":
            # Payment was successful
            reference = data.get("reference")
            amount = data.get("amount", 0) / 100  # Convert from Kobo to KES
            
            # Process successful payment
            # Update user balance, create transaction record, etc.
            
            return {"status": "success", "message": "Payment processed"}
            
        elif event == "charge.failed":
            # Payment failed
            reference = data.get("reference")
            
            # Handle failed payment
            # Maybe send notification to user
            
            return {"status": "success", "message": "Failed payment handled"}
            
        else:
            # Other events
            return {"status": "success", "message": "Event processed"}
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/banks")
async def list_banks():
    """List available banks for bank transfer"""
    try:
        result = await paystack_service.list_banks()
        
        if result["success"]:
            return {
                "success": True,
                "banks": result["banks"]
            }
        else:
            raise HTTPException(status_code=400, detail=result["error"])
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/public-key")
async def get_public_key():
    """Get Paystack public key for frontend"""
    return {"public_key": paystack_service.get_public_key()}
