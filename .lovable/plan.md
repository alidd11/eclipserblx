
# Revert Eclipse+ to Original Single-Tier System

## Overview
Restore the Eclipse+ membership back to its original single-tier design with £4.99/month, 30% discount, and 1 free product per month. Remove the multi-tier (Basic/Pro/Premium) system and associated UI complexity.

---

## What Will Be Reverted

### Current Multi-Tier System (To Be Removed)
| Tier | Price | Discount | Free Products |
|------|-------|----------|---------------|
| Basic | £2.99/mo | 15% | 0 |
| Pro | £4.99/mo | 30% | 1 |
| Premium | £9.99/mo | 50% | 2 |

### Original Single-Tier System (To Be Restored)
| Membership | Price | Discount | Free Products |
|------------|-------|----------|---------------|
| Eclipse+ | £4.99/mo | 30% | 1 |

---

## Changes Required

### 1. Database Changes
- Deactivate the multi-tier records in `subscription_tiers` table (Basic, Premium)
- Keep only the Pro tier as the singular "Eclipse+" option, or simplify the data model

### 2. Frontend Changes

**EclipsePlus.tsx** - Main membership page:
- Remove tier selection grid and `TierCard` components
- Remove `BillingToggle` component (or simplify if annual billing is desired)
- Restore single pricing card with "£4.99/mo" and "30% off + 1 free product"
- Change title display from "Eclipse {tier}" back to just "Eclipse+"

**useSubscription.ts** - Subscription hook:
- Remove tier-based logic or default all subscriptions to single tier
- Hardcode default 30% discount and 1 free product values

**Subscribed user display:**
- Show "Eclipse+" instead of "Eclipse Basic", "Eclipse Pro", etc.
- Simplify the membership card to show fixed benefits

### 3. Components to Simplify or Remove
- `src/components/subscription/TierCard.tsx` - May be removed or simplified
- `src/components/subscription/BillingToggle.tsx` - May be removed if only monthly billing
- `src/hooks/useSubscriptionTiers.ts` - Simplify or remove tier fetching logic

### 4. Edge Functions
- `check-subscription` - Simplify to return fixed benefits (30% discount, 1 free product)
- `claim-signup-promotion` - Update to grant the single Eclipse+ tier instead of "basic"
- `create-subscription-checkout` - Simplify to single subscription option

---

## Technical Details

### EclipsePlus.tsx Simplification
```text
Current structure:
┌─────────────────────────────────────────────┐
│  Hero: "Choose Your Perfect Plan"           │
│  BillingToggle: Monthly / Annual            │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐       │
│  │ Basic   │ │  Pro    │ │ Premium │       │
│  │ £2.99   │ │ £4.99   │ │ £9.99   │       │
│  └─────────┘ └─────────┘ └─────────┘       │
└─────────────────────────────────────────────┘

Simplified structure:
┌─────────────────────────────────────────────┐
│  Hero: "Eclipse+ Membership"                │
│  ┌─────────────────────────────────┐        │
│  │     Eclipse+                    │        │
│  │     £4.99/month                 │        │
│  │     • 30% off all purchases     │        │
│  │     • 1 free product/month      │        │
│  │     [ Subscribe Now ]           │        │
│  └─────────────────────────────────┘        │
└─────────────────────────────────────────────┘
```

### Subscribed User Card Update
- Display "Eclipse+" instead of "Eclipse {currentTier}"
- Fixed "30% off all purchases • 1 free product/month" text
- Remove tier-specific icon mapping (Star/Crown/Sparkles → just Crown)

### Database Simplification Options
**Option A:** Deactivate Basic and Premium tiers in database, keep only Pro as the single "Eclipse+" tier

**Option B:** Remove tier column dependency entirely and use simple boolean `is_subscribed`

Recommended: **Option A** (minimal database changes, just deactivate unused tiers)

---

## Files to Modify
1. `src/pages/EclipsePlus.tsx` - Simplify to single-tier UI
2. `src/hooks/useSubscription.ts` - Remove tier complexity
3. `src/hooks/useSubscriptionTiers.ts` - Simplify or remove
4. `supabase/functions/claim-signup-promotion/index.ts` - Grant "pro" tier for promotions
5. `supabase/functions/check-subscription/index.ts` - Ensure consistent 30%/1 free values

---

## Expected Outcome
- Users see simple "Eclipse+" membership option at £4.99/month
- All existing subscribers display as "Eclipse+" with 30% discount and 1 free product
- Signup promotions grant the single Eclipse+ tier
- Cleaner, simpler user experience matching the original system
