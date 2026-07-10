import logging

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_role
from app.core.security import create_access_token, create_refresh_token, decode_token, hash_password, verify_password
from app.models.store import Store, StoreType
from app.models.user import User, UserRole
from app.schemas.user import (
    LoginWithOTPRequest,
    OTPSendRequest,
    OTPVerifyRequest,
    RefreshRequest,
    RegisterWithOTPRequest,
    TokenResponse,
    UserCreate,
    UserLogin,
    UserResponse,
)
from app.services.otp import send_otp as _send_otp, verify_otp as _verify_otp

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/send-otp")
async def send_otp(payload: OTPSendRequest):
    await _send_otp(payload.email)
    return {"message": "OTP sent to your email"}


@router.post("/register-with-otp", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register_with_otp(payload: RegisterWithOTPRequest, db: AsyncSession = Depends(get_db)):
    logger.info("OTP register attempt for %s (role=%s)", payload.email, payload.role)

    valid = await _verify_otp(payload.email, payload.otp)
    if not valid:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired OTP")

    if payload.role == "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin registration is restricted")

    result = await db.execute(select(User).where(User.email == payload.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

    role = payload.role if payload.role == "shopkeeper" else "customer"
    password_hash = hash_password(payload.password) if payload.password else None

    user = User(
        email=payload.email,
        password_hash=password_hash,
        name=payload.name,
        role=role,
        store_name=payload.store_name,
        phone=payload.phone,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    if role == "shopkeeper" and payload.store_name:
        try:
            store_type_str = str(payload.store_type) if payload.store_type else "other"
            try:
                StoreType(store_type_str)
            except ValueError:
                store_type_str = "other"

            store = Store(
                name=payload.store_name,
                store_type=store_type_str,
                address=payload.address,
                city=payload.city,
                state=payload.state,
                pin_code=payload.pin_code,
                gst_number=payload.gst_number,
                monthly_revenue=payload.monthly_revenue,
                business_description=payload.business_description,
                owner_id=user.id,
                is_active=True,
            )
            db.add(store)
            await db.commit()
        except Exception as e:
            logger.error("ERROR creating store: %s: %s", type(e).__name__, e)
            raise HTTPException(status_code=500, detail=f"Store creation error: {str(e)}")

    access_token = create_access_token({"sub": str(user.id), "role": user.role})
    refresh_token = create_refresh_token({"sub": str(user.id)})
    return TokenResponse(access_token=access_token, refresh_token=refresh_token, user=UserResponse.model_validate(user))


@router.post("/login-with-otp", response_model=TokenResponse)
async def login_with_otp(payload: LoginWithOTPRequest, db: AsyncSession = Depends(get_db)):
    logger.info("OTP login attempt for %s", payload.email)

    valid = await _verify_otp(payload.email, payload.otp)
    if not valid:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired OTP")

    result = await db.execute(select(User).where(User.email == payload.email))
    user = result.scalar_one_or_none()
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or inactive")

    access_token = create_access_token({"sub": str(user.id), "role": user.role})
    refresh_token = create_refresh_token({"sub": str(user.id)})
    return TokenResponse(access_token=access_token, refresh_token=refresh_token, user=UserResponse.model_validate(user))


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(payload: UserCreate, db: AsyncSession = Depends(get_db)):
    logger.info("Password register attempt for %s", payload.email)
    if payload.role == "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin registration is restricted")

    result = await db.execute(select(User).where(User.email == payload.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

    role = payload.role if payload.role == "shopkeeper" else "customer"

    user = User(
        email=payload.email,
        password_hash=hash_password(payload.password),
        name=payload.name,
        role=role,
        store_name=payload.store_name,
        phone=payload.phone,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    if role == "shopkeeper" and payload.store_name:
        try:
            store_type_str = str(payload.store_type) if payload.store_type else "other"
            try:
                StoreType(store_type_str)
            except ValueError:
                store_type_str = "other"

            store = Store(
                name=payload.store_name,
                store_type=store_type_str,
                address=payload.address,
                city=payload.city,
                state=payload.state,
                pin_code=payload.pin_code,
                gst_number=payload.gst_number,
                monthly_revenue=payload.monthly_revenue,
                business_description=payload.business_description,
                owner_id=user.id,
                is_active=True,
            )
            db.add(store)
            await db.commit()
        except Exception as e:
            logger.error("ERROR creating store: %s: %s", type(e).__name__, e)
            raise HTTPException(status_code=500, detail=f"Store creation error: {str(e)}")

    return UserResponse.model_validate(user)


@router.post("/login", response_model=TokenResponse)
async def login(payload: UserLogin, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == payload.email))
    user = result.scalar_one_or_none()
    if not user or not user.password_hash or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    access_token = create_access_token({"sub": str(user.id), "role": user.role})
    refresh_token = create_refresh_token({"sub": str(user.id)})
    return TokenResponse(access_token=access_token, refresh_token=refresh_token, user=UserResponse.model_validate(user))


@router.post("/refresh", response_model=TokenResponse)
async def refresh(payload: RefreshRequest, db: AsyncSession = Depends(get_db)):
    token_data = decode_token(payload.refresh_token)
    if token_data is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired refresh token")
    user_id = token_data.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token payload")
    result = await db.execute(select(User).where(User.id == int(user_id)))
    user = result.scalar_one_or_none()
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or inactive")
    access_token = create_access_token({"sub": str(user.id), "role": user.role})
    refresh_token = create_refresh_token({"sub": str(user.id)})
    return TokenResponse(access_token=access_token, refresh_token=refresh_token, user=UserResponse.model_validate(user))


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    return UserResponse.model_validate(current_user)


@router.get("/users", response_model=list[UserResponse])
async def list_users(
    role: str | None = Query(None),
    search: str | None = Query(None),
    current_user: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    query = select(User).order_by(User.created_at.desc())
    if role:
        query = query.where(User.role == role)
    if search:
        query = query.where(User.name.ilike(f"%{search}%") | User.email.ilike(f"%{search}%"))
    result = await db.execute(query)
    return [UserResponse.model_validate(u) for u in result.scalars().all()]


@router.patch("/users/{user_id}/role", response_model=UserResponse)
async def update_user_role(
    user_id: int,
    new_role: str = Query(...),
    current_user: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    try:
        user.role = UserRole(new_role)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid role: {new_role}")
    await db.commit()
    await db.refresh(user)
    return UserResponse.model_validate(user)


@router.patch("/users/{user_id}/toggle-active", response_model=UserResponse)
async def toggle_user_active(
    user_id: int,
    current_user: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    if user_id == current_user.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot deactivate yourself")
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    user.is_active = not user.is_active
    await db.commit()
    await db.refresh(user)
    return UserResponse.model_validate(user)
