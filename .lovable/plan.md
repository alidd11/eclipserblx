

# Plan: Update Customer-Side Cards to Match Premium Dark Theme

## Overview
Update the card styling across customer-facing pages to create a more premium, consistent dark theme appearance. The current cards use basic `bg-card border-border` styling, but we'll enhance them with subtle gradients, refined borders, and improved visual hierarchy matching the platform's premium gaming aesthetic.

---

## Current State Analysis

The screenshot shows the **My Purchases/Downloads** page with:
- Basic card styling (`bg-card border-border`)
- Product items with simple `bg-card border-border` styling
- Download buttons with gradient styling (already good)
- Status badges with appropriate colors

The current styling is functional but lacks the premium "glass" effect and subtle gradient accents seen in marketplace cards like `TopSellersCard`, `NewArrivalsCard`, and `CategoriesGridCard`.

---

## Proposed Changes

### 1. Update MyPurchases.tsx Card Styling
**File:** `src/pages/MyPurchases.tsx`

| Element | Current | Proposed |
|---------|---------|----------|
| Main container card | `<Card>` | `<Card className="border-primary/10 bg-gradient-to-br from-card via-card to-primary/5">` |
| Product item rows | `p-4 rounded-xl bg-card border border-border` | `p-4 rounded-xl bg-card/80 border border-primary/10 hover:border-primary/20 backdrop-blur-sm transition-all` |
| Order cards | `rounded-xl border border-border bg-card` | `rounded-xl border border-primary/10 bg-gradient-to-br from-card to-muted/30` |
| Empty states | Basic muted | Enhanced with subtle gradient background |
| Batch download bar | `bg-muted/30 border border-border` | `bg-card/60 border border-primary/10 backdrop-blur-sm` |

### 2. Update Account Page Cards
**File:** `src/pages/Account.tsx`

Apply consistent premium styling to account section cards:
- Profile card: Subtle gradient overlay
- User IDs section: Enhanced hover states
- Status badges area: Refined background

### 3. Update Shared Account Components
**Files affected:**
- `src/components/account/MyPurchasesCard.tsx`
- `src/components/account/LinkedAccountsCard.tsx`
- `src/components/account/ReferralCard.tsx`
- `src/components/account/AffiliateCard.tsx`
- `src/components/account/EmailSubscriptionCard.tsx`
- `src/components/account/NotificationSettingsCard.tsx`
- `src/components/account/SoundCustomizationCard.tsx`
- `src/components/account/ThemeSettingsCard.tsx`
- `src/components/account/SavedCardsCard.tsx`

Update base Card className from:
```tsx
<Card className="bg-card border-border">
```
To:
```tsx
<Card className="border-primary/10 bg-gradient-to-br from-card via-card to-primary/5">
```

### 4. Update Inner Elements
For inner card elements (like linked account rows, product items):

**From:**
```tsx
className="p-2.5 bg-muted/50 rounded-lg border border-border"
```

**To:**
```tsx
className="p-2.5 bg-muted/30 rounded-lg border border-border/50 hover:border-primary/20 transition-colors"
```

---

## Design Tokens Used

Based on the existing theme in `src/index.css`:

| Token | Dark Mode Value | Usage |
|-------|----------------|-------|
| `--card` | `220 20% 7%` | Base card background |
| `--primary` | `265 100% 65%` | Purple accent color |
| `--border` | `220 15% 18%` | Default border |
| `--muted` | `220 15% 15%` | Secondary backgrounds |

The gradient approach (`from-card via-card to-primary/5`) creates a subtle purple tint that matches the premium gaming aesthetic without being overwhelming.

---

## Implementation Order

1. **MyPurchases.tsx** - Main downloads page (most visible)
2. **Account Cards** - LinkedAccountsCard, MyPurchasesCard, etc.
3. **Account.tsx** - Profile section and IDs area
4. **Other Account Pages** - AdAnalyticsPage, MyAdvertisementsPage, FollowingPage

---

## Technical Details

### CSS Classes Pattern
```tsx
// Primary card container
"border-primary/10 bg-gradient-to-br from-card via-card to-primary/5"

// Inner interactive rows
"bg-muted/30 rounded-lg border border-border/50 hover:border-primary/20 hover:bg-muted/40 transition-all"

// Empty states
"bg-muted/20 rounded-lg border border-dashed border-border/50"
```

### Maintaining Accessibility
- All color contrast ratios remain compliant
- Focus states unchanged
- Interactive elements retain clear hover/active feedback

---

## Files to Modify

1. `src/pages/MyPurchases.tsx` - Main downloads/purchases page
2. `src/components/account/MyPurchasesCard.tsx` - Account purchases widget
3. `src/components/account/LinkedAccountsCard.tsx` - Discord/Roblox linking
4. `src/components/account/ReferralCard.tsx` - Referral program card
5. `src/components/account/AffiliateCard.tsx` - Affiliate dashboard card
6. `src/components/account/EmailSubscriptionCard.tsx` - Email preferences
7. `src/components/account/NotificationSettingsCard.tsx` - Push notifications
8. `src/components/account/SoundCustomizationCard.tsx` - Sound settings
9. `src/components/account/ThemeSettingsCard.tsx` - Theme picker
10. `src/components/account/SavedCardsCard.tsx` - Payment methods
11. `src/pages/Account.tsx` - Profile header and IDs section styling
12. `src/pages/Account/AdAnalyticsPage.tsx` - Ad analytics cards
13. `src/pages/Account/MyAdvertisementsPage.tsx` - Advertisements cards

---

## Expected Result

After implementation:
- Cards will have a subtle purple gradient tint matching the platform's gaming aesthetic
- Inner elements will have refined borders with hover effects
- Empty states will feel more polished
- Overall consistency with marketplace cards (TopSellersCard, NewArrivalsCard, etc.)
- Maintains the dark theme while adding premium visual depth

