from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_role
from app.models.store import Store
from app.models.user import User
from app.schemas.store import StoreCreate, StoreResponse, StoreUpdate

router = APIRouter()


@router.get("/", response_model=list[StoreResponse])
async def list_stores(
    page: int | None = Query(None, ge=1),
    page_size: int | None = Query(None, ge=1, le=100),
    response: Response = None,
    current_user: User = Depends(require_role("admin", "shopkeeper")),
    db: AsyncSession = Depends(get_db),
):
    base_query = select(Store).where(Store.owner_id == current_user.id, Store.is_active == True).order_by(Store.name)
    total = None
    if page is not None and page_size is not None:
        count_result = await db.execute(select(func.count()).select_from(Store).where(Store.owner_id == current_user.id, Store.is_active == True))
        total = count_result.scalar()
        base_query = base_query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(base_query)
    items = [StoreResponse.model_validate(s) for s in result.scalars().all()]
    if total is not None and page and page_size and response:
        response.headers["X-Total-Count"] = str(total)
        response.headers["X-Page"] = str(page)
        response.headers["X-Page-Size"] = str(page_size)
        response.headers["X-Total-Pages"] = str(max(1, (total + page_size - 1) // page_size))
    return items


@router.post("/", response_model=StoreResponse, status_code=status.HTTP_201_CREATED)
async def create_store(payload: StoreCreate, current_user: User = Depends(require_role("admin", "shopkeeper")), db: AsyncSession = Depends(get_db)):
    store = Store(**payload.model_dump(), owner_id=current_user.id)
    db.add(store)
    await db.commit()
    await db.refresh(store)
    return StoreResponse.model_validate(store)


@router.put("/{store_id}", response_model=StoreResponse)
async def update_store(store_id: int, payload: StoreUpdate, current_user: User = Depends(require_role("admin", "shopkeeper")), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Store).where(Store.id == store_id, Store.owner_id == current_user.id))
    store = result.scalar_one_or_none()
    if not store:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Store not found")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(store, key, value)
    await db.commit()
    await db.refresh(store)
    return StoreResponse.model_validate(store)


@router.delete("/{store_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_store(store_id: int, current_user: User = Depends(require_role("admin", "shopkeeper")), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Store).where(Store.id == store_id, Store.owner_id == current_user.id))
    store = result.scalar_one_or_none()
    if not store:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Store not found")
    store.is_active = False
    await db.commit()
