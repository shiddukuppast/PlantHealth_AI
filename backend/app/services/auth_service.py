from datetime import datetime, timezone

from bson import ObjectId
from fastapi import Depends, HTTPException, Request, status
from pymongo.errors import DuplicateKeyError

from app.core.database import get_database
from app.core.security import create_access_token, decode_access_token, extract_bearer_token, get_password_hash, verify_password
from app.schemas.auth_schema import LoginRequest, SignupRequest
from app.schemas.user_schema import UserPublic


def _serialize_user(document: dict) -> UserPublic:
    return UserPublic(id=str(document["_id"]), name=document["name"], email=document["email"])


async def signup_user(payload: SignupRequest) -> tuple[UserPublic, str]:
    db = get_database()
    email = payload.email.lower().strip()
    now = datetime.now(timezone.utc)
    document = {
        "name": payload.name.strip(),
        "email": email,
        "password_hash": get_password_hash(payload.password),
        "created_at": now,
        "updated_at": now,
    }

    try:
        result = await db["users"].insert_one(document)
    except DuplicateKeyError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already exists.") from exc

    created_user = {**document, "_id": result.inserted_id}
    token = create_access_token(subject=str(result.inserted_id), email=email)
    return _serialize_user(created_user), token


async def login_user(payload: LoginRequest) -> tuple[UserPublic, str]:
    db = get_database()
    email = payload.email.lower().strip()
    user = await db["users"].find_one({"email": email})
    if user is None or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password.")

    token = create_access_token(subject=str(user["_id"]), email=user["email"])
    return _serialize_user(user), token


async def get_current_user(request: Request) -> UserPublic:
    token = extract_bearer_token(request)
    payload = decode_access_token(token)
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload.")

    try:
        object_id = ObjectId(user_id)
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token subject.") from exc

    db = get_database()
    user = await db["users"].find_one({"_id": object_id})
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found.")

    return _serialize_user(user)


CurrentUser = Depends(get_current_user)

