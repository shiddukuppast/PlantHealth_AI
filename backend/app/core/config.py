from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", case_sensitive=False)

    app_name: str = "PlantGuard AI Backend"
    mongodb_uri: str = Field(..., alias="MONGODB_URI")
    database_name: str = Field("plantguard", alias="DATABASE_NAME")

    jwt_secret_key: str = Field(..., alias="JWT_SECRET_KEY")
    jwt_algorithm: str = Field("HS256", alias="JWT_ALGORITHM")
    access_token_expire_minutes: int = Field(60, alias="ACCESS_TOKEN_EXPIRE_MINUTES")

    model_path: str = Field(..., alias="MODEL_PATH")
    class_names_path: str = Field(..., alias="CLASS_NAMES_PATH")

    frontend_url: str = Field("http://localhost:3000", alias="FRONTEND_URL")
    cors_origins: str | None = Field(default=None, alias="CORS_ORIGINS")

    max_upload_size_mb: int = Field(10, alias="MAX_UPLOAD_SIZE_MB")
    token_cookie_name: str = Field("plantguard_access_token", alias="TOKEN_COOKIE_NAME")
    cookie_secure: bool = Field(False, alias="COOKIE_SECURE")

    @property
    def backend_root(self) -> Path:
        return Path(__file__).resolve().parents[2]

    @property
    def model_file(self) -> Path:
        candidate = Path(self.model_path)
        return candidate if candidate.is_absolute() else self.backend_root / candidate

    @property
    def class_names_file(self) -> Path:
        candidate = Path(self.class_names_path)
        return candidate if candidate.is_absolute() else self.backend_root / candidate

    @property
    def max_upload_size_bytes(self) -> int:
        return self.max_upload_size_mb * 1024 * 1024

    @property
    def allowed_origins(self) -> list[str]:
        if self.cors_origins:
            return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]
        return [self.frontend_url]


@lru_cache
def get_settings() -> Settings:
    return Settings()

