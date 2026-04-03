
# Seller Onboarding Overhaul

## Phase 1: Reduce Friction (Step Consolidation)
- **Merge Appearance + Categories** into a single "Store Setup" step
- **Make Socials & Roblox optional** — sellers can skip and complete post-launch
- Result: 7 steps → 5 steps (TOS → Store Setup → Payout → First Product → Launch)
- Add **"Skip for now"** buttons on non-essential steps

## Phase 2: Progress & Persistence
- **Auto-save** each step to database so sellers can leave and resume
- **Time estimates** on each step header ("~1 min")
- **Progress bar** with step names visible at all times

## Phase 3: Conversion Boosters
- **Store templates** — 3 pre-built themes (Minimal, Gaming, Professional) with preset colors/layouts selectable during Store Setup
- **First product wizard** — Inline guided product upload as the final onboarding step with smart defaults and category suggestions
- **Live mini-preview** — Small store preview card that updates in real-time as seller fills in details

## Phase 4: Trust & Motivation
- **Earnings calculator** — Interactive slider during Payout step: "10 sales × £5 = £42.50/mo earnings"
- **Success stories** — Brief seller testimonials shown between steps as transition cards
- **Post-onboarding Store Health score** — Dashboard widget showing 0-100% completion encouraging optional step completion

## Files to Create/Modify
| Action | File |
|--------|------|
| Modify | `src/hooks/useSellerOnboarding.ts` — reduce to 5 steps, add auto-save |
| Create | `src/components/seller/onboarding/StoreTemplates.tsx` |
| Create | `src/components/seller/onboarding/EarningsCalculator.tsx` |
| Create | `src/components/seller/onboarding/SellerSuccessStories.tsx` |
| Create | `src/components/seller/onboarding/StoreHealthScore.tsx` |
| Create | `src/components/seller/onboarding/LiveStorePreview.tsx` |
| Modify | `src/components/seller/onboarding/` step components — consolidate |
| Modify | Seller dashboard — add Store Health widget |

## No database migration needed
All changes are UI/UX — existing tables (stores, seller_agreements, profiles) already support this.
