from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from app.services.wallet_service import wallet_service
from app.core.security import get_current_user
from app.models.user import User
from app.models.wallet import (
    P2PTransfer, BankTransfer, WalletPinUpdate, WalletLimitUpdate
)

router = APIRouter()

@router.post("/create")
async def create_wallet(current_user: User = Depends(get_current_user)):
    """Create a new wallet for the current user"""
    try:
        result = await wallet_service.create_wallet(str(current_user.id))
        
        if result["success"]:
            return {
                "success": True,
                "wallet_id": result["wallet_id"],
                "wallet_number": result["wallet_number"],
                "message": "Wallet created successfully"
            }
        else:
            raise HTTPException(status_code=400, detail=result["error"])
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/balance")
async def get_wallet_balance(current_user: User = Depends(get_current_user)):
    """Get current user's wallet balance"""
    try:
        wallet = await wallet_service.get_wallet(str(current_user.id))
        
        if not wallet:
            raise HTTPException(status_code=404, detail="Wallet not found")
        
        return {
            "success": True,
            "wallet_number": wallet.wallet_number,
            "balance_kes": wallet.balance_kes,
            "balance_usdt": wallet.balance_usdt,
            "status": wallet.status,
            "is_locked": wallet.is_locked
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/transfer/p2p")
async def p2p_transfer(
    transfer: P2PTransfer,
    current_user: User = Depends(get_current_user)
):
    """Send money to another user via phone number"""
    try:
        result = await wallet_service.p2p_transfer(transfer, str(current_user.id))
        
        if result["success"]:
            return {
                "success": True,
                "message": "Transfer successful",
                "transaction_id": result["transaction_id"],
                "amount": result["amount"],
                "fee": result["fee"],
                "total_amount": result["total_amount"]
            }
        else:
            raise HTTPException(status_code=400, detail=result["error"])
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/transfer/bank")
async def bank_transfer(
    transfer: BankTransfer,
    current_user: User = Depends(get_current_user)
):
    """Transfer money to bank account"""
    try:
        result = await wallet_service.bank_transfer(transfer, str(current_user.id))
        
        if result["success"]:
            return {
                "success": True,
                "message": "Bank transfer initiated",
                "transaction_id": result["transaction_id"],
                "amount": result["amount"],
                "fee": result["fee"],
                "total_amount": result["total_amount"],
                "status": result["status"]
            }
        else:
            raise HTTPException(status_code=400, detail=result["error"])
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/transactions")
async def get_transactions(
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_user)
):
    """Get user's transaction history"""
    try:
        transactions = await wallet_service.get_transaction_history(
            str(current_user.id), limit
        )
        
        return {
            "success": True,
            "transactions": transactions,
            "count": len(transactions)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/pin/set")
async def set_wallet_pin(
    pin_data: WalletPinUpdate,
    current_user: User = Depends(get_current_user)
):
    """Set or update wallet PIN"""
    try:
        if pin_data.new_pin != pin_data.confirm_pin:
            raise HTTPException(status_code=400, detail="PINs do not match")
        
        if len(pin_data.new_pin) != 4:
            raise HTTPException(status_code=400, detail="PIN must be 4 digits")
        
        result = await wallet_service.set_wallet_pin(str(current_user.id), pin_data.new_pin)
        
        if result["success"]:
            return {
                "success": True,
                "message": "PIN set successfully"
            }
        else:
            raise HTTPException(status_code=400, detail=result["error"])
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/search/{phone_number}")
async def search_user_by_phone(
    phone_number: str,
    current_user: User = Depends(get_current_user)
):
    """Search for a user by phone number for P2P transfers"""
    try:
        # This would typically search in your user database
        # For now, we'll return a mock response
        if not phone_number.startswith("+254"):
            phone_number = "+254" + phone_number.lstrip("0")
        
        return {
            "success": True,
            "phone_number": phone_number,
            "message": "User found (mock response)"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/limits")
async def get_wallet_limits(current_user: User = Depends(get_current_user)):
    """Get wallet transfer limits"""
    try:
        wallet = await wallet_service.get_wallet(str(current_user.id))
        
        if not wallet:
            raise HTTPException(status_code=404, detail="Wallet not found")
        
        return {
            "success": True,
            "daily_limit_kes": wallet.daily_limit_kes,
            "monthly_limit_kes": wallet.monthly_limit_kes,
            "daily_transfer_count": wallet.daily_transfer_count,
            "monthly_transfer_count": wallet.monthly_transfer_count,
            "max_daily_transfers": 10
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
