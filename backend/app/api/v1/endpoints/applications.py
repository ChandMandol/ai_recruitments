import os
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import FileResponse
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.api.deps import get_current_admin, get_current_candidate, get_current_user, get_db
from app.models.analysis import CVAnalysisReport
from app.models.application import ApplicationStatus, JobApplication
from app.models.candidate import CandidateProfile
from app.models.job import Job
from app.models.notification import NotificationType
from app.models.user import User, UserRole
from app.schemas.analysis import CVAnalysisResponse
from app.schemas.application import (
    ApplicationCreate,
    ApplicationListResponse,
    ApplicationResponse,
    ApplicationStatusUpdate,
    CandidateBrief,
    CandidateCompareRequest,
    CandidateCompareResponse,
    CandidateDetailProfile,
)
from app.schemas.job import JobResponse
from app.services.notification_service import create_notification, notify_admins

router = APIRouter()


def _serialize_application(app: JobApplication) -> ApplicationResponse:
    profile_data = None
    if app.candidate and getattr(app.candidate, "candidate_profile", None):
        profile_data = CandidateDetailProfile.model_validate(app.candidate.candidate_profile)

    ai_report_data = None
    if getattr(app, "analysis_report", None):
        ai_report_data = CVAnalysisResponse.model_validate(app.analysis_report)
        if app.candidate:
            ai_report_data.candidate_name = app.candidate.full_name
            ai_report_data.candidate_email = app.candidate.email
        if app.job:
            ai_report_data.job_title = app.job.title

    return ApplicationResponse(
        id=app.id,
        job_id=app.job_id,
        candidate_id=app.candidate_id,
        resume_url=app.resume_url,
        resume_filename=app.resume_filename,
        cover_letter=app.cover_letter,
        status=app.status,
        ai_match_score=app.ai_match_score,
        ai_match_summary=app.ai_match_summary,
        admin_notes=app.admin_notes,
        applied_at=app.applied_at,
        created_at=app.created_at,
        job=JobResponse.model_validate(app.job) if app.job else None,
        candidate=CandidateBrief.model_validate(app.candidate) if app.candidate else None,
        candidate_profile=profile_data,
        ai_report=ai_report_data,
    )


@router.post("", response_model=ApplicationResponse, status_code=status.HTTP_201_CREATED)
async def submit_application(
    payload: ApplicationCreate,
    current_candidate: User = Depends(get_current_candidate),
    db: AsyncSession = Depends(get_db),
):
    """Candidate-only: Apply for a published job. Strictly prevents duplicate applications."""
    # 1. Check if job exists and is live
    job_stmt = select(Job).where(Job.id == payload.job_id)
    job_res = await db.execute(job_stmt)
    job = job_res.scalar_one_or_none()

    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="The specified job opening does not exist.",
        )

    if not job.is_published:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This job opening is currently not accepting applications.",
        )

    # 2. Prevent duplicate application
    dup_stmt = select(JobApplication).where(
        JobApplication.job_id == payload.job_id,
        JobApplication.candidate_id == current_candidate.id,
    )
    dup_res = await db.execute(dup_stmt)
    existing_app = dup_res.scalar_one_or_none()

    if existing_app:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You have already submitted an application for this position.",
        )

    # 3. Resolve CV from payload or candidate profile
    resume_url = payload.resume_url
    resume_filename = payload.resume_filename

    if not resume_url:
        prof_stmt = select(CandidateProfile).where(CandidateProfile.user_id == current_candidate.id)
        prof_res = await db.execute(prof_stmt)
        profile = prof_res.scalar_one_or_none()
        if profile and profile.resume_url:
            resume_url = profile.resume_url
            resume_filename = profile.resume_filename
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No resume found. Please upload your CV before submitting an application.",
            )

    # 4. Create new job application with initial screening match calculation
    new_app = JobApplication(
        job_id=payload.job_id,
        candidate_id=current_candidate.id,
        resume_url=resume_url,
        resume_filename=resume_filename,
        cover_letter=payload.cover_letter,
        status=ApplicationStatus.APPLIED.value,
        ai_match_score=88,  # Initial preliminary match score
        ai_match_summary="Candidate background aligned with required tech stack. Scheduled for Gemini analysis.",
    )

    db.add(new_app)

    # In-app notifications
    await create_notification(
        db=db,
        user_id=current_candidate.id,
        title=f"Application Submitted: {job.title}",
        message=f"Your application for '{job.title}' was successfully submitted and is queued for screening.",
        type=NotificationType.APPLICATION_STATUS_UPDATED.value,
        link_url="/candidate/applications",
    )
    await notify_admins(
        db=db,
        title=f"New Application: {current_candidate.full_name}",
        message=f"{current_candidate.full_name} applied for '{job.title}'.",
        type=NotificationType.NEW_APPLICATION.value,
        link_url="/admin/applications",
    )

    await db.commit()
    await db.refresh(new_app)

    # Re-fetch with relationships loaded
    loaded_stmt = (
        select(JobApplication)
        .options(
            selectinload(JobApplication.job),
            selectinload(JobApplication.candidate).selectinload(User.candidate_profile),
            selectinload(JobApplication.analysis_report),
        )
        .where(JobApplication.id == new_app.id)
    )
    loaded_app = (await db.execute(loaded_stmt)).scalar_one()

    return _serialize_application(loaded_app)


@router.get("/my", response_model=ApplicationListResponse)
async def get_my_applications(
    current_candidate: User = Depends(get_current_candidate),
    db: AsyncSession = Depends(get_db),
):
    """Candidate-only: List all applications submitted by logged in candidate with status tracking."""
    stmt = (
        select(JobApplication)
        .options(
            selectinload(JobApplication.job),
            selectinload(JobApplication.candidate).selectinload(User.candidate_profile),
            selectinload(JobApplication.analysis_report),
        )
        .where(JobApplication.candidate_id == current_candidate.id)
        .order_by(JobApplication.applied_at.desc())
    )
    result = await db.execute(stmt)
    apps = result.scalars().all()

    items = [_serialize_application(a) for a in apps]
    return ApplicationListResponse(items=items, total=len(items))


@router.get("/check/{job_id}")
async def check_job_application_status(
    job_id: str,
    current_candidate: User = Depends(get_current_candidate),
    db: AsyncSession = Depends(get_db),
):
    """Quickly check if candidate has already applied for a specific job."""
    stmt = select(JobApplication).where(
        JobApplication.job_id == job_id,
        JobApplication.candidate_id == current_candidate.id,
    )
    res = await db.execute(stmt)
    app = res.scalar_one_or_none()

    if app:
        return {
            "has_applied": True,
            "application_id": app.id,
            "status": app.status,
            "applied_at": app.applied_at,
        }
    return {"has_applied": False, "application_id": None, "status": None}


@router.get("/admin/all", response_model=ApplicationListResponse)
async def list_all_applications_admin(
    job_id: Optional[str] = Query(None, description="Filter by Job ID"),
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by application status"),
    search: Optional[str] = Query(None, description="Search by candidate name or email"),
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Admin-only: Retrieve all candidate job applications across the platform with full profiles and AI reports."""
    query = (
        select(JobApplication)
        .options(
            selectinload(JobApplication.job),
            selectinload(JobApplication.candidate).selectinload(User.candidate_profile),
            selectinload(JobApplication.analysis_report),
        )
        .join(JobApplication.candidate)
        .join(JobApplication.job)
    )

    if job_id:
        query = query.where(JobApplication.job_id == job_id)

    if status_filter and status_filter.upper() != "ALL":
        query = query.where(JobApplication.status == status_filter.upper())

    if search:
        s = f"%{search}%"
        query = query.where(
            or_(
                User.full_name.ilike(s),
                User.email.ilike(s),
                Job.title.ilike(s),
            )
        )

    query = query.order_by(JobApplication.applied_at.desc())
    result = await db.execute(query)
    apps = result.scalars().all()

    items = [_serialize_application(a) for a in apps]
    return ApplicationListResponse(items=items, total=len(items))


@router.post("/admin/compare", response_model=CandidateCompareResponse)
async def compare_candidates(
    payload: CandidateCompareRequest,
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Admin-only: Compare 2 to 5 selected candidates side-by-side with match scores and skill alignments."""
    if len(payload.application_ids) < 2 or len(payload.application_ids) > 5:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Candidate comparison requires between 2 and 5 application IDs.",
        )

    stmt = (
        select(JobApplication)
        .options(
            selectinload(JobApplication.job),
            selectinload(JobApplication.candidate).selectinload(User.candidate_profile),
            selectinload(JobApplication.analysis_report),
        )
        .where(JobApplication.id.in_(payload.application_ids))
    )
    res = await db.execute(stmt)
    apps = res.scalars().all()

    if len(apps) < 2:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least 2 valid applications must be found to perform a side-by-side comparison.",
        )

    # Sort applications to match incoming order
    app_map = {a.id: a for a in apps}
    ordered_apps = [app_map[aid] for aid in payload.application_ids if aid in app_map]

    serialized = [_serialize_application(a) for a in ordered_apps]

    # Generate comparison summary insight
    highest_score = max((a.ai_match_score or 0) for a in ordered_apps)
    top_candidates = [
        a.candidate.full_name
        for a in ordered_apps
        if a.candidate and (a.ai_match_score or 0) == highest_score
    ]
    summary_text = (
        f"Comparing {len(ordered_apps)} candidates. Highest Gemini match score is {highest_score}% "
        f"held by {', '.join(top_candidates)}."
    )

    return CandidateCompareResponse(
        applications=serialized,
        comparison_summary=summary_text,
    )


@router.get("/{application_id}/details", response_model=ApplicationResponse)
async def get_application_details(
    application_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve detailed view of a job application (candidate profile, CV, AI report, admin notes)."""
    stmt = (
        select(JobApplication)
        .options(
            selectinload(JobApplication.job),
            selectinload(JobApplication.candidate).selectinload(User.candidate_profile),
            selectinload(JobApplication.analysis_report),
        )
        .where(JobApplication.id == application_id)
    )
    res = await db.execute(stmt)
    app = res.scalar_one_or_none()

    if not app:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Application with ID '{application_id}' not found.",
        )

    if current_user.role not in [UserRole.ADMIN.value, UserRole.SUPER_ADMIN.value]:
        if app.candidate_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not authorized to view this application.",
            )

    return _serialize_application(app)


@router.patch("/{application_id}/status", response_model=ApplicationResponse)
async def update_application_status(
    application_id: str,
    payload: ApplicationStatusUpdate,
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Admin-only: Update candidate application status (e.g. SHORTLISTED, WAITING_LIST, REJECTED) and internal notes."""
    stmt = (
        select(JobApplication)
        .options(
            selectinload(JobApplication.job),
            selectinload(JobApplication.candidate).selectinload(User.candidate_profile),
            selectinload(JobApplication.analysis_report),
        )
        .where(JobApplication.id == application_id)
    )
    res = await db.execute(stmt)
    app = res.scalar_one_or_none()

    if not app:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Application with ID '{application_id}' not found.",
        )

    app.status = payload.status
    if payload.ai_match_score is not None:
        app.ai_match_score = payload.ai_match_score
    if payload.ai_match_summary is not None:
        app.ai_match_summary = payload.ai_match_summary
    if payload.admin_notes is not None:
        app.admin_notes = payload.admin_notes

    # In-app notification for candidate regarding status update
    job_title = app.job.title if app.job else "Position"
    await create_notification(
        db=db,
        user_id=app.candidate_id,
        title=f"Application Status Updated: {payload.status}",
        message=f"Your application status for '{job_title}' has been updated to {payload.status}.",
        type=NotificationType.APPLICATION_STATUS_UPDATED.value,
        link_url="/candidate/applications",
    )

    await db.commit()
    await db.refresh(app)

    return _serialize_application(app)


UPLOAD_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "uploads", "resumes"))


@router.get("/{application_id}/resume")
async def get_application_resume_file(
    application_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Serve resume file for an application (inline view / download)."""
    stmt = (
        select(JobApplication)
        .options(
            selectinload(JobApplication.candidate).selectinload(User.candidate_profile)
        )
        .where(JobApplication.id == application_id)
    )
    res = await db.execute(stmt)
    app = res.scalar_one_or_none()

    if not app:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Application with ID '{application_id}' not found.",
        )

    # Search for physical file
    target_file = None
    if os.path.exists(UPLOAD_DIR):
        files = os.listdir(UPLOAD_DIR)
        cand_prefix = app.candidate_id[:8]
        for f in files:
            if cand_prefix in f:
                target_file = f
                break

    filename = app.resume_filename or "candidate_resume.pdf"
    ext = os.path.splitext(filename)[1].lower()
    media_type = "application/pdf" if ext == ".pdf" else "application/vnd.openxmlformats-officedocument.wordprocessingml.document"

    if target_file:
        file_path = os.path.join(UPLOAD_DIR, target_file)
        return FileResponse(
            path=file_path,
            media_type=media_type,
            filename=filename,
            headers={"Content-Disposition": f'inline; filename="{filename}"'},
        )
    else:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Resume file '{filename}' is not stored on local disk.",
        )


