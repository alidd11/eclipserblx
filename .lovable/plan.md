

## Unified UX System — Enterprise Device Adaptation Layer

### Problem

The codebase has **7+ independent device/platform detection mechanisms** scattered across 40+ files, each implementing its own logic inline:

1. `useIsMobile()` — breakpoint-based (768px), used in ~20 files
2. `usePlatform()` — UA-based device detection, used in 1 file
3. `useIOSKeyboardFix()` — keyboard visibility, used in 2 files
4. `useIOSChatKeyboard()` — chat-specific keyboard handling, used in 3 files
5. `useNetworkQuality()` — connection speed, used in **0 files** (dead code)
6. `useEdgeSwipe()` — touch gesture, used in 1 file
7. `useSwipeGesture()` — another touch gesture, used in 1 file
8. Inline `isStandalone` detection — copy-pasted in **6 files** (AdminLayout, SellerLayout, InstallPrompt, AdminInstallPrompt, NotificationSettingsCard, PWAAdminRedirect)
9. Inline `isPWA` detection — copy-pasted in **2 more files** (StaffChatRoom, PWAWrapper)

An enterprise company would have **one unified device context** that all components consume, not 9 ad-hoc detection patterns.

---

### What Changes

#### 1. Create `useDevice()` — Single Source of Truth

A new `src/hooks/useDevice.tsx` context provider that consolidates all device state into one place:

```text
useDevice() returns:
├── isMobile        (breakpoint: <768px)
├── isTablet        (breakpoint: 768-1024px)
├── isDesktop       (breakpoint: >1024px)
├── isStandalone    (PWA installed mode)
├── isIOS / isAndroid / isSafari
├── supportsApplePay / supportsGooglePay
├── networkQuality  ('low' | 'medium' | 'high')
├── prefersReducedMotion
└── isKeyboardVisible
```

This replaces: `useIsMobile`, `usePlatform`, `useNetworkQuality`, `useReducedMotion` (partially), and all inline `isStandalone`/`isPWA` checks.

#### 2. Delete Dead Code

- **`useNetworkQuality.ts`** — zero consumers, delete entirely
- **`useIOSKeyboardFix.ts`** — merge into `useDevice` (only 2 consumers)
- **`usePlatform.ts`** — merge into `useDevice` (only 1 consumer)

#### 3. Consolidate Gesture Hooks

- **`useSwipeGesture.ts`** — only used in ProductDetail for image swiping, keep as-is (purpose-specific)
- **`useEdgeSwipe.ts`** — only used in LayoutShell for drawer, keep as-is (purpose-specific)
- These are correctly scoped; no consolidation needed

#### 4. Migrate Consumers

Replace all inline `isStandalone` detection in 6 files with `const { isStandalone } = useDevice()`:
- `AdminLayout.tsx` — remove 8 lines of standalone detection
- `SellerLayout.tsx` — remove 8 lines of standalone detection
- `InstallPrompt.tsx` — remove `isStandalone()` function
- `AdminInstallPrompt.tsx` — remove `isStandalone()` function
- `NotificationSettingsCard.tsx` — remove inline `isPWA` check
- `StaffChatRoom.tsx` — remove inline `isPWA` check

Replace `useIsMobile()` imports in ~20 files with `const { isMobile } = useDevice()`.

Replace `usePlatform()` in `PaymentMethodDisplay.tsx` with `useDevice()`.

Replace `useIOSKeyboardFix()` in `StoreMessages.tsx` and `SellerMessages.tsx` with `useDevice()`.

#### 5. Add `DeviceProvider` to App.tsx

Wrap below `AuthProvider` so all components have access.

---

### Steps

1. **Create `src/hooks/useDevice.tsx`** — context provider combining breakpoint listener, UA detection, standalone detection, network quality, and keyboard visibility into one subscription
2. **Delete** `useNetworkQuality.ts`, `useIOSKeyboardFix.ts`, `usePlatform.ts`
3. **Keep** `use-mobile.tsx` as a thin re-export (`export const useIsMobile = () => useDevice().isMobile`) for backward compat during migration
4. **Update 6 files** with inline `isStandalone` — replace with `useDevice()`
5. **Update ~20 files** using `useIsMobile` — switch import to `useDevice`
6. **Update `PaymentMethodDisplay.tsx`** — replace `usePlatform()` with `useDevice()`
7. **Update `StoreMessages.tsx` and `SellerMessages.tsx`** — replace `useIOSKeyboardFix()` with `useDevice()`
8. **Add `DeviceProvider`** to `App.tsx` provider tree
9. **Verify build** passes with zero errors

### Files Changed
- **Create**: `src/hooks/useDevice.tsx`
- **Delete**: `src/hooks/useNetworkQuality.ts`, `src/hooks/useIOSKeyboardFix.ts`, `src/hooks/usePlatform.ts`
- **Edit**: `src/hooks/use-mobile.tsx` (thin re-export wrapper)
- **Edit**: `src/App.tsx` (add DeviceProvider)
- **Edit**: `src/components/admin/AdminLayout.tsx`, `src/components/seller/SellerLayout.tsx`, `src/components/pwa/InstallPrompt.tsx`, `src/components/pwa/AdminInstallPrompt.tsx`, `src/components/account/NotificationSettingsCard.tsx`, `src/components/chat/StaffChatRoom.tsx` (replace inline standalone)
- **Edit**: `src/components/payments/PaymentMethodDisplay.tsx` (replace usePlatform)
- **Edit**: `src/pages/StoreMessages.tsx`, `src/pages/seller/SellerMessages.tsx` (replace useIOSKeyboardFix)
- **Edit**: ~15 additional files replacing `useIsMobile` imports

### Impact
- One device context subscription per app mount instead of 20+ independent listeners
- Zero copy-pasted standalone detection
- 3 dead/redundant hooks deleted
- Every component gets consistent device state from the same source
- Adding new device capabilities (e.g., `hasNotch`, `supportsHaptics`) is a one-line addition to the provider instead of a new hook

