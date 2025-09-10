import secrets
import hashlib
from datetime import datetime, timedelta
from typing import Optional
from bson import ObjectId
from database.mongodb import get_collection

class VerificationService:
    def __init__(self):
        self.token_expiry_hours = 24
    
    async def generate_verification_token(self, user_id: str) -> str:
        """Generate a secure verification token for email verification."""
        # Generate a random token
        token = secrets.token_urlsafe(32)
        
        # Hash the token for storage
        token_hash = hashlib.sha256(token.encode()).hexdigest()
        
        # Store token in database with expiry
        verification_collection = await get_collection("email_verifications")
        expiry_time = datetime.utcnow() + timedelta(hours=self.token_expiry_hours)
        
        await verification_collection.insert_one({
            "user_id": ObjectId(user_id),
            "token_hash": token_hash,
            "expires_at": expiry_time,
            "created_at": datetime.utcnow(),
            "used": False
        })
        
        return token
    
    async def verify_token(self, token: str) -> Optional[str]:
        """Verify a token and return user_id if valid."""
        # Hash the provided token
        token_hash = hashlib.sha256(token.encode()).hexdigest()
        
        # Find the token in database
        verification_collection = await get_collection("email_verifications")
        verification_record = await verification_collection.find_one({
            "token_hash": token_hash,
            "used": False,
            "expires_at": {"$gt": datetime.utcnow()}
        })
        
        if not verification_record:
            return None
        
        # Mark token as used
        await verification_collection.update_one(
            {"_id": verification_record["_id"]},
            {"$set": {"used": True, "used_at": datetime.utcnow()}}
        )
        
        return str(verification_record["user_id"])
    
    async def cleanup_expired_tokens(self):
        """Clean up expired verification tokens."""
        verification_collection = await get_collection("email_verifications")
        await verification_collection.delete_many({
            "expires_at": {"$lt": datetime.utcnow()}
        })

# Create a global instance
verification_service = VerificationService()
