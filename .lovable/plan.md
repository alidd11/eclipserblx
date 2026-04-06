# Remove Affiliate Applications System

Since all members are auto-enrolled, the `affiliate_applications` table is unnecessary. 

## Database Migration
1. **Add payout columns to `profiles`**: `preferred_payout_method`, `bank_account_holder`, `bank_account_number`, `bank_swift_bic`, `bank_name`, `bank_country`, `bank_routing_number`
2. **Migrate existing data** from `affiliate_applications` to `profiles` (63 records)
3. **Drop** `affiliate_applications` table and `affiliate_applications_masked` view
4. **Drop** the `auto_enroll_affiliate` trigger (no longer needed)

## Code Changes
- **Delete** `src/pages/admin/AffiliateApplications.tsx` — no more applications to review
- **Update** `src/pages/admin/AffiliateHub.tsx` — remove "Applications" tab
- **Update** `src/components/AppRoutes.tsx` — remove import and route
- **Update** `src/components/account/AffiliateCard.tsx` — remove application form/check, show dashboard directly since all users are affiliates
- **Update** `src/pages/affiliate/useAffiliateData.ts` — read payout settings from `profiles` instead of `affiliate_applications`
- **Update** `src/pages/Account.tsx` — read affiliate_id from `profiles.referral_code` instead
- **Update** `src/components/admin/CustomerProfileDialog.tsx` — remove affiliate_applications query
- **Update** `supabase/functions/request-affiliate-payout/index.ts` — read payout settings from `profiles`
- **Update** `supabase/functions/create-affiliate-connect-account/index.ts` — remove application check

## What Stays
- `affiliate_balances` — still tracks earnings
- `affiliate_commissions` — still tracks commissions  
- `affiliate_payouts` — still tracks payout history
- `profiles.referral_code` — already used as the affiliate ID
