import io

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

from app.core.database import get_db
from app.core.dependencies import require_role
from app.models.b2c_order import B2COrder
from app.models.order import Order
from app.models.user import User

router = APIRouter()

# Register a font that supports the Indian Rupee symbol
try:
    pdfmetrics.registerFont(TTFont("DejaVuSans", "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"))
    RUPEE_FONT = "DejaVuSans"
except Exception:
    try:
        pdfmetrics.registerFont(
            TTFont("ArialUnicode", "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf")
        )
        RUPEE_FONT = "ArialUnicode"
    except Exception:
        RUPEE_FONT = "Helvetica"


def _build_pdf(buf: io.BytesIO, *, store_name: str, store_phone: str | None, store_email: str | None, order) -> None:
    doc = SimpleDocTemplate(buf, pagesize=A4, topMargin=0.5 * inch, bottomMargin=0.5 * inch)
    styles = getSampleStyleSheet()
    elements = []

    elements.append(Paragraph(f"<b>{store_name or 'KhataBox Store'}</b>", styles["Title"]))
    elements.append(Spacer(1, 6))
    if store_phone:
        elements.append(Paragraph(f"Phone: {store_phone}", styles["Normal"]))
    if store_email:
        elements.append(Paragraph(f"Email: {store_email}", styles["Normal"]))
    elements.append(Spacer(1, 12))

    elements.append(Paragraph("<b>Invoice</b>", styles["Heading2"]))
    elements.append(Paragraph(f"Order #: {order.order_number}", styles["Normal"]))
    elements.append(Paragraph(f"Status: {str(order.status).upper()}", styles["Normal"]))
    elements.append(
        Paragraph(f"Date: {order.created_at.strftime('%d-%b-%Y %I:%M %p')}", styles["Normal"])
    )
    elements.append(Spacer(1, 12))

    data = [["#", "Product", "Qty", "Unit Price", "Total"]]
    for i, item in enumerate(order.items, 1):
        data.append(
            [
                str(i),
                item.product_name,
                str(item.quantity),
                f"\u20b9{item.unit_price:.2f}",
                f"\u20b9{item.total_price:.2f}",
            ]
        )

    col_widths = [0.5 * inch, 2.5 * inch, 0.6 * inch, 1.2 * inch, 1.2 * inch]
    table = Table(data, colWidths=col_widths)
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#2563EB")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), RUPEE_FONT),
                ("FONTSIZE", (0, 0), (-1, 0), 10),
                ("BOTTOMPADDING", (0, 0), (-1, 0), 8),
                ("GRID", (0, 1), (-1, -1), 0.5, colors.grey),
                ("ALIGN", (2, 1), (-1, -1), "RIGHT"),
                ("FONTSIZE", (0, 1), (-1, -1), 9),
                ("FONTNAME", (0, 1), (-1, -1), RUPEE_FONT),
            ]
        )
    )
    elements.append(table)
    elements.append(Spacer(1, 12))

    totals_data = [["Subtotal:", f"\u20b9{order.subtotal:.2f}"]]
    if getattr(order, "discount", 0):
        totals_data.append(["Discount:", f"-\u20b9{order.discount:.2f}"])
    totals_data.append(["GST (18%):", f"\u20b9{getattr(order, 'gst', 0):.2f}"])
    totals_data.append(["Total:", f"\u20b9{order.total:.2f}"])

    totals_table = Table(totals_data, colWidths=[2.5 * inch, 1.5 * inch])
    totals_table.setStyle(
        TableStyle(
            [
                ("FONTNAME", (0, 0), (0, -2), RUPEE_FONT),
                ("FONTNAME", (0, -1), (-1, -1), RUPEE_FONT),
                ("FONTSIZE", (0, 0), (-1, -1), 10),
                ("ALIGN", (1, 0), (1, -1), "RIGHT"),
                ("TOPPADDING", (0, 0), (-1, -1), 3),
                ("BOTTOMPADDING", (0, -1), (-1, -1), 6),
                ("LINEABOVE", (0, -1), (-1, -1), 1, colors.black),
            ]
        )
    )
    elements.append(totals_table)

    if getattr(order, "notes", None):
        elements.append(Spacer(1, 12))
        elements.append(Paragraph(f"Notes: {order.notes}", styles["Normal"]))

    doc.build(elements)
    buf.seek(0)


@router.post("/customer/generate/b2c/{order_id}")
async def generate_customer_b2c_invoice(
    order_id: int,
    current_user: User = Depends(require_role("customer")),
    db: AsyncSession = Depends(get_db),
):
    """Generate invoice PDF for a B2C order ONLY after status == completed.

    Frontend calls this endpoint directly from customer pages.
    """
    result = await db.execute(
        select(B2COrder)
        .where(B2COrder.id == order_id, B2COrder.customer_user_id == current_user.id)
        .options(selectinload(B2COrder.items))
    )
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="B2C order not found")

    # completed in backend == "received" in UI
    status_val = order.status.value if hasattr(order.status, "value") else str(order.status)
    if status_val.lower() != "completed":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invoice available after received")

    # We don't have shopkeeper contact fields in B2C order model; keep store generic.
    buf = io.BytesIO()
    # Build a compatible "order" object interface expected by _build_pdf
    # B2COrder.items already have product_name/quantity/unit_price/total_price.
    _build_pdf(
        buf,
        store_name="KhataBox Store",
        store_phone=None,
        store_email=None,
        order=order,
    )

    return StreamingResponse(
        buf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="invoice_{order.order_number}.pdf"'},
    )


@router.post("/customer/generate/regular/{order_id}")
async def generate_customer_regular_invoice(
    order_id: int,
    current_user: User = Depends(require_role("customer")),
    db: AsyncSession = Depends(get_db),
):
    """Optional: allow customer to download invoice for legacy orders.

    This keeps access rules aligned with existing invoice endpoint assumptions.
    """
    # Legacy order model uses shopkeeper_id and items relationship; reuse existing Order generator model.
    result = await db.execute(
        select(Order)
        .where(Order.id == order_id)
        .options(selectinload(Order.items))
    )
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")

    if getattr(order, "customer_email", None) and getattr(current_user, "email", None) and order.customer_email != current_user.email:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed")

    # Reuse the existing admin/shopkeeper invoice logic style for PDF.
    buf = io.BytesIO()
    _build_pdf(
        buf,
        store_name="KhataBox Store",
        store_phone=None,
        store_email=None,
        order=order,
    )

    return StreamingResponse(
        buf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="invoice_{order.order_number}.pdf"'},
    )

