from fastapi import APIRouter
from app.api.v1.endpoints import (
    adaptive_interview,
    admin,
    applications,
    auth,
    candidate,
    evaluations,
    interviews,
    jobs,
    notifications,
)

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(jobs.router, prefix="/jobs", tags=["Job Management"])
api_router.include_router(applications.router, prefix="/applications", tags=["Applications"])
api_router.include_router(evaluations.router, prefix="/evaluations", tags=["AI Evaluations"])
api_router.include_router(interviews.router, prefix="/interviews", tags=["Interview Scheduling"])
api_router.include_router(notifications.router, prefix="", tags=["Notifications"])
api_router.include_router(admin.router, prefix="/admin", tags=["Admin Portal"])
api_router.include_router(candidate.router, prefix="/candidate", tags=["Candidate Portal"])
api_router.include_router(adaptive_interview.router, prefix="/adaptive-interview", tags=["Adaptive AI Assessment"])

