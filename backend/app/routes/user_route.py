from fastapi import APIRouter

from app.schemas.user_schema import UserPublic
from app.services.auth_service import CurrentUser

router = APIRouter(prefix="/user", tags=["user"])


@router.get("/profile", response_model=UserPublic)
async def profile(current_user: UserPublic = CurrentUser) -> UserPublic:
    return current_user

