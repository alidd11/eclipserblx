

## Email Visibility Audit & Fix Plan

### Current State
Emails are displayed in several admin pages where they should be replaced with customer IDs or display names. The **Orders page** already correctly uses `getCustomerId()` instead of emails. However, many other admin pages still show raw emails.

### Pages Showing Emails (Needs Fixing)

| Page | What's Shown | Fix |
|------|-------------|-----|
| **ActivityFeed** (Dashboard) | `customer_email` for orders, `email` for signups | Replace with customer_id lookup for orders, display_name for signups |
| **Refunds** | `customer_email` in table, detail dialog, and search | Replace with customer_id from profiles (same pattern as Orders page) |
| **Transcripts** | `customer_email` fallback for ticket names | Replace with `customer_id` or 'Unknown Customer' fallback |
| **AuditLogs** | `email` fallback for staff identity | Replace with `display_name` or staff_id fallback |
| **IpBans** | `email` fallback for banned user/banner display | Replace with `display_name` or customer_id |
| **BotCodes** | `email` for processor display | Replace with `display_name` or staff_id |
| **StoreApplications** | `email` shown next to applicant name | Replace with customer_id |
| **StaffActivity** | `email` fallback for staff names | Replace with `display_name` or staff_id |
| **SellerAgreements** | `owner_email` shown | Replace with store name or owner display_name |
| **AffiliateApplications** | `email` shown in detail panel | Remove email display, keep affiliate_id |
| **Recruiters** | `email` shown and searched | Replace with recruiter_id |

### Pages Where Email is Acceptable
- **StaffMessages** — Internal staff communication, email used for mention matching (backend only, not displayed to customers)
- **StaffProfile** — Already hides primary admin email; staff emails are internal
- **CustomerProfileDialog** — Primary admin only, contains all PII by design
- **GrantEclipsePlusDialog** — Primary admin only, used for auth verification
- **Subscribers** — Email newsletter subscribers page, email IS the data
- **GDPRCompliance** — Primary admin only compliance dashboard
- **LiveChat** — Already restricted email to primary admin only

### Implementation Approach
For each page:
1. Replace `email` with `display_name` or `customer_id` in display
2. For Refunds page: fetch customer profiles to resolve `user_id` → `customer_id` (same pattern as Orders page)
3. For ActivityFeed: fetch `customer_id` from profiles for order users, use `display_name` only for signups
4. Keep email in data fetches where needed for backend logic (e.g., sending emails) but don't render it

### Files to Modify
1. `src/components/admin/dashboard/ActivityFeed.tsx`
2. `src/pages/admin/Refunds.tsx`
3. `src/pages/admin/Transcripts.tsx`
4. `src/pages/admin/AuditLogs.tsx`
5. `src/pages/admin/IpBans.tsx`
6. `src/pages/admin/BotCodes.tsx`
7. `src/pages/admin/StoreApplications.tsx`
8. `src/pages/admin/StaffActivity.tsx`
9. `src/pages/admin/SellerAgreements.tsx`
10. `src/pages/admin/AffiliateApplications.tsx`
11. `src/pages/admin/Recruiters.tsx`

