# Vision Gap Analysis - KhataBox

## Document Purpose
This document compares the current KhataBox implementation against the original product vision defined in `docs/PRD.md`. Features are classified as: **✅ Implemented**, **⚠️ Partial**, **❌ Missing**, or **🛠️ Technical Debt**.

---

## 1. Authentication & Authorization

### Current State
| Feature | Status | Notes |
|---------|--------|-------|
| JWT Authentication | ✅ Implemented | `backend/app/auth.py` - Token-based auth |
| Password Hashing | ✅ Implemented | bcrypt via python-jose |
| Role-Based Access Control | ⚠️ Partial | Basic role checks exist, needs hardening |
| Refresh Token Rotation | ❌ Missing | Backend supports, frontend not wired |
| Session Management | ⚠️ Partial | Token stored locally, no refresh UI |
| Password Reset Flow | ❌ Missing | Not implemented |

**Gap:** Frontend doesn't implement automatic token refresh despite backend supporting it.

---

## 2. Inventory Management

### Current State
| Feature | Status | Notes |
|---------|--------|-------|
| Product CRUD | ✅ Implemented | `api/v1/products.py` |
| SKU/Category/Brand | ✅ Implemented | All fields in Product model |
| Cost/Selling Price | ✅ Implemented | With margin calculation |
| Stock Quantity Tracking | ✅ Implemented | `available_quantity` field |
| Reorder Threshold | ✅ Implemented | Triggers low-stock alerts |
| Multi-Store Inventory | ⚠️ Partial | Model supports, no explicit store filter in APIs |
| Inventory Movements | ❌ Missing | No audit trail for stock changes |
| Expiry Tracking | ⚠️ Partial | Fields exist (batch, mfg_date, expiry_date) but not used |
| Bulk Import/Export | ⚠️ Partial | CSV export exists, import not implemented |
| QR Code Label Generation | ✅ Implemented | `api/v1/qrcodes.py` - Batch labels |

**Gap:** No inventory movement history, no bulk product import UI.

---

## 3. Billing & Orders

### Current State
| Feature | Status | Notes |
|---------|--------|-------|
| Billing Page | ✅ Implemented | `(dashboard)/billing/page.tsx` |
| Cart Management | ✅ Implemented | `store/cart.ts` (shopkeeper) |
| QR Code Scanning | ⚠️ Partial | Legacy endpoint exists but page uses SKU search |
| Invoice Generation | ✅ Implemented | Auto-generated on order completion |
| GST Calculation | ✅ Implemented | Tax breakdown in receipts |
| Discount Handling | ❌ Missing | Not in current order flow |
| Order Status Workflow | ✅ Implemented | pending → confirmed → processing → completed → cancelled |
| Payment Mode Tracking | ⚠️ Partial | Field exists, UI selection incomplete |
| Receipts | ✅ Implemented | Auto-generated PDF |

**Gap:** Billing page uses product search by SKU/name instead of actual QR code scanning.

---

## 4. Customer Cart & Orders

### Current State
| Feature | Status | Notes |
|---------|--------|-------|
| Customer Cart Models | ⚠️ Partial | Model exists (`customer_cart.py`), API NOT wired |
| Customer Cart Schemas | ⚠️ Partial | Schemas exist, no API endpoints |
| Customer Catalog | ✅ Implemented | `(dashboard)/catalog/page.tsx` |
| Bulk Orders | ✅ Implemented | With credit limit checking |
| Customer Order History | ✅ Implemented | Via customer orders endpoint |

**Gap:** CustomerCart model exists but has no API router - never wired to frontend.

---

## 5. QR Code System

### Current State
| Feature | Status | Notes |
|---------|--------|-------|
| Permanent QR Identity | ✅ Implemented | `product_uuid` (UUID string) |
| QR Generation | ✅ Implemented | Batch label printing |
| QR Scanning (Legacy) | ⚠️ Partial | Endpoint exists, limited usage |
| Customer QR Scan UI | ❌ Missing | No customer-facing scanning page |

**Gap:** Customer-facing QR scanning never implemented despite model readiness.

---

## 6. AI Demand Forecasting

### Current State
| Feature | Status | Notes |
|---------|--------|-------|
| ML Algorithm | ✅ Implemented | Random Forest in `ml/forecast.py` |
| Prediction Model | ✅ Implemented | Trained model exists (R²=0.862) |
| Forecast Dashboard | ⚠️ Partial | Page exists, uses mock data |
| Weekly Predictions | ❌ Missing | Not integrated with real sales data |
| Restock Recommendations | ❌ Missing | Not calculated |
| Confidence Scores | ❌ Missing | Not displayed |

**Gap:** Forecasting page uses hardcoded mock data, not real API integration.

---

## 7. Supplier Management

### Current State
| Feature | Status | Notes |
|---------|--------|-------|
| Supplier CRUD | ✅ Implemented | `api/v1/suppliers.py` |
| Purchase Orders | ✅ Implemented | `api/v1/purchase_orders.py` |
| PO Status Tracking | ✅ Implemented | pending → confirmed → received |
| Supplier Price Analysis | ❌ Missing | Not calculated |

**Gap:** No supplier-wise price comparison feature.

---

## 8. Reports & Analytics

### Current State
| Feature | Status | Notes |
|---------|--------|-------|
| Sales Reports | ✅ Implemented | Daily/weekly/monthly |
| Inventory Reports | ⚠️ Partial | Basic valuation, no turnover |
| Customer Reports | ❌ Missing | Top customers, LTV not implemented |
| Product Reports | ⚠️ Partial | Basic top products |
| Export (CSV/PDF) | ✅ Implemented | CSV export |

**Gap:** Limited analytics, no visual charts in dashboard.

---

## 9. Notifications

### Current State
| Feature | Status | Notes |
|---------|--------|-------|
| Low Stock Alerts | ⚠️ Partial | Database query exists, no push |
| Expiry Alerts | ❌ Missing | Not implemented |
| Payment Reminders | ❌ Missing | Not implemented |
| AI Recommendations | ❌ Missing | Not displayed |

**Gap:** No notification system - all alerts are pull-only.

---

## 10. Customer-Facing Features

### Current State
| Feature | Status | Notes |
|---------|--------|-------|
| Customer Login/Register | ✅ Implemented | Customer auth, B2B portal |
| Product Catalog | ✅ Implemented | Browse by category |
| Order Placement | ✅ Implemented | Bulk orders |
| Order History | ✅ Implemented | View past orders |
| Invoice Download | ⚠️ Partial | Can view, download not complete |

**Gap:** No customer QR scanning app, no self-service portal.

---

## 11. UI/UX Patterns

### Current State
| Feature | Status | Notes |
|---------|--------|-------|
| Loading States | ⚠️ Partial | Some spinners, not consistent |
| Error Boundaries | ❌ Missing | No React error boundaries |
| Form Validation | ⚠️ Partial | Basic, not comprehensive |
| Toast Notifications | ❌ Missing | No unified toast system |
| TanStack Query | ⚠️ Partial | Wired in providers, unused |

**Gap:** Inconsistent UX patterns, no error handling infrastructure.

---

## Technical Debt Summary

| Issue | Severity | Location |
|------|----------|----------|
| CustomerCart API not wired | High | `backend/app/api/v1/` - missing router |
| Billing uses SKU search not QR | Medium | `billing/page.tsx` |
| Forecasting mock data | High | `forecasting/page.tsx` |
| No token refresh UI | Medium | Frontend auth flow |
| Multi-store filtering | Low | Product/Order APIs |
| No inventory movements | Medium | Database |
| Export not comprehensive | Low | Reports |

---

## Priority Recommendations

### Phase 1 - Core Fixes (Before Feature Work)
1. Wire CustomerCart API endpoint
2. Fix billing page to use QR scanning
3. Integrate real forecasting data
4. Add JWT refresh to frontend

### Phase 2 - Missing Core Features
5. Inventory movement tracking
6. Error boundaries and loading states
7. Supplier price analysis

### Phase 3 - Enhancement
8. Customer QR scanning app
9. Notification system
10. Advanced reports

### Phase 4 - Future
11. Mobile app
12. WhatsApp ordering
13. AI chat assistant