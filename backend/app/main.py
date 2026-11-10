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
    """Seed default superadmin on startup if database has no admin."""
    async with AsyncSessionLocal() as session:
        try:
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
                await session.commit()
                logger.info(f"Default Super Admin seeded: {settings.FIRST_SUPERADMIN_EMAIL}")
            else:
                logger.info("Super Admin already exists.")
        except Exception as e:
            logger.error(f"Error during superadmin seeding: {e}")
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
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
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
        content={"detail": "An unexpected server error occurred. Please try again later."},
    )


# Health check endpoints
@app.get("/health", tags=["System"])
@app.get("/api/health", tags=["System"])
async def health_check():
    """Health check endpoint to verify backend status."""
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "environment": settings.ENVIRONMENT,
        "database": "PostgreSQL 16",
    }


# Include V1 API Routes
app.include_router(api_router, prefix=settings.API_V1_STR)

# WebSocket routes — mounted directly on app (not under api_router)
# to avoid CORS/prefix conflicts with WS upgrade handshake
app.include_router(ws_interview_router, prefix=settings.API_V1_STR)

