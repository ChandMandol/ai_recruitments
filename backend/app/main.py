import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import select
from app.api.v1.router import api_router
from app.api.v1.endpoints.websocket_interview import router as ws_interview_router
from app.core.config import settings
from app.core.database import AsyncSessionLocal, Base, engine
from app.core.security import get_password_hash
from app.core.security_headers import SecurityHeadersMiddleware
from app.models.user import User, UserRole

# Logging configuration
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - [%(levelname)s] - %(name)s - %(message)s"
)
logger = logging.getLogger("ai_recruitment_hub")


async def seed_initial_superadmin():
    """Seed default superadmin and demo candidate on startup if database has no admin."""
    async with AsyncSessionLocal() as session:
        try:
            # 1. Super Admin Seed
            stmt = select(User).where(User.email == settings.FIRST_SUPERADMIN_EMAIL.lower())
            result = await session.execute(stmt)
            existing_admin = result.scalar_one_or_none()
            if not existing_admin:
                admin_user = User(
                    email=settings.FIRST_SUPERADMIN_EMAIL.lower(),
                    password_hash=get_password_hash(settings.FIRST_SUPERADMIN_PASSWORD),
                    full_name=settings.FIRST_SUPERADMIN_NAME,
                    role=UserRole.SUPER_ADMIN.value,
                    is_active=True,
                    is_verified=True,
                )
                session.add(admin_user)
                logger.info(f"Default Super Admin seeded: {settings.FIRST_SUPERADMIN_EMAIL}")
            else:
                logger.info("Super Admin already exists.")

            # 2. Demo Candidate Seed
            demo_email = "candidate.demo@example.com"
            demo_stmt = select(User).where(User.email == demo_email)
            demo_result = await session.execute(demo_stmt)
            existing_candidate = demo_result.scalar_one_or_none()
            if not existing_candidate:
                candidate_user = User(
                    email=demo_email,
                    password_hash=get_password_hash("Candidate@123"),
                    full_name="Demo Candidate",
                    role=UserRole.CANDIDATE.value,
                    is_active=True,
                    is_verified=True,
                )
                session.add(candidate_user)
                logger.info(f"Default Demo Candidate seeded: {demo_email}")

            await session.commit()
        except Exception as e:
            logger.error(f"Error during initial data seeding: {e}")
            await session.rollback()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan handler for FastAPI: database table creation and initial data seeding."""
    logger.info("Initializing database tables and services...")
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logger.info("Database schema synchronized.")
        
        # Seed default admin account
        await seed_initial_superadmin()
    except Exception as e:
        logger.error(f"Database startup failed: {e}")
    
    yield
    
    logger.info("Shutting down application and database connections...")
    await engine.dispose()


app = FastAPI(
    title=settings.PROJECT_NAME,
    description="AI-Powered Recruitment Hub API with Gemini Live, WebRTC, and Role-Based Authentication.",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS Middleware
origins = list(settings.BACKEND_CORS_ORIGINS) if isinstance(settings.BACKEND_CORS_ORIGINS, (list, tuple)) else [str(settings.BACKEND_CORS_ORIGINS)]
if "*" in origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origin_regex=".*",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
else:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

# OWASP Security Headers Middleware
app.add_middleware(SecurityHeadersMiddleware)


# Global Exception Handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception at {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "detail": "An unexpected server error occurred. Please try again later.",
            "error_type": exc.__class__.__name__,
            "error_message": str(exc),
        },
    )


# Health check endpoints
@app.get("/health", tags=["System"])
@app.get("/api/health", tags=["System"])
async def health_check():
    """Health check endpoint to verify backend and database connection status."""
    db_connected = False
    db_error = None
    admin_exists = False
    candidate_exists = False
    try:
        async with AsyncSessionLocal() as session:
            await session.execute(select(1))
            db_connected = True

            admin_res = await session.execute(
                select(User.email).where(User.email == settings.FIRST_SUPERADMIN_EMAIL.lower())
            )
            admin_exists = admin_res.scalar_one_or_none() is not None

            cand_res = await session.execute(
                select(User.email).where(User.email == "candidate.demo@example.com")
            )
            candidate_exists = cand_res.scalar_one_or_none() is not None
    except Exception as e:
        db_error = f"{e.__class__.__name__}: {str(e)}"

    # Mask database URL for safety (keep host and scheme)
    url_str = settings.DATABASE_URL
    if "@" in url_str:
        prefix, rest = url_str.split("@", 1)
        scheme = prefix.split("://")[0] if "://" in prefix else ""
        host_port = rest.split("/")[0] if "/" in rest else rest
        db_target = f"{scheme}://***@{host_port}"
    else:
        db_target = url_str

    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "environment": settings.ENVIRONMENT,
        "database": "PostgreSQL 16",
        "database_connected": db_connected,
        "admin_seeded": admin_exists,
        "demo_candidate_seeded": candidate_exists,
        "database_target": db_target,
        "database_error": db_error,
    }


# Include V1 API Routes
app.include_router(api_router, prefix=settings.API_V1_STR)

# WebSocket routes — mounted directly on app (not under api_router)
# to avoid CORS/prefix conflicts with WS upgrade handshake
app.include_router(ws_interview_router, prefix=settings.API_V1_STR)

