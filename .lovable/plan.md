# Enterprise RBAC Hardening

## Audit Findings

Your RBAC infrastructure is solid — `permissions` (74 rows), `role_permissions`, `user_roles`, `useUserPermissions` hook with `hasPermission()` / `hasAnyPermission()`. The gaps are enforcement, not design.

| # | Layer | Gap |
|---|---|---|
| 1 | Routes | `AdminLayout` accepts `requiredPermissions` but **no admin route in `AppRoutes.tsx` ever passes it.** Direct URL access bypasses the sidebar gate. |
| 2 | UI actions | `Categories.tsx` and `Products.tsx` show Edit/Delete/Create buttons with **no `hasPermission` checks** — only the sidebar hides the page link. |
| 3 | Permissions catalog | No `manage_categories` or `view_categories` permission exists. Categories piggy-backs on whoever can reach the sidebar item. |
| 4 | RLS — categories | Only `SELECT` policy exists. **No INSERT/UPDATE/DELETE policies** at all — current admin writes are silently denied (or only work for superuser). |
| 5 | RLS — store_applications | `Staff can manage applications` is `FOR ALL USING (is_staff())` — any staff role can approve, not just those with `review_store_applications`. |
| 6 | RLS — products | Generally good (already permission-scoped via `manage_products`), one stale policy `Team members can create products` worth reviewing. |

## Plan

### Step 1 — Centralize permission gating helpers (1 file)

Add a small `<PermissionGate>` and `useRequirePermission()` to `src/hooks/useUserPermissions.tsx` so callers don't repeat the pattern:

- `<PermissionGate permission="manage_products" fallback={null}>...</PermissionGate>`
- `useRequirePermission('manage_categories')` — used by pages to redirect or show a "Not authorised" panel.

No new dependencies, no new system — thin wrappers over existing `hasPermission`.

### Step 2 — Wire route-level guards (`AppRoutes.tsx`)

Each admin page already wraps itself in `<AdminLayout>`, so the cleanest non-invasive fix is to **pass `requiredPermissions` from inside each affected page**, not from the routes file. Touch these pages only:

```text
Products.tsx          -> requiredPermissions={['manage_products','view_products']}
SellerProductsAll.tsx -> requiredPermissions={['view_products','manage_seller_stores']}
SellerProductReview.tsx -> requiredPermissions={['manage_products']}
Categories.tsx        -> requiredPermissions={['manage_categories']}
StoreApplications.tsx -> requiredPermissions={['review_store_applications']}
ModerationQueue.tsx   -> requiredPermissions={['view_seller_stores']}  // already gated in sidebar; mirror it
DeveloperSubmissions.tsx -> requiredPermissions={['manage_developer_submissions']}
```

`AdminLayout` already renders an "Insufficient permissions" screen when the check fails, so no UI work needed.

### Step 3 — Gate destructive UI actions

Wrap Delete/Edit/Create buttons in `Categories.tsx` and `Products.tsx` with `<PermissionGate>` (or hide via `hasPermission`). Show read-only view when the user only has `view_*`.

### Step 4 — Add missing permission rows + assign to roles (migration)

```sql
INSERT INTO permissions (name, description) VALUES
  ('manage_categories', 'Create, edit, reorder, and delete marketplace categories'),
  ('view_categories',   'View the categories admin page')
ON CONFLICT (name) DO NOTHING;

-- Assign to existing roles using current convention
INSERT INTO role_permissions (role, permission_id)
SELECT r.role, p.id
FROM (VALUES ('admin'::app_role), ('lead_administrator'::app_role)) AS r(role)
CROSS JOIN permissions p
WHERE p.name IN ('manage_categories','view_categories')
ON CONFLICT DO NOTHING;
```

### Step 5 — RLS hardening (migration)

**Categories** — add the missing write policies, scoped to `manage_categories`:

```sql
CREATE POLICY "Staff with manage_categories can insert"
  ON categories FOR INSERT TO authenticated
  WITH CHECK (has_permission(auth.uid(), 'manage_categories'));

CREATE POLICY "Staff with manage_categories can update"
  ON categories FOR UPDATE TO authenticated
  USING (has_permission(auth.uid(), 'manage_categories'))
  WITH CHECK (has_permission(auth.uid(), 'manage_categories'));

CREATE POLICY "Staff with manage_categories can delete"
  ON categories FOR DELETE TO authenticated
  USING (has_permission(auth.uid(), 'manage_categories'));
```

**store_applications** — replace the broad `Staff can manage applications` with permission-scoped policies for `UPDATE` (approval) and `DELETE`:

```sql
DROP POLICY "Staff can manage applications" ON store_applications;

CREATE POLICY "Reviewers can update applications"
  ON store_applications FOR UPDATE TO authenticated
  USING (has_permission(auth.uid(), 'review_store_applications'))
  WITH CHECK (has_permission(auth.uid(), 'review_store_applications'));

CREATE POLICY "Reviewers can delete applications"
  ON store_applications FOR DELETE TO authenticated
  USING (has_permission(auth.uid(), 'review_store_applications'));
```

(`SELECT` and `INSERT` policies for staff/users already exist and stay.)

**Products** — leave existing policies; verify `has_permission(auth.uid(),'manage_products')` is the gate on the moderator UPDATE policy.

`has_permission(uuid, text)` is assumed to exist (consistent with `has_role`). If not, the migration creates it as `SECURITY DEFINER` to avoid recursive RLS.

### Step 6 — Verify

1. Run `tsc --noEmit -p tsconfig.app.json` — must pass.
2. Run `supabase--linter` — must show no new errors.
3. Smoke test in preview: log in as admin → Categories CRUD works; log in as a role without `manage_categories` → page shows "Insufficient permissions"; sidebar item hidden.

## Out of Scope

- No new admin pages, no role redesign, no UI direction changes.
- `Recruiter` role stays purged (Core rule).
- No changes to `useUserPermissions` data-fetching strategy — purely additive helpers.
- No changes to staff-only payouts, audit logs, or financial RLS (already isolated).

## Risk

Low. Step 5's migration is the only blast-radius change — replacing one over-broad `store_applications` policy. If the new permission-scoped policy is misconfigured, only `review_store_applications` holders are affected (currently `admin` + `lead_administrator`). Categories writes are currently broken for everyone non-superuser, so adding policies is strictly additive.
