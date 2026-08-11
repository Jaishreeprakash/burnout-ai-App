from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Any, Optional
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

    @field_validator("email", "username", mode="before")
    def clean_credentials(cls, v: Any) -> Any:
        if isinstance(v, str):
            return v.strip().lower()
        return v

    @field_validator("full_name", mode="before")
    def clean_name(cls, v: Any) -> Any:
        if isinstance(v, str):
            return v.strip()
        return v

    @field_validator("age", mode="before")
    def clean_age(cls, v: Any) -> Any:
        if v is None or v == "" or v == "undefined" or v == "null":
            return None
        try:
            return int(v)
        except (ValueError, TypeError):
            return None

    @field_validator("gender", mode="before")
    def clean_gender(cls, v: Any) -> Any:
        if isinstance(v, str):
            v = v.strip()
            return v if v and v.lower() != "undefined" and v.lower() != "null" else None
        return None


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    age: Optional[int] = Field(default=None, ge=0, le=150)
    gender: Optional[str] = None

    _no_nul = field_validator("full_name", "gender", mode="before")(reject_nul_bytes)


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
