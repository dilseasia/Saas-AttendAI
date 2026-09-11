"""
core/config.py
──────────────
Centralized settings using pydantic-settings.
All values are pulled from environment variables / .env file.
"""

from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # ── App ───────────────────────────────────────────────────────
    APP_NAME: str = "SaaS Attend-AI"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False

    # ── Database ──────────────────────────────────────────────────
    DATABASE_URL: str = "postgresql://postgres:password@localhost:5432/saas_attendai"
    DB_POOL_MIN_SIZE: int = 5
    DB_POOL_MAX_SIZE: int = 20
    DB_COMMAND_TIMEOUT: float = 30.0

    # ── JWT ───────────────────────────────────────────────────────
    JWT_SECRET_KEY: str = "CHANGE_ME_USE_A_LONG_RANDOM_SECRET_IN_PRODUCTION"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # ── CORS ──────────────────────────────────────────────────────
    ALLOWED_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
    ]

    # ── Business ──────────────────────────────────────────────────
    TRIAL_DAYS: int = 14
    DEFAULT_TIMEZONE: str = "Asia/Kolkata"

    # ── SMTP Email ────────────────────────────────────────────────
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    EMAILS_FROM_EMAIL: str = "noreply@attendai.com"
    EMAILS_FROM_NAME: str = "Attend AI"
    FRONTEND_URL: str = "http://localhost:3000"

    # ── Stripe Settings ───────────────────────────────────────────
    STRIPE_SECRET_KEY: str = ""
    STRIPE_PUBLISHABLE_KEY: str = ""
    STRIPE_WEBHOOK_SECRET: str = ""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()
