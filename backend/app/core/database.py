from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from app.core.config import get_settings

client: AsyncIOMotorClient | None = None
database: AsyncIOMotorDatabase | None = None


async def connect_to_mongo() -> None:
    global client, database
    settings = get_settings()
    client = AsyncIOMotorClient(settings.mongodb_uri, serverSelectionTimeoutMS=5000)
    database = client[settings.database_name]
    await client.admin.command("ping")

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
        raise RuntimeError("Database is not connected.")
    return database


def is_connected() -> bool:
    return client is not None and database is not None

