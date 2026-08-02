from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from database import get_db
from models.user import User
from schemas.user import Token, UserCreate, UserResponse, ResetPasswordRequest
from utils.auth_utils import (
    create_access_token,
    get_current_user,
    get_password_hash,
    verify_password,
)
from config import settings

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
def register(user_data: UserCreate, db: Session = Depends(get_db)):
    """Register a new user account."""
    # Check if email already exists
    existing_email = db.query(User).filter(User.email == user_data.email).first()
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email already exists",
        )

    # Check if username already exists
    existing_username = db.query(User).filter(User.username == user_data.username).first()
    if existing_username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This username is already taken",
        )

    hashed_pw = get_password_hash(user_data.password)
    new_user = User(
        email=user_data.email,
        username=user_data.username,
        hashed_password=hashed_pw,
        full_name=user_data.full_name,
        age=user_data.age,
        gender=user_data.gender,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    access_token = create_access_token(
        data={"sub": new_user.email},
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    return Token(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(new_user),
    )


@router.post("/login", response_model=Token)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    """Login with email (as username field) and password, returns JWT token."""
    # OAuth2PasswordRequestForm delivers raw form data with no Pydantic model
    # behind it, so unlike every other endpoint these two fields never pass
    # through schema validation. A NUL byte here crashes the DB query
    # (psycopg2 rejects NUL in any bound parameter) and a password over 72
    # bytes crashes bcrypt verification — both would otherwise be raw 500s.
    # Treat malformed input the same as wrong credentials rather than leak
    # which case it was.
    if "\x00" in form_data.username or "\x00" in form_data.password or len(form_data.password.encode("utf-8")) > 72:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # OAuth2PasswordRequestForm uses `username` field — we treat it as email
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user:
        # Also try matching by username
        user = db.query(User).filter(User.username == form_data.username).first()

    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Account is inactive",
        )

    access_token = create_access_token(
        data={"sub": user.email},
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    return Token(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(user),
    )


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    """Get the currently authenticated user's profile."""
    return current_user


@router.post("/reset-password", status_code=status.HTTP_200_OK)
def reset_password(req: ResetPasswordRequest, db: Session = Depends(get_db)):
    """Reset a user's password."""
    # Find user by email or username
    user = db.query(User).filter(User.email == req.email).first()
    if not user:
        user = db.query(User).filter(User.username == req.email).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No account found with this email or username",
        )

    # Hash the new password and update user in DB
    hashed_pw = get_password_hash(req.new_password)
    user.hashed_password = hashed_pw
    db.commit()
    return {"status": "success", "message": "Password updated successfully"}
