
# Hybrid Affiliate Payout System Implementation Plan

## Overview
This plan restores **Stripe Connect** for automatic payouts while keeping **PayPal** as an alternative option. Affiliates will choose their preferred payout method during application, and the system will handle both seamlessly.

---

## Current State Analysis
The system currently:
- Has database columns for both `paypal_email` and `stripe_account_id` in the `affiliate_payouts` table
- Has `stripe_account_id` column in the `profiles` table
- Only validates PayPal email in the payout request flow
- Shows "Via Stripe Connect" text in admin UI but doesn't actually use it
- Has existing Stripe Connect edge functions (`create-connect-account`, `check-connect-status`) used for sellers

---

## Implementation Steps

### 1. Database Changes
Add a `preferred_payout_method` column to track the affiliate's choice:

**New column on `affiliate_applications` table:**
- `preferred_payout_method` (text): Values `'stripe'` or `'paypal'`

**Update `affiliate_payouts` table:**
- `payout_method` (text): Values `'stripe'` or `'paypal'` to record which method was used

---

### 2. Edge Function Updates

#### A. Create `create-affiliate-connect-account` Edge Function
A new function specifically for affiliates to onboard to Stripe Connect:
- Authenticates the user
- Verifies they have an approved affiliate application
- Creates a Stripe Express account with `transfers` capability
- Stores the `stripe_account_id` in the `profiles` table
- Returns an onboarding URL

#### B. Create `check-affiliate-connect-status` Edge Function
Check if an affiliate has completed Stripe Connect onboarding:
- Returns `hasAccount`, `isOnboarded`, `canReceivePayments` status

#### C. Update `request-affiliate-payout` Edge Function
Support both payout methods:
- Accept a `method` parameter (`'stripe'` or `'paypal'`)
- For **PayPal**: Validate `paypal_email` exists, create pending payout (current behaviour)
- For **Stripe**: Validate `stripe_account_id` exists and is onboarded, then attempt automatic transfer using `stripe.transfers.create()`
- Store the `payout_method` on the payout record

#### D. Update `process-affiliate-payout` Edge Function
Handle processing differently based on method:
- For **PayPal**: Mark as completed (manual payment by staff)
- For **Stripe**: Already processed automatically on request; this just updates status if needed

#### E. Update `send-affiliate-announcement` Edge Function
Update the embed to mention both payment options:
- "Payments processed via **Stripe Connect** (automatic) or **PayPal** (manual)."

---

### 3. Frontend Updates

#### A. Application Form (`Affiliate.tsx` & `AffiliateCard.tsx`)
Add payout method selector to the application form:
- Radio group: "Stripe Connect (Recommended)" or "PayPal"
- If Stripe selected: Show info about connecting after approval
- If PayPal selected: Show PayPal email input (required)
- Make PayPal email optional if Stripe is selected

#### B. Approved Affiliate Dashboard
Add Stripe Connect onboarding flow:
- If `preferred_payout_method` is `'stripe'` and not connected:
  - Show "Connect with Stripe" button
  - Call `create-affiliate-connect-account` to get onboarding URL
  - Redirect to Stripe, then back to dashboard
- Show connection status badge (Connected/Not Connected)
- When requesting payout:
  - If connected to Stripe: Use automatic transfer
  - If PayPal: Use current manual flow

#### C. Admin Affiliates Page (`Affiliates.tsx`)
Update payout requests table:
- Show payout method column (Stripe/PayPal icon)
- Show Stripe account status or PayPal email
- "Process" button for PayPal payouts (manual)
- Stripe payouts show as auto-processed with transfer link
- Update settings text from "Via Stripe Connect" to "Via Stripe or PayPal"

#### D. Admin Manual Payouts Page (`ManualPayouts.tsx`)
- Only show PayPal payouts here (Stripe payouts are automatic)
- Display PayPal email clearly for staff to process

---

### 4. Flow Diagrams

**Affiliate Onboarding Flow:**
```text
Application Form
      |
      v
[Choose Payout Method]
      |
  +---+---+
  |       |
Stripe   PayPal
  |       |
  v       v
No email  Enter
required  email
  |       |
  +---+---+
      |
      v
Submit Application
      |
      v
(After Approval)
      |
  +---+---+
  |       |
Stripe   PayPal
  |       |
  v       v
Connect  Ready
via link to earn
```

**Payout Request Flow:**
```text
Request Payout
      |
      v
[Check Method]
      |
  +---+---+
  |       |
Stripe   PayPal
  |       |
  v       v
Auto     Create
Transfer pending
to acct  request
  |       |
  v       v
Complete Staff
instantly reviews
```

---

## Files to Create/Modify

### New Files:
- `supabase/functions/create-affiliate-connect-account/index.ts`
- `supabase/functions/check-affiliate-connect-status/index.ts`

### Modified Files:
- `supabase/functions/request-affiliate-payout/index.ts`
- `supabase/functions/process-affiliate-payout/index.ts`
- `supabase/functions/send-affiliate-announcement/index.ts`
- `src/pages/Affiliate.tsx`
- `src/components/account/AffiliateCard.tsx`
- `src/pages/admin/Affiliates.tsx`
- `src/pages/admin/ManualPayouts.tsx`

---

## Technical Considerations

1. **Stripe API Key**: The existing `STRIPE_SECRET_KEY` secret will be used for both seller and affiliate Connect accounts

2. **Account Type**: Using Express accounts (same as sellers) for simplified onboarding

3. **Error Handling**: Stripe transfer failures will be logged and the payout will be marked as failed, with balance restored

4. **Backwards Compatibility**: Existing affiliates with only PayPal email will continue to use PayPal; they can update their preference in settings

5. **Minimum Payout**: Same minimum applies regardless of method (£10)
