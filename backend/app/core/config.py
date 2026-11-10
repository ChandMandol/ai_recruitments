from typing import Any, List, Union
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit
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

    # CORS: Accepts List[str] or raw string like "*" or comma-separated origins
    BACKEND_CORS_ORIGINS: Union[List[str], str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]

    @field_validator("DATABASE_URL", mode="before")
    def assemble_async_db_url(cls, v: str | None) -> str:
        if not v or not isinstance(v, str):
            return v or ""
        url = v.strip()
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql+asyncpg://", 1)
        elif url.startswith("postgresql://") and not url.startswith("postgresql+"):
            url = url.replace("postgresql://", "postgresql+asyncpg://", 1)

        parsed = urlsplit(url)
        query_params = parse_qsl(parsed.query, keep_blank_values=True)

        allowed_asyncpg_params = {
            "timeout", "command_timeout", "statement_cache_size",
            "max_cached_statement_lifetime", "max_cacheable_statement_size",
            "target_session_attrs", "direct_tls"
        }

        new_params = []
        ssl_set = False
        for k, val in query_params:
            k_lower = k.lower()
            if k_lower in ("sslmode", "ssl"):
                if val.lower() in ("require", "verify-ca", "verify-full", "true", "1"):
                    new_params.append(("ssl", "require"))
                    ssl_set = True
                elif val.lower() in ("disable", "false", "0"):
                    new_params.append(("ssl", "disable"))
                    ssl_set = True
            elif k_lower in allowed_asyncpg_params:
                new_params.append((k, val))
            # Parameters like channel_binding, options, gssencmode are ignored for asyncpg

        # Ensure cloud-hosted databases (Neon, Render, Supabase) connect over SSL
        if not ssl_set and any(host in parsed.netloc for host in ("neon.tech", "render.com", "supabase.co")):
            new_params.append(("ssl", "require"))

        new_query = urlencode(new_params)
        return urlunsplit((parsed.scheme, parsed.netloc, parsed.path, new_query, parsed.fragment))

    @field_validator("SYNC_DATABASE_URL", mode="before")
    def assemble_sync_db_url(cls, v: str | None) -> str:
        if isinstance(v, str):
            if v.startswith("postgres://"):
                return v.replace("postgres://", "postgresql+psycopg2://", 1)
            elif v.startswith("postgresql://") and not v.startswith("postgresql+"):
                return v.replace("postgresql://", "postgresql+psycopg2://", 1)
        return v or ""

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    def assemble_cors_origins(cls, v: Any) -> List[str]:
        if isinstance(v, str):
            v_str = v.strip()
            if not v_str:
                return ["*"]
            if v_str.startswith("[") and v_str.endswith("]"):
                import json
                try:
                    loaded = json.loads(v_str)
                    if isinstance(loaded, list):
                        return [str(i).strip() for i in loaded if i]
                except Exception:
                    pass
            return [i.strip() for i in v_str.split(",") if i.strip()]
        elif isinstance(v, (list, tuple)):
            return [str(i).strip() for i in v if i]
        return ["*"]

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )


settings = Settings()

