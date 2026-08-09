from fastapi import APIRouter, Response, status

from app.core.config import get_settings
from app.schemas.auth_schema import AuthResponse, LoginRequest, SignupRequest
from app.schemas.user_schema import UserPublic
from app.services.auth_service import CurrentUser, login_user, signup_user

router = APIRouter(prefix="/auth", tags=["auth"])


def _set_auth_cookie(response: Response, token: str) -> None:
    settings = get_settings()
    response.set_cookie(
        key=settings.token_cookie_name,
        value=token,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",
        max_age=settings.access_token_expire_minutes * 60,
        path="/",
    )


@router.post("/signup", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def signup(payload: SignupRequest, response: Response) -> AuthResponse:
    user, access_token = await signup_user(payload)
    _set_auth_cookie(response, access_token)
    return AuthResponse(message="Account created successfully", user=user, access_token=access_token)


@router.post("/login", response_model=AuthResponse)
async def login(payload: LoginRequest, response: Response) -> AuthResponse:
    user, access_token = await login_user(payload)
    _set_auth_cookie(response, access_token)
    return AuthResponse(message="Login successful", user=user, access_token=access_token)


@router.get("/me", response_model=UserPublic)
async def me(current_user: UserPublic = CurrentUser) -> UserPublic:
    return current_user


@router.post("/logout")
async def logout(response: Response) -> dict:
    settings = get_settings()
    response.delete_cookie(key=settings.token_cookie_name, path="/")
    return {"success": True, "message": "Logged out successfully."}

