
## Enterprise Custom Domain System Redesign

The current system is **functionally solid** (pre-checks, health checks, auto-fix, Cloudflare integration) but the UX is a single long scrolling page with inline forms. Enterprise domain managers (Vercel, Netlify, Cloudflare Pages) use a cleaner structure.

---

### Changes

#### 1. **Refactor into focused components** (from 1098-line monolith)
- `DomainOverview.tsx` — Hero stats bar showing domain count, SSL status, health summary
- `SubdomainSection.tsx` — Free subdomain card (claim/manage)
- `CustomDomainCard.tsx` — Individual domain card with status, health, actions
- `AddDomainWizard.tsx` — Multi-step domain connection flow (replaces inline input + AlertDialog)
- `CloudflareCredentials.tsx` — Extract existing CloudflareCredentialsCard
- `DnsRecordRow.tsx` — Reusable DNS record display with copy button

#### 2. **Visual upgrades**
- **Domain stats bar** at top: Total domains, active count, SSL status, last health check time
- **Status timeline** on each domain card: Added → DNS Configured → Verified → SSL Active
- **Tabbed layout**: "Domains" tab (subdomain + custom) | "Cloudflare" tab (credentials + integration)
- Domain cards use the high-density `border-border rounded-xl` pattern with cleaner action buttons
- DNS record instructions in a clean table format instead of numbered paragraphs

#### 3. **UX improvements**
- Add domain flow becomes a **slide-over panel** or **stepped wizard** (Step 1: Enter domain → Step 2: Pre-check results → Step 3: DNS instructions → Step 4: Verify)
- **Bulk health check** button to check all domains at once
- **Copy all DNS records** button for quick setup
- Domain card shows **last checked** timestamp and **uptime indicator**
- Better empty state with illustration

#### 4. **Keep existing backend logic intact**
- All `supabase.functions.invoke('store-domain-manager', ...)` calls stay the same
- All mutations and queries remain unchanged
- Only restructuring the presentation layer
