from typing import List, Union
from pydantic import AnyHttpUrl, EmailStr, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "AI Recruitment Hub"
    API_V1_STR: str = "/api/v1"
    
    # Environment
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    
    # Database: Default PostgreSQL, adaptable to SQLite for lightweight testing
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/ai_recruitment_hub"
    # Sync database URL for Alembic migrations if needed
    SYNC_DATABASE_URL: str = "postgresql+psycopg2://postgres:postgres@localhost:5432/ai_recruitment_hub"

    # Security & JWT
    SECRET_KEY: str = "super-secret-jwt-key-for-ai-recruitment-hub-change-in-production-2026"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 1 day for dev ease
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    RESET_PASSWORD_EXPIRE_MINUTES: int = 30

    # Initial Super Admin Seed Credentials
    FIRST_SUPERADMIN_EMAIL: EmailStr = "admin@recruitmenthub.ai"
    FIRST_SUPERADMIN_PASSWORD: str = "Admin@123456"
    FIRST_SUPERADMIN_NAME: str = "Platform Super Admin"

    # AI Engine: Google Gemini API (Env Var or Vercel Environment Variable)
    GEMINI_API_KEY: str | None = None
    GEMINI_MODEL: str = "gemini-2.0-flash"

    # CORS
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )


settings = Settings()

