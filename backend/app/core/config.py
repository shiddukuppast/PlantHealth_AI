from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False
    )

    app_name: str = "PlantGuard AI Backend"

    mongodb_uri: str = Field(
        ...,
        alias="MONGODB_URI"
    )

    database_name: str = Field(
        "plantguard",
        alias="DATABASE_NAME"
    )

    jwt_secret_key: str = Field(
        ...,
        alias="JWT_SECRET_KEY"
    )

    jwt_algorithm: str = Field(
        "HS256",
        alias="JWT_ALGORITHM"
    )

    access_token_expire_minutes: int = Field(
        60,
        alias="ACCESS_TOKEN_EXPIRE_MINUTES"
    )


    # ==========================================================
    # MODEL 1
    # Disease vs Pest
    # ==========================================================

    classifier_model_path: str = Field(
        ...,
        alias="CLASSIFIER_MODEL_PATH"
    )

    classifier_class_names_path: str = Field(
        ...,
        alias="CLASSIFIER_CLASS_NAMES_PATH"
    )


    # ==========================================================
    # MODEL 2
    # Plant Disease Classifier
    # ==========================================================

    disease_model_path: str = Field(
        ...,
        alias="DISEASE_MODEL_PATH"
    )

    disease_class_names_path: str = Field(
        ...,
        alias="DISEASE_CLASS_NAMES_PATH"
    )


    # ==========================================================
    # MODEL 3
    # Pest Classifier
    # ==========================================================

    pest_model_path: str = Field(
        ...,
        alias="PEST_MODEL_PATH"
    )

    pest_class_names_path: str = Field(
        ...,
        alias="PEST_CLASS_NAMES_PATH"
    )

    model_confidence_threshold: float = Field(
        0.60,
        alias="MODEL_CONFIDENCE_THRESHOLD"
    )

    model_rejection_threshold: float = Field(
        0.15,
        alias="MODEL_REJECTION_THRESHOLD"
    )

    llm_api_key: str | None = Field(
        default=None,
        alias="LLM_API_KEY"
    )

    llm_api_url: str = Field(
        "https://api.openai.com/v1/chat/completions",
        alias="LLM_API_URL"
    )

    llm_model: str = Field(
        "openai/gpt-oss-20b",
        alias="LLM_MODEL"
    )

    openweather_api_key: str | None = Field(
        default=None,
        alias="OPENWEATHER_API_KEY"
    )

    openweather_city: str = Field(
        "Bengaluru",
        alias="OPENWEATHER_CITY"
    )

    openweather_country: str = Field(
        "IN",
        alias="OPENWEATHER_COUNTRY"
    )


    # ==========================================================
    # FRONTEND
    # ==========================================================

    frontend_url: str = Field(
        "http://localhost:3000",
        alias="FRONTEND_URL"
    )

    cors_origins: str | None = Field(
        default=None,
        alias="CORS_ORIGINS"
    )


    # ==========================================================
    # UPLOAD
    # ==========================================================

    max_upload_size_mb: int = Field(
        10,
        alias="MAX_UPLOAD_SIZE_MB"
    )

    token_cookie_name: str = Field(
        "plantguard_access_token",
        alias="TOKEN_COOKIE_NAME"
    )

    cookie_secure: bool = Field(
        False,
        alias="COOKIE_SECURE"
    )


    # ==========================================================
    # BACKEND ROOT
    # ==========================================================

    @property
    def backend_root(self) -> Path:

        return Path(__file__).resolve().parents[2]


    # ==========================================================
    # MODEL 1 PATH
    # ==========================================================

    @property
    def classifier_model_file(self) -> Path:

        candidate = Path(
            self.classifier_model_path
        )

        return (
            candidate
            if candidate.is_absolute()
            else self.backend_root / candidate
        )


    @property
    def classifier_class_names_file(self) -> Path:

        candidate = Path(
            self.classifier_class_names_path
        )

        return (
            candidate
            if candidate.is_absolute()
            else self.backend_root / candidate
        )


    # ==========================================================
    # MODEL 2 PATH
    # ==========================================================

    @property
    def disease_model_file(self) -> Path:

        candidate = Path(
            self.disease_model_path
        )

        return (
            candidate
            if candidate.is_absolute()
            else self.backend_root / candidate
        )


    @property
    def disease_class_names_file(self) -> Path:

        candidate = Path(
            self.disease_class_names_path
        )

        return (
            candidate
            if candidate.is_absolute()
            else self.backend_root / candidate
        )


    # ==========================================================
    # MODEL 3 PATH
    # ==========================================================

    @property
    def pest_model_file(self) -> Path:

        candidate = Path(
            self.pest_model_path
        )

        return (
            candidate
            if candidate.is_absolute()
            else self.backend_root / candidate
        )


    @property
    def pest_class_names_file(self) -> Path:

        candidate = Path(
            self.pest_class_names_path
        )

        return (
            candidate
            if candidate.is_absolute()
            else self.backend_root / candidate
        )


    # ==========================================================
    # UPLOAD SIZE
    # ==========================================================

    @property
    def max_upload_size_bytes(self) -> int:

        return (
            self.max_upload_size_mb
            * 1024
            * 1024
        )


    # ==========================================================
    # CORS
    # ==========================================================

    @property
    def allowed_origins(self) -> list[str]:

        if self.cors_origins:

            return [
                origin.strip()
                for origin in self.cors_origins.split(",")
                if origin.strip()
            ]

        return [self.frontend_url]


@lru_cache
def get_settings() -> Settings:

    return Settings()