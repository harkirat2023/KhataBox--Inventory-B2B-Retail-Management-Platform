import io
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
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
from app.models.order import Order, OrderItem
from app.models.user import User

router = APIRouter()


@router.post("/generate/{order_id}")
async def generate_invoice(
    order_id: int,
    current_user: User = Depends(require_role("admin", "shopkeeper")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Order)
        .where(Order.id == order_id, Order.shopkeeper_id == current_user.id)
        .options(selectinload(Order.items))
    )
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")

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
    elements.append(Paragraph(f"Order #: {order.order_number}", styles["Normal"]))
    elements.append(
        Paragraph(f"Date: {order.created_at.strftime('%d-%b-%Y %I:%M %p')}", styles["Normal"])
    )
    elements.append(Paragraph(f"Status: {order.status.upper()}", styles["Normal"]))
    elements.append(Spacer(1, 12))

    data = [["#", "Product", "Qty", "Unit Price", "Total"]]
    for i, item in enumerate(order.items, 1):
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
        ["Subtotal:", f"\u20b9{order.subtotal:.2f}"],
    ]
    if order.discount:
        totals_data.append(["Discount:", f"-\u20b9{order.discount:.2f}"])
    totals_data.append(["GST (18%):", f"\u20b9{order.gst:.2f}"])
    totals_data.append(["Total:", f"\u20b9{order.total:.2f}"])

    totals_table = Table(totals_data, colWidths=[2.5 * inch, 1.5 * inch])
    totals_table.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (0, -2), "Helvetica"),
        ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("ALIGN", (1, 0), (1, -1), "RIGHT"),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, -1), (-1, -1), 6),
        ("LINEABOVE", (0, -1), (-1, -1), 1, colors.black),
    ]))
    elements.append(totals_table)

    if order.notes:
        elements.append(Spacer(1, 12))
        elements.append(Paragraph(f"Notes: {order.notes}", styles["Normal"]))

    doc.build(elements)
    buf.seek(0)

    return StreamingResponse(
        buf,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="invoice_{order.order_number}.pdf"',
        },
    )
