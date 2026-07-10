import io
import os

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

import logging
import traceback

from app.core.database import get_db
from app.core.dependencies import require_role

from app.models.order import Order

from app.models.user import User
from app.models.b2c_order import B2COrder

logger = logging.getLogger(__name__)


# Register a font that supports the Indian Rupee symbol
try:
    # Try to register DejaVu Sans or similar font that supports ₹
    pdfmetrics.registerFont(TTFont('DejaVuSans', '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'))
    RUPEE_FONT = 'DejaVuSans'
except:
    try:
        # Fallback to system fonts
        pdfmetrics.registerFont(TTFont('ArialUnicode', '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf'))
        RUPEE_FONT = 'ArialUnicode'
    except:
        # If no Unicode font available, use default and replace rupee with text
        RUPEE_FONT = 'Helvetica'

router = APIRouter()


def _assert_user_can_generate_order_invoice(order, current_user: User) -> None:
    """Raise 404/403 if invoice generation is not allowed for the current user."""
    # Legacy orders
    if hasattr(order, "shopkeeper_id") and hasattr(order, "customer_id"):
        # shopkeeper/admin: shopkeeper_id matches auth user id
        if order.shopkeeper_id == current_user.id:
            return

        # customer: order.customer_id matches B2B Customer.id (NOT auth user id)
        # We must resolve Customer by email in the route handler.
        if current_user.role == "customer":
            # signal "unauthorized" using a conservative check
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")

        # other roles
        if order.customer_id != current_user.id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
        return



    # B2C orders
    if hasattr(order, "shopkeeper_id") and hasattr(order, "customer_user_id"):
        if order.shopkeeper_id != current_user.id and order.customer_user_id != current_user.id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
        return



@router.post("/generate/{order_id}")
async def generate_invoice(
    order_id: int,
    current_user: User = Depends(require_role("admin", "shopkeeper", "customer")),
    db: AsyncSession = Depends(get_db),
):

    # Supports BOTH:
    # - legacy regular orders (app.models.order.Order)
    # - B2C orders (app.models.b2c_order.B2COrder)

    # 1) Try legacy order first
    result = await db.execute(
        select(Order)
        .where(Order.id == order_id)
        .options(selectinload(Order.items))
    )
    order = result.scalar_one_or_none()

    is_b2c = False
    b2c_order = None

    if order is not None:
        # Special-case legacy orders for customers: resolve B2B Customer by email.
        if current_user.role == "customer" and hasattr(order, "customer_id"):
            from app.models.customer import Customer  # local import to keep helper signature unchanged

            cust_result = await db.execute(
                select(Customer).where(Customer.email == current_user.email)
            )
            customer = cust_result.scalar_one_or_none()
            if not customer or order.customer_id != customer.id:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
        else:
            _assert_user_can_generate_order_invoice(order, current_user)

        # Customer rule: only allow invoice download when status is "received"
        # (frontend maps B2C completed->received; backend stores B2C as "completed").
        if str(getattr(order, "status", "")).lower() not in {"completed", "received"}:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail='Invoice is not available until order is received',
            )

    else:
        # 2) Try B2C order
        b2c_result = await db.execute(
            select(B2COrder)
            .where(B2COrder.id == order_id)
            .options(selectinload(B2COrder.items))
        )
        b2c_order = b2c_result.scalar_one_or_none()
        if not b2c_order:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")

        _assert_user_can_generate_order_invoice(b2c_order, current_user)

        # Customer rule: only allow invoice download when customer sees "received"
        # which corresponds to backend B2C status "completed".
        if str(getattr(b2c_order, "status", "")).lower() != "completed":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail='Invoice is not available until order is received',
            )

        is_b2c = True


    # Normalize fields for invoice rendering
    if is_b2c:
        order_number = b2c_order.order_number
        order_items = b2c_order.items or []
        created_at = b2c_order.created_at
        status = b2c_order.status
        subtotal = b2c_order.subtotal
        discount = b2c_order.discount
        gst = b2c_order.gst
        total = b2c_order.total
        notes = b2c_order.notes
    else:
        order_number = order.order_number
        order_items = order.items or []
        created_at = order.created_at
        status = order.status
        subtotal = order.subtotal
        discount = order.discount
        gst = order.gst
        total = order.total
        notes = order.notes



    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, topMargin=0.5 * inch, bottomMargin=0.5 * inch)
    styles = getSampleStyleSheet()
    elements = []

    elements.append(Paragraph(f"<b>{current_user.store_name or 'KhataBox Store'}</b>", styles["Title"]))
    elements.append(Spacer(1, 6))
    if current_user.phone:
        elements.append(Paragraph(f"Phone: {current_user.phone}", styles["Normal"]))
    if current_user.email:
        elements.append(Paragraph(f"Email: {current_user.email}", styles["Normal"]))
    elements.append(Spacer(1, 12))

    elements.append(Paragraph(f"<b>Invoice</b>", styles["Heading2"]))
    elements.append(Paragraph(f"Order #: {order_number}", styles["Normal"]))
    elements.append(
        Paragraph(f"Date: {created_at.strftime('%d-%b-%Y %I:%M %p')}", styles["Normal"])
    )
    elements.append(Paragraph(f"Status: {str(status).upper()}", styles["Normal"]))

    elements.append(Spacer(1, 12))

    data = [["#", "Product", "Qty", "Unit Price", "Total"]]
    for i, item in enumerate(order_items, 1):

        data.append([
            str(i),
            item.product_name,
            str(item.quantity),
            f"\u20b9{item.unit_price:.2f}",
            f"\u20b9{item.total_price:.2f}",
        ])

    col_widths = [0.5 * inch, 2.5 * inch, 0.6 * inch, 1.2 * inch, 1.2 * inch]
    table = Table(data, colWidths=col_widths)
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#2563EB")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), RUPEE_FONT),
        ("FONTSIZE", (0, 0), (-1, 0), 10),
        ("BOTTOMPADDING", (0, 0), (-1, 0), 8),
        ("GRID", (0, 1), (-1, -1), 0.5, colors.grey),
        ("ALIGN", (2, 1), (-1, -1), "RIGHT"),
        ("FONTSIZE", (0, 1), (-1, -1), 9),
        ("FONTNAME", (0, 1), (-1, -1), RUPEE_FONT),
    ]))
    elements.append(table)
    elements.append(Spacer(1, 12))

    totals_data = [
        ["Subtotal:", f"\u20b9{subtotal:.2f}"],
    ]

    if discount:
        totals_data.append(["Discount:", f"-\u20b9{discount:.2f}"])
    totals_data.append(["GST (18%):", f"\u20b9{gst:.2f}"])
    totals_data.append(["Total:", f"\u20b9{total:.2f}"])


    totals_table = Table(totals_data, colWidths=[2.5 * inch, 1.5 * inch])
    totals_table.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (0, -2), RUPEE_FONT),
        ("FONTNAME", (0, -1), (-1, -1), RUPEE_FONT),
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("ALIGN", (1, 0), (1, -1), "RIGHT"),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, -1), (-1, -1), 6),
        ("LINEABOVE", (0, -1), (-1, -1), 1, colors.black),
    ]))
    elements.append(totals_table)

    if notes:
        elements.append(Spacer(1, 12))
        elements.append(Paragraph(f"Notes: {notes}", styles["Normal"]))


    try:
        doc.build(elements)
    except Exception as e:
        logger.error("PDF build failed for order %s: %s", order_number, traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"PDF generation failed: {str(e)}")
    buf.seek(0)

    return StreamingResponse(
        buf,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="invoice_{order_number}.pdf"',
        },
    )

