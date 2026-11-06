from fastapi import HTTPException, status
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from app.core.config import get_settings

client: AsyncIOMotorClient | None = None
database: AsyncIOMotorDatabase | None = None


async def connect_to_mongo() -> None:
    global client, database
    settings = get_settings()
    temp_client = AsyncIOMotorClient(settings.mongodb_uri, serverSelectionTimeoutMS=5000)
    await temp_client.admin.command("ping")

    client = temp_client
    database = client[settings.database_name]

    users = database["users"]
    predictions = database["predictions"]
    await users.create_index("email", unique=True)
    await predictions.create_index([("user_id", 1), ("created_at", -1)])


async def close_mongo_connection() -> None:
    global client, database
    if client is not None:
        client.close()
    client = None
    database = None


def get_database() -> AsyncIOMotorDatabase:
    if database is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database service is unavailable. Please verify your MongoDB configuration.",
        )
    return database


def is_connected() -> bool:
    return client is not None and database is not None

