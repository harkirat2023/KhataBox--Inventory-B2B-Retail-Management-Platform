# QR Commerce Plan - KhataBox

## Vision Alignment
Per PRD Section 5 ("Billing - Scan Product, Auto Fetch Product, Add To Cart, Generate Bill"), QR commerce is central to the KhataBox experience.

---

## Current State

### What's Implemented
| Component | Status | Location |
|-----------|--------|----------|
| product_uuid field | ✅ Complete | `product.py` model |
| QR API endpoints | ✅ Complete | `qrcodes.py` |
| QR label printing | ✅ Complete | Batch labels |
| Billing page | ⚠️ Search only | Uses SKU search |

### What's Missing
- Real-time QR scanning in billing
- Customer-facing scanning app
- Integration with inventory updates

---

## QR Identity System

### Design Principle
QR codes encode `product_uuid` - a permanent UUID that doesn't change when price or stock changes. This allows:
- Pre-printed labels on shelves
- No label replacement when prices change
- Permanent shelf identity

### UUID Encoding
```
product_uuid format: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
QR payload: product_uuid string (not the integer ID)
```

---

## User Journeys

### Shopkeeper Billing Journey

**Current (Broken):**
1. Open Billing page
2. Type SKU or product name in search
3. Select product from dropdown
4. Add to cart
5. Generate bill

**Target (QR-First):**
1. Open Billing page
2. Tap "Start Camera"
3. Scan product on shelf
4. Product auto-loaded
5. Adjust quantity
6. Add to cart
7. Continue scanning (stay in camera mode)
8. Generate bill

### Customer Self-Service Journey

**Target:**
1. Log in as Customer
2. Navigate to "Scan Products"
3. Scan shelf QR code
4. View product details + price
5. Select quantity
6. Add to cart (customer-specific cart)
7. Continue scanning
8. View cart
9. Checkout
10. Order confirmation

---

## Technical Implementation

### Frontend Scanner Integration

**Library:** `html5-qrcode` (already in `package.json`)

**Configuration:**
```typescript
// Scanner config
{
  fps: 10,
  qrbox: { width: 250, height: 250 },
  aspectRatio: 1.0,
}
```

**Required Component Features:**
- Camera permission handling
- Graceful fallback for no camera
- Torch/flash toggle (if available)
- Manual UUID entry fallback
- Sound feedback on scan (optional)

### API Flow

```
[Scan QR Code]
    ↓
Decode product_uuid
    ↓
GET /api/v1/products/by-uuid/{product_uuid}
    ↓
Return: { id, name, sku, price, stock, ... }
    ↓
[Add to Cart]
```

### Cart Integration

**Shopkeeper Cart:** Uses `useCartStore` (current)
**Customer Cart:** New `useCustomerCartStore` (to be created)

Both carts persist to localStorage with role-specific keys.

---

## Inventory Synchronization

### Real-Time Stock Display
On scan, display:
- Current stock level
- "Low Stock" warning if ≤ reorder threshold
- "Out of Stock" if unavailable

### Inventory Locking (Optional)
When item in cart, optionally reserve quantity:
- Update `reserve_quantity` field
- Release on checkout or cart expiry (15 min)

---

## UI/UX Specifications

### Billing Page Layout

```
┌─────────────────────────────────────┐
│  [Scan QR]  │  Search by SKU    │ ← Toggle
├─────────────────────────────────────┤
│                                     │
│     ┌─────────────────────┐        │
│     │                     │        │
│     │   [Camera View]    │        │ ← Hidden when searching
│     │                     │        │
│     └─────────────────────┘        │
│                                     │
├─────────────────────────────────────┤
│  Last Scanned:                        │
│  ┌────────────────────────────────┐ │
│  │ Product Name          $99.00   │ │
│  │ SKU: ABC123           Stock: 5  │ │
│  │ [-] 1 [+]  [ADD TO CART]      │ │
│  └────────────────────────────────┘ │
├─────────────────────────────────────┤
│  Cart Total: $297.00 (3 items)       │
│  [VIEW CART] [GENERATE BILL]         │
└─────────────────────────────────────┘
```

### Customer Scan Page Layout

```
┌─────────────────────────────────────┐
│  ← Back    Scan Products             │
├─────────────────────────────────────┤
│                                     │
│     ┌─────────────────────┐        │
│     │                     │        │
│     │   [Camera View]    │        │
│     │                     │        │
│     └─────────────────────┘        │
│                                     │
│     [Enter UUID Manually]            │
│                                     │
├─────────────────────────────────────┤
│  Your Cart: $150.00 (2 items)       │
│  [VIEW CART]                       │
└─────────────────────────────────────┘
```

---

## Implementation Steps

### Step 1: Scanner Component
- [ ] Create `components/ui/qr-scanner.tsx`
- [ ] Handle camera permissions
- [ ] Implement QR decoding
- [ ] Add manual fallback

### Step 2: Billing Integration
- [ ] Add toggle between search/QR
- [ ] Replace search with scanner
- [ ] Pass scanned product to cart
- [ ] Test end-to-end flow

### Step 3: Customer Scan Page
- [ ] Create new route
- [ ] Connect to CustomerCart API
- [ ] Implement checkout flow
- [ ] Test customer journey

---

## QR Label Specifications

### Label Content
```
┌────────────────────┐
│  [Product Image]  │
│     (40x40)       │
├────────────────────┤
│  Product Name     │
│  SKU: ABC123      │
│  Price: ₹99.00    │
│                   │
│  ┌──────────────┐ │
│  │              │ │
│  │   [QR CODE] │ │
│  │              │ │
│  └──────────────┘ │
└────────────────────┘
```

### Print Options
- **Sheet labels:** 3x7 grid on A4
- **Single label:** Roll printer compatible
- **Batch generation:** 100+ labels with progress

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Scan to bill time | < 30 seconds |
| Label scan success rate | > 95% |
| Camera permission grant | > 80% |
| Cart abandonment | < 20% |

---

## Testing Plan

### Scanner Tests
- [ ] Multiple device cameras (iOS Safari, Android Chrome, Desktop)
- [ ] Various lighting conditions
- [ ] Print quality variations
- [ ] Offline handling

### Integration Tests
- [ ] Scan → Product load → Add to cart
- [ ] Cart → Checkout → Order creation
- [ ] Inventory sync on completion

---

## Fallback Strategy

### No Camera Access
1. Show manual UUID input field
2. Provide "Enter SKU" alternative
3. Allow barcode (Code128) as fallback

### Offline Mode
1. Cache product catalog in IndexedDB
2. Queue cart updates
3. Sync when online

---

## Security Considerations

### QR Code tampering
- Product UUID is hard to guess (UUID v4)
- Verify product exists before adding
- Alert if product marked inactive

### Cart hijacking
- Persist cart per session/device
- Attach to authenticated user
- Re-validate stock on checkout