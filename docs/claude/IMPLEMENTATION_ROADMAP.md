# Implementation Roadmap - KhataBox

## Overview
Phased implementation plan to achieve the full product vision. Each phase builds on the previous. Timeline estimates are based on moderate development velocity.

---

## Phase 1: Foundation & Core Fixes

**Objective:** Fix broken or missing core infrastructure before adding features.

### 1.1 CustomerCart API Wiring
- [ ] Create `backend/app/api/v1/customer_cart.py` router
- [ ] Wire endpoints: GET cart, POST items, PUT item quantity, DELETE item, POST checkout
- [ ] Add cart creation on first item add
- [ ] Connect to existing OrderCreate flow
- [ ] Test: Verify customer can add items and checkout

### 1.2 Frontend Token Refresh
- [ ] Implement `useAuthStore` token refresh logic
- [ ] Add token storage with expiry timestamp
- [ ] Add interceptor for automatic refresh
- [ ] Test: Verify session persists across refresh

### 1.3 Loading & Error States
- [ ] Add React error boundaries at route level
- [ ] Create consistent loading spinner components
- [ ] Add TanStack Query to all data fetching
- [ ] Test: Verify graceful error handling

### 1.4 RBAC Hardening
- [ ] Add customer-scoped queries (filter by `customer.id`)
- [ ] Add shopkeeper-scoped queries (filter by `shopkeeper_id`)
- [ ] Add admin-only endpoints verification
- [ ] Test: Verify unauthorized access blocked

**Duration:** 2-3 weeks
**Risk:** Medium - modifies existing flows

---

## Phase 2: QR Commerce Platform

**Objective:** Enable true QR-first operations for shopkeepers and customers.

### 2.1 Billing QR Integration
- [ ] Replace SKU search with QR scanner in billing page
- [ ] Use `html5-qrcode` library (already installed)
- [ ] Add "Start Camera" button with permission handling
- [ ] Fallback manual entry for devices without camera
- [ ] Test: Scan product, verify product loads

### 2.2 Customer Scanning App
- [ ] Create `(dashboard)/customers/scan/page.tsx`
- [ ] Full-screen camera interface
- [ ] Product lookup via product_uuid
- [ ] Quantity selector UI
- [ ] Add to cart flow
- [ ] Test: Customer scans, adds to cart, checks out

### 2.3 QR Label Optimization
- [ ] Add product image to label design
- [ ] Add batch printing with progress
- [ ] Add SKU/barcode hybrid option
- [ ] Test: Print and scan multiple labels

**Duration:** 2-3 weeks
**Risk:** Low - new features, no existing changes

---

## Phase 3: Real Data Integration

**Objective:** Connect forecasting and reports to real data.

### 3.1 Forecasting Real Data
- [ ] Create sales data aggregation endpoint
- [ ] Feed historical sales to ML model
- [ ] Display predictions on dashboard
- [ ] Calculate confidence scores
- [ ] Generate restock recommendations
- [ ] Test: Verify predictions align with sales

### 3.2 Inventory Movement Tracking
- [ ] Add `InventoryMovement` model
- [ ] Track: order placed (reserve), order completed (consume), order cancelled (restore), stock received
- [ ] Create movement history API
- [ ] Display in inventory view
- [ ] Test: Verify movement history accurate

### 3.3 Enhanced Reports
- [ ] Inventory turnover calculation
- [ ] Top customers by revenue
- [ ] Customer lifetime value calculation
- [ ] Product velocity analysis
- [ ] Test: Verify report accuracy

**Duration:** 2-3 weeks
**Risk:** Medium - requires model additions

---

## Phase 4: Customer Experience

**Objective:** Complete B2C/B2B customer experience.

### 4.1 Customer Self-Service
- [ ] Customer dashboard with order summary
- [ ] Invoice download (PDF generation)
- [ ] Order tracking status view
- [ ] Credit limit display
- [ ] Test: Customer manages orders independently

### 4.2 Customer Notifications
- [ ] In-app notification center
- [ ] Order status change alerts
- [ ] Low stock (when out of ordered item)
- [ ] Payment due reminders
- [ ] Test: Customer receives notifications

### 4.3 Supplier Portal
- [ ] Supplier login access
- [ ] View assigned purchase orders
- [ ] Confirm/reject PO
- [ ] Delivery tracking
- [ ] Test: Supplier manages orders

**Duration:** 2-3 weeks
**Risk:** Medium - new user flows

---

## Phase 5: Operational Excellence

**Objective:** Production hardening and operational features.

### 5.1 Bulk Operations
- [ ] CSV product import with validation
- [ ] Bulk product update
- [ ] Bulk order creation
- [ ] Test: Import 100+ products successfully

### 5.2 Expiry Management
- [ ] Expiry alert thresholds (90/60/30 days)
- [ ] Dashboard widget for expiring stock
- [ ] Auto-suggestion for near-expiry items
- [ ] Test: Alerts trigger at correct thresholds

### 5.3 Multi-Store
- [ ] Store switcher in header
- [ ] Stock transfer between stores
- [ ] Consolidated reporting
- [ ] Test: Transfer stock between stores

**Duration:** 2-3 weeks
**Risk:** Low - isolated features

---

## Phase 6: Advanced Features

**Objective:** Next-level capabilities per vision.

### 6.1 Supplier Price Analysis
- [ ] Supplier-wise price comparison
- [ ] Price trend charts
- [ ] Recommendation engine
- [ ] Test: Verify accurate comparisons

### 6.2 Advanced Analytics
- [ ] Interactive dashboard charts
- [ ] Date range selector
- [ ] Export to PDF
- [ ] Test: Charts render correctly

### 6.3 AI Recommendations
- [ ] Restocking alert based on forecasting
- [ ] Price optimization hints
- [ ] Customer behavior insights
- [ ] Test: Recommendations are actionable

**Duration:** 3-4 weeks
**Risk:** High - complex calculations

---

## Implementation Sequence

```
Phase 1 (Weeks 1-3)
├── 1.1 CustomerCart API
├── 1.2 Token Refresh
├── 1.3 Loading/Error States
└── 1.4 RBAC Hardening

Phase 2 (Weeks 4-6)
├── 2.1 Billing QR
├── 2.2 Customer Scan App
└── 2.3 QR Labels

Phase 3 (Weeks 7-9)
├── 3.1 Forecasting Real Data
├── 3.2 Inventory Movements
└── 3.3 Enhanced Reports

Phase 4 (Weeks 10-12)
├── 4.1 Customer Self-Service
├── 4.2 Notifications
└── 4.3 Supplier Portal

Phase 5 (Weeks 13-15)
├── 5.1 Bulk Operations
├── 5.2 Expiry Management
└── 5.3 Multi-Store

Phase 6 (Weeks 16-20)
├── 6.1 Supplier Price Analysis
├── 6.2 Advanced Analytics
└── 6.3 AI Recommendations
```

---

## Dependency Map

| Feature | Depends On |
|---------|------------|
| Customer Scanning | 1.1 CustomerCart API |
| QR Billing | 2.1 Token Refresh (for auth) |
| Forecasting Real Data | 3.2 Inventory Movements |
| Customer Notifications | 4.1 Customer Self-Service |
| Customer LTV Reports | 4.1 Customer Self-Service |

---

## Success Criteria

Each phase is complete when:
1. All items have passing tests
2. No regression in existing features
3. Documentation updated
4. User feedback incorporated

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| CustomerCart breaking existing orders | Test extensively, use feature flag |
| Forecasting inaccurate | Start with simple model, iterate |
| Multi-store complexity | Start single-store, add later |
| AI recommendations wrong | Human review of suggestions |

---

## Resources Required

- 1 Full-stack developer (4-6 months)
- 1 Backend/ML developer (2 months for Phase 3, 6)
- 1 QA engineer (part-time)
- Design support (Phase 2, 4)