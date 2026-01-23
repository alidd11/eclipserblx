

# Update Affiliate UI Messaging for Hybrid Stripe/PayPal System

## Overview
This plan updates all affiliate-related messaging across the application to consistently reflect the hybrid payout system where affiliates can choose between **Stripe Connect (instant automatic payouts)** or **PayPal (manual payouts within 1-3 business days)**.

---

## Current Issues Found

1. **Outdated "after approval" text**: Since applications are now auto-approved, the Stripe description mentioning "You'll connect your Stripe account after approval" is misleading.

2. **Inconsistent payout messaging**: Some places correctly show both options, but the messaging could be more consistent.

3. **AffiliateCard uses hardcoded `MINIMUM_PAYOUT`**: Should use dynamic `settings.minimumPayout` consistently.

4. **Missing payout method indicator**: When showing "Minimum balance for payout", it doesn't clarify the available methods.

---

## Files to Update

### 1. `src/pages/Affiliate.tsx`

**Application Form Section (lines 513-527)**
- Update Stripe description from "You'll connect your Stripe account after approval" to "You'll connect your Stripe account after joining."
- Keep PayPal description as-is (correctly describes manual payouts)

**Stripe Onboarding Banner (lines 731-733)**
- Current text is good: "receive instant automatic payouts directly to your bank"

**Minimum Balance Message (lines 803-806)**
- Add clarity about which payout methods are available

### 2. `src/components/account/AffiliateCard.tsx`

**Stripe Onboarding Card (lines 496-499)**
- Keep existing text (already correct)

**Payout Request Footer (line 603)**
- Already dynamically shows "Instant via Stripe" or "Via PayPal (1-3 days)" based on connection status - this is correct

**Minimum Balance Info**
- Add similar clarifying text for minimum payout threshold

### 3. Minor: Confirm other files are already correct

**Admin Affiliates (src/pages/admin/Affiliates.tsx)**
- Line 576: Already shows "Via Stripe or PayPal" - correct

**Edge Function (supabase/functions/send-affiliate-announcement/index.ts)**
- Lines 74-76: Already shows "Stripe Connect (automatic) or PayPal (manual)" - correct

---

## Specific Changes

### `src/pages/Affiliate.tsx`

#### Change 1: Update Stripe description in application form
**Location**: Lines 513-515
```text
Before: "Automatic instant payouts directly to your bank account. You'll connect your Stripe account after approval."
After:  "Instant payouts directly to your bank. Connect your Stripe account after joining to activate."
```

#### Change 2: Add payout method info to minimum balance message
**Location**: Lines 803-806
```text
Before: "Minimum balance for payout: £{minimumPayout}"
After:  "Minimum balance for payout: £{minimumPayout}. Via Stripe (instant) or PayPal (1-3 days)."
```

### `src/components/account/AffiliateCard.tsx`

#### Change 1: Update Stripe description in application form
**Location**: Lines 328-329
```text
Before: "Stripe Connect (Instant)"
After:  "Stripe Connect (Instant)" (no change needed)
```

#### Change 2: Add minimum balance info message below payout section
**Location**: Around line 573-574 (when balance is below minimum)
- Add clarifying text about both payout methods being available once threshold is reached

---

## Technical Details

| File | Line(s) | Change |
|------|---------|--------|
| `src/pages/Affiliate.tsx` | 513-515 | Update Stripe description text |
| `src/pages/Affiliate.tsx` | 803-806 | Add payout method clarification |
| `src/components/account/AffiliateCard.tsx` | 328-329 | Minor wording update (optional) |
| `src/components/account/AffiliateCard.tsx` | 573-574 | Add payout method clarification |

---

## Summary

The implementation updates 2-3 text strings across 2 files to ensure:
1. "After approval" is changed to "after joining" (reflecting auto-approval)
2. All minimum payout threshold messages clarify both Stripe and PayPal are options
3. Consistent terminology: "Stripe Connect (instant)" and "PayPal (1-3 business days)"

The admin pages and edge functions are already correctly updated and require no changes.

