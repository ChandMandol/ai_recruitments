# AI Recruitment Hub 🚀

An Enterprise-grade, AI-Powered Multimodal Recruitment Platform featuring Real-Time Voice & Video AI Interviewing, Turn-Based Half-Duplex Conversation, Automated Gemini CV Screening, In-App Notifications, OWASP Security Hardening, and Production Docker Orchestration.

---

## 🌟 Platform Capabilities & Phases (Phases 1–15 Complete)

1. **Phase 1–3: Architecture & Security Foundation**
   - Dual-role authentication (`ADMIN` / `CANDIDATE`) using JWT (Access & Refresh tokens).
   - Password reset tokens, Bcrypt hashing, and strict Role-Based Access Control (RBAC).
2. **Phase 4: Job Management System**
   - Full CRUD lifecycle with 11 domain fields, department/location filtering, and draft/published statuses.
3. **Phase 5–6: Candidate Portal & CV Management**
   - Candidate profile management, resume upload with magic-byte validation and traversal sanitization, instant PDF viewer.
4. **Phase 7–8: AI CV Screening & Gemini Analysis**
   - Automated CV parsing and candidate-job matching using Google Gemini 2.0.
   - Structured JSON breakdown: Skill matching, experience matching, education matching, strengths, weaknesses, and custom interview questions.
5. **Phase 9: Recruiter Dashboard & Shortlisting Pipeline**
   - Kanban-style application pipeline: `APPLIED`, `UNDER_REVIEW`, `SHORTLISTED`, `INTERVIEW_SCHEDULED`, `REJECTED`, `WAITING_LIST`.
   - Side-by-side multi-candidate comparison tool (2–5 candidates).
6. **Phase 10: Interview Scheduling Engine**
   - Automated conflict and overlap detection preventing double-booking of candidates.
   - Generates secure unique room tokens (`room_live_...`) for live AI sessions.
7. **Phase 11: AI Interview Room UI**
   - Dual-screen professional video interview interface: AI Avatar side with speaking waveforms and Candidate live video feed.
   - Media controls: Microphone toggle, camera toggle, session timer, connection status pill, and end interview modal.
8. **Phase 12: Real-Time Voice & Video Integration**
   - BidiGenerateContent WebSocket client connecting to Gemini Live API (`models/gemini-2.0-flash-exp`).
   - Bidirectional audio streaming: 16kHz PCM audio input and 24kHz PCM audio output.
9. **Phase 13: Turn-Based AI Interview Engine**
   - Strict 4-phase turn state machine: `AI_SPEAKING`, `CANDIDATE_LISTENING`, `AI_PROCESSING`, `INTERVIEW_COMPLETED`.
   - Software half-duplex audio gating: Candidate microphone transmission is strictly muted while AI speaks to eliminate acoustic feedback and echoes.
   - Web Audio API Voice Activity Detection (VAD) with 2.5s silence auto-commit and manual override button.
10. **Phase 14: AI Evaluation & Result Management**
    - Post-interview analysis across 6 evaluation criteria (Technical Knowledge, Problem Solving, Answer Relevance, Conceptual Understanding, Communication Clarity, Job Compatibility).
    - Question-by-question scoring and feedback.
    - Human Admin Decision Gate: Final hiring decisions (`SELECTED`, `REJECTED`, `WAITLISTED`) remain 100% under Admin control.
    - Candidate privacy gate: Unpublished evaluations remain private until Admin explicitly publishes.
11. **Phase 15: Notifications, Security Hardening & Deployment Readiness**
    - In-app notification system with live unread badge, dropdown bell, and deep linking.
    - Event triggers: Application submitted, status updated, interview scheduled, results published.
    - Security hardening: OWASP security headers (`nosniff`, `DENY`, `HSTS`, `Permissions-Policy`), token-bucket rate limiting on auth endpoints, strict file upload MIME & magic byte checks.
    - Production Docker setup: Multi-stage Dockerfiles for backend and frontend, Nginx reverse proxy with WebSocket support, and `docker-compose.yml`.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS v4, Lucide Icons, Axios, Web Audio API |
| **Backend** | Python 3.12, FastAPI, Starlette, Uvicorn, WebSockets, Asyncio |
| **Database & ORM** | PostgreSQL 16, SQLAlchemy 2.0 (Asyncpg + Psycopg2), Alembic |
| **AI Engine** | Google Gemini Live API & Google Gemini REST 2.0 (`gemini-2.0-flash`) |
| **Security** | JWT HS256, Passlib Bcrypt, OWASP Security Headers, Sliding-Window Rate Limiter |
| **Deployment** | Docker, Docker Compose, Nginx Alpine Multi-Stage Reverse Proxy |

---

## 🔑 Default Credentials for Testing

| Role | Email | Password | Access Level |
|---|---|---|---|
| **Super Admin** | `admin@recruitmenthub.ai` | `Admin@123456` | Full Platform & Recruiter Controls |
| **Demo Candidate** | `candidate.demo@example.com` | `Candidate@123` | Candidate Portal, Applications & Live Interview |

---

## 🚀 Running the Project Locally

### 1. Start PostgreSQL Database
```powershell
.\scripts\start_postgres.ps1
```
*(Runs portable PostgreSQL 16 cluster on port 5432)*

### 2. Start FastAPI Backend
```powershell
.\scripts\start_backend.ps1
```
*API running at: `http://localhost:8000` (Interactive docs at `http://localhost:8000/docs`)*

### 3. Start React Frontend
```powershell
.\scripts\start_frontend.ps1
```
*App running at: `http://localhost:3000`*

---

## 🐳 Production Deployment with Docker Compose

To deploy the entire production stack (PostgreSQL, FastAPI backend, and Nginx frontend) in isolated Docker containers:

1. Configure environment:
```bash
cp .env.example .env
# Edit .env and enter your GEMINI_API_KEY and SECRET_KEY
```

2. Build and run containers:
```bash
docker compose up --build -d
```

3. Access the services:
- **Web Application**: `http://localhost` (or `http://localhost:3000`)
- **API Documentation**: `http://localhost:8000/docs`
- **Health Check**: `http://localhost/health`

---

## 🧪 Comprehensive Automated Test Suite

Run all backend unit and integration tests with Pytest:
```powershell
cd backend
.\venv\Scripts\pytest.exe -c pytest.ini tests -v
```

### Verified Test Results:
```
======================== 13 passed in 62.15s (0:01:02) ========================
backend/tests/test_applicant_management.py::test_applicant_management_and_shortlisting PASSED
backend/tests/test_applications.py::test_job_application_pipeline_and_duplicate_prevention PASSED
backend/tests/test_auth.py::test_health_check PASSED
backend/tests/test_auth.py::test_candidate_registration_and_login PASSED
backend/tests/test_auth.py::test_admin_login_and_role_authorization PASSED
backend/tests/test_auth.py::test_forgot_and_reset_password_flow PASSED
backend/tests/test_cv_analysis.py::test_ai_cv_analysis_and_gemini_config PASSED
backend/tests/test_interview_evaluation.py::test_interview_evaluation_and_admin_decision_flow PASSED
backend/tests/test_interview_scheduling.py::test_interview_scheduling_lifecycle_and_overlap_detection PASSED
backend/tests/test_jobs.py::test_job_lifecycle_crud PASSED
backend/tests/test_notifications.py::test_security_headers_present PASSED
backend/tests/test_notifications.py::test_notifications_lifecycle_and_triggers PASSED
backend/tests/test_websocket_interview.py::test_websocket_interview_connection_and_messaging PASSED
```

Frontend production build verification:
```powershell
cd frontend
npm run build
# 0 TypeScript errors, bundle generated cleanly
```
