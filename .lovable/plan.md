
# Enterprise Polish — Full Improvement Plan

## 1. Trust & Credibility

### 1a. Public Status Page (`/status`)
- Simple page showing system health (online/degraded/offline) using existing `useSystemStatus` hook
- Display uptime indicator and last-checked timestamp
- Clean, minimal layout matching enterprise aesthetic

### 1b. Organization JSON-LD Schema
- Add Organization structured data to the homepage for Google Knowledge Panel eligibility
- Include company name, logo, social links, contact info

### 1c. Security & Privacy Page (`/security`)
- Static page outlining data protection practices (encryption at rest, RLS, HTTPS, GDPR compliance)
- Builds trust with enterprise buyers — standard for SaaS platforms

---

## 2. Conversion & UX

### 2a. Skeleton Loading States
- Replace remaining spinner-based loading with skeleton placeholders across key pages (product grid, seller dashboard, order history)
- Use existing `Skeleton` component consistently

### 2b. Smart Search Suggestions
- Add recent searches and popular terms dropdown to the search input
- Improves discoverability and reduces friction

### 2c. Tooltip Guidance on Complex Forms
- Add contextual tooltips to seller product creation and payout forms
- Explains fields like "SWIFT/BIC", "Webhook URL", commission rates

---

## 3. Operational Maturity

### 3a. Structured Error Codes
- Define a `ERROR_CODES` map (e.g., `ERR_INSUFFICIENT_BALANCE`, `ERR_RATE_LIMITED`, `ERR_PRODUCT_UNAVAILABLE`)
- Use in edge functions and surface user-friendly messages in toast notifications

### 3b. Rate Limit Response Headers
- Add `X-RateLimit-Remaining` and `X-RateLimit-Reset` headers to all edge function responses (already have the shared utility, just need to wire it into responses)

### 3c. Brand Assets Page (`/brand`)
- Public page with downloadable logos, color palette, and usage guidelines
- Standard for enterprise companies; useful for partners and press

---

## 4. Technical Debt

### 4a. Consolidate Duplicate Utilities
- Audit and merge duplicate formatting functions (date, currency, truncation helpers)
- Single source of truth for shared logic

### 4b. Component Consistency Audit
- Scan for any remaining raw `Card` usage and convert to `border-border rounded-xl` pattern
- Ensure all primary buttons are `h-12` consistently

---

## Implementation Order
1. JSON-LD Organization schema (quick SEO win)
2. Status page + Security page (trust)
3. Skeleton loading audit (UX)
4. Structured error codes (operational)
5. Brand page (credibility)
6. Search suggestions, tooltips, utility consolidation, component audit (polish)

**Estimated scope**: ~12 files modified, ~4 new files created. No database changes required.
