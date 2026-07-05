from fastapi import APIRouter

from app.api.v1 import (
    auth,
    b2c,
    catalog,
    customer_cart,
    dashboard,
    data,
    payments,
    products,
    orders,
    suppliers,
    customers,
    forecasting,
    inventory,
    invoices,
    purchase_orders,
    receipts,
    qrcodes,
    expiry,
    audit,
    notifications,
    reports,
    stores,
    transfers,
)

router = APIRouter(prefix="/api/v1")
router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
router.include_router(dashboard.router, prefix="/dashboard", tags=["Dashboard"])
router.include_router(data.router, prefix="/data", tags=["Data Management"])
router.include_router(catalog.router, prefix="/catalog", tags=["Catalog"])
router.include_router(products.router, prefix="/products", tags=["Products"])
router.include_router(orders.router, prefix="/orders", tags=["Orders"])
router.include_router(suppliers.router, prefix="/suppliers", tags=["Suppliers"])
router.include_router(customers.router, prefix="/customers", tags=["Customers"])
router.include_router(forecasting.router, prefix="/forecasting", tags=["Forecasting"])
router.include_router(inventory.router, prefix="/inventory", tags=["Inventory"])
router.include_router(invoices.router, prefix="/invoices", tags=["Invoices"])
router.include_router(receipts.router, prefix="/receipts", tags=["Receipts"])
router.include_router(purchase_orders.router, prefix="/purchase-orders", tags=["Purchase Orders"])
router.include_router(qrcodes.router, prefix="/qrcodes", tags=["QR Codes"])
router.include_router(expiry.router, prefix="/expiry", tags=["Expiry"])
router.include_router(audit.router, prefix="/audit", tags=["Audit"])
router.include_router(notifications.router, prefix="/notifications", tags=["Notifications"])
router.include_router(reports.router, prefix="/reports", tags=["Reports"])
router.include_router(stores.router, prefix="/stores", tags=["Stores"])
router.include_router(transfers.router, prefix="/transfers", tags=["Stock Transfers"])
router.include_router(customer_cart.router, prefix="/cart", tags=["Customer Cart"])
router.include_router(payments.router, prefix="/payment", tags=["Payments"])
router.include_router(b2c.router, prefix="/b2c", tags=["B2C Orders"])
