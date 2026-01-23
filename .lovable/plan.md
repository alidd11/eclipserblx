
# Add Payout Settings Section to Affiliate Dashboard

## Overview
Add a new "Payout Settings" card to the affiliate dashboard that allows members to:
1. Change their preferred payout method (Stripe or PayPal)
2. Update their PayPal email address
3. View their current Stripe connection status

## Current State
- Affiliates select their payout method during application
- No way to change preferences after joining
- PayPal email is stored in both `affiliate_applications.paypal_email` and `profiles.paypal_email`
- Stripe Connect status is already being checked via `check-affiliate-connect-status` edge function

## Implementation

### File: `src/pages/Affiliate.tsx`

**1. Add new state for payout settings form**
```typescript
const [payoutSettings, setPayoutSettings] = useState({
  preferred_method: 'stripe' as 'stripe' | 'paypal',
  paypal_email: '',
});
```

**2. Sync payout settings state from application data**
```typescript
useEffect(() => {
  if (application) {
    setPayoutSettings({
      preferred_method: application.preferred_payout_method || 'stripe',
      paypal_email: application.paypal_email || '',
    });
  }
}, [application]);
```

**3. Add mutation to update payout settings**
```typescript
const updatePayoutSettingsMutation = useMutation({
  mutationFn: async (settings: { preferred_method: 'stripe' | 'paypal'; paypal_email: string }) => {
    // Update affiliate_applications
    await supabase
      .from('affiliate_applications')
      .update({
        preferred_payout_method: settings.preferred_method,
        paypal_email: settings.paypal_email,
      })
      .eq('user_id', user.id);
    
    // Sync PayPal email to profiles table
    await supabase
      .from('profiles')
      .update({ paypal_email: settings.paypal_email })
      .eq('id', user.id);
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['affiliate-application'] });
    toast({ title: "Payout settings updated" });
  },
});
```

**4. Add Payout Settings Card UI (after Referral Link card, around line 927)**

The card will include:
- Radio group to switch between Stripe and PayPal
- Current Stripe connection status badge
- Connect Stripe button (if not connected)
- PayPal email input field (shown when PayPal selected or as secondary option)
- Save button

```text
┌─────────────────────────────────────────────────────────┐
│ ⚙️ Payout Settings                                      │
│ Choose how you want to receive your earnings            │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ ○ Stripe Connect (Instant)                              │
│   Automatic payouts directly to your bank               │
│   ┌──────────────────────────────────┐                  │
│   │ ✓ Connected        [Manage →]    │                  │
│   └──────────────────────────────────┘                  │
│                                                         │
│ ○ PayPal (1-3 business days)                            │
│   Manual payouts processed by our team                  │
│   ┌────────────────────────────────────────┐            │
│   │ PayPal Email: you@email.com            │            │
│   └────────────────────────────────────────┘            │
│                                                         │
│                              [ Save Changes ]           │
└─────────────────────────────────────────────────────────┘
```

## Database Changes
None required - all necessary columns already exist:
- `affiliate_applications.preferred_payout_method`
- `affiliate_applications.paypal_email`
- `profiles.paypal_email`

## Technical Notes

| Aspect | Details |
|--------|---------|
| Validation | PayPal email required when PayPal is selected |
| Stripe status | Uses existing `connectStatus` query data |
| Sync | Updates both `affiliate_applications` and `profiles` tables |
| Invalidation | Refreshes application data after save |

## Summary
This adds approximately 80-100 lines of code to `Affiliate.tsx`:
1. New state + useEffect for form data
2. New mutation for saving settings
3. New Card component with RadioGroup, Input, and Button

The implementation follows existing patterns in the file and reuses the Stripe Connect functionality already present in the dashboard.
