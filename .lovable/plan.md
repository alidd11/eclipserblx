
# Eclipse Pre-Relaunch Security Audit (Read-Only)

Goal: produce a verified findings report + minimal remediation plan. No data changes, no deploys, no prod config edits. All work is inspection only (file reads, `supabase--read_query` selects, `supabase--linter`, `security--run_security_scan`, dependency scan).

## Scope

In: source in `src/`, `supabase/functions/`, `supabase/migrations/`, live DB schema/policies/functions/grants, storage buckets/policies, edge function config, `index.html` headers, `public/_headers`, `.env` usage, dependency tree, Stripe webhook + checkout paths.

Out: `eclipse-portal-bot/*` runtime, third-party dashboards, penetration testing, load testing, any write/mutation.

## Audit Workstreams

Each workstream = read, verify against live DB where relevant, record finding with severity (Critical/High/Med/Low), file:line or object name, and a minimal fix.

1. **Auth & session**
   - `useAuth`, `useAdminAuth`, `useUserPermissions`: JWT handling, session refresh, primary-admin email gate.
   - `getUser` vs `getSession` usage across gated routes.
   - Social/OAuth callbacks (`AuthDiscordCallback`, `AuthRobloxCallback`, `OAuthConsent`) for open-redirect and state validation.

2. **Role & permission enforcement**
   - `user_roles`, `role_permissions`, `has_role`, `has_permission`, `can_assign_role`, `can_create_role` — confirm no client-writable role tables and no recursive RLS.
   - Client-side `PermissionGate` matches server RLS (defense-in-depth, not sole gate).

3. **RLS & grants (live DB)**
   - Run `supabase--linter` and cross-check every `public` table for: RLS enabled, explicit GRANTs match policy scope (no `anon` on auth-only tables), no `USING (true)` on sensitive tables.
   - Focus tables: `profiles`, `orders`, `order_items`, `seller_payouts`, `seller_transactions`, `store_payment_details`, `seller_webhooks`, `store_domains`, `identity_verifications`, `refund_requests`, `user_roles`, `role_permissions`, `audit_logs`, `password_reset_codes`, `discord_link_codes`, `download_tokens`.
   - Verify every `*_safe`/`*_public`/`*_storefront` view has `security_invoker = on` and mirrors row filters.

4. **SECURITY DEFINER surface**
   - Every `SECURITY DEFINER` function has `SET search_path` pinned.
   - EXECUTE grants limited to intended roles (allowlist per stored memory).
   - No definer function returns bulk PII to `anon`/`authenticated` beyond policy intent.

5. **Edge functions**
   - Enumerate `supabase/functions/*/index.ts`; for each confirm: correct `_shared/auth-guard.ts` guard (`requireServiceRole`/`requireAdmin`/`requireStaff`/`requireAuth`), guard placed after OPTIONS branch (per project rule about the mid-argument-list regression), CORS on all responses, Zod/schema input validation, no raw SQL, no logging of tokens/PII, rate limiting where user-triggered.
   - Cross-check `supabase/config.toml` `verify_jwt` values against in-function guards.

6. **Payments / Stripe**
   - Webhook handlers: signature verification with `constructEvent`, idempotency via `processed_webhook_events`, no trust of client-supplied amount/price IDs.
   - Checkout creators: price IDs referenced server-side only, no `price_data` from client, correct `mode`, success/cancel URLs use request origin allowlist.
   - Refund/dispute paths (`process-dispute-refund`) authorization + amount bounds.
   - Payout logic: `seller_balances` mutations only via SECURITY DEFINER, RLS blocks direct writes.

7. **File uploads & storage**
   - Bucket public/private matches use; RLS on `storage.objects` scoped to owner/path.
   - `secureFileUpload`, `magicBytes`, `sanitize`, `watermark` used on user uploads.
   - Download tokens (`download_tokens`) bound to user/IP, single-use, expiry enforced server-side.

8. **Input validation & XSS**
   - `validationSchemas.ts` covers every user-writable form; server-side re-validation in edge functions.
   - Sweep for `dangerouslySetInnerHTML` (rich text, chat links, product descriptions) → confirm DOMPurify/`sanitize.ts` path.
   - Chat link handling (`chatLinks.tsx`, `blockedLinks.ts`) against javascript:/data: URIs and open-redirect targets.

9. **Secrets & client bundle**
   - `.env` contains only `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID` (public by design).
   - `rg` bundle-visible code for `SERVICE_ROLE`, `STRIPE_SECRET`, private keys, hardcoded webhook secrets, admin emails beyond the accepted `alicanimir1@gmail.com` gate.
   - Confirm no service role usage in any `src/**` file.

10. **Rate limiting & abuse**
    - `rate_limits` table + `check_rate_limit` coverage on: auth-adjacent endpoints, password reset (`password_reset_codes`), contact form, chat send, review submit, download issuance.

11. **HTTP headers, CSP, redirects**
    - `public/_headers` + `index.html` meta: CSP presence/quality, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, HSTS (host-level note only).
    - Router: any `navigate(param)` where `param` is user-controlled → open-redirect risk. Auth callback `redirectTo` allowlist.

12. **Logging & PII**
    - Grep edge functions + client for `console.log` of tokens, emails, full payment payloads, Stripe secrets, DB rows containing PII.
    - `audit_logs` / `data_audit_log` write paths don't store raw secrets or tokens.

13. **Dependencies**
    - `code--dependency_scan` for high/critical CVEs; note any that touch auth/crypto/parsing.

## Deliverable

Single report grouped by severity:

```text
[SEV] Title
  Where:   file:line  |  db object
  Evidence: exact excerpt / query result
  Impact:  concrete abuse scenario
  Fix:     minimal permanent change (usually 1 migration or 1 file edit)
  Test:    unit / integration / manual repro step
```

Followed by a prioritized remediation queue (Critical → High → Med → Low), each item sized so it can ship as a single migration or a single PR with tests. No fixes applied in this step — findings first, then you approve which to implement.

## Assumptions / open questions

- Treat `alicanimir1@gmail.com` primary-admin email gate as accepted (per prior memory) unless you want it re-examined.
- Audit uses the current `main` branch state in this project; the `claude/repo-overview-lx4wyo` dev branch is out of scope unless you say otherwise.
- Live DB reads will use `supabase--read_query` against project `qlnbergwjfrmgkjhrbkj` — read-only, no data mutation.
