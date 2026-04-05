

## Polish Recovery & Guest Support to Enterprise Visual Standard

### What Changes

Align the three customer-facing recovery features with the site's established flattened enterprise aesthetic — bordered containers, muted headers, clean typography, no gradient buttons on utility pages.

### Steps

1. **RecoverOrder.tsx — Visual overhaul**
   - Replace `Card`/`CardHeader` with flat bordered container (`border-border rounded-xl`) and `bg-muted/30` header area
   - Replace `gradient-button` with standard primary button (utility page, not conversion)
   - Add a step-by-step visual guide: "1. Check your email receipt → 2. Copy the reference starting with pi_ or cs_ → 3. Paste below"
   - Remove "from Stripe" copy — replace with "from your payment confirmation email"
   - Add the guest support form as a fallback in the unauthenticated state (instead of just "please sign in")
   - Improve result states: success card with order details, error card with actionable next steps

2. **GuestSupportForm.tsx — Polish**
   - Add character counter on textarea (X/5000)
   - Expose category dropdown (Downloads, Payments, Account, Other) — the edge function already supports it
   - Add subtle info banner: "We typically respond within 24 hours"
   - Match input styling to the flattened aesthetic

3. **Support.tsx — Integration fixes**
   - Show guest support form for ALL users (not just logged-out) with a toggle/accordion "Having trouble signing in?" — this covers the exact edge case of auth-broken users
   - Flatten the order recovery banner: remove `bg-primary/5`, use standard `bg-muted/30` with left border accent
   - Add the recovery link to the "Payments & Orders" help topic articles list

### Files Changed
- `src/pages/RecoverOrder.tsx` — Visual redesign + unauthenticated fallback
- `src/components/support/GuestSupportForm.tsx` — Category selector, character counter, response time info
- `src/pages/Support.tsx` — Show guest form for all users, flatten recovery banner

