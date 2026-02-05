

# Developer Product Submissions & Payment Records Dashboard

## Overview

This plan creates two new admin pages:
1. **Developer Product Submissions** - Where internal developers can upload products requiring admin approval
2. **Developer Payments** - Admin-only ledger to track payments owed and paid to developers

---

## Security Model

### Developer Submissions
- Viewable by staff with `manage_developer_submissions` permission
- Admins can approve/reject submissions

### Developer Payments (Admin-Only)
- **Strictly restricted to admin role only** - no separate permission
- Uses `requiredRoles={['admin']}` in AdminLayout
- Similar security model to the Income page
- RLS policies restrict all operations to admin role

---

## Database Changes

Two new tables will be created:

### 1. `developer_product_submissions`
```text
┌─────────────────────────────────────────────────────────┐
│ developer_product_submissions                            │
├─────────────────────────────────────────────────────────┤
│ id (uuid, PK)                                           │
│ developer_id (uuid, FK → profiles.user_id)              │
│ product_name (text)                                      │
│ product_description (text)                               │
│ category_id (uuid, FK → categories.id)                  │
│ price (numeric)                                          │
│ files (jsonb) - uploaded file references                │
│ status (pending/approved/rejected/revision_requested)   │
│ reviewer_id (uuid, FK → profiles.user_id, nullable)     │
│ reviewer_notes (text, nullable)                          │
│ approved_product_id (uuid, FK → products.id, nullable)  │
│ created_at, updated_at                                   │
└─────────────────────────────────────────────────────────┘
```

### 2. `developer_payments` (Admin-Only Access)
```text
┌─────────────────────────────────────────────────────────┐
│ developer_payments                                       │
├─────────────────────────────────────────────────────────┤
│ id (uuid, PK)                                           │
│ developer_id (uuid, FK → profiles.user_id)              │
│ amount (numeric)                                         │
│ currency (text, default 'GBP')                          │
│ payment_type (salary/commission/bonus/freelance/other)  │
│ status (pending/processing/completed/failed/cancelled)  │
│ due_date (date, nullable)                                │
│ paid_date (date, nullable)                               │
│ payment_method (text, nullable)                          │
│ payment_reference (text, nullable)                       │
│ notes (text, nullable)                                   │
│ created_by (uuid, FK → profiles.user_id)                │
│ created_at, updated_at                                   │
└─────────────────────────────────────────────────────────┘
```

### RLS Policies

**developer_product_submissions:**
- Staff can SELECT all submissions
- Staff can INSERT their own submissions
- Admins can UPDATE (for approval/rejection)

**developer_payments (Admin-Only):**
- Only users with `admin` role can SELECT, INSERT, UPDATE, DELETE
- No other roles can access this table

---

## New Permissions

Only one new permission needed:
- `manage_developer_submissions` (category: team)

Developer payments does NOT get a permission - it's hardcoded to admin-only for maximum security.

---

## New Admin Pages

### 1. Developer Submissions (`/admin/developer-submissions`)

**Features:**
- Grid of submission cards showing status, developer, date
- "Submit New Product" form for developers
- Review workflow for admins (approve/reject/request revision)
- Status filtering tabs: All, Pending, Approved, Rejected

### 2. Developer Payments (`/admin/developer-payments`)

**Features:**
- Summary cards: Total Owed, Pending Count, Paid This Month
- Tabbed table: Due, Processing, Completed, All
- "Add Payment" form dialog
- "Mark as Paid" workflow with reference input
- Filter by developer and date range

**Access Control:**
```tsx
<AdminLayout requiredRoles={['admin']}>
  {/* Only admins can see this page */}
</AdminLayout>
```

---

## Navigation Updates

**AdminSidebar.tsx:**
- "Developer Submissions" under Store section (visible to staff with permission)
- "Developer Payments" under Daily Operations (visible to admins only)

---

## File Changes Summary

### New Files
1. `src/pages/admin/DeveloperSubmissions.tsx`
2. `src/pages/admin/DeveloperPayments.tsx`

### Modified Files
1. `src/components/admin/AdminSidebar.tsx` - Add navigation links
2. `src/App.tsx` - Add routes
3. Database migration for tables + RLS + permission

