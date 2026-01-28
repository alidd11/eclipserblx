

# Roblox-Style Role Permission System

## Overview

This plan redesigns the Role Permissions page to match Roblox's intuitive permission management interface, making it easier for admins to navigate and customize role permissions.

## Current State Analysis

The existing system has:
- **55 permissions** across 2 categories (actions, pages)
- A working toggle system for enabling/disabling permissions per role
- Role hierarchy with custom roles support

## Proposed Changes

### 1. Reorganize Permission Categories

Replace the current 2-category system with more intuitive Roblox-style categories:

| New Category | Icon | Includes |
|-------------|------|----------|
| **Dashboard** | LayoutDashboard | view_dashboard, view_analytics, view_income, view_audit_logs |
| **Store** | Package | view_products, manage_products, view_orders, manage_orders, view_reviews, manage_reviews, view_discounts, manage_discounts |
| **Users** | Users | view_users, manage_users, delete_users, view_ip_bans, manage_ip_bans, view_subscribers, manage_subscriptions |
| **Marketplace** | Store | view_seller_stores, manage_seller_stores, view_store_applications, review_store_applications, view_seller_payouts, process_payouts, view_seller_tickets, manage_seller_tickets |
| **Communications** | MessageCircle | view_live_chat, respond_to_chat, view_contact_messages, respond_to_contacts, view_forum_reports, manage_forum_reports |
| **Team** | Shield | view_staff_directory, view_staff_activity, manage_staff, view_applications, review_applications, view_job_channels, manage_job_channels |
| **Affiliates** | Gift | view_affiliates, manage_affiliates, view_affiliate_applications, review_affiliate_applications, view_referrals, manage_referrals |
| **System** | Settings | view_settings, manage_settings, view_permissions, manage_permissions, view_incidents, manage_incidents, view_bot_codes, manage_bot_codes, manage_user_roles |

### 2. New UI Design

Create a cleaner, Roblox-inspired interface with:

```text
┌─────────────────────────────────────────────────────────────────┐
│  Role Permissions                                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐   │
│  │  Admin  │ │ Product │ │  Order  │ │ Support │ │ Analyst │   │
│  │   🔒    │ │ Manager │ │ Manager │ │  Agent  │ │         │   │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘   │
│       ▲                                                         │
│       │ Selected                                                │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ 📊 Dashboard                                           ▼   ││
│  ├─────────────────────────────────────────────────────────────┤│
│  │ ☑️ View Dashboard        Access the admin dashboard         ││
│  │ ☑️ View Analytics        Access analytics page              ││
│  │ ☐ View Income            Access income/revenue page         ││
│  │ ☑️ View Audit Logs       Access audit logs                  ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ 📦 Store                                               ▼   ││
│  ├─────────────────────────────────────────────────────────────┤│
│  │ ☑️ View Products         Access products list               ││
│  │ ☑️ Manage Products       Create, edit, delete products      ││
│  │ ...                                                         ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 3. Key UI Features

**Role Selection Bar**
- Horizontal scrollable role cards with icons and colors
- Shows permission count per role
- Lock icon for admin (non-editable)
- Quick hierarchy level indicator

**Category Accordion**
- Collapsible sections for each permission category
- Category icon and name as header
- Permission count badge (enabled/total)
- Expand/collapse all button

**Permission Toggles**
- Clean checkbox or switch for each permission
- Permission name (human-readable)
- Description on hover or below
- Visual feedback when enabled (highlighted row)

**Quick Actions**
- "Select All" / "Deselect All" per category
- Copy permissions from another role
- Preset templates (e.g., "Support Template", "Manager Template")

### 4. Database Migration

Update the `permissions` table to use the new category structure:

```sql
-- Update permission categories for better organization
UPDATE public.permissions SET category = 'dashboard' WHERE name IN ('view_dashboard', 'view_analytics', 'view_income', 'view_audit_logs');
UPDATE public.permissions SET category = 'store' WHERE name IN ('view_products', 'manage_products', 'view_orders', 'manage_orders', 'view_reviews', 'manage_reviews', 'view_discounts', 'manage_discounts');
-- ... (continue for all categories)
```

### 5. Implementation Files

| File | Changes |
|------|---------|
| `src/pages/admin/RolePermissions.tsx` | Complete redesign with new UI |
| `src/components/admin/PermissionCategory.tsx` | New component for collapsible category sections |
| `src/components/admin/RoleSelector.tsx` | New component for role selection bar |
| `supabase/migrations/...` | Update permission categories in database |

---

## Technical Details

### New Permission Categories Mapping

```typescript
const PERMISSION_CATEGORIES = {
  dashboard: {
    label: 'Dashboard & Analytics',
    icon: LayoutDashboard,
    permissions: ['view_dashboard', 'view_analytics', 'view_income', 'view_audit_logs']
  },
  store: {
    label: 'Store Management',
    icon: Package,
    permissions: ['view_products', 'manage_products', 'view_orders', 'manage_orders', ...]
  },
  // ... more categories
};
```

### Accessibility Considerations

- All toggles keyboard navigable
- Clear focus indicators
- ARIA labels for screen readers
- High contrast for enabled/disabled states

### Mobile Optimization

- Role selector becomes horizontal scroll on mobile
- Categories stack vertically
- Touch-friendly toggle targets (44px minimum)
- Mobile dropdown for role selection on small screens

---

## Summary

This redesign transforms the permission management into a more intuitive, Roblox-inspired interface that:

1. **Organizes permissions logically** into 8 intuitive categories
2. **Simplifies navigation** with collapsible sections
3. **Improves visual feedback** with clear enabled/disabled states
4. **Maintains hierarchy enforcement** from the existing system
5. **Works great on mobile** with responsive design

