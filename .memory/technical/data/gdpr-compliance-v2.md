# Memory: technical/data/gdpr-compliance-v2
Updated: 2026-03-06

The platform implements comprehensive GDPR compliance across multiple layers:

**1. Cookie Consent System:**
- Three categories: Essential (always on), Analytics (opt-in), Marketing (opt-in)
- Banner with Accept All / Reject Non-Essential / Customize options
- Granular toggle dialog for individual category control
- Consent version tracking (`CONSENT_VERSION` in `useCookieConsent.tsx`) — when incremented, users are re-prompted

**2. Server-Side Consent Records (`consent_records` table):**
- Every consent action is recorded with: visitor_id, user_id (if authenticated), consent_version, preferences JSON, action type, user_agent, timestamp
- RLS: anonymous insert allowed (pre-auth consent); authenticated users can read own records; admins can read all for audits

**3. Analytics Gating:**
- `usePageTracking` checks `hasAnalyticsConsent()` before any tracking
- No analytics data collected without explicit opt-in
- `eclipse_visitor_id` is a random UUID (not linked to identity)

**4. Data Retention (Automated):**
- Page visits: 90 days (auto-deleted via `cleanup_expired_tracking_data`)
- Search logs: 60 days (auto-deleted)
- IP hashes: 30-90 days (anonymised)
- Orders/transactions: 7 years (HMRC legal obligation)
- Consent records: 3 years after last interaction
- Audit logs: 2 years

**5. Privacy Policy (`/privacy`):**
- Last updated: 2026-03-06
- Includes: Article 6 legal bases, sub-processor table with locations, data retention schedule, international transfers (SCCs), automated decision-making disclosure, children's privacy, all 7 GDPR rights with article references

**6. PII Protection:**
- Customer emails masked in seller views (`mask_email` function)
- Staff PII access logged via `log_sensitive_access`
- `hide_from_leaderboard` profile setting for user privacy
- Sentry configured to exclude PII (no replay, no feedback)
