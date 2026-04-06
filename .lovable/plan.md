

# Deep Security Hardening — Permanent Fixes

## Scan Results Summary
The security scan surfaced **16 findings**: 3 critical (error), 12 warnings, 1 info. Several previous findings are already resolved/ignored. This plan addresses every actionable item.

---

## Critical Fixes (3 errors)

### 1. Store credentials — bot tokens readable by admins
**Problem**: `store_credentials` table stores Discord bot tokens and Cloudflare API tokens in plaintext, readable by any admin/lead_administrator.
**Fix**: Use Column-Level Security via a security-invoker view. Create `store_credentials_safe` view that masks `discord_bot_token` and `cloudflare_api_token` (shows only last 4 chars). Update the admin SELECT policy to use `has_permission(auth.uid(), 'manage_seller_stores')` instead of broad admin check. Frontend seller-facing code already only reads non-sensitive columns — no client changes needed.

### 2. Store payment details — bank numbers in plaintext
**Problem**: `store_payment_details` exposes `bank_account_number`, `bank_routing_number`, `bank_swift_bic` to staff with `manage_seller_stores`.
**Fix**: Create a database function `masked_bank_number(text)` that returns `****XXXX` (last 4 only). Create a security-invoker view `store_payment_details_safe` that masks these fields. Update the staff SELECT policy to restrict to `manage_payouts` permission (not `manage_seller_stores`). Frontend admin payout pages will query the view instead of the raw table.

### 3. User payment details — bank numbers in plaintext
**Problem**: Same issue as above but on `user_payment_details` table.
**Fix**: Apply identical masking view pattern. Staff with `manage_payouts` see masked values only. Full values are only accessible via service role in edge functions (payout processing).

---

## Warning Fixes (9 actionable)

### 4. Audit logs — IP addresses readable by all staff
**Fix**: Replace `is_staff(auth.uid())` SELECT policy on `audit_logs` and `data_audit_log` with `has_permission(auth.uid(), 'view_audit_logs')`. This scopes access to admin/lead_administrator only, not analysts or support agents.

### 5. Contact messages — customer emails readable by all staff
**Fix**: Replace `is_staff(auth.uid())` on `contact_messages` SELECT/UPDATE/DELETE with `has_permission(auth.uid(), 'manage_support')`. Only support-oriented roles need this.

### 6. Seller payouts — internal transfer IDs exposed to sellers
**Fix**: Create a view `seller_payouts_safe` that omits `stripe_transfer_id`, `wise_transfer_id`, `wise_quote_id` from the seller-facing SELECT policy. Sellers see status and amount only.

### 7. Affiliate payouts — Stripe account IDs exposed to users
**Fix**: Similar view pattern — omit `stripe_account_id` and `stripe_transfer_id` from user-facing reads.

### 8. Chat attachment uploads — no path ownership enforcement
**Fix**: Update the `Authenticated users can upload chat attachments` storage policy to enforce `(storage.foldername(name))[1] = (auth.uid())::text` in WITH CHECK, preventing users from uploading to other users' folders.

### 9. Forum image uploads — no path ownership enforcement
**Fix**: Add `(storage.foldername(name))[1] = (auth.uid())::text` WITH CHECK to `Authenticated users can upload forum images` storage policy.

### 10. Seller webhook secrets — readable by all staff
**Fix**: Replace `is_staff(auth.uid())` on `seller_webhooks` SELECT with `has_permission(auth.uid(), 'manage_seller_stores')` to limit access.

### 11. Password reset codes — stored in plaintext
**Fix**: This table already has a deny-all RLS policy (`USING(false)`). The codes are only accessible via service role. Add a migration to hash codes using `crypt()` with `gen_salt('bf')` and update the edge function that validates codes to use `crypt(input, stored_hash) = stored_hash`.

### 12. Email send log — recipient emails in plaintext
**Fix**: Already service-role-only access. Add a scheduled cleanup function or retention policy comment. Mark as acceptable with documentation.

---

## Warnings to Acknowledge (3 — no code fix needed)

- **Extension in public schema** — pg_net must stay in public for edge function webhooks. Already ignored.
- **IP violation reports** — reporter_id NULL rows are protected by RLS (no anonymous SELECT). Acceptable.
- **Profiles PII** — staff access required, app-layer filtering in place. Already documented.

---

## Implementation Details

### Database Migration (single migration file)
1. Create `masked_bank_number(text)` SECURITY DEFINER function
2. Create `store_payment_details_safe` view with masked fields
3. Create `seller_payouts_safe` view omitting internal IDs
4. Create `affiliate_payouts_safe` view omitting internal IDs
5. Drop and recreate RLS policies on:
   - `audit_logs` / `data_audit_log` → `has_permission('view_audit_logs')`
   - `contact_messages` → `has_permission('manage_support')`
   - `seller_webhooks` staff SELECT → `has_permission('manage_seller_stores')`
   - `store_payment_details` staff SELECT → `has_permission('manage_payouts')`
6. Update storage policies for `chat-attachments` and `forum-images` INSERT
7. Hash `password_reset_codes.code` column (add `code_hash` column, backfill, drop plaintext)

### Frontend Changes
- Update admin payout pages to query `_safe` views instead of raw tables
- Update seller payout display to query `seller_payouts_safe`
- No other UI changes needed — policies are transparent

### Permissions Seeding
- Insert `view_audit_logs` permission if not exists
- Insert `manage_support` permission if not exists
- Grant both to admin and lead_administrator roles

### Security Finding Cleanup
- Delete resolved findings from the scanner after fixes are verified

---

## Summary
- **3 critical fixes**: Mask sensitive financial/credential data via views
- **9 warning fixes**: Scope RLS policies to correct permissions, enforce storage path ownership, hash reset codes
- **3 acknowledged**: Already mitigated, documented
- **0 new UI features** — all fixes are backend hardening

