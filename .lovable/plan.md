
## Enterprise Polish Pass

After auditing every customer-facing surface, here are the remaining rough edges:

---

### 1. Auth Page — 1,257 Lines, No Layout Shell
The auth page (`Auth.tsx`) is a **1,257-line monolith** with no `MainLayout` wrapper — it renders raw, with no header/footer. Enterprise login pages (Shopify, Gumroad, Stripe) always show consistent branding + a link back to the homepage.

**Fix:**
- Wrap in a minimal layout with the Eclipse logo + a "← Back to store" link
- Split the 1,257-line file into smaller sub-components (LoginForm, SignupForm, ForgotPasswordForm, ResetForm, VerifyForm)

---

### 2. Hero Banner — "gaming-card" Overlay Language
`HeroBanner.tsx` line 21 says `"Dark overlay — deeper for gaming feel"` — the overlays are fine technically, but the `bg-background/65` + left gradient + bottom gradient creates a muddy, washed-out image. Enterprise hero sections use a single clean overlay.

**Fix:**
- Simplify to one `bg-background/50` overlay + one bottom fade — remove the left-side gradient (it was for left-aligned text that no longer exists since text is centered)

---

### 3. Mobile Hero — Shadow Glow on CTA
The mobile "Browse" button still has `shadow-[0_0_16px_hsl(var(--primary)/0.25)]` — a gaming-style glow that doesn't match the enterprise direction.

**Fix:**
- Remove the glow shadow from the mobile CTA button

---

### 4. FinalCTA — No Visual Container
The "Turn your creations into revenue" section is floating text with no visual boundary — it looks disconnected from the page. Enterprise CTAs use a subtle card or background treatment.

**Fix:**
- Add `rounded-xl border border-border/50 bg-card/50` to the inner div to give it a grounded container

---

### 5. Auth Page Size
At 1,257 lines, `Auth.tsx` is the largest single file in the project. This is a maintainability risk.

**Fix:**
- Extract each auth mode into its own component file under `src/components/auth/`
- Keep the main `Auth.tsx` as a thin router between modes

---

### 6. Product Card Hover States
Product cards likely still have gaming-style hover effects. Need to verify and normalize to enterprise `hover:border-primary/30` instead of glow shadows.

**Fix:**
- Audit `ProductCard.tsx` for any remaining glow/gradient hover effects

---

### Files Changed
- `src/components/landing/HeroBanner.tsx` — Simplify overlays
- `src/components/landing/LandingHero.tsx` — Remove glow shadow from mobile CTA
- `src/components/landing/FinalCTA.tsx` — Add container treatment
- `src/pages/Auth.tsx` — Add minimal branding layout, extract sub-components
- `src/components/ui/ProductCard.tsx` — Normalize hover states (if needed)
