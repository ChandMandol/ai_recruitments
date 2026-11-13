import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import func, select
from app.api.v1.router import api_router
from app.api.v1.endpoints.websocket_interview import router as ws_interview_router
from app.core.config import settings
from app.core.database import AsyncSessionLocal, Base, engine
from app.core.security import get_password_hash
from app.core.security_headers import SecurityHeadersMiddleware
from app.models.application import ApplicationStatus, JobApplication
from app.models.candidate import CandidateProfile
from app.models.job import Job
from app.models.user import User, UserRole

# Logging configuration
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - [%(levelname)s] - %(name)s - %(message)s"
)
logger = logging.getLogger("ai_recruitment_hub")


async def seed_initial_superadmin():
    """Seed default superadmin, demo candidate, demo jobs, and shortlisted application on startup."""
    async with AsyncSessionLocal() as session:
        try:
            # 1. Super Admin Seed
            stmt = select(User).where(User.email == settings.FIRST_SUPERADMIN_EMAIL.lower())
            result = await session.execute(stmt)
            admin_user = result.scalars().first()
            if not admin_user:
                admin_user = User(
                    email=settings.FIRST_SUPERADMIN_EMAIL.lower(),
                    password_hash=get_password_hash(settings.FIRST_SUPERADMIN_PASSWORD),
                    full_name=settings.FIRST_SUPERADMIN_NAME,
                    role=UserRole.SUPER_ADMIN.value,
                    is_active=True,
                    is_verified=True,
                )
                session.add(admin_user)
                await session.flush()
                logger.info(f"Default Super Admin seeded: {settings.FIRST_SUPERADMIN_EMAIL}")
            else:
                logger.info("Super Admin already exists.")

            # 2. Demo Candidate Seed
            demo_email = "candidate.demo@example.com"
            demo_stmt = select(User).where(User.email == demo_email)
            demo_result = await session.execute(demo_stmt)
            candidate_user = demo_result.scalars().first()
            if not candidate_user:
                candidate_user = User(
                    email=demo_email,
                    password_hash=get_password_hash("Candidate@123"),
                    full_name="Demo Candidate",
                    role=UserRole.CANDIDATE.value,
                    is_active=True,
                    is_verified=True,
                )
                session.add(candidate_user)
                await session.flush()
                logger.info(f"Default Demo Candidate seeded: {demo_email}")

            # 3. Demo Candidate Profile & Resume
            cand_profile_stmt = select(CandidateProfile).where(CandidateProfile.user_id == candidate_user.id)
            profile = (await session.execute(cand_profile_stmt)).scalars().first()
            if not profile:
                profile = CandidateProfile(
                    user_id=candidate_user.id,
                    headline="Full-Stack Engineer & AI Specialist",
                    skills=["Java", "Spring Boot", "React", "PostgreSQL", "Docker", "FastAPI"],
                    resume_url="/uploads/resumes/demo_candidate_resume.pdf",
                    resume_filename="demo_candidate_resume.pdf",
                )
                session.add(profile)
                await session.flush()
            elif not profile.resume_url:
                profile.resume_url = "/uploads/resumes/demo_candidate_resume.pdf"
                profile.resume_filename = "demo_candidate_resume.pdf"
                session.add(profile)
                await session.flush()

            # 4. Demo Job Seed (if no jobs exist)
            job_count_stmt = select(func.count()).select_from(Job)
            job_count = (await session.execute(job_count_stmt)).scalar() or 0
            primary_job = None
            if job_count == 0:
                jobs_to_seed = [
                    Job(
                        title="Java Developer",
                        department="Engineering",
                        location="Remote",
                        employment_type="FULL_TIME",
                        experience="3-5 years",
                        salary="$95,000 - $125,000",
                        description="We are seeking an experienced Java Developer skilled in Spring Boot, microservices architecture, and cloud deployment.",
                        responsibilities="Build scalable backend services, design REST APIs, optimize database queries, write automated tests.",
                        required_skills=["Java", "Spring Boot", "PostgreSQL", "Docker", "REST API"],
                        status="PUBLISHED",
                        is_published=True,
                        created_by_id=admin_user.id,
                    ),
                    Job(
                        title="Lead Full Stack AI Engineer",
                        department="AI Research & Engineering",
                        location="Hybrid",
                        employment_type="FULL_TIME",
                        experience="5+ years",
                        salary="$130,000 - $165,000",
                        description="Lead the design and implementation of AI-driven recruitment platforms using Gemini Live, Python FastAPI, and React.",
                        responsibilities="Architect WebRTC media pipelines, integrate multimodal LLMs, mentor engineering team.",
                        required_skills=["Python", "FastAPI", "React", "TypeScript", "Gemini API", "WebRTC"],
                        status="PUBLISHED",
                        is_published=True,
                        created_by_id=admin_user.id,
                    ),
                ]
                session.add_all(jobs_to_seed)
                await session.flush()
                primary_job = jobs_to_seed[0]
                logger.info("Default demo jobs seeded.")
            else:
                first_job_stmt = select(Job).limit(1)
                primary_job = (await session.execute(first_job_stmt)).scalars().first()

            # 5. Demo Job Application (if candidate has no applications)
            if primary_job and candidate_user:
                app_stmt = select(JobApplication).where(JobApplication.candidate_id == candidate_user.id)
                existing_app = (await session.execute(app_stmt)).scalars().first()
                if not existing_app:
                    demo_application = JobApplication(
                        job_id=primary_job.id,
                        candidate_id=candidate_user.id,
                        resume_url="/uploads/resumes/demo_candidate_resume.pdf",
                        resume_filename="demo_candidate_resume.pdf",
                        cover_letter="I am excited to apply for this role with extensive background in distributed backend microservices.",
                        status=ApplicationStatus.SHORTLISTED.value,
                        ai_match_score=88,
                        ai_match_summary="Strong alignment with core requirements: Java, Spring Boot, REST APIs, and database architecture.",
                    )
                    session.add(demo_application)
                    logger.info("Default demo job application seeded (Status: SHORTLISTED).")

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

