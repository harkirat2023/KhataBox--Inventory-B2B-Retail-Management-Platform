# Customer Checkout (Convert Scanned Cart into Order)

## Overview

Customers can convert their scanned cart into an order.

This document specifies:
- the **customer checkout workflow**
- the **order summary** to display before payment
- the **exactly two payment options** to show
- a **payment abstraction design** for **Pay Online** (without integrating Razorpay/PhonePe yet)

This file is written to align with the existing customer cart and order creation flow described in:
- `docs/updates/CUSTOMER_PRODUCT_SCAN.md`

---

## Goals

1. Allow customers to review the cart and place an order.
2. Display an order summary containing:
   - products
   - quantity
   - subtotal
   - taxes
   - discounts
   - final amount
3. Offer **exactly two** payment options:
   1. **Pay at Shop**
   2. **Pay Online**
4. For now, **Pay Online** should:
   - create only a **provider-agnostic payment abstraction**
   - not call Razorpay / PhonePe
5. Design the payment flow so external providers can be added later without changing the checkout UX.

---

## Customer Workflow

### 1) Customer reviews cart
- Customer scans products into cart.
- Customer lands on cart review area (or cart sidebar during scanning).
- Customer can adjust quantities per cart rules already defined for scanning.

### 2) Customer clicks **Checkout**
- The frontend requests/derives the **order summary** for the current cart.
- The system validates cart readiness (e.g., inventory availability) and computes totals.

### 3) System creates an order summary (display)
Before the customer selects payment:
- Display a summary with the following breakdown fields:

#### Line Items (products)
For each cart item:
- `product` (name / sku)
- `quantity`
- `unit_price` (if available from cart)
- `line_total` (unit_price * quantity)

#### Totals
- `subtotal`
- `taxes`
- `discounts`
- `final_amount`

> Note: “taxes” and “discounts” are displayed even if they are `0.00` for now.

### 4) Customer chooses payment option
Show **exactly two** options:

1. **Pay at Shop**
   - Customer selection marks order payment as “pay on delivery / at shop”.
   - No online payment provider interaction.

2. **Pay Online**
   - System creates a **payment abstraction only** (provider-agnostic).
   - No Razorpay / PhonePe integration yet.
   - The UI proceeds to a confirmation state indicating payment is pending / created.

### 5) System creates the order (and payment abstraction if Pay Online)
- System finalizes cart into an order using the existing order system.
- If payment method is:
  - **Pay at Shop**: order is created with payment due at shop.
  - **Pay Online**: order + payment abstraction are created; provider step is deferred.

---

## Order Summary Display Contract

### Required fields (must be shown in this order UI)
1. Products (line items)
2. Quantity (per line item)
3. Subtotal
4. Taxes
5. Discounts
6. Final amount

### Example response shape (conceptual)
```json
{
  "items": [
    {
      "product_id": 123,
      "name": "Product Name",
      "sku": "PROD-123",
      "quantity": 2,
      "unit_price": 99.99,
      "line_total": 199.98
    }
  ],
  "subtotal": 199.98,
  "taxes": 0.00,
  "discounts": 0.00,
  "final_amount": 199.98
}
```

> Implementation may reuse existing cart totals logic already present in the customer cart endpoints.

---

## Payment Options (Exactly Two)

### Option A: Pay at Shop
- Value: `pay_at_shop`
- Behavior:
  - Create order with payment method = `pay_at_shop`
  - No payment abstraction required for external providers.
  - Order is ready for “at shop” payment flow.

### Option B: Pay Online
- Value: `pay_online`
- Behavior (current phase):
  - Create payment abstraction only
  - Do **not** integrate Razorpay or PhonePe
  - Mark payment as “provider pending/created” in a provider-agnostic way

---

## Payment Abstraction Design (Provider-Agnostic)

To enable future providers, the Pay Online flow must separate:
1. **Checkout UX + order creation**
2. **Payment intent abstraction**
3. **Provider adapter step** (added later)

### Payment abstraction states (conceptual)
- `PENDING` — payment requested, provider not created yet
- `ABSTRACTION_CREATED` — internal payment intent/record created successfully
- `PROVIDER_REQUIRES_REDIRECT` — later when provider integration exists
- `FAILED` — payment failed (provider-specific later)
- `SUCCEEDED` — payment completed (provider-specific later)

### Core fields for abstraction (conceptual)
- `payment_id` (internal)
- `order_id` (linked)
- `customer_id`
- `payment_method`: `pay_online`
- `amount`: equals `final_amount`
- `currency`: e.g. `INR`
- `status`: one of states above
- `provider`: initially `null` or `"not_selected"`
- `provider_reference`: initially `null` (provider-specific later)

### Adapter interface concept (for future integration)
Later, add provider adapters without changing checkout UI:
- `createProviderPayment(paymentAbstraction)`
- `handleCallback(providerPayload)`
- `mapProviderStatusToInternal(providerStatus)`

For now:
- Pay Online stops at creating the **payment abstraction**.

---

## Backend API Notes (Alignment with Existing Checkout)

The customer scanning doc describes an existing checkout endpoint:

- `POST /api/v1/customer-cart/checkout`

This Customer Checkout documentation constrains the frontend/backed behavior for this task:
- The `payment_method` values used must be limited to:
  - `pay_at_shop`
  - `pay_online`
- For `pay_online`, the backend must create the payment abstraction only.
- No Razorpay / PhonePe API calls should occur in this phase.

> If the current backend uses different enum strings (example in scan doc uses `credit`), update mapping internally to ensure checkout only exposes:
> - `pay_at_shop`
> - `pay_online`

---

## UX / Frontend Behavior Requirements

1. Checkout page MUST show the full order summary breakdown:
   - products, quantity, subtotal, taxes, discounts, final amount
2. Payment section MUST show exactly two choices:
   - Pay at Shop
   - Pay Online
3. On **Pay Online**, the system should:
   - create the payment abstraction
   - transition to confirmation UI (e.g., “Payment initialized” / “Payment pending”)
4. No redirect to Razorpay/PhonePe until those providers are integrated.

---

## Future Provider Extension Points

When adding providers later:
- Implement provider adapters:
  - Razorpay adapter
  - PhonePe adapter
- Update Pay Online flow from:
  - “create abstraction only” → “create provider payment and redirect/collect payment”
- Keep checkout UX unchanged:
  - payment options stay the same
  - provider selection can remain internal or be added as hidden config later

---

## Acceptance Criteria (This Phase)

- `docs/updates/CUSTOMER_CHECKOUT.md` exists with the workflow and constraints above.
- Checkout UX shows order summary fields:
  - products, quantity, subtotal, taxes, discounts, final amount
- Checkout shows exactly two payment options:
  - Pay at Shop
  - Pay Online
- Pay Online creates only payment abstraction:
  - no Razorpay
  - no PhonePe
- Payment system structure allows provider adapters to be added later.
