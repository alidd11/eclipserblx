

# Plan: Align Seller Dashboard with Admin Dashboard Template

## Overview
Refactor the seller dashboard to adopt the proven patterns and components from the admin dashboard while preserving seller-specific functionality. This will improve code maintainability, PWA stability, and provide a consistent user experience.

## Changes

### 1. Adopt AdminStatCard Component for Stats
Replace the custom stat cards in SellerDashboard with the reusable `AdminStatCard` component already available in the codebase.

**File:** `src/pages/seller/SellerDashboard.tsx`
- Import `AdminStatCard` from `@/components/admin/AdminStatCard`
- Replace the 4 manual stat cards with AdminStatCard instances
- Apply consistent styling and color semantics

### 2. Add Time-Based Greeting
Mirror the admin dashboard's personalized greeting pattern.

**File:** `src/pages/seller/SellerDashboard.tsx`
- Add `getTimeBasedGreeting()` helper function
- Update header to show "Good morning/afternoon/evening, [Store Name]!"
- Simplify the subtitle text

### 3. Enhance SellerLayout with PWA Improvements
Port the robust PWA handling from AdminLayout to improve iOS stability.

**File:** `src/components/seller/SellerLayout.tsx`
- Add iOS keyboard viewport handling (`--chat-vvh` CSS variable pattern)
- Add chat page detection for messaging routes
- Improve document scroll locking for chat contexts
- Ensure proper safe-area handling matches admin

### 4. Standardize Quick Actions Grid
Ensure the quick actions grid matches the admin dashboard pattern exactly.

**File:** `src/pages/seller/SellerDashboard.tsx`
- Update grid to use 3-column layout consistently (matching admin)
- Wrap in a Card component with header like admin
- Use muted/50 background patterns for items

### 5. Update Dashboard Card Layout
Reorganize cards to follow admin dashboard's vertical flow pattern.

**File:** `src/pages/seller/SellerDashboard.tsx`
- Move greeting to top with simplified layout
- Group related cards (stats, health, activity)
- Apply consistent card border and background classes

### 6. Add Seller-Specific Announcements Section (Optional Enhancement)
Consider adding a store announcements section similar to admin, but for seller promotions/notes.

**Decision Point:** This can be added in a future iteration if needed.

## Technical Details

### Component Reuse
```
AdminStatCard props:
- label: string
- value: string | number  
- valueColor: 'default' | 'green' | 'blue' | 'yellow' | 'orange' | 'destructive' | 'primary'
- subtitle?: string
- className?: string
```

### Example Transformation
Current:
```tsx
<Card>
  <CardHeader>
    <CardTitle>Total Revenue</CardTitle>
    <DollarSign />
  </CardHeader>
  <CardContent>
    <div className="text-2xl font-bold">{formatCurrency(...)}</div>
    <p className="text-xs">Lifetime earnings</p>
  </CardContent>
</Card>
```

After:
```tsx
<AdminStatCard
  label="Total Revenue"
  value={formatCurrency(store?.total_revenue || 0)}
  valueColor="default"
  subtitle="Lifetime earnings"
/>
```

## Files Modified
1. `src/pages/seller/SellerDashboard.tsx` - Main dashboard refactor
2. `src/components/seller/SellerLayout.tsx` - PWA enhancements (if needed)

## Preserved Seller-Specific Elements
- TOS Warning Banner (critical for compliance)
- Store Link Card (unique to sellers)
- Store Health Score widget (seller-specific metrics)
- NotificationCenter (commerce-focused activity feed)
- Pending Items Alert (moderation queue visibility)

## Benefits
1. **Reduced code duplication** - Reuse AdminStatCard and patterns
2. **Consistent UX** - Users moving between admin and seller dashboards will feel familiar
3. **Improved PWA stability** - Port proven iOS handling
4. **Easier maintenance** - Single pattern to update and improve
5. **Professional appearance** - Consistent design language across the platform

