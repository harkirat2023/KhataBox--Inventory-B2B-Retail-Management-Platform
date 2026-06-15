import json
from datetime import datetime, timezone

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import async_session
from app.models.audit_log import AuditLog
from app.models.customer import Customer
from app.models.inventory import InventoryMovement
from app.models.invoice import Invoice
from app.models.notification import Notification
from app.models.order import Order, OrderItem
from app.models.product import Product
from app.models.purchase_order import PurchaseOrder, PurchaseOrderItem
from app.models.store import Store
from app.models.supplier import Supplier
from app.models.user import User
from app.services.storage import upload, download

TABLES = [
    "users",
    "products",
    "suppliers",
    "customers",
    "orders",
    "order_items",
    "invoices",
    "purchase_orders",
    "purchase_order_items",
    "inventory_movements",
    "notifications",
    "audit_logs",
    "stores",
]


async def export_backup() -> dict:
    data = {}
    async with async_session() as db:
        for table in TABLES:
            result = await db.execute(text(f"SELECT * FROM {table}"))
            columns = list(result.keys())
            rows = [dict(zip(columns, row)) for row in result.all()]
            for r in rows:
                for k, v in r.items():
                    if isinstance(v, datetime):
                        r[k] = v.isoformat()
            data[table] = rows
    return {
        "version": "1.0",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "data": data,
    }


async def import_backup(backup: dict) -> dict:
    result = {"imported": 0, "errors": 0, "details": []}
    async with async_session() as db:
        for table in TABLES:
            rows = backup.get("data", {}).get(table, [])
            for row in rows:
                try:
                    row.pop("id", None)
                    await db.execute(text(f"INSERT INTO {table} ({','.join(row.keys())}) VALUES ({','.join([':'+k for k in row.keys()])})"), row)
                    result["imported"] += 1
                    result["details"].append(f"Imported row into {table}")
                except Exception as e:
                    result["errors"] += 1
                    result["details"].append(f"Error importing into {table}: {e}")
        await db.commit()
    return result


async def export_to_storage() -> str | None:
    backup = await export_backup()
    key = f"backups/khatabox_backup_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}.json"
    ok = upload(key, json.dumps(backup, default=str).encode(), "application/json")
    return key if ok else None


async def restore_from_storage(key: str) -> dict:
    data = download(key)
    if data is None:
        return {"imported": 0, "errors": 1, "details": ["Backup file not found"]}
    backup = json.loads(data)
    return await import_backup(backup)
