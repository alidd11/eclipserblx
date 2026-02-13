

# Dead Code Cleanup Plan

After thorough investigation, I found several files and hooks that are completely unused (never imported anywhere). Here's what's safe to remove and what should stay.

---

## Safe to Remove (confirmed zero imports)

### 1. Orphaned Pages (not in any route or import)
- **`src/pages/MarketplaceComingSoon.tsx`** -- Not referenced in AppRoutes or anywhere else. Likely a placeholder that was replaced by the live Marketplace page.
- **`src/pages/ThreadDetail.tsx`** -- Not in any route. Appears to be leftover from a forum feature that was never fully wired up.

### 2. Unused Hooks (never imported by any component)
- **`src/hooks/usePrefetch.ts`** -- Zero imports anywhere. Was likely meant for pre-loading data but never connected.
- **`src/hooks/useEmbeddedPayment.ts`** -- Zero imports. Payment flows use `EmbeddedPaymentModal` directly instead.
- **`src/hooks/useNativeApp.ts`** -- Zero imports. Capacitor/native app detection hook that nothing uses.
- **`src/hooks/useResponsiveColumns.ts`** -- Zero imports. Grid column calculator that was never adopted.

### 3. Unused Components (never imported)
- **`src/components/NavLink.tsx`** -- Custom NavLink wrapper with zero imports. All components use `NavLink` directly from `react-router-dom`.
- **`src/components/admin/KeyboardDebugOverlay.tsx`** -- Debug-only overlay with zero imports. Was used during iOS PWA keyboard debugging and left behind.
- **`src/components/forum/CreateThreadDialog.tsx`** -- Zero imports. Part of the incomplete forum feature.
- **`src/components/forum/GeneralChatChannel.tsx`** -- Zero imports. Same orphaned forum feature.
- **`src/components/recommendations/RecommendedProducts.tsx`** -- Zero imports (and the only consumer of `useAIRecommendations`).
- **`src/hooks/useAIRecommendations.ts`** -- Only imported by the unused `RecommendedProducts.tsx` above, so also dead.

### 4. Entire Orphaned Directories (all contents unused)
- **`src/components/forum/`** -- Both files inside are unused. Can remove the whole folder.
- **`src/components/recommendations/`** -- Single file inside is unused. Can remove the whole folder.

---

## Keep (confirmed in use)
These were investigated but are actively used:
- `useCountUp` -- used by StatsCard
- `useFormPersistence` -- used across 16+ files
- `useDropZone` -- used in 5+ files
- `useNetworkQuality` -- used by PWAWrapper
- `useCurrentIp` -- used by admin Users page
- `useSwipeGesture` -- used by ProductDetail and StorePage
- `useFeatureFlag` -- used by 5 files
- `useVideoThumbnail` -- used by VideoThumbnail component (which is used)
- `usePlatform` -- used by PaymentMethodDisplay
- `useBackgroundPush` -- used by 3 files
- `useBiometricAuth` -- used by admin Settings and Login
- `useAdminTextScaling` -- used by AdminLayout
- `useStaffPresence` -- used by AdminLayout
- `useSmartSearch` -- used by SearchCommandPalette
- `AdminStatCard` -- used across 9+ admin pages
- `IpBanCheck` -- used in App.tsx
- `LanguageSwitcher` -- used in Header and Footer
- `ConnectionErrorBoundary` -- used in App.tsx
- `HeroBanner` -- used by LandingHero and PWALandingHero
- All bot components -- used by ProductDetail and MyPurchases

---

## Summary

| Category | Files to Remove | Risk |
|----------|----------------|------|
| Orphaned pages | 2 | None -- no routes point to them |
| Unused hooks | 6 (including useAIRecommendations) | None -- zero consumers |
| Unused components | 5 | None -- zero imports |
| **Total** | **13 files** | **Zero breakage risk** |

---

## Technical Details

The removal is straightforward file deletion with no cascading effects since every file identified has **zero imports** across the entire codebase. No database tables, edge functions, or routes reference them.

Files to delete:
```text
src/pages/MarketplaceComingSoon.tsx
src/pages/ThreadDetail.tsx
src/hooks/usePrefetch.ts
src/hooks/useEmbeddedPayment.ts
src/hooks/useNativeApp.ts
src/hooks/useResponsiveColumns.ts
src/hooks/useAIRecommendations.ts
src/components/NavLink.tsx
src/components/admin/KeyboardDebugOverlay.tsx
src/components/forum/CreateThreadDialog.tsx
src/components/forum/GeneralChatChannel.tsx
src/components/recommendations/RecommendedProducts.tsx
```

