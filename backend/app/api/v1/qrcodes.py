import io
import uuid as _uuid

import qrcode
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import JSONResponse, StreamingResponse
from PIL import Image, ImageDraw, ImageFont
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_role
from app.models.product import Product
from app.models.user import User

router = APIRouter()

LABEL_W, LABEL_H = 200, 120
COLS = 3
ROWS = 6


async def _get_product(product_id: int, current_user: User, db: AsyncSession) -> Product:
    result = await db.execute(
        select(Product).where(Product.id == product_id, Product.owner_id == current_user.id)
    )
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    return product


def _make_qr_image(content: str) -> io.BytesIO:
    qr = qrcode.make(content)
    buf = io.BytesIO()
    qr.save(buf, format="PNG")
    buf.seek(0)
    return buf


# --- Legacy label endpoints (encode product int id) ---

@router.get("/product/{product_id}")
async def generate_product_qr(
    product_id: int,
    current_user: User = Depends(require_role("admin", "shopkeeper")),
    db: AsyncSession = Depends(get_db),
):
    """Legacy: QR encodes integer product id (backward compatible)."""
    await _get_product(product_id, current_user, db)
    buf = _make_qr_image(str(product_id))
    return StreamingResponse(
        buf,
        media_type="image/png",
        headers={"Content-Disposition": f'inline; filename="product_{product_id}_qr.png"'},
    )


@router.get("/batch")
async def batch_qr_labels(
    ids: str = Query(..., description="Comma-separated product IDs"),
    current_user: User = Depends(require_role("admin", "shopkeeper")),
    db: AsyncSession = Depends(get_db),
):
    """Legacy: batch label sheet with QR + product info (backward compatible)."""
    id_list = [int(x.strip()) for x in ids.split(",") if x.strip()]
    if not id_list:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No product IDs provided")

    result = await db.execute(
        select(Product).where(Product.id.in_(id_list), Product.owner_id == current_user.id)
    )
    products = {p.id: p for p in result.scalars().all()}
    if not products:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No products found")

    n = len(id_list)
    nc = COLS
    nr = (n + nc - 1) // nc
    sheet_w = nc * LABEL_W
    sheet_h = max(nr * LABEL_H, LABEL_H)

    sheet = Image.new("RGB", (sheet_w, sheet_h), "white")
    draw = ImageDraw.Draw(sheet)

    try:
        font = ImageFont.truetype("arial.ttf", 10)
        title_font = ImageFont.truetype("arial.ttf", 8)
    except (IOError, OSError):
        font = ImageFont.load_default()
        title_font = font

    for idx, pid in enumerate(id_list):
        col = idx % nc
        row = idx // nc
        x = col * LABEL_W
        y = row * LABEL_H

        product = products.get(pid)
        label = product.name[:20] if product else f"ID: {pid}"

        qr_img = qrcode.make(str(pid)).resize((80, 80), Image.NEAREST)
        sheet.paste(qr_img, (x + 10, y + 10))

        draw.text((x + 100, y + 10), label, fill="black", font=title_font)
        if product:
            draw.text((x + 100, y + 30), f"SKU: {product.sku[:18]}", fill="black", font=font)
            draw.text((x + 100, y + 45), f"Price: ₹{product.selling_price}", fill="black", font=font)
            draw.text((x + 100, y + 60), f"Stock: {product.stock_quantity}", fill="black", font=font)
            draw.text((x + 100, y + 75), f"Cat: {product.category[:12]}", fill="black", font=font)

        draw.rectangle([x, y, x + LABEL_W - 1, y + LABEL_H - 1], outline="gray")

    buf = io.BytesIO()
    sheet.save(buf, format="PNG")
    buf.seek(0)

    return StreamingResponse(
        buf,
        media_type="image/png",
        headers={"Content-Disposition": f'inline; filename="qr_labels_batch.png"'},
    )


# --- Permanent QR identity endpoints (encode product_uuid) ---

@router.get("/permanent/{product_id}")
async def get_permanent_qr(
    product_id: int,
    current_user: User = Depends(require_role("admin", "shopkeeper")),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve the permanent QR code image for a product (encodes product_uuid)."""
    product = await _get_product(product_id, current_user, db)
    buf = _make_qr_image(product.product_uuid)
    return StreamingResponse(
        buf,
        media_type="image/png",
        headers={
            "Content-Disposition": f'inline; filename="product_{product_id}_permanent_qr.png"',
        },
    )


@router.get("/permanent/{product_id}/data")
async def get_permanent_qr_data(
    product_id: int,
    current_user: User = Depends(require_role("admin", "shopkeeper")),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve the permanent QR identity data (product_uuid) for a product."""
    product = await _get_product(product_id, current_user, db)
    return JSONResponse(content={"product_id": product.id, "product_uuid": product.product_uuid})


@router.post("/permanent/{product_id}/regenerate")
async def regenerate_permanent_qr(
    product_id: int,
    current_user: User = Depends(require_role("admin", "shopkeeper")),
    db: AsyncSession = Depends(get_db),
):
    """Regenerate the product UUID (replaces the existing one). Returns new QR image."""
    product = await _get_product(product_id, current_user, db)
    product.product_uuid = str(_uuid.uuid4())
    await db.commit()
    await db.refresh(product)
    buf = _make_qr_image(product.product_uuid)
    return StreamingResponse(
        buf,
        media_type="image/png",
        headers={
            "Content-Disposition": f'inline; filename="product_{product_id}_permanent_qr.png"',
        },
    )
