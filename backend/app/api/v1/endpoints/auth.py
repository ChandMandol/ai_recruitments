from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.deps import get_current_user, get_db
from app.core.config import settings
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    generate_secure_reset_token,
    get_password_hash,
    verify_password,
)
from app.models.company import Company
from app.models.user import User, UserRole
from app.schemas.auth import (
    AdminRegisterRequest,
    CandidateRegisterRequest,
    ChangePasswordRequest,
    ForgotPasswordRequest,
    ForgotPasswordResponse,
    LoginRequest,
    MessageResponse,
    RefreshTokenRequest,
    ResetPasswordRequest,
    TokenResponse,
    UserResponse,
)
from app.core.rate_limiter import auth_rate_limiter

router = APIRouter()


@router.post("/register/candidate", response_model=TokenResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(auth_rate_limiter.check)])
async def register_candidate(
    payload: CandidateRegisterRequest,
    db: AsyncSession = Depends(get_db),
):
    """Register a new candidate and return authentication tokens."""
    # Check if email is already in use
    stmt = select(User).where(User.email == payload.email.lower().strip())
    existing = await db.execute(stmt)
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists.",
        )

    # Create new candidate
    user = User(
        email=payload.email.lower().strip(),
        password_hash=get_password_hash(payload.password),
        full_name=payload.full_name.strip(),
        phone=payload.phone.strip() if payload.phone else None,
        role=UserRole.CANDIDATE.value,
        is_active=True,
        is_verified=True,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    # Generate JWT tokens
    access_token = create_access_token(subject=user.id, role=user.role)
    refresh_token = create_refresh_token(subject=user.id, role=user.role)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=UserResponse.model_validate(user),
    )


@router.post("/register/admin", response_model=TokenResponse, status_code=status.HTTP_403_FORBIDDEN)
async def register_admin():
    """Direct admin registration is disabled. Super Admin assigns roles directly from dashboard."""
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Public admin registration is disabled. Please register a candidate account, and have a Super Admin promote the account to Admin role.",
    )


@router.post("/login", response_model=TokenResponse, dependencies=[Depends(auth_rate_limiter.check)])
async def login(
    payload: LoginRequest,
    db: AsyncSession = Depends(get_db),
):
    """Authenticate Admin or Candidate and return access + refresh tokens."""
    email_clean = payload.email.lower().strip()
    stmt = select(User).where(User.email == email_clean)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="আপনার অ্যাকাউন্টটি ব্লক করা হয়েছে। অনুগ্রহ করে সাপোর্টে যোগাযোগ করুন (Your account has been blocked. Please contact support).",
        )

    # If frontend requests role verification (e.g. candidate logging into admin portal)
    if payload.expected_role:
        expected = payload.expected_role.upper()
        # Admin portal allows ADMIN and SUPER_ADMIN
        if expected == "ADMIN" and user.role not in [UserRole.ADMIN.value, UserRole.SUPER_ADMIN.value]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: Candidate accounts cannot log in through the Admin Portal.",
            )
        elif expected == "CANDIDATE" and user.role != UserRole.CANDIDATE.value:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: Admin accounts cannot log in through the Candidate Portal.",
            )

    access_token = create_access_token(subject=user.id, role=user.role)
    refresh_token = create_refresh_token(subject=user.id, role=user.role)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=UserResponse.model_validate(user),
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_access_token(
    payload: RefreshTokenRequest,
    db: AsyncSession = Depends(get_db),
):
    """Exchange a valid refresh token for a new access token."""
    decoded = decode_token(payload.refresh_token)
    if not decoded or decoded.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        )

    user_id = decoded.get("sub")
    stmt = select(User).where(User.id == user_id)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User no longer exists or is inactive",
        )

    new_access_token = create_access_token(subject=user.id, role=user.role)
    new_refresh_token = create_refresh_token(subject=user.id, role=user.role)

    return TokenResponse(
        access_token=new_access_token,
        refresh_token=new_refresh_token,
        user=UserResponse.model_validate(user),
    )


@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(
    current_user: User = Depends(get_current_user),
):
    """Fetch currently authenticated user details."""
    return UserResponse.model_validate(current_user)


@router.post("/forgot-password", response_model=ForgotPasswordResponse, dependencies=[Depends(auth_rate_limiter.check)])
async def forgot_password(
    payload: ForgotPasswordRequest,
    db: AsyncSession = Depends(get_db),
):
    """Generate a password reset token for the specified email."""
    stmt = select(User).where(User.email == payload.email.lower().strip())
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    # Always return success message to prevent user enumeration
    if not user:
        return ForgotPasswordResponse(
            message="If an account with that email exists, password reset instructions have been generated.",
            reset_token=None,
        )

    reset_token = generate_secure_reset_token()
    user.reset_token = reset_token
    user.reset_token_expires_at = datetime.now(timezone.utc) + timedelta(
        minutes=settings.RESET_PASSWORD_EXPIRE_MINUTES
    )
    await db.commit()

    return ForgotPasswordResponse(
        message="Password reset instructions and token generated successfully.",
        reset_token=reset_token,
    )


@router.post("/reset-password", response_model=MessageResponse, dependencies=[Depends(auth_rate_limiter.check)])
async def reset_password(
    payload: ResetPasswordRequest,
    db: AsyncSession = Depends(get_db),
):
    """Verify reset token and update user password."""
    stmt = select(User).where(User.reset_token == payload.reset_token)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    now = datetime.now(timezone.utc)
    if not user or not user.reset_token_expires_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or unrecognized password reset token.",
        )

    # Check expiration
    expires_at = user.reset_token_expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)

    if now > expires_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password reset token has expired. Please request a new one.",
        )

    # Update password and clear token
    user.password_hash = get_password_hash(payload.new_password)
    user.reset_token = None
    user.reset_token_expires_at = None
    await db.commit()

    return MessageResponse(
        message="Password has been reset successfully. You can now log in with your new password.",
        success=True,
    )


@router.post("/change-password", response_model=MessageResponse)
async def change_password(
    payload: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Change password for an already authenticated user."""
    if not verify_password(payload.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password does not match.",
        )

    current_user.password_hash = get_password_hash(payload.new_password)
    await db.commit()

    return MessageResponse(
        message="Your password has been changed successfully.",
        success=True,
    )


@router.post("/logout", response_model=MessageResponse)
async def logout(
    current_user: User = Depends(get_current_user),
):
    """Logout endpoint. Client will discard stored JWT tokens."""
    return MessageResponse(
        message=f"User {current_user.email} successfully logged out.",
        success=True,
    )

