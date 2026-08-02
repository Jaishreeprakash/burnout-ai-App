from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional
from datetime import datetime

from .validators import reject_nul_bytes


class UserCreate(BaseModel):
    email: str
    username: str
    password: str = Field(max_length=72)  # bcrypt's real hashing limit
    full_name: str
    age: Optional[int] = Field(default=None, ge=0, le=150)
    gender: Optional[str] = None

    _no_nul = field_validator("email", "username", "password", "full_name", "gender", mode="before")(reject_nul_bytes)


class UserLogin(BaseModel):
    email: str
    password: str


class UserResponse(BaseModel):
    id: int
    email: str
    username: str
    full_name: str
    age: Optional[int] = None
    gender: Optional[str] = None
    created_at: datetime
    is_active: bool

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse


class TokenData(BaseModel):
    email: Optional[str] = None


class ResetPasswordRequest(BaseModel):
    email: str
    new_password: str = Field(max_length=72)  # bcrypt's real hashing limit

    _no_nul = field_validator("email", "new_password", mode="before")(reject_nul_bytes)
