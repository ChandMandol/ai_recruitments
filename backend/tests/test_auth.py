import uuid
import pytest
from httpx import ASGITransport, AsyncClient
from app.core.config import settings
from app.main import app, seed_initial_superadmin


@pytest.fixture(scope="session", autouse=True)
async def init_db_for_tests():
    """Ensure superadmin is seeded before tests run."""
    await seed_initial_superadmin()


@pytest.mark.asyncio
async def test_health_check():
    """Verify backend health endpoint."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["database"] == "PostgreSQL 16"


@pytest.mark.asyncio
async def test_candidate_registration_and_login():
    """Test candidate registration, token generation, and login."""
    unique_suffix = uuid.uuid4().hex[:6]
    candidate_email = f"candidate.{unique_suffix}@example.com"

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Register candidate
        reg_payload = {
            "full_name": "Rahim Ahmed",
            "email": candidate_email,
            "password": "Password@123",
            "phone": "+8801700000000",
        }
        res = await client.post("/api/v1/auth/register/candidate", json=reg_payload)
        assert res.status_code == 201, res.text
        data = res.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["user"]["role"] == "CANDIDATE"
        assert data["user"]["email"] == candidate_email
        candidate_token = data["access_token"]
        refresh_token = data["refresh_token"]

        # 2. Duplicate registration should fail
        res_dup = await client.post("/api/v1/auth/register/candidate", json=reg_payload)
        assert res_dup.status_code == 400

        # 3. Candidate login
        login_payload = {
            "email": candidate_email,
            "password": "Password@123",
            "expected_role": "CANDIDATE",
        }
        res_login = await client.post("/api/v1/auth/login", json=login_payload)
        assert res_login.status_code == 200
        login_data = res_login.json()
        assert login_data["user"]["full_name"] == "Rahim Ahmed"

        # 4. Fetch profile with token
        headers = {"Authorization": f"Bearer {candidate_token}"}
        res_me = await client.get("/api/v1/auth/me", headers=headers)
        assert res_me.status_code == 200
        assert res_me.json()["email"] == candidate_email

        # 5. Access candidate dashboard (authorized)
        res_cand_dash = await client.get("/api/v1/candidate/dashboard", headers=headers)
        assert res_cand_dash.status_code == 200
        assert res_cand_dash.json()["candidate_name"] == "Rahim Ahmed"

        # 6. Access admin overview as candidate (must be 403 FORBIDDEN)
        res_admin_denied = await client.get("/api/v1/admin/overview", headers=headers)
        assert res_admin_denied.status_code == 403

        # 7. Refresh token
        res_refresh = await client.post("/api/v1/auth/refresh", json={"refresh_token": refresh_token})
        assert res_refresh.status_code == 200
        assert "access_token" in res_refresh.json()


@pytest.mark.asyncio
async def test_admin_login_and_role_authorization():
    """Test admin login, access to admin overview, and role restrictions."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Seeded admin login
        admin_login = {
            "email": settings.FIRST_SUPERADMIN_EMAIL,
            "password": settings.FIRST_SUPERADMIN_PASSWORD,
            "expected_role": "ADMIN",
        }
        res = await client.post("/api/v1/auth/login", json=admin_login)
        assert res.status_code == 200, res.text
        admin_data = res.json()
        assert admin_data["user"]["role"] in ["ADMIN", "SUPER_ADMIN"]
        admin_token = admin_data["access_token"]

        headers = {"Authorization": f"Bearer {admin_token}"}

        # Admin can access admin overview
        res_overview = await client.get("/api/v1/admin/overview", headers=headers)
        assert res_overview.status_code == 200
        assert "total_candidates" in res_overview.json()

        # Admin can list all users
        res_users = await client.get("/api/v1/admin/users", headers=headers)
        assert res_users.status_code == 200
        assert len(res_users.json()) >= 1


@pytest.mark.asyncio
async def test_forgot_and_reset_password_flow():
    """Test forgot password token generation and password reset."""
    unique_suffix = uuid.uuid4().hex[:6]
    test_email = f"sakib.reset.{unique_suffix}@example.com"

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Register candidate for reset test
        reg_payload = {
            "full_name": "Sakib Hasan",
            "email": test_email,
            "password": "OldPassword@123",
        }
        await client.post("/api/v1/auth/register/candidate", json=reg_payload)

        # 2. Request password reset
        forgot_res = await client.post(
            "/api/v1/auth/forgot-password",
            json={"email": test_email}
        )
        assert forgot_res.status_code == 200
        reset_token = forgot_res.json().get("reset_token")
        assert reset_token is not None

        # 3. Reset password using token
        reset_payload = {
            "reset_token": reset_token,
            "new_password": "NewSecretPassword@456",
        }
        res_reset = await client.post("/api/v1/auth/reset-password", json=reset_payload)
        assert res_reset.status_code == 200
        assert res_reset.json()["success"] is True

        # 4. Old password should fail
        res_old_login = await client.post("/api/v1/auth/login", json={
            "email": test_email,
            "password": "OldPassword@123",
        })
        assert res_old_login.status_code == 401

        # 5. New password should succeed
        res_new_login = await client.post("/api/v1/auth/login", json={
            "email": test_email,
            "password": "NewSecretPassword@456",
        })
        assert res_new_login.status_code == 200
