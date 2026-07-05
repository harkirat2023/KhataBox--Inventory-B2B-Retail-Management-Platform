import io
from datetime import datetime
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_role
from app.models.customer import Customer
from app.models.order import Order
from app.models.receipt import Receipt, ReceiptItem
from app.models.store import Store
from app.models.user import User, UserRole

router = APIRouter()


def _as_order_number(order: Order | None) -> str | None:
    return order.order_number if order else None


def _permission_for_receipt(current_user: User, receipt: Receipt) -> bool:
    if current_user.role == UserRole.ADMIN:
        return True
    if current_user.role == UserRole.SHOPKEEPER:
        return receipt.shopkeeper_id == current_user.id
    # customer can only view their own receipts
    if current_user.role == UserRole.CUSTOMER:
        return receipt.customer_id is not None and receipt.customer_id == receipt.customer_id
    return False


def _require_receipt_access(
    current_user: User,
    receipt: Receipt,
) -> None:
    # customer authorization depends on "customer id derived from user email"? This system stores only customer_id,
    # and current_user.id is the auth user id. In existing code, "customer" is tied to User.email.
    # We therefore resolve customer record below when customer role is used.
    if current_user.role == UserRole.ADMIN:
        return

    if current_user.role == UserRole.SHOPKEEPER:
        if receipt.shopkeeper_id != current_user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
        return

    if current_user.role == UserRole.CUSTOMER:
        # Customer user id in auth is not same as customers.id. Existing API uses Customer.email == current_user.email.
        # We'll validate using customer lookup in endpoint, not here.
        return

    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")


async def _get_customer_for_current_user(current_user: User, db: AsyncSession) -> Customer:
    if current_user.role != UserRole.CUSTOMER:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Not a customer user")
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
    return customer


@router.get("/order/{order_id}", response_model=dict)
async def get_receipt_for_order(
    order_id: int,
    current_user: User = Depends(require_role("admin", "shopkeeper")),
    db: AsyncSession = Depends(get_db),
):
    # Load receipt + items
    result = await db.execute(
        select(Receipt)
        .where(Receipt.order_id == order_id)
        .options(selectinload(Receipt.items))
    )
    receipt = result.scalar_one_or_none()
    if not receipt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Receipt not found")

    # permissions:
    if current_user.role == UserRole.CUSTOMER:
        customer = await _get_customer_for_current_user(current_user, db)
        if receipt.customer_id != customer.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
    else:
        if current_user.role == UserRole.SHOPKEEPER and receipt.shopkeeper_id != current_user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
        if current_user.role not in (UserRole.ADMIN, UserRole.SHOPKEEPER):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")

    order_result = await db.execute(select(Order).where(Order.id == receipt.order_id).options(selectinload(Order.items)))
    order = order_result.scalar_one_or_none()

    return {
        "receipt_number": receipt.receipt_number,
        "order_number": order.order_number if order else None,
        "customer_id": receipt.customer_id,
        "shopkeeper_id": receipt.shopkeeper_id,
        "items": [
            {
                "product_id": it.product_id,
                "product_name": it.product_name,
                "quantity": it.quantity,
                "unit_price": it.unit_price,
                "line_total": it.line_total,
            }
            for it in receipt.items or []
        ],
        "taxes": receipt.taxes,
        "discount": receipt.discount,
        "total_amount": receipt.total_amount,
        "payment_method": receipt.payment_method.value if hasattr(receipt.payment_method, "value") else receipt.payment_method,
        "timestamp": receipt.generated_at,
    }


@router.get("/history")
async def receipt_history(
    current_user: User = Depends(require_role("admin", "shopkeeper")),
    db: AsyncSession = Depends(get_db),
):
    if current_user.role == UserRole.ADMIN:
        q = select(Receipt).order_by(Receipt.generated_at.desc()).options(selectinload(Receipt.items))
    elif current_user.role == UserRole.SHOPKEEPER:
        q = (
            select(Receipt)
            .where(Receipt.shopkeeper_id == current_user.id)
            .order_by(Receipt.generated_at.desc())
            .options(selectinload(Receipt.items))
        )
    else:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Use /receipts/my for customer view")

    result = await db.execute(q)
    receipts = result.scalars().all()

    order_ids = [r.order_id for r in receipts]
    orders_by_id = {}
    if order_ids:
        ores = await db.execute(select(Order).where(Order.id.in_(order_ids)))
        orders = ores.scalars().all()
        orders_by_id = {o.id: o for o in orders}

    customer_ids = [r.customer_id for r in receipts if r.customer_id is not None]
    customers_by_id = {}
    if customer_ids:
        cres = await db.execute(select(Customer).where(Customer.id.in_(customer_ids)))
        customers = cres.scalars().all()
        customers_by_id = {c.id: c for c in customers}

    items = []
    for r in receipts:
        o = orders_by_id.get(r.order_id)
        c = customers_by_id.get(r.customer_id) if r.customer_id is not None else None
        items.append(
            {
                "id": r.id,
                "receipt_number": r.receipt_number,
                "order_number": o.order_number if o else None,
                "customer": c.company_name if c else None,
                "shopkeeper_id": r.shopkeeper_id,
                "taxes": r.taxes,
                "discount": r.discount,
                "total_amount": r.total_amount,
                "payment_method": r.payment_method.value if hasattr(r.payment_method, "value") else r.payment_method,
                "timestamp": r.generated_at,
                "items_count": len(r.items or []),
            }
        )
    return items


@router.get("/my")
async def my_receipts(
    current_user: User = Depends(require_role("admin", "shopkeeper", "customer")),
    db: AsyncSession = Depends(get_db),
):
    customer = await _get_customer_for_current_user(current_user, db)
    result = await db.execute(
        select(Receipt)
        .where(Receipt.customer_id == customer.id)
        .order_by(Receipt.generated_at.desc())
        .options(selectinload(Receipt.items))
    )
    receipts = result.scalars().all()
    items = []
    for r in receipts:
        result_o = await db.execute(select(Order).where(Order.id == r.order_id))
        o = result_o.scalar_one_or_none()
        items.append(
            {
                "id": r.id,
                "receipt_number": r.receipt_number,
                "order_number": o.order_number if o else None,
                "taxes": r.taxes,
                "discount": r.discount,
                "total_amount": r.total_amount,
                "payment_method": r.payment_method.value if hasattr(r.payment_method, "value") else r.payment_method,
                "timestamp": r.generated_at,
                "items_count": len(r.items or []),
            }
        )
    return items


def _generate_receipt_pdf_bytes(
    *,
    receipt: Receipt,
    order: Order,
    items: list[ReceiptItem],
    store_name: str,
    customer_company: str | None,
) -> bytes:
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, topMargin=0.5 * inch, bottomMargin=0.5 * inch)
    styles = getSampleStyleSheet()
    elements = []

    elements.append(Paragraph(f"<b>{store_name}</b>", styles["Title"]))
    elements.append(Spacer(1, 6))

    elements.append(Paragraph("<b>Receipt</b>", styles["Heading2"]))
    elements.append(Paragraph(f"Receipt #: {receipt.receipt_number}", styles["Normal"]))
    elements.append(Paragraph(f"Order #: {order.order_number}", styles["Normal"]))
    if customer_company:
        elements.append(Paragraph(f"Customer: {customer_company}", styles["Normal"]))
    elements.append(Paragraph(f"Payment Method: {(receipt.payment_method.value if hasattr(receipt.payment_method, 'value') else receipt.payment_method) or 'N/A'}", styles["Normal"]))
    elements.append(Paragraph(f"Timestamp: {receipt.generated_at.strftime('%d-%b-%Y %I:%M %p')}", styles["Normal"]))
    elements.append(Spacer(1, 12))

    data = [["#", "Product", "Qty", "Unit Price", "Line Total"]]
    for idx, it in enumerate(items, 1):
        data.append([
            str(idx),
            it.product_name,
            str(it.quantity),
            f"₹{it.unit_price:.2f}",
            f"₹{it.line_total:.2f}",
        ])

    col_widths = [0.4 * inch, 2.3 * inch, 0.5 * inch, 1.0 * inch, 1.0 * inch]
    table = Table(data, colWidths=col_widths)
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#16a34a")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 10),
        ("BOTTOMPADDING", (0, 0), (-1, 0), 8),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
        ("ALIGN", (2, 1), (-1, -1), "RIGHT"),
        ("FONTSIZE", (0, 1), (-1, -1), 9),
    ]))
    elements.append(table)
    elements.append(Spacer(1, 12))

    totals_data = [
        ["Subtotal:", f"₹{order.subtotal:.2f}"],
    ]
    if receipt.discount:
        totals_data.append(["Discount:", f"-₹{receipt.discount:.2f}"])
    totals_data.append(["Taxes:", f"₹{receipt.taxes:.2f}"])
    totals_data.append(["Total:", f"₹{receipt.total_amount:.2f}"])

    totals_table = Table(totals_data, colWidths=[2.5 * inch, 1.5 * inch])
    totals_table.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (0, -2), "Helvetica"),
        ("FONTNAME", (0, -1), (0, -1), "Helvetica"),
        ("FONTNAME", (1, -1), (1, -1), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("ALIGN", (1, 0), (1, -1), "RIGHT"),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, -1), (-1, -1), 6),
        ("LINEABOVE", (0, -1), (-1, -1), 1, colors.black),
    ]))
    elements.append(totals_table)

    elements.append(Spacer(1, 12))
    elements.append(Paragraph(f"Payment: {(receipt.payment_method.value if hasattr(receipt.payment_method, 'value') else receipt.payment_method) or 'N/A'}", styles["Normal"]))

    doc.build(elements)
    buf.seek(0)
    return buf.getvalue()


@router.get("/{receipt_id}/pdf")
async def download_receipt_pdf(
    receipt_id: int,
    current_user: User = Depends(require_role("admin", "shopkeeper")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Receipt)
        .where(Receipt.id == receipt_id)
        .options(selectinload(Receipt.items))
    )
    receipt = result.scalar_one_or_none()
    if not receipt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Receipt not found")

    # permissions + resolve customer/store
    store_result = await db.execute(select(Store).where(Store.owner_id == receipt.shopkeeper_id).limit(1))
    store = store_result.scalar_one_or_none()
    store_name = store.name if store else (current_user.store_name or "KhataBox Store")

    order_result = await db.execute(select(Order).where(Order.id == receipt.order_id).options(selectinload(Order.items)))
    order = order_result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")

    customer_company = None
    if current_user.role == UserRole.CUSTOMER:
        customer = await _get_customer_for_current_user(current_user, db)
        if receipt.customer_id != customer.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
        customer_company = customer.company_name
    else:
        if current_user.role == UserRole.SHOPKEEPER and receipt.shopkeeper_id != current_user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
        if receipt.customer_id is not None:
            cust_res = await db.execute(select(Customer).where(Customer.id == receipt.customer_id))
            customer = cust_res.scalar_one_or_none()
            customer_company = customer.company_name if customer else None

    pdf_bytes = _generate_receipt_pdf_bytes(
        receipt=receipt,
        order=order,
        items=receipt.items or [],
        store_name=store_name,
        customer_company=customer_company,
    )

    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="receipt_{receipt.receipt_number}.pdf"'},
    )
