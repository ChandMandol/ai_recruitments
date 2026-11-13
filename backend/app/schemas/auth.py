from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, EmailStr, Field
from app.models.user import UserRole


class UserResponse(BaseModel):
    id: str
    email: EmailStr
    full_name: str
    role: str
    phone: Optional[str] = None
    avatar_url: Optional[str] = None
    is_active: bool
    is_verified: bool
    company_id: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CandidateRegisterRequest(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=100, description="Full Name of candidate")
    email: EmailStr = Field(..., description="Valid candidate email address")
    password: str = Field(..., min_length=6, max_length=128, description="Password (min 6 characters)")
    phone: Optional[str] = Field(None, max_length=20, description="Phone number")


class AdminRegisterRequest(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=128)
    phone: Optional[str] = None
    company_name: Optional[str] = None
    admin_secret: Optional[str] = Field(None, description="Secret invitation key to authorize Admin registration")


class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    expected_role: Optional[str] = None  # Optional check to prevent candidate login from admin portal


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserResponse


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ForgotPasswordResponse(BaseModel):
    message: str
    reset_token: Optional[str] = None  # Provided in dev/testing mode for instant testability


class ResetPasswordRequest(BaseModel):
    reset_token: str
    new_password: str = Field(..., min_length=6, max_length=128)


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=6, max_length=128)


class MessageResponse(BaseModel):
    message: str
    success: bool = True


class UserStatusUpdateRequest(BaseModel):
    is_active: bool


class UserRoleUpdateRequest(BaseModel):
    role: UserRole



