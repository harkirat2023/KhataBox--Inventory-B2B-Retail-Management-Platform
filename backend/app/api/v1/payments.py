import random
import string

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.customer import Customer
from app.models.payment import Payment
from app.models.order import PaymentMethod
from app.models.user import User
from app.schemas.payment import PaymentInitiate, PaymentSimulateResponse

router = APIRouter()


@router.post("/simulate", response_model=PaymentSimulateResponse)
async def simulate_payment(
    payload: PaymentInitiate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Customer).where(Customer.email == current_user.email))
    customer = result.scalar_one_or_none()
    if not customer:
        customer = Customer(
            email=current_user.email,
            company_name=current_user.email.split("@")[0],
            contact_person=current_user.name or current_user.email.split("@")[0],
            owner_id=0,
        )
        db.add(customer)
        await db.flush()

    transaction_id = "SIM-" + "".join(random.choices(string.ascii_uppercase + string.digits, k=10))

    pm_value = payload.payment_method
    try:
        pm = PaymentMethod(pm_value)
    except ValueError:
        pm = PaymentMethod.UPI

    payment = Payment(
        customer_id=customer.id,
        order_id=None,
        amount=payload.amount,
        payment_method=pm,
        transaction_id=transaction_id,
        status="completed",
    )
    db.add(payment)
    await db.commit()

    return PaymentSimulateResponse(
        success=True,
        transaction_id=transaction_id,
        message="Payment simulated successfully",
    )
