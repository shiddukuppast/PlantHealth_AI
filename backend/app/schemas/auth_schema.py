from pydantic import BaseModel, EmailStr, Field

from app.schemas.user_schema import UserPublic


class SignupRequest(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class AuthResponse(BaseModel):
    message: str
    user: UserPublic
    access_token: str
    token_type: str = "bearer"

