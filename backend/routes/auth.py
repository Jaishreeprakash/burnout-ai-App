from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from database import get_db
from models.user import User
from schemas.user import Token, UserCreate, UserResponse, UserUpdate, ResetPasswordRequest
from utils.auth_utils import (
    create_access_token,
    get_current_user,
    get_password_hash,
    verify_password,
)
from config import settings

router = APIRouter(prefix="/auth", tags=["Authentication"])


from sqlalchemy import func
from sqlalchemy.orm import Session

@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
def register(user_data: UserCreate, db: Session = Depends(get_db)):
    """Register a new user account."""
    email_clean = user_data.email.strip().lower()
    username_clean = user_data.username.strip().lower()

    # Check if email already exists
    existing_email = db.query(User).filter(func.lower(User.email) == email_clean).first()
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email already exists",
        )

    # Check if username already exists
    existing_username = db.query(User).filter(func.lower(User.username) == username_clean).first()
    if existing_username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This username is already taken",
        )

    hashed_pw = get_password_hash(user_data.password)
    new_user = User(
        email=email_clean,
        username=username_clean,
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
    if "\x00" in form_data.username or "\x00" in form_data.password or len(form_data.password.encode("utf-8")) > 72:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    input_identifier = form_data.username.strip().lower()

    # Match by email or username (case-insensitive)
    user = db.query(User).filter(func.lower(User.email) == input_identifier).first()
    if not user:
        user = db.query(User).filter(func.lower(User.username) == input_identifier).first()

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


@router.put("/me", response_model=UserResponse)
def update_me(
    data: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update the currently authenticated user's profile."""
    if data.full_name is not None and data.full_name.strip():
        current_user.full_name = data.full_name.strip()
    if data.age is not None:
        current_user.age = data.age
    if data.gender is not None:
        current_user.gender = data.gender.strip()
    db.commit()
    db.refresh(current_user)
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
