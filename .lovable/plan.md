
## Full Codebase Sweep — Catch Every Legacy Pattern

### What the audit found

**Zero type errors** ✅ — TypeScript is clean.

**Remaining issues across the codebase:**

| Issue | Count | Where |
|-------|-------|-------|
| `glass-card` class (legacy gaming aesthetic) | 38 uses | Legal pages, Jobs, Admin, 1 seller page |
| `gaming-card` / `gaming-card-hover` | 2 uses | CategoryShowcase, Admin Login |
| `gradient-button` (outside seller) | 225 uses in 30 files | Customer pages, Admin, Checkout, etc. |
| Card imports in non-seller pages | 70+ files | Admin, customer, bot pages |
| Hardcoded `text-white`/`bg-black` | ~50 uses | Store pages, Featured, Product Detail, Admin |
| Stray `console.log` | 2 | BotIntegrationGuide |

### What we'll fix now (safe, no-breakage)

**Priority 1 — Seller area final cleanup (1 file)**
- Remove `glass-card` from `SellerTermsOfService.tsx` line 238

**Priority 2 — Console.log cleanup (1 file)**
- Remove 2 `console.log` statements from `BotIntegrationGuide.tsx`

**Priority 3 — Legacy `gaming-card` in public pages (2 files)**
- `CategoryShowcase.tsx` — replace `gaming-card-hover` with enterprise container
- Admin Login — replace `gaming-card` with flat containers

**Priority 4 — `glass-card` in legal/public pages (4 files)**
- `Jobs.tsx` — replace 4 `glass-card` uses
- `PrivacyPolicy.tsx` — replace 5 `glass-card` uses
- `RefundPolicy.tsx` — replace 6 `glass-card` uses
- `TermsOfService.tsx` — replace 1 `glass-card` use

### What we'll NOT touch (intentional / context-dependent)

- **`gradient-button`** — This is the primary CTA style used across checkout, product pages, and the chat widget. Changing it site-wide is a visual redesign decision, not a bug fix. These 225 instances are intentional brand styling for conversion-critical buttons (Add to Cart, Checkout, etc.).
- **`text-white`/`bg-black`** — Most are contextually correct (image overlays `bg-black/60`, dark store themes, Twitter/X preview component, badge colors). These aren't design token violations — they're semantic uses where the exact color matters regardless of theme.
- **Card imports in admin/customer pages** — These are functional and visually consistent within their own sections. Migrating 70+ files would be a separate initiative.

### Risk
Very low — removing dead classes and replacing decorative wrappers with the established flat pattern. No logic changes.
