from motor.motor_asyncio import AsyncIOMotorClient
from pymongo.errors import DuplicateKeyError, ConnectionFailure
from typing import Optional
import logging
from config.settings import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

class MongoDB:
    client: Optional[AsyncIOMotorClient] = None
    database = None

    @classmethod
    async def connect_to_mongo(cls):
        """Create database connection."""
        try:
            cls.client = AsyncIOMotorClient(settings.mongodb_url)
            cls.database = cls.client[settings.mongodb_database]
            
            # Test the connection
            await cls.client.admin.command('ping')
            logger.info("Successfully connected to MongoDB")
            
            # Create indexes
            await cls.create_indexes()
            
        except ConnectionFailure as e:
            logger.error(f"Failed to connect to MongoDB: {e}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error connecting to MongoDB: {e}")
            raise

    @classmethod
    async def close_mongo_connection(cls):
        """Close database connection."""
        if cls.client:
            cls.client.close()
            logger.info("MongoDB connection closed")

    @classmethod
    async def create_indexes(cls):
        """Create database indexes for better performance."""
        try:
            # Users collection indexes
            await cls.database.users.create_index("email", unique=True)
            await cls.database.users.create_index("google_id", sparse=True)
            await cls.database.users.create_index("phone_number", sparse=True)
            
            # Wallets collection indexes
            await cls.database.wallets.create_index("user_id", unique=True)
            
            # Transactions collection indexes
            await cls.database.transactions.create_index("user_id")
            await cls.database.transactions.create_index("reference", unique=True)
            await cls.database.transactions.create_index("created_at")
            await cls.database.transactions.create_index("status")
            
            # Bots collection indexes
            await cls.database.bots.create_index("user_id")
            await cls.database.bots.create_index("status")
            
            logger.info("Database indexes created successfully")
            
        except Exception as e:
            logger.error(f"Error creating indexes: {e}")

    @classmethod
    def get_collection(cls, collection_name: str):
        """Get a collection from the database."""
        if cls.database is None:
            raise ConnectionError("Database not connected")
        return cls.database[collection_name]

# Database connection functions
async def get_database():
    """Get database instance."""
    if MongoDB.database is None:
        await MongoDB.connect_to_mongo()
    return MongoDB.database

async def get_collection(collection_name: str):
    """Get a specific collection."""
    if MongoDB.database is None:
        await MongoDB.connect_to_mongo()
    return MongoDB.get_collection(collection_name)

# Collection names
USERS_COLLECTION = "users"
WALLETS_COLLECTION = "wallets"
TRANSACTIONS_COLLECTION = "transactions"
BOTS_COLLECTION = "bots"
TRADES_COLLECTION = "trades"
