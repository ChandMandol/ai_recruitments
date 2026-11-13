import os
import shutil
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm.attributes import flag_modified

from app.api.deps import get_current_candidate, get_db
from app.models.adaptive_assessment import AdaptiveAssessment, AssessmentStatus
from app.models.candidate import CandidateProfile
from app.models.user import User
from app.schemas.adaptive_assessment import (
    AnswerEvaluationResponse,
    AssessmentResponse,
    SubmitAnswerRequest,
)
from app.services.adaptive_interview_service import (
    generate_round_questions,
    generate_summary_report,
    process_candidate_answer,
)
from app.services.cv_analyzer import (
    build_candidate_fallback_text,
    extract_text_from_file,
    get_effective_gemini_api_key,
)

router = APIRouter()

TEMP_UPLOAD_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "..", "uploads", "resumes")
)
os.makedirs(TEMP_UPLOAD_DIR, exist_ok=True)


@router.post("/start", response_model=AssessmentResponse, status_code=status.HTTP_201_CREATED)
async def start_adaptive_interview(
    job_category: str = Form(...),
    interview_level: str = Form("Mid-Level"),
    use_profile_cv: bool = Form(True),
    file: Optional[UploadFile] = File(None),
    current_candidate: User = Depends(get_current_candidate),
    db: AsyncSession = Depends(get_db),
):
    """
    Initiate a new CV-Based Adaptive AI Interview Assessment:
    - Extracts CV text from uploaded file or existing candidate profile
    - Generates initial 5 technical & behavioral questions (Round 1)
    - Sets initial session state
    """
    cv_filename = None
    cv_text = ""

    # 1. Process uploaded resume file if provided
    if file and file.filename:
        raw_name = os.path.basename(file.filename)
        ext = os.path.splitext(raw_name)[1].lower()
        if ext in (".pdf", ".docx"):
            safe_name = f"assessment_{uuid.uuid4().hex[:8]}_{current_candidate.id[:6]}{ext}"
            saved_path = os.path.join(TEMP_UPLOAD_DIR, safe_name)
            contents = await file.read()
            with open(saved_path, "wb") as f:
                f.write(contents)
            cv_filename = raw_name
            cv_text = extract_text_from_file(saved_path)

    # 2. If no new file or extraction empty, fallback to candidate profile
    if not cv_text and use_profile_cv:
        stmt = select(CandidateProfile).where(CandidateProfile.user_id == current_candidate.id)
        prof_res = await db.execute(stmt)
        profile = prof_res.scalar_one_or_none()

        if profile and profile.resume_url:
            cv_filename = profile.resume_filename or "Profile_Resume.pdf"
            base_fname = os.path.basename(profile.resume_url.split("?")[0])
            disk_path = os.path.join(TEMP_UPLOAD_DIR, base_fname)
            if os.path.exists(disk_path):
                cv_text = extract_text_from_file(disk_path)

        if not cv_text:
            cv_text = build_candidate_fallback_text(current_candidate, profile)

    # 3. Load Gemini API Key
    api_key = await get_effective_gemini_api_key(db)

    # 4. Generate Round 1 Questions (Exactly 5 Questions)
    round_1_questions = await generate_round_questions(
        job_category=job_category.strip(),
        interview_level=interview_level.strip(),
        cv_text=cv_text,
        round_number=1,
        start_index=1,
        count=5,
        api_key=api_key,
    )

    rounds_data = [
        {
            "round_number": 1,
            "questions_count": 5,
            "min_required_correct": 1,
            "correct_count": 0,
            "is_completed": False,
            "passed": None,
            "questions": round_1_questions,
        }
    ]

    # 5. Create Database Assessment Record
    assessment = AdaptiveAssessment(
        candidate_id=current_candidate.id,
        job_category=job_category.strip(),
        interview_level=interview_level.strip(),
        cv_filename=cv_filename,
        cv_text_summary=(cv_text[:3000] if cv_text else None),
        status=AssessmentStatus.IN_PROGRESS.value,
        total_questions_asked=5,
        total_correct=0,
        current_round=1,
        current_question_index=1,
        rounds_data=rounds_data,
        summary_report=None,
    )
    db.add(assessment)
    await db.commit()
    await db.refresh(assessment)

    active_q = round_1_questions[0] if round_1_questions else None

    return AssessmentResponse(
        id=assessment.id,
        candidate_id=assessment.candidate_id,
        job_category=assessment.job_category,
        interview_level=assessment.interview_level,
        cv_filename=assessment.cv_filename,
        status=assessment.status,
        current_round=assessment.current_round,
        current_question_index=assessment.current_question_index,
        total_questions_asked=assessment.total_questions_asked,
        total_correct=assessment.total_correct,
        active_question=active_q,
        rounds=assessment.rounds_data,
        summary_report=assessment.summary_report,
        termination_reason=assessment.termination_reason,
        created_at=assessment.created_at,
    )


@router.get("/history", response_model=List[AssessmentResponse])
async def list_candidate_assessments(
    current_candidate: User = Depends(get_current_candidate),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve history of all adaptive interview assessments taken by the candidate."""
    stmt = (
        select(AdaptiveAssessment)
        .where(AdaptiveAssessment.candidate_id == current_candidate.id)
        .order_by(desc(AdaptiveAssessment.created_at))
    )
    result = await db.execute(stmt)
    records = result.scalars().all()

    items = []
    for a in records:
        # Find active question if in progress
        active_q = None
        if a.status == AssessmentStatus.IN_PROGRESS.value:
            for r in a.rounds_data:
                for q in r.get("questions", []):
                    if q.get("index") == a.current_question_index:
                        active_q = q
                        break
        items.append(
            AssessmentResponse(
                id=a.id,
                candidate_id=a.candidate_id,
                job_category=a.job_category,
                interview_level=a.interview_level,
                cv_filename=a.cv_filename,
                status=a.status,
                current_round=a.current_round,
                current_question_index=a.current_question_index,
                total_questions_asked=a.total_questions_asked,
                total_correct=a.total_correct,
                active_question=active_q,
                rounds=a.rounds_data,
                summary_report=a.summary_report,
                termination_reason=a.termination_reason,
                created_at=a.created_at,
            )
        )
    return items


@router.get("/{assessment_id}", response_model=AssessmentResponse)
async def get_assessment_details(
    assessment_id: str,
    current_candidate: User = Depends(get_current_candidate),
    db: AsyncSession = Depends(get_db),
):
    """Fetch current state, questions, and progress of a specific assessment."""
    stmt = select(AdaptiveAssessment).where(
        AdaptiveAssessment.id == assessment_id,
        AdaptiveAssessment.candidate_id == current_candidate.id,
    )
    result = await db.execute(stmt)
    assessment = result.scalar_one_or_none()
    if not assessment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assessment session not found.",
        )

    active_q = None
    if assessment.status == AssessmentStatus.IN_PROGRESS.value:
        for r in assessment.rounds_data:
            for q in r.get("questions", []):
                if q.get("index") == assessment.current_question_index:
                    active_q = q
                    break

    return AssessmentResponse(
        id=assessment.id,
        candidate_id=assessment.candidate_id,
        job_category=assessment.job_category,
        interview_level=assessment.interview_level,
        cv_filename=assessment.cv_filename,
        status=assessment.status,
        current_round=assessment.current_round,
        current_question_index=assessment.current_question_index,
        total_questions_asked=assessment.total_questions_asked,
        total_correct=assessment.total_correct,
        active_question=active_q,
        rounds=assessment.rounds_data,
        summary_report=assessment.summary_report,
        termination_reason=assessment.termination_reason,
        created_at=assessment.created_at,
    )


@router.post("/{assessment_id}/answer", response_model=AnswerEvaluationResponse)
async def submit_assessment_answer(
    assessment_id: str,
    payload: SubmitAnswerRequest,
    current_candidate: User = Depends(get_current_candidate),
    db: AsyncSession = Depends(get_db),
):
    """
    Submit answer for the current question:
    - Evaluates answer correctness and feedback via AI
    - Checks round pass/fail criteria (>= 1 correct required per round)
    - If 0 correct: Terminates session early and compiles summary
    - If >= 1 correct: Unlocks next 2 questions up to maximum 20
    """
    stmt = select(AdaptiveAssessment).where(
        AdaptiveAssessment.id == assessment_id,
        AdaptiveAssessment.candidate_id == current_candidate.id,
    )
    result = await db.execute(stmt)
    assessment = result.scalar_one_or_none()
    if not assessment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assessment session not found.",
        )

    if assessment.status != AssessmentStatus.IN_PROGRESS.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"This assessment session is already {assessment.status}.",
        )

    api_key = await get_effective_gemini_api_key(db)

    try:
        eval_result = await process_candidate_answer(
            assessment=assessment,
            question_index=payload.question_index,
            candidate_answer=payload.answer_text,
            api_key=api_key,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

    # Flag modified for SQLAlchemy JSON column mutation tracking
    flag_modified(assessment, "rounds_data")
    if assessment.summary_report:
        flag_modified(assessment, "summary_report")

    await db.commit()
    await db.refresh(assessment)

    return AnswerEvaluationResponse(
        question_index=eval_result["question_index"],
        is_correct=eval_result["is_correct"],
        score=eval_result["score"],
        feedback=eval_result["feedback"],
        model_answer=eval_result["model_answer"],
        round_completed=eval_result["round_completed"],
        round_passed=eval_result["round_passed"],
        session_status=eval_result["session_status"],
        termination_reason=eval_result["termination_reason"],
        next_question=eval_result["next_question"],
        summary_report=eval_result["summary_report"],
    )


@router.post("/{assessment_id}/end", response_model=AssessmentResponse)
async def end_assessment_manually(
    assessment_id: str,
    current_candidate: User = Depends(get_current_candidate),
    db: AsyncSession = Depends(get_db),
):
    """Allow candidate to gracefully conclude the interview early and generate summary."""
    stmt = select(AdaptiveAssessment).where(
        AdaptiveAssessment.id == assessment_id,
        AdaptiveAssessment.candidate_id == current_candidate.id,
    )
    result = await db.execute(stmt)
    assessment = result.scalar_one_or_none()
    if not assessment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assessment session not found.",
        )

    if assessment.status == AssessmentStatus.IN_PROGRESS.value:
        assessment.status = AssessmentStatus.COMPLETED.value
        assessment.completed_at = datetime.now(timezone.utc)
        assessment.termination_reason = "Session concluded by candidate."
        assessment.summary_report = generate_summary_report(assessment)
        flag_modified(assessment, "summary_report")
        await db.commit()
        await db.refresh(assessment)

    return AssessmentResponse(
        id=assessment.id,
        candidate_id=assessment.candidate_id,
        job_category=assessment.job_category,
        interview_level=assessment.interview_level,
        cv_filename=assessment.cv_filename,
        status=assessment.status,
        current_round=assessment.current_round,
        current_question_index=assessment.current_question_index,
        total_questions_asked=assessment.total_questions_asked,
        total_correct=assessment.total_correct,
        active_question=None,
        rounds=assessment.rounds_data,
        summary_report=assessment.summary_report,
        termination_reason=assessment.termination_reason,
        created_at=assessment.created_at,
    )


@router.get("/{assessment_id}/summary", response_model=Dict[str, Any])
async def get_assessment_summary(
    assessment_id: str,
    current_candidate: User = Depends(get_current_candidate),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve full AI summary report for an assessment."""
    stmt = select(AdaptiveAssessment).where(
        AdaptiveAssessment.id == assessment_id,
        AdaptiveAssessment.candidate_id == current_candidate.id,
    )
    result = await db.execute(stmt)
    assessment = result.scalar_one_or_none()
    if not assessment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assessment session not found.",
        )

    if not assessment.summary_report:
        assessment.summary_report = generate_summary_report(assessment)
        flag_modified(assessment, "summary_report")
        await db.commit()

    return assessment.summary_report
