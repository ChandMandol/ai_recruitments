from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.deps import get_current_admin, get_current_user, get_db
from app.models.job import Job
from app.models.user import User, UserRole
from app.schemas.job import JobCreate, JobListResponse, JobResponse, JobStatusUpdate, JobUpdate

router = APIRouter()


@router.post("", response_model=JobResponse, status_code=status.HTTP_201_CREATED)
async def create_job(
    payload: JobCreate,
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Admin-only: Create a new job posting."""
    job_status = "PUBLISHED" if payload.is_published else (payload.status or "DRAFT")

    new_job = Job(
        title=payload.title,
        description=payload.description,
        responsibilities=payload.responsibilities,
        required_skills=payload.required_skills,
        qualifications=payload.qualifications,
        education=payload.education,
        experience=payload.experience,
        salary=payload.salary,
        employment_type=payload.employment_type,
        vacancies=payload.vacancies,
        application_deadline=payload.application_deadline,
        department=payload.department,
        location=payload.location or "Remote",
        status=job_status,
        is_published=payload.is_published,
        created_by_id=current_admin.id,
        company_id=current_admin.company_id,
    )

    db.add(new_job)
    await db.commit()
    await db.refresh(new_job)

    return JobResponse.model_validate(new_job)


@router.get("/admin/all", response_model=JobListResponse)
async def list_admin_jobs(
    search: Optional[str] = Query(None, description="Search by title, department, or location"),
    job_status: Optional[str] = Query(None, alias="status", description="Filter by status (DRAFT, PUBLISHED)"),
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=100),
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Admin-only: Retrieve all jobs (drafts, published, archived) with optional search and filters."""
    query = select(Job)

    # Optional multi-tenant filter: if admin belongs to a company, filter by that company
    if current_admin.company_id:
        query = query.where(Job.company_id == current_admin.company_id)

    if search:
        search_filter = f"%{search}%"
        query = query.where(
            or_(
                Job.title.ilike(search_filter),
                Job.department.ilike(search_filter),
                Job.location.ilike(search_filter),
                Job.description.ilike(search_filter),
            )
        )

    if job_status and job_status.upper() != "ALL":
        query = query.where(Job.status == job_status.upper())

    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # Paginate and order
    query = query.order_by(Job.created_at.desc()).offset((page - 1) * size).limit(size)
    result = await db.execute(query)
    jobs = result.scalars().all()

    items = [JobResponse.model_validate(j) for j in jobs]
    return JobListResponse(items=items, total=total, page=page, size=size)


@router.get("", response_model=JobListResponse)
async def list_public_jobs(
    search: Optional[str] = Query(None, description="Search by title, department, skills"),
    department: Optional[str] = Query(None, description="Filter by department"),
    employment_type: Optional[str] = Query(None, description="Filter by employment type"),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
):
    """Public / Candidate: Browse published active job postings."""
    query = select(Job).where(Job.is_published == True)

    if search:
        search_filter = f"%{search}%"
        query = query.where(
            or_(
                Job.title.ilike(search_filter),
                Job.department.ilike(search_filter),
                Job.description.ilike(search_filter),
            )
        )

    if department:
        query = query.where(Job.department.ilike(f"%{department}%"))

    if employment_type:
        query = query.where(Job.employment_type == employment_type)

    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    query = query.order_by(Job.created_at.desc()).offset((page - 1) * size).limit(size)
    result = await db.execute(query)
    jobs = result.scalars().all()

    items = [JobResponse.model_validate(j) for j in jobs]
    return JobListResponse(items=items, total=total, page=page, size=size)


@router.get("/{job_id}", response_model=JobResponse)
async def get_job_by_id(
    job_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Retrieve details for a specific job."""
    stmt = select(Job).where(Job.id == job_id)
    result = await db.execute(stmt)
    job = result.scalar_one_or_none()

    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job with ID '{job_id}' not found",
        )

    return JobResponse.model_validate(job)


@router.put("/{job_id}", response_model=JobResponse)
async def update_job(
    job_id: str,
    payload: JobUpdate,
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Admin-only: Edit an existing job posting."""
    stmt = select(Job).where(Job.id == job_id)
    result = await db.execute(stmt)
    job = result.scalar_one_or_none()

    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job with ID '{job_id}' not found",
        )

    update_data = payload.model_dump(exclude_unset=True)

    # Sync is_published and status if either is updated
    if "is_published" in update_data:
        if update_data["is_published"]:
            update_data["status"] = "PUBLISHED"
        else:
            if "status" not in update_data:
                update_data["status"] = "DRAFT"

    for field, val in update_data.items():
        setattr(job, field, val)

    await db.commit()
    await db.refresh(job)

    return JobResponse.model_validate(job)


@router.patch("/{job_id}/publish", response_model=JobResponse)
async def publish_job(
    job_id: str,
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Admin-only: Publish a job to make it live for candidates."""
    stmt = select(Job).where(Job.id == job_id)
    result = await db.execute(stmt)
    job = result.scalar_one_or_none()

    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job with ID '{job_id}' not found",
        )

    job.is_published = True
    job.status = "PUBLISHED"

    await db.commit()
    await db.refresh(job)

    return JobResponse.model_validate(job)


@router.patch("/{job_id}/unpublish", response_model=JobResponse)
async def unpublish_job(
    job_id: str,
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Admin-only: Unpublish a job (revert back to draft)."""
    stmt = select(Job).where(Job.id == job_id)
    result = await db.execute(stmt)
    job = result.scalar_one_or_none()

    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job with ID '{job_id}' not found",
        )

    job.is_published = False
    job.status = "DRAFT"

    await db.commit()
    await db.refresh(job)

    return JobResponse.model_validate(job)


@router.delete("/{job_id}", status_code=status.HTTP_200_OK)
async def delete_job(
    job_id: str,
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Admin-only: Delete a job posting."""
    stmt = select(Job).where(Job.id == job_id)
    result = await db.execute(stmt)
    job = result.scalar_one_or_none()

    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job with ID '{job_id}' not found",
        )

    await db.delete(job)
    await db.commit()

    return {"message": "Job deleted successfully", "id": job_id}
