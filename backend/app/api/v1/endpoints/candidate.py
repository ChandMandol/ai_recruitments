import os
import shutil
import uuid
from datetime import datetime, timezone
from typing import Any, Dict
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.deps import get_current_candidate, get_db
from app.core.config import settings
from app.models.application import JobApplication
from app.models.candidate import CandidateProfile
from app.models.user import User
from app.schemas.candidate import CandidateProfileResponse, CandidateProfileUpdate

router = APIRouter()

# Storage directory for resumes
UPLOAD_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "uploads", "resumes"))
os.makedirs(UPLOAD_DIR, exist_ok=True)

ALLOWED_EXTENSIONS = {".pdf", ".docx"}
MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB


async def get_or_create_profile(user_id: str, db: AsyncSession) -> CandidateProfile:
    """Helper to retrieve candidate profile or create a default blank one."""
    stmt = select(CandidateProfile).where(CandidateProfile.user_id == user_id)
    result = await db.execute(stmt)
    profile = result.scalar_one_or_none()

    if not profile:
        profile = CandidateProfile(
            user_id=user_id,
            skills=[],
            education=[],
            experience=[],
            projects=[],
            certifications=[],
        )
        db.add(profile)
        await db.commit()
        await db.refresh(profile)

    return profile


@router.get("/dashboard", response_model=Dict[str, Any])
async def get_candidate_dashboard(
    current_candidate: User = Depends(get_current_candidate),
    db: AsyncSession = Depends(get_db),
):
    """Candidate portal overview showing live counts of applied jobs and interviews."""
    # Count applied jobs
    app_stmt = select(func.count()).select_from(JobApplication).where(JobApplication.candidate_id == current_candidate.id)
    applied_count = (await db.execute(app_stmt)).scalar() or 0

    # Count scheduled interviews
    interview_stmt = select(func.count()).select_from(JobApplication).where(
        JobApplication.candidate_id == current_candidate.id,
        JobApplication.status == "INTERVIEW_SCHEDULED",
    )
    scheduled_interviews = (await db.execute(interview_stmt)).scalar() or 0

    # Check profile completion
    profile = await get_or_create_profile(current_candidate.id, db)
    has_resume = bool(profile.resume_url)
    has_skills = bool(profile.skills and len(profile.skills) > 0)
    profile_complete = bool(current_candidate.phone and has_resume and has_skills)

    return {
        "candidate_id": current_candidate.id,
        "candidate_name": current_candidate.full_name,
        "candidate_email": current_candidate.email,
        "applied_jobs_count": applied_count,
        "pending_interviews_count": scheduled_interviews,
        "completed_interviews_count": 0,
        "profile_completed": profile_complete,
        "has_resume": has_resume,
    }


@router.get("/profile", response_model=CandidateProfileResponse)
async def get_candidate_profile(
    current_candidate: User = Depends(get_current_candidate),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve full profile details for logged in candidate."""
    profile = await get_or_create_profile(current_candidate.id, db)
    return CandidateProfileResponse.model_validate(profile)


@router.put("/profile", response_model=CandidateProfileResponse)
async def update_candidate_profile(
    payload: CandidateProfileUpdate,
    current_candidate: User = Depends(get_current_candidate),
    db: AsyncSession = Depends(get_db),
):
    """Update personal information, social links, skills, and career history."""
    profile = await get_or_create_profile(current_candidate.id, db)

    update_data = payload.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        setattr(profile, field, val)

    # Sync phone with user record if provided
    if payload.phone is not None:
        current_candidate.phone = payload.phone
        db.add(current_candidate)

    await db.commit()
    await db.refresh(profile)

    return CandidateProfileResponse.model_validate(profile)


@router.post("/resume/upload", response_model=CandidateProfileResponse)
async def upload_resume(
    file: UploadFile = File(...),
    current_candidate: User = Depends(get_current_candidate),
    db: AsyncSession = Depends(get_db),
):
    """Upload or replace candidate resume in PDF or DOCX format (Max 10MB)."""
    # 1. Validate file extension and sanitize filename
    raw_name = os.path.basename(file.filename or "")
    ext = os.path.splitext(raw_name)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file format '{ext}'. Only PDF (.pdf) and Word (.docx) files are supported.",
        )

    # 2. Read contents and check size
    contents = await file.read()
    file_size = len(contents)
    if file_size > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File exceeds maximum allowed size of 10MB ({file_size // (1024*1024)}MB uploaded).",
        )

    # Validate header signature if file is non-empty
    if file_size >= 4:
        if ext == ".pdf" and not (contents.startswith(b"%PDF") or b"PDF" in contents[:100]):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid file signature: Content does not match standard PDF structure.",
            )
        elif ext == ".docx" and not (contents.startswith(b"PK\x03\x04") or b"PK" in contents[:100]):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid file signature: Content does not match standard DOCX structure.",
            )

    profile = await get_or_create_profile(current_candidate.id, db)

    # 3. Clean up previous resume file if it exists
    if profile.resume_url:
        old_file_path = os.path.join(UPLOAD_DIR, os.path.basename(profile.resume_url))
        if os.path.exists(old_file_path):
            try:
                os.remove(old_file_path)
            except OSError:
                pass

    # 4. Generate unique secure filename
    safe_filename = f"{uuid.uuid4().hex}_{current_candidate.id[:8]}{ext}"
    dest_path = os.path.join(UPLOAD_DIR, safe_filename)

    with open(dest_path, "wb") as f:
        f.write(contents)

    # 5. Update database record
    profile.resume_url = f"/api/v1/candidate/resume/file?t={int(datetime.now().timestamp())}"
    profile.resume_filename = raw_name or f"resume{ext}"
    profile.resume_file_size = file_size
    profile.resume_mime_type = file.content_type or ("application/pdf" if ext == ".pdf" else "application/vnd.openxmlformats-officedocument.wordprocessingml.document")
    profile.resume_uploaded_at = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(profile)

    return CandidateProfileResponse.model_validate(profile)


@router.get("/resume/file")
async def preview_resume_file(
    current_candidate: User = Depends(get_current_candidate),
    db: AsyncSession = Depends(get_db),
):
    """Preview or download candidate's uploaded resume."""
    profile = await get_or_create_profile(current_candidate.id, db)

    if not profile.resume_url or not profile.resume_filename:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No resume uploaded yet.",
        )

    # Find the file in upload dir
    target_files = [f for f in os.listdir(UPLOAD_DIR) if current_candidate.id[:8] in f]
    if not target_files:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resume file not found on disk.",
        )

    file_path = os.path.join(UPLOAD_DIR, target_files[0])
    media_type = profile.resume_mime_type or "application/pdf"

    return FileResponse(
        path=file_path,
        media_type=media_type,
        filename=profile.resume_filename,
        headers={"Content-Disposition": f'inline; filename="{profile.resume_filename}"'},
    )


@router.delete("/resume", response_model=CandidateProfileResponse)
async def delete_resume(
    current_candidate: User = Depends(get_current_candidate),
    db: AsyncSession = Depends(get_db),
):
    """Delete candidate's uploaded resume."""
    profile = await get_or_create_profile(current_candidate.id, db)

    target_files = [f for f in os.listdir(UPLOAD_DIR) if current_candidate.id[:8] in f]
    for tf in target_files:
        try:
            os.remove(os.path.join(UPLOAD_DIR, tf))
        except OSError:
            pass

    profile.resume_url = None
    profile.resume_filename = None
    profile.resume_file_size = None
    profile.resume_mime_type = None
    profile.resume_uploaded_at = None

    await db.commit()
    await db.refresh(profile)

    return CandidateProfileResponse.model_validate(profile)
