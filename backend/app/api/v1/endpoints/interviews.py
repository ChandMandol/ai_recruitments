import uuid
from datetime import datetime, timedelta, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.api.deps import get_current_admin, get_current_candidate, get_current_user, get_db
from app.models.application import ApplicationStatus, JobApplication
from app.models.interview import InterviewSchedule, InterviewStatus
from app.models.job import Job
from app.models.notification import NotificationType
from app.models.user import User, UserRole
from app.services.notification_service import create_notification
from app.schemas.interview import (
    EligibleCandidateItem,
    EligibleCandidateListResponse,
    InterviewCancel,
    InterviewCreate,
    InterviewListResponse,
    InterviewResponse,
    InterviewUpdate,
)

router = APIRouter()


def _serialize_interview(interview: InterviewSchedule) -> InterviewResponse:
    cand_name = interview.candidate.full_name if interview.candidate else None
    cand_email = interview.candidate.email if interview.candidate else None
    j_title = interview.job.title if interview.job else None
    j_dept = interview.job.department if interview.job else None

    return InterviewResponse(
        id=interview.id,
        application_id=interview.application_id,
        candidate_id=interview.candidate_id,
        job_id=interview.job_id,
        title=interview.title,
        scheduled_at=interview.scheduled_at,
        duration_minutes=interview.duration_minutes,
        end_at=interview.end_at,
        room_token=interview.room_token,
        meeting_link=interview.meeting_link,
        instructions=interview.instructions,
        notes=interview.notes,
        status=interview.status,
        cancellation_reason=interview.cancellation_reason,
        created_at=interview.created_at,
        candidate_name=cand_name,
        candidate_email=cand_email,
        job_title=j_title,
        job_department=j_dept,
    )


@router.post("", response_model=InterviewResponse, status_code=status.HTTP_201_CREATED)
async def schedule_interview(
    payload: InterviewCreate,
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Admin-only: Schedule an individual interview session for a candidate. Prevents overlapping schedules."""
    # 1. Fetch application with relationships
    app_stmt = (
        select(JobApplication)
        .options(selectinload(JobApplication.job), selectinload(JobApplication.candidate))
        .where(JobApplication.id == payload.application_id)
    )
    app_res = await db.execute(app_stmt)
    application = app_res.scalar_one_or_none()

    if not application:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="The specified job application was not found.",
        )

    # 2. Compute start and end times
    start_time = payload.scheduled_at
    if start_time.tzinfo is None:
        start_time = start_time.replace(tzinfo=timezone.utc)

    duration = payload.duration_minutes
    end_time = start_time + timedelta(minutes=duration)

    # 3. Check for Overlapping Interviews for this candidate
    overlap_stmt = select(InterviewSchedule).where(
        InterviewSchedule.candidate_id == application.candidate_id,
        InterviewSchedule.status.in_([
            InterviewStatus.SCHEDULED.value,
            InterviewStatus.IN_PROGRESS.value,
            InterviewStatus.RESCHEDULED.value,
        ]),
        InterviewSchedule.scheduled_at < end_time,
        InterviewSchedule.end_at > start_time,
    )
    conflict = (await db.execute(overlap_stmt)).scalar_one_or_none()

    if conflict:
        cand_name = application.candidate.full_name if application.candidate else "Candidate"
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Scheduling Conflict: Candidate '{cand_name}' already has an interview '{conflict.title}' "
                f"scheduled from {conflict.scheduled_at.strftime('%Y-%m-%d %I:%M %p')} to {conflict.end_at.strftime('%I:%M %p')} UTC. "
                f"Overlapping interviews are strictly prevented."
            ),
        )

    # 4. Generate unique room token and link
    room_token = f"room_live_{uuid.uuid4().hex[:12]}"
    meeting_link = f"/interview/live?room={room_token}"
    interview_title = payload.title or f"AI Technical Interview — {application.job.title}"

    # 5. Create Interview Schedule
    new_interview = InterviewSchedule(
        application_id=application.id,
        candidate_id=application.candidate_id,
        job_id=application.job_id,
        created_by_id=current_admin.id,
        title=interview_title,
        scheduled_at=start_time,
        duration_minutes=duration,
        end_at=end_time,
        room_token=room_token,
        meeting_link=meeting_link,
        instructions=payload.instructions or "Please ensure your camera and microphone are properly tested before entering the AI interview room.",
        notes=payload.notes,
        status=InterviewStatus.SCHEDULED.value,
    )
    db.add(new_interview)

    # 6. Update Application status to INTERVIEW_SCHEDULED
    application.status = ApplicationStatus.INTERVIEW_SCHEDULED.value
    db.add(application)

    # 7. Notify candidate of scheduled interview
    job_name = application.job.title if application.job else "Position"
    await create_notification(
        db=db,
        user_id=application.candidate_id,
        title=f"AI Interview Scheduled: {job_name}",
        message=f"Your AI technical interview for '{job_name}' has been scheduled for {start_time.strftime('%b %d, %Y at %I:%M %p')} UTC. Room is ready for testing.",
        type=NotificationType.INTERVIEW_SCHEDULED.value,
        link_url=meeting_link,
    )

    await db.commit()
    await db.refresh(new_interview)

    # Re-fetch with relationships loaded
    loaded_stmt = (
        select(InterviewSchedule)
        .options(selectinload(InterviewSchedule.candidate), selectinload(InterviewSchedule.job))
        .where(InterviewSchedule.id == new_interview.id)
    )
    loaded_interview = (await db.execute(loaded_stmt)).scalar_one()

    return _serialize_interview(loaded_interview)


@router.get("/admin/all", response_model=InterviewListResponse)
async def list_all_interviews_admin(
    job_id: Optional[str] = Query(None, description="Filter by Job UUID"),
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by Interview Status"),
    search: Optional[str] = Query(None, description="Search by candidate name, email, or job title"),
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Admin-only: Retrieve all scheduled interview sessions across the platform."""
    query = (
        select(InterviewSchedule)
        .options(selectinload(InterviewSchedule.candidate), selectinload(InterviewSchedule.job))
        .join(InterviewSchedule.candidate)
        .join(InterviewSchedule.job)
    )

    if job_id:
        query = query.where(InterviewSchedule.job_id == job_id)

    if status_filter and status_filter.upper() != "ALL":
        query = query.where(InterviewSchedule.status == status_filter.upper())

    if search:
        s = f"%{search}%"
        query = query.where(
            or_(
                User.full_name.ilike(s),
                User.email.ilike(s),
                Job.title.ilike(s),
                InterviewSchedule.title.ilike(s),
            )
        )

    query = query.order_by(InterviewSchedule.scheduled_at.asc())
    result = await db.execute(query)
    interviews = result.scalars().all()

    items = [_serialize_interview(i) for i in interviews]
    return InterviewListResponse(items=items, total=len(items))


@router.get("/admin/eligible-candidates", response_model=EligibleCandidateListResponse)
async def list_eligible_candidates(
    job_id: Optional[str] = Query(None, description="Optional job ID filter"),
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Admin-only: Retrieve candidates eligible for scheduling an interview."""
    query = (
        select(JobApplication)
        .options(selectinload(JobApplication.candidate), selectinload(JobApplication.job))
        .join(JobApplication.candidate)
        .join(JobApplication.job)
        .where(
            JobApplication.status.in_([
                ApplicationStatus.SHORTLISTED.value,
                ApplicationStatus.APPLIED.value,
                ApplicationStatus.SCREENING.value,
                ApplicationStatus.INTERVIEW_SCHEDULED.value,
            ])
        )
    )

    if job_id:
        query = query.where(JobApplication.job_id == job_id)

    query = query.order_by(JobApplication.applied_at.desc())
    result = await db.execute(query)
    apps = result.scalars().all()

    items = [
        EligibleCandidateItem(
            application_id=a.id,
            candidate_id=a.candidate_id,
            candidate_name=a.candidate.full_name if a.candidate else "Candidate",
            candidate_email=a.candidate.email if a.candidate else "",
            job_id=a.job_id,
            job_title=a.job.title if a.job else "",
            status=a.status,
            ai_match_score=a.ai_match_score,
        )
        for a in apps
    ]
    return EligibleCandidateListResponse(items=items, total=len(items))


@router.get("/my", response_model=InterviewListResponse)
async def get_my_interviews(
    current_candidate: User = Depends(get_current_candidate),
    db: AsyncSession = Depends(get_db),
):
    """Candidate-only: Retrieve all interview schedules assigned to logged-in candidate."""
    stmt = (
        select(InterviewSchedule)
        .options(selectinload(InterviewSchedule.candidate), selectinload(InterviewSchedule.job))
        .where(InterviewSchedule.candidate_id == current_candidate.id)
        .order_by(InterviewSchedule.scheduled_at.asc())
    )
    result = await db.execute(stmt)
    interviews = result.scalars().all()

    items = [_serialize_interview(i) for i in interviews]
    return InterviewListResponse(items=items, total=len(items))


@router.get("/{interview_id}", response_model=InterviewResponse)
async def get_interview_detail(
    interview_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve full details for an individual interview session."""
    stmt = (
        select(InterviewSchedule)
        .options(selectinload(InterviewSchedule.candidate), selectinload(InterviewSchedule.job))
        .where(InterviewSchedule.id == interview_id)
    )
    interview = (await db.execute(stmt)).scalar_one_or_none()

    if not interview:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Interview with ID '{interview_id}' not found.",
        )

    # Candidates can only access their own interviews
    if current_user.role not in [UserRole.ADMIN.value, UserRole.SUPER_ADMIN.value]:
        if interview.candidate_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to view this interview session.",
            )

    return _serialize_interview(interview)


@router.put("/{interview_id}", response_model=InterviewResponse)
async def update_interview(
    interview_id: str,
    payload: InterviewUpdate,
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Admin-only: Update interview schedule time, duration, instructions, or status. Re-validates overlaps."""
    stmt = (
        select(InterviewSchedule)
        .options(selectinload(InterviewSchedule.candidate), selectinload(InterviewSchedule.job))
        .where(InterviewSchedule.id == interview_id)
    )
    interview = (await db.execute(stmt)).scalar_one_or_none()

    if not interview:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Interview with ID '{interview_id}' not found.",
        )

    # Calculate new time window if changed
    new_start = payload.scheduled_at or interview.scheduled_at
    if new_start.tzinfo is None:
        new_start = new_start.replace(tzinfo=timezone.utc)

    new_duration = payload.duration_minutes or interview.duration_minutes
    new_end = new_start + timedelta(minutes=new_duration)

    # If timing changed, check for overlap conflicts
    if payload.scheduled_at is not None or payload.duration_minutes is not None:
        overlap_stmt = select(InterviewSchedule).where(
            InterviewSchedule.id != interview.id,
            InterviewSchedule.candidate_id == interview.candidate_id,
            InterviewSchedule.status.in_([
                InterviewStatus.SCHEDULED.value,
                InterviewStatus.IN_PROGRESS.value,
                InterviewStatus.RESCHEDULED.value,
            ]),
            InterviewSchedule.scheduled_at < new_end,
            InterviewSchedule.end_at > new_start,
        )
        conflict = (await db.execute(overlap_stmt)).scalar_one_or_none()
        if conflict:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"Scheduling Conflict: Rescheduling overlaps with '{conflict.title}' "
                    f"({conflict.scheduled_at.strftime('%Y-%m-%d %I:%M %p')} to {conflict.end_at.strftime('%I:%M %p')} UTC)."
                ),
            )

        interview.scheduled_at = new_start
        interview.duration_minutes = new_duration
        interview.end_at = new_end
        if interview.status == InterviewStatus.SCHEDULED.value:
            interview.status = InterviewStatus.RESCHEDULED.value

    if payload.title is not None:
        interview.title = payload.title
    if payload.instructions is not None:
        interview.instructions = payload.instructions
    if payload.notes is not None:
        interview.notes = payload.notes
    if payload.status is not None:
        interview.status = payload.status

    await db.commit()
    await db.refresh(interview)

    return _serialize_interview(interview)


@router.post("/{interview_id}/cancel", response_model=InterviewResponse)
async def cancel_interview(
    interview_id: str,
    payload: InterviewCancel,
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Admin-only: Cancel a scheduled interview session."""
    stmt = (
        select(InterviewSchedule)
        .options(selectinload(InterviewSchedule.candidate), selectinload(InterviewSchedule.job))
        .where(InterviewSchedule.id == interview_id)
    )
    interview = (await db.execute(stmt)).scalar_one_or_none()

    if not interview:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Interview with ID '{interview_id}' not found.",
        )

    interview.status = InterviewStatus.CANCELLED.value
    interview.cancellation_reason = payload.cancellation_reason or "Cancelled by administrator."

    await db.commit()
    await db.refresh(interview)

    return _serialize_interview(interview)

