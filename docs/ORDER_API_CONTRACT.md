# Order API Contract — Shopkeeper Reception

## Overview
This document defines the response fields required by the shopkeeper Orders dashboard.

## Status Standardization
UI workflow labels map to backend enum values:

- Pending → `pending`
- Confirmed → `confirmed`
- Ready → `processing`
- Completed → `completed`
- Cancelled → `cancelled`

> The UI displays **Ready** using the backend value `processing`.

## Endpoints

### 1) List shopkeeper orders
**GET** `/api/v1/orders/`

Response: `OrderResponse[]`

Each order includes:
- `id: number`
- `order_number: string`
- `shopkeeper_id: number`
- `customer_id: number | null`
- `customer_name: string | null`
- `status: string` (backend enum value)
- `payment_method: string | null`
- `subtotal: number`
- `discount: number`
- `gst: number`
- `total: number`
- `notes: string | null`
- `created_at: datetime`
- `updated_at: datetime`
- `items: OrderItemResponse[]`

### 2) Get single order
**GET** `/api/v1/orders/{order_id}`

Response: `OrderResponse` with the exact same contract as above.

### 3) Update order status
**PATCH** `/api/v1/orders/{order_id}/status`

Request body:
```json
{
  "status": "pending|confirmed|processing|completed|cancelled"
}
```

Response:
- `OrderResponse` with the same contract as above.

## Required UI Fields (Contract Guarantees)
This phase guarantees the frontend receives:
- `customer_name`
- per-item `product_sku`
- per-item `total` (line amount)
so the shopkeeper Orders dashboard renders without placeholders/workarounds.
