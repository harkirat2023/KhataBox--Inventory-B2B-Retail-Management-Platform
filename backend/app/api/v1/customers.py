from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_role
from app.models.customer import Customer
from app.models.user import User
from app.schemas.customer import CustomerCreate, CustomerResponse, CustomerUpdate

router = APIRouter()


@router.get("/", response_model=list[CustomerResponse])
async def list_customers(
    page: int | None = Query(None, ge=1),
    page_size: int | None = Query(None, ge=1, le=100),
    response: Response = None,
    current_user: User = Depends(require_role("admin", "shopkeeper")),
    db: AsyncSession = Depends(get_db),
):
    base_query = select(Customer).where(Customer.owner_id == current_user.id)
    total = None
    if page is not None and page_size is not None:
        count_result = await db.execute(select(func.count()).select_from(Customer).where(Customer.owner_id == current_user.id))
        total = count_result.scalar()
        base_query = base_query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(base_query)
    items = [CustomerResponse.model_validate(c) for c in result.scalars().all()]
    if total is not None and page and page_size and response:
        response.headers["X-Total-Count"] = str(total)
        response.headers["X-Page"] = str(page)
        response.headers["X-Page-Size"] = str(page_size)
        response.headers["X-Total-Pages"] = str(max(1, (total + page_size - 1) // page_size))
    return items


@router.post("/", response_model=CustomerResponse, status_code=status.HTTP_201_CREATED)
async def create_customer(payload: CustomerCreate, current_user: User = Depends(require_role("admin", "shopkeeper")), db: AsyncSession = Depends(get_db)):
    customer = Customer(**payload.model_dump(), owner_id=current_user.id)
    db.add(customer)
    await db.commit()
    await db.refresh(customer)
    return CustomerResponse.model_validate(customer)


@router.put("/{customer_id}", response_model=CustomerResponse)
async def update_customer(customer_id: int, payload: CustomerUpdate, current_user: User = Depends(require_role("admin", "shopkeeper")), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Customer).where(Customer.id == customer_id, Customer.owner_id == current_user.id))
    customer = result.scalar_one_or_none()
    if not customer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(customer, key, value)
    await db.commit()
    await db.refresh(customer)
    return CustomerResponse.model_validate(customer)


@router.delete("/{customer_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_customer(customer_id: int, current_user: User = Depends(require_role("admin", "shopkeeper")), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Customer).where(Customer.id == customer_id, Customer.owner_id == current_user.id))
    customer = result.scalar_one_or_none()
    if not customer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")
    await db.delete(customer)
    await db.commit()
