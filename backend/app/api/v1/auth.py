import logging

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.config import settings
from app.core.database import get_db
from app.core.dependencies import get_current_user, require_role
from app.core.security import create_access_token, create_refresh_token, hash_password, verify_password
from app.models.store import Store, StoreType
from app.models.user import User, UserRole
from app.schemas.user import TokenResponse, UserCreate, UserLogin, UserResponse

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(payload: UserCreate, db: AsyncSession = Depends(get_db)):
    logger.info(f"Starting registration for {payload.email}")
    # Block public admin registration for security
    if payload.role == "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin registration is restricted"
        )
    # Check for duplicate email
    result = await db.execute(select(User).where(User.email == payload.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

    # For customer role, auto-assign role to customer (disable custom role selection)
    role = payload.role
    if role != "shopkeeper":
        role = "customer"

    logger.info(f"Creating user with role={role}")

    # Create user
    user = User(
        email=payload.email,
        password_hash=app.core.security.hash_password(payload.password),
        name=payload.name,
        role=role,
        store_name=payload.store_name,
        phone=payload.phone,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    logger.info(f"User committed: id={user.id}")

    # For shopkeeper role, create store with business information
    if role == "shopkeeper" and payload.store_name:
        logger.info(f"Creating store for user {user.id}")
        try:
            # Use asyncpg directly to bypass SQLAlchemy Enum caching issue
            store_type_str = str(payload.store_type) if payload.store_type else "other"
            logger.info(f"Store type string: '{store_type_str}'")

            # Create direct connection for store creation
            direct_engine = create_async_engine(settings.DATABASE_URL)
            async with direct_engine.connect() as conn:
                result = await conn.execute(
                    text('''
                    INSERT INTO stores (name, store_type, address, city, state, pin_code, gst_number, monthly_revenue, business_description, owner_id, is_active, created_at, updated_at)
                    VALUES (:name, :store_type, :address, :city, :state, :pin_code, :gst_number, :monthly_revenue, :business_description, :owner_id, :is_active, NOW(), NOW())
                    RETURNING id
                '''), {
                    'name': payload.store_name,
                    'store_type': store_type_str,
                    'address': payload.address,
                    'city': payload.city,
                    'state': payload.state,
                    'pin_code': payload.pin_code,
                    'gst_number': payload.gst_number,
                    'monthly_revenue': payload.monthly_revenue,
                    'business_description': payload.business_description,
                    'owner_id': user.id,
                    'is_active': True
                })
                await conn.commit()
                row = result.fetchone()
                logger.info(f"Store created with id: {row[0]}")
            await direct_engine.dispose()
        except Exception as e:
            logger.error(f"ERROR creating store: {type(e).__name__}: {e}")
            # Re-raise to see actual error
            raise HTTPException(status_code=500, detail=f"Store creation error: {str(e)}")

    await db.refresh(user)
    access_token = app.core.security.create_access_token({"sub": str(user.id), "role": user.role})
    refresh_token = app.core.security.create_refresh_token({"sub": str(user.id)})
    logger.info(f"Registration complete for user {user.id}")
    return TokenResponse(access_token=access_token, refresh_token=refresh_token, user=UserResponse.model_validate(user))


@router.post("/login", response_model=TokenResponse)
async def login(payload: UserLogin, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == payload.email))
    user = result.scalar_one_or_none()
    if not user or not app.core.security.verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    access_token = app.core.security.create_access_token({"sub": str(user.id), "role": user.role})
    refresh_token = app.core.security.create_refresh_token({"sub": str(user.id)})
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