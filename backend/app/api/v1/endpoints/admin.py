from typing import Any, Dict, List
import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.deps import get_current_admin, get_db
from app.core.config import settings
from app.core.security import get_password_hash
from app.models.analysis import SystemSetting
from app.models.application import ApplicationStatus, JobApplication
from app.models.candidate import CandidateProfile
from app.models.job import Job
from app.models.user import User, UserRole
from app.schemas.analysis import GeminiConfigResponse, GeminiConfigUpdate
from app.schemas.auth import UserResponse
from app.services.cv_analyzer import get_effective_gemini_api_key

router = APIRouter()


@router.get("/overview", response_model=Dict[str, Any])
async def get_admin_overview(
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Admin-only dashboard metrics and platform statistics."""
    # Count candidates
    c_stmt = select(func.count()).select_from(User).where(User.role == UserRole.CANDIDATE.value)
    total_candidates = (await db.execute(c_stmt)).scalar() or 0

    # Count admins
    a_stmt = select(func.count()).select_from(User).where(
        User.role.in_([UserRole.ADMIN.value, UserRole.SUPER_ADMIN.value])
    )
    total_admins = (await db.execute(a_stmt)).scalar() or 0

    # Count published jobs
    j_stmt = select(func.count()).select_from(Job).where(Job.is_published == True)
    active_jobs_count = (await db.execute(j_stmt)).scalar() or 0

    return {
        "admin_name": current_admin.full_name,
        "admin_role": current_admin.role,
        "total_candidates": total_candidates,
        "total_admins": total_admins,
        "active_jobs_count": active_jobs_count,
        "completed_interviews": 0,
        "system_status": "Operational",
        "database": "PostgreSQL 16",
    }


@router.get("/users", response_model=List[UserResponse])
async def list_all_users(
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Admin-only list of all platform users."""
    stmt = select(User).order_by(User.created_at.desc())
    result = await db.execute(stmt)
    users = result.scalars().all()
    return [UserResponse.model_validate(u) for u in users]


@router.get("/settings/gemini", response_model=GeminiConfigResponse)
async def get_gemini_config(
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Admin-only: Retrieve current Google Gemini API Key configuration status (key is masked for security)."""
    # 1. Check database setting
    stmt = select(SystemSetting).where(SystemSetting.key == "GEMINI_API_KEY")
    res = await db.execute(stmt)
    db_setting = res.scalar_one_or_none()

    key_source = "NONE"
    raw_key = None

    if db_setting and db_setting.value:
        key_source = "DATABASE"
        raw_key = db_setting.value
    elif settings.GEMINI_API_KEY:
        key_source = "ENVIRONMENT_VARIABLE"
        raw_key = settings.GEMINI_API_KEY

    masked = None
    if raw_key and len(raw_key) > 8:
        masked = f"{raw_key[:6]}...{raw_key[-4:]}"

    return GeminiConfigResponse(
        has_api_key=bool(raw_key),
        key_source=key_source,
        masked_key=masked,
        model=settings.GEMINI_MODEL,
        status="Operational" if raw_key else "Missing Key",
    )


@router.post("/settings/gemini", response_model=GeminiConfigResponse)
async def update_gemini_config(
    payload: GeminiConfigUpdate,
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Admin-only: Configure and save Google Gemini API Key dynamically from Admin Dashboard."""
    stmt = select(SystemSetting).where(SystemSetting.key == "GEMINI_API_KEY")
    res = await db.execute(stmt)
    setting = res.scalar_one_or_none()

    if setting:
        setting.value = payload.api_key.strip()
    else:
        setting = SystemSetting(
            key="GEMINI_API_KEY",
            value=payload.api_key.strip(),
            description="Configured via Admin Dashboard",
            is_secret=True,
        )
        db.add(setting)

    await db.commit()
    await db.refresh(setting)

    masked = f"{setting.value[:6]}...{setting.value[-4:]}"
    return GeminiConfigResponse(
        has_api_key=True,
        key_source="DATABASE",
        masked_key=masked,
        model=payload.model or settings.GEMINI_MODEL,
        status="Configured via Dashboard",
    )


@router.post("/settings/gemini/test")
async def test_gemini_connection(
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Admin-only: Ping Google Gemini API to test if the configured API key is valid and working."""
    key = await get_effective_gemini_api_key(db)
    if not key:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No Gemini API Key found in database or environment variables.",
        )

    url = f"https://generativelanguage.googleapis.com/v1beta/models/{settings.GEMINI_MODEL}:generateContent?key={key}"
    body = {
        "contents": [{"parts": [{"text": "Hello, respond with 'AI Recruitment Hub is online!'"}]}]
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            res = await client.post(url, json=body)
            if res.status_code == 200:
                data = res.json()
                reply = data["candidates"][0]["content"]["parts"][0]["text"].strip()
                return {
                    "success": True,
                    "status_code": 200,
                    "message": "Connection to Google Gemini API successful!",
                    "reply": reply,
                }
            else:
                return {
                    "success": False,
                    "status_code": res.status_code,
                    "message": f"Gemini API returned error: {res.text}",
                }
    except Exception as e:
        return {
            "success": False,
            "status_code": 500,
            "message": f"Connection failed: {str(e)}",
        }


@router.delete("/settings/gemini")
async def clear_gemini_config(
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Admin-only: Clear custom database Gemini API key, falling back to environment variable."""
    stmt = select(SystemSetting).where(SystemSetting.key == "GEMINI_API_KEY")
    res = await db.execute(stmt)
    setting = res.scalar_one_or_none()

    if setting:
        await db.delete(setting)
        await db.commit()

    return {"message": "Database Gemini API Key cleared. System will now use environment variables if present."}


@router.post("/seed-demo-data")
async def seed_demo_data(
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Admin-only: Seed or reset sample candidate, job opening, and application for testing interview scheduling."""
    # 1. Ensure Demo Candidate exists
    demo_email = "candidate.demo@example.com"
    cand_stmt = select(User).where(User.email == demo_email)
    candidate_user = (await db.execute(cand_stmt)).scalars().first()
    if not candidate_user:
        candidate_user = User(
            email=demo_email,
            password_hash=get_password_hash("Candidate@123"),
            full_name="Demo Candidate",
            role=UserRole.CANDIDATE.value,
            is_active=True,
            is_verified=True,
        )
        db.add(candidate_user)
        await db.flush()

    # 2. Ensure Candidate Profile & resume exist
    prof_stmt = select(CandidateProfile).where(CandidateProfile.user_id == candidate_user.id)
    profile = (await db.execute(prof_stmt)).scalars().first()
    if not profile:
        profile = CandidateProfile(
            user_id=candidate_user.id,
            headline="Full-Stack Software Engineer",
            skills=["Java", "Spring Boot", "React", "TypeScript", "PostgreSQL", "Docker"],
            resume_url="/uploads/resumes/demo_candidate_resume.pdf",
            resume_filename="demo_candidate_resume.pdf",
        )
        db.add(profile)
        await db.flush()
    elif not profile.resume_url:
        profile.resume_url = "/uploads/resumes/demo_candidate_resume.pdf"
        profile.resume_filename = "demo_candidate_resume.pdf"
        db.add(profile)
        await db.flush()

    # 3. Ensure at least one published job exists
    job_stmt = select(Job).where(Job.is_published == True).order_by(Job.created_at.desc())
    job = (await db.execute(job_stmt)).scalars().first()
    if not job:
        job = Job(
            title="Java Developer",
            department="Engineering",
            location="Remote",
            employment_type="FULL_TIME",
            experience="3-5 years",
            salary="$95,000 - $125,000",
            description="We are seeking an experienced Java Developer skilled in Spring Boot, microservices, and database architecture.",
            responsibilities="Develop scalable backend microservices, write automated tests, and collaborate with frontend developers.",
            required_skills=["Java", "Spring Boot", "PostgreSQL", "Docker", "REST APIs"],
            status="PUBLISHED",
            is_published=True,
            created_by_id=current_admin.id,
        )
        db.add(job)
        await db.flush()

    # 4. Ensure candidate has an application with SHORTLISTED or APPLIED status
    app_stmt = select(JobApplication).where(
        JobApplication.candidate_id == candidate_user.id,
        JobApplication.job_id == job.id,
    ).order_by(JobApplication.created_at.desc())
    application = (await db.execute(app_stmt)).scalars().first()
    if not application:
        application = JobApplication(
            job_id=job.id,
            candidate_id=candidate_user.id,
            resume_url="/uploads/resumes/demo_candidate_resume.pdf",
            resume_filename="demo_candidate_resume.pdf",
            cover_letter="I am very excited about the Java Developer position. I have 4 years of hands-on experience building distributed systems with Spring Boot.",
            status=ApplicationStatus.SHORTLISTED.value,
            ai_match_score=88,
            ai_match_summary="Strong match with required Java and Spring Boot backend requirements.",
        )
        db.add(application)
        await db.flush()
    else:
        # If it was rejected or in another status, reset to SHORTLISTED so admin can schedule
        if application.status not in [
            ApplicationStatus.SHORTLISTED.value,
            ApplicationStatus.APPLIED.value,
            ApplicationStatus.SCREENING.value,
        ]:
            application.status = ApplicationStatus.SHORTLISTED.value
            db.add(application)
            await db.flush()

    await db.commit()

    return {
        "success": True,
        "message": f"Demo data ready! Candidate '{candidate_user.full_name}' is shortlisted for '{job.title}'.",
        "candidate_id": candidate_user.id,
        "job_id": job.id,
        "application_id": application.id,
    }


