
# Capacitor Native Screen Orientation Lock Implementation

## Overview
This plan adds true native screen orientation locking for iOS and Android using the `@capacitor/screen-orientation` plugin. This will physically prevent the device from rotating to landscape mode when running as a native app, providing a better experience than the current overlay-based solution which only blocks the UI after rotation.

## What This Solves
- **Current behavior**: The app rotates to landscape, then shows a blocking overlay asking users to rotate back
- **New behavior**: The device will refuse to rotate at all, keeping the app locked to portrait mode at the OS level

## Implementation Strategy

The solution uses a layered approach:
1. **Native apps (Capacitor)**: Use the Screen Orientation plugin for true OS-level locking
2. **PWA fallback**: Keep the existing overlay for web/PWA users where native locking isn't available

---

## Technical Details

### 1. Install the Capacitor Screen Orientation Plugin

Add the `@capacitor/screen-orientation` package to dependencies.

### 2. Create Native Orientation Utility (`src/lib/nativeOrientation.ts`)

A new utility module following the same pattern as `nativeKeyboard.ts`:

```text
┌─────────────────────────────────────────────────┐
│            nativeOrientation.ts                 │
├─────────────────────────────────────────────────┤
│ initNativeOrientation()                         │
│   - Checks if running on native platform        │
│   - Locks orientation to portrait               │
│   - Returns early on web/PWA                    │
├─────────────────────────────────────────────────┤
│ lockToPortrait()                                │
│   - Locks screen to portrait mode               │
├─────────────────────────────────────────────────┤
│ unlockOrientation()                             │
│   - Allows all orientations (if needed later)   │
├─────────────────────────────────────────────────┤
│ isOrientationLockSupported()                    │
│   - Returns true on native platforms            │
└─────────────────────────────────────────────────┘
```

### 3. Update App Initialization (`src/main.tsx`)

Initialize the native orientation lock when the app starts, alongside the existing native keyboard initialization.

### 4. Update OrientationLockOverlay Component

Modify the existing overlay to:
- Skip rendering entirely when running on native platforms (where true locking is active)
- Continue showing the overlay for PWA/web users where native locking isn't available

### 5. Update Capacitor Config (`capacitor.config.ts`)

Add the ScreenOrientation plugin configuration (though the plugin works with defaults).

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `package.json` | Modify | Add `@capacitor/screen-orientation` dependency |
| `src/lib/nativeOrientation.ts` | Create | Native orientation lock utilities |
| `src/main.tsx` | Modify | Initialize orientation lock on app start |
| `src/components/pwa/OrientationLockOverlay.tsx` | Modify | Skip overlay on native platforms |
| `capacitor.config.ts` | Modify | Add ScreenOrientation plugin config (optional) |

---

## User Steps After Implementation

After I implement these changes, you'll need to run these commands in your local project:

1. **Pull the latest changes**: `git pull`
2. **Install new dependency**: `npm install`
3. **Sync with native projects**: `npx cap sync`
4. **Rebuild and run**:
   - iOS: `npx cap run ios`
   - Android: `npx cap run android`

The orientation lock will now be enforced at the native OS level, preventing physical rotation entirely.
