import asyncio
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_admin, get_current_user, get_db
from app.models.analysis import CVAnalysisReport
from app.models.application import ApplicationStatus, JobApplication
from app.models.interview import InterviewSchedule
from app.models.interview_evaluation import FinalDecision, InterviewEvaluation
from app.models.job import Job
from app.models.notification import NotificationType
from app.models.user import User, UserRole
from app.schemas.analysis import CVAnalysisResponse
from app.schemas.evaluation import (
    AdminDecisionUpdate,
    CandidateResultResponse,
    InterviewEvaluationResponse,
)
from app.services.cv_analyzer import analyze_application_cv
from app.services.email_service import send_interview_result_email
from app.services.interview_evaluator import evaluate_interview_session
from app.services.notification_service import create_notification

router = APIRouter()


# ═════════════════════════════════════════════════════════════════════════════
# 1. CV Screening AI Evaluation Endpoints (Existing Phase 8)
# ═════════════════════════════════════════════════════════════════════════════

@router.post("/cv/analyze/{application_id}", response_model=CVAnalysisResponse)
async def trigger_cv_analysis(
    application_id: str,
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Admin-only: Trigger or re-run Google Gemini AI CV analysis for a specific job application."""
    stmt = (
        select(JobApplication)
        .options(selectinload(JobApplication.job), selectinload(JobApplication.candidate))
        .where(JobApplication.id == application_id)
    )
    result = await db.execute(stmt)
    application = result.scalar_one_or_none()

    if not application:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job application '{application_id}' not found.",
        )

    report = await analyze_application_cv(application, db)

    return CVAnalysisResponse(
        id=report.id,
        application_id=report.application_id,
        job_id=report.job_id,
        candidate_id=report.candidate_id,
        overall_score=report.overall_score,
        recommendation=report.recommendation,
        recommendation_reason=report.recommendation_reason,
        extracted_profile=report.extracted_profile,
        skill_matching=report.skill_matching,
        experience_matching=report.experience_matching,
        education_matching=report.education_matching,
        strengths=report.strengths,
        weaknesses=report.weaknesses,
        suggested_questions=report.suggested_questions,
        raw_cv_text_snippet=report.raw_cv_text_snippet,
        analyzed_at=report.analyzed_at,
        candidate_name=application.candidate.full_name if application.candidate else None,
        candidate_email=application.candidate.email if application.candidate else None,
        job_title=application.job.title if application.job else None,
    )


@router.get("/cv/{application_id}", response_model=CVAnalysisResponse)
async def get_cv_analysis_report(
    application_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve detailed AI CV analysis report."""
    stmt = (
        select(JobApplication)
        .options(selectinload(JobApplication.job), selectinload(JobApplication.candidate))
        .where(JobApplication.id == application_id)
    )
    result = await db.execute(stmt)
    application = result.scalar_one_or_none()

    if not application:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job application '{application_id}' not found.",
        )

    if current_user.role == UserRole.CANDIDATE.value and application.candidate_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to view this analysis report.",
        )

    rep_stmt = select(CVAnalysisReport).where(CVAnalysisReport.application_id == application_id)
    rep_res = await db.execute(rep_stmt)
    report = rep_res.scalar_one_or_none()

    if not report:
        report = await analyze_application_cv(application, db)

    return CVAnalysisResponse(
        id=report.id,
        application_id=report.application_id,
        job_id=report.job_id,
        candidate_id=report.candidate_id,
        overall_score=report.overall_score,
        recommendation=report.recommendation,
        recommendation_reason=report.recommendation_reason,
        extracted_profile=report.extracted_profile,
        skill_matching=report.skill_matching,
        experience_matching=report.experience_matching,
        education_matching=report.education_matching,
        strengths=report.strengths,
        weaknesses=report.weaknesses,
        suggested_questions=report.suggested_questions,
        raw_cv_text_snippet=report.raw_cv_text_snippet,
        analyzed_at=report.analyzed_at,
        candidate_name=application.candidate.full_name if application.candidate else None,
        candidate_email=application.candidate.email if application.candidate else None,
        job_title=application.job.title if application.job else None,
    )


@router.get("/cv/all/reports", response_model=List[CVAnalysisResponse])
async def list_all_cv_reports(
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Admin-only: List all AI CV screening evaluation reports."""
    stmt = (
        select(CVAnalysisReport)
        .options(selectinload(CVAnalysisReport.job), selectinload(CVAnalysisReport.candidate))
        .order_by(CVAnalysisReport.analyzed_at.desc())
    )
    result = await db.execute(stmt)
    reports = result.scalars().all()

    return [
        CVAnalysisResponse(
            id=r.id,
            application_id=r.application_id,
            job_id=r.job_id,
            candidate_id=r.candidate_id,
            overall_score=r.overall_score,
            recommendation=r.recommendation,
            recommendation_reason=r.recommendation_reason,
            extracted_profile=r.extracted_profile,
            skill_matching=r.skill_matching,
            experience_matching=r.experience_matching,
            education_matching=r.education_matching,
            strengths=r.strengths,
            weaknesses=r.weaknesses,
            suggested_questions=r.suggested_questions,
            raw_cv_text_snippet=r.raw_cv_text_snippet,
            analyzed_at=r.analyzed_at,
            candidate_name=r.candidate.full_name if r.candidate else None,
            candidate_email=r.candidate.email if r.candidate else None,
            job_title=r.job.title if r.job else None,
        )
        for r in reports
    ]


# ═════════════════════════════════════════════════════════════════════════════
# 2. Phase 14: AI Live Interview Evaluation & Final Result Management
# ═════════════════════════════════════════════════════════════════════════════

@router.post("/interview/evaluate/{interview_id}", response_model=InterviewEvaluationResponse)
async def trigger_interview_evaluation(
    interview_id: str,
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Admin-only: Synthesize Gemini AI candidate evaluation for a completed interview.
    Analyzes Technical Knowledge, Problem Solving, Relevance, Understanding, Communication, and Compatibility.
    """
    try:
        report = await evaluate_interview_session(interview_id, db)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))

    # Load relations for display
    stmt = (
        select(InterviewEvaluation)
        .options(
            selectinload(InterviewEvaluation.candidate),
            selectinload(InterviewEvaluation.job),
        )
        .where(InterviewEvaluation.id == report.id)
    )
    res = await db.execute(stmt)
    eval_item = res.scalar_one()

    return _build_eval_response(eval_item)


@router.get("/interview/{interview_id}", response_model=InterviewEvaluationResponse)
async def get_interview_evaluation(
    interview_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get interview evaluation report.
    - Admin can view anytime (and review decision).
    - Candidate can ONLY view if Admin has published the report (is_published == True).
    """
    stmt = (
        select(InterviewEvaluation)
        .options(
            selectinload(InterviewEvaluation.candidate),
            selectinload(InterviewEvaluation.job),
            selectinload(InterviewEvaluation.interview),
        )
        .where(InterviewEvaluation.interview_id == interview_id)
    )
    res = await db.execute(stmt)
    evaluation = res.scalar_one_or_none()

    if not evaluation:
        # If admin requests and interview exists, auto-evaluate
        if current_user.role in (UserRole.ADMIN.value, UserRole.SUPER_ADMIN.value):
            try:
                evaluation = await evaluate_interview_session(interview_id, db)
                stmt_reload = (
                    select(InterviewEvaluation)
                    .options(
                        selectinload(InterviewEvaluation.candidate),
                        selectinload(InterviewEvaluation.job),
                    )
                    .where(InterviewEvaluation.id == evaluation.id)
                )
                res_reload = await db.execute(stmt_reload)
                evaluation = res_reload.scalar_one()
            except ValueError as e:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Interview evaluation report is not yet generated or available.",
            )

    # Candidate authorization & publication gate
    if current_user.role == UserRole.CANDIDATE.value:
        if evaluation.candidate_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not authorized to view this evaluation.",
            )
        if not evaluation.is_published:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="This interview evaluation is still under review by the hiring team.",
            )

    return _build_eval_response(evaluation)


@router.put("/interview/{interview_id}/decision", response_model=InterviewEvaluationResponse)
async def update_admin_final_decision(
    interview_id: str,
    payload: AdminDecisionUpdate,
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Admin-only: Record Human Final Decision (SELECTED | REJECTED | WAITLISTED)
    and control whether the result is published to the candidate.
    Human Admin always holds ultimate decision-making power.
    """
    # Validate decision value
    valid_decisions = [d.value for d in FinalDecision]
    if payload.final_decision not in valid_decisions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid decision '{payload.final_decision}'. Must be one of: {valid_decisions}",
        )

    stmt = (
        select(InterviewEvaluation)
        .options(
            selectinload(InterviewEvaluation.candidate),
            selectinload(InterviewEvaluation.job),
            selectinload(InterviewEvaluation.application),
        )
        .where(InterviewEvaluation.interview_id == interview_id)
    )
    res = await db.execute(stmt)
    evaluation = res.scalar_one_or_none()

    if not evaluation:
        # Generate evaluation first if not exists yet
        evaluation = await evaluate_interview_session(interview_id, db)
        stmt_reload = (
            select(InterviewEvaluation)
            .options(
                selectinload(InterviewEvaluation.candidate),
                selectinload(InterviewEvaluation.job),
                selectinload(InterviewEvaluation.application),
            )
            .where(InterviewEvaluation.id == evaluation.id)
        )
        res_reload = await db.execute(stmt_reload)
        evaluation = res_reload.scalar_one()

    now = datetime.now(timezone.utc)
    evaluation.final_decision = payload.final_decision
    evaluation.admin_notes = payload.admin_notes
    evaluation.decided_by_id = current_admin.id
    evaluation.decided_at = now

    if payload.is_published:
        evaluation.is_published = True
        evaluation.published_at = now
    else:
        evaluation.is_published = False

    # Synchronize JobApplication status with Admin's final decision
    if evaluation.application:
        if payload.final_decision == FinalDecision.SELECTED.value:
            evaluation.application.status = ApplicationStatus.ACCEPTED.value
        elif payload.final_decision == FinalDecision.REJECTED.value:
            evaluation.application.status = ApplicationStatus.REJECTED.value
        elif payload.final_decision == FinalDecision.WAITLISTED.value:
            evaluation.application.status = ApplicationStatus.WAITING_LIST.value

    # Notify candidate if results are published
    if payload.is_published:
        job_title = evaluation.job.title if evaluation.job else "Position"
        decision_label = payload.final_decision
        await create_notification(
            db=db,
            user_id=evaluation.candidate_id,
            title=f"Interview Decision: {decision_label}",
            message=f"The hiring team has completed the evaluation for '{job_title}'. Your outcome: {decision_label}.",
            type=NotificationType.RESULT_PUBLISHED.value,
            link_url="/candidate/interviews",
        )

        # Dispatch real email notification via Gmail SMTP
        if evaluation.candidate and evaluation.candidate.email:
            asyncio.create_task(
                send_interview_result_email(
                    to_email=evaluation.candidate.email,
                    candidate_name=evaluation.candidate.full_name or "Candidate",
                    job_title=job_title,
                    decision=decision_label,
                    score=evaluation.overall_score,
                    feedback=payload.admin_notes or evaluation.strengths_summary,
                )
            )

    await db.commit()

    # Re-fetch with relationships loaded
    stmt_reload = (
        select(InterviewEvaluation)
        .options(
            selectinload(InterviewEvaluation.candidate),
            selectinload(InterviewEvaluation.job),
            selectinload(InterviewEvaluation.application),
        )
        .where(InterviewEvaluation.id == evaluation.id)
    )
    res_reload = await db.execute(stmt_reload)
    evaluation = res_reload.scalar_one()

    return _build_eval_response(evaluation)


@router.get("/candidate/my-results", response_model=List[CandidateResultResponse])
async def get_candidate_results(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Candidate Portal: View results for completed interviews.
    - If published by Admin: Candidate sees scores, feedback, decision.
    - If not yet published: Shows "UNDER_REVIEW" with polite message.
    """
    # Find all interviews for this candidate
    stmt = (
        select(InterviewSchedule)
        .options(
            selectinload(InterviewSchedule.job),
        )
        .where(InterviewSchedule.candidate_id == current_user.id)
        .order_by(InterviewSchedule.scheduled_at.desc())
    )
    res = await db.execute(stmt)
    interviews = res.scalars().all()

    results: List[CandidateResultResponse] = []

    for inv in interviews:
        eval_stmt = (
            select(InterviewEvaluation)
            .where(InterviewEvaluation.interview_id == inv.id)
        )
        eval_res = await db.execute(eval_stmt)
        evaluation = eval_res.scalar_one_or_none()

        job_title = inv.job.title if inv.job else "Position"

        if evaluation and evaluation.is_published:
            results.append(
                CandidateResultResponse(
                    is_evaluated=True,
                    is_published=True,
                    interview_id=inv.id,
                    job_title=job_title,
                    final_decision=evaluation.final_decision,
                    overall_score=evaluation.overall_score,
                    criteria_scores=evaluation.individual_scores,
                    question_analysis=evaluation.question_analysis,
                    strengths=evaluation.strengths,
                    weaknesses=evaluation.weaknesses,
                    improvement_suggestions=evaluation.improvement_suggestions,
                    overall_evaluation=evaluation.overall_evaluation,
                    admin_feedback=evaluation.admin_notes,
                    published_at=evaluation.published_at,
                    status_message=f"Official hiring decision: {evaluation.final_decision}",
                )
            )
        else:
            results.append(
                CandidateResultResponse(
                    is_evaluated=bool(evaluation),
                    is_published=False,
                    interview_id=inv.id,
                    job_title=job_title,
                    final_decision=None,
                    overall_score=None,
                    status_message="Interview completed. Evaluation is under review by the hiring team.",
                )
            )

    return results


@router.get("/admin/all-evaluations", response_model=List[InterviewEvaluationResponse])
async def list_all_interview_evaluations(
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Admin-only: List all candidate interview evaluations and decision statuses."""
    stmt = (
        select(InterviewEvaluation)
        .options(
            selectinload(InterviewEvaluation.candidate),
            selectinload(InterviewEvaluation.job),
        )
        .order_by(InterviewEvaluation.created_at.desc())
    )
    res = await db.execute(stmt)
    evaluations = res.scalars().all()

    return [_build_eval_response(e) for e in evaluations]


def _build_eval_response(e: InterviewEvaluation) -> InterviewEvaluationResponse:
    return InterviewEvaluationResponse(
        id=e.id,
        interview_id=e.interview_id,
        application_id=e.application_id,
        candidate_id=e.candidate_id,
        job_id=e.job_id,
        technical_knowledge=e.technical_knowledge,
        problem_solving=e.problem_solving,
        answer_relevance=e.answer_relevance,
        conceptual_understanding=e.conceptual_understanding,
        communication_clarity=e.communication_clarity,
        job_compatibility=e.job_compatibility,
        overall_score=e.overall_score,
        question_analysis=e.question_analysis,
        individual_scores=e.individual_scores,
        strengths=e.strengths,
        weaknesses=e.weaknesses,
        improvement_suggestions=e.improvement_suggestions,
        overall_evaluation=e.overall_evaluation,
        ai_recommendation=e.ai_recommendation,
        final_decision=e.final_decision,
        admin_notes=e.admin_notes,
        is_published=e.is_published,
        published_at=e.published_at,
        decided_at=e.decided_at,
        created_at=e.created_at,
        candidate_name=e.candidate.full_name if e.candidate else None,
        candidate_email=e.candidate.email if e.candidate else None,
        job_title=e.job.title if e.job else None,
    )
