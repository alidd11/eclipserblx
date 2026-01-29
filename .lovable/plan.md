
# External Links in PWA: Open in Default Browser

## Overview
Currently, when users tap external links (like Discord OAuth for bot installation) in the PWA, they open within the PWA's webview. This causes issues with:
- OAuth flows not completing properly
- Users getting stuck in the in-app browser
- The safe-area layout glitch when returning from external links

The solution involves creating a unified utility that intelligently handles external links based on the platform (Native Capacitor vs PWA vs Regular Web).

---

## Solution Architecture

```text
┌─────────────────────────────────────────────────────────────────┐
│                    openExternalUrl(url)                         │
└────────────────────────────┬────────────────────────────────────┘
                             │
              ┌──────────────┴──────────────┐
              ▼                              ▼
     ┌────────────────┐            ┌────────────────────┐
     │ Capacitor Native │          │    Web (PWA/Browser)  │
     └────────┬────────┘            └──────────┬──────────┘
              │                                │
              ▼                                ▼
   ┌──────────────────────┐      ┌─────────────────────────────┐
   │ @capacitor/browser   │      │ Check if Standalone PWA     │
   │ Browser.open({url})  │      └──────────────┬──────────────┘
   │                      │                     │
   │ Opens SFSafariView   │      ┌──────────────┴──────────────┐
   │ or Chrome Custom Tabs│      ▼                              ▼
   └──────────────────────┘  ┌────────────┐            ┌──────────────┐
                             │ Standalone │            │ Regular Web  │
                             │ PWA        │            │ Browser      │
                             └─────┬──────┘            └──────┬───────┘
                                   │                          │
                                   ▼                          ▼
                         window.location.href       window.open(_blank)
```

---

## Changes Required

### 1. Install `@capacitor/browser` Plugin
Add the Capacitor Browser plugin as a dependency for native app builds.

```bash
npm install @capacitor/browser
npx cap sync
```

### 2. Create Utility: `src/lib/externalBrowser.ts`
A new utility file that provides a unified `openExternalUrl()` function:

```typescript
import { Capacitor } from '@capacitor/core';

export async function openExternalUrl(url: string): Promise<void> {
  // Native Capacitor app - use Browser plugin
  if (Capacitor.isNativePlatform()) {
    const { Browser } = await import('@capacitor/browser');
    await Browser.open({ url });
    return;
  }
  
  // PWA standalone mode - use location.href 
  // (iOS PWA doesn't support window.open to Safari)
  const isStandalone = 
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true;
  
  if (isStandalone) {
    window.location.href = url;
  } else {
    // Regular browser - open in new tab
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}

export function isStandalonePWA(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true
  );
}
```

### 3. Update `AddToServerButton.tsx`
Replace `window.location.href` with the new utility:

```typescript
// Before
window.location.href = data.oauthUrl;

// After
import { openExternalUrl } from '@/lib/externalBrowser';
await openExternalUrl(data.oauthUrl);
```

### 4. Update Other External Link Handlers
Apply the same pattern to other places that open external URLs:
- `useSubscription.ts` - Stripe customer portal
- `useAdSubscription.ts` - Ad subscription portal
- `Checkout.tsx` - Stripe checkout
- `Advertise.tsx` - Ad checkout
- `DiscordLinkCard.tsx` - Discord OAuth linking

---

## Technical Details

| Platform | Behavior |
|----------|----------|
| **Capacitor iOS** | Opens `SFSafariViewController` (in-app Safari sheet) |
| **Capacitor Android** | Opens Chrome Custom Tabs |
| **iOS PWA** | Redirects using `location.href` (Safari opens, user returns via "back to app" button) |
| **Android PWA** | Uses `window.open` which opens Chrome |
| **Desktop Browser** | Opens new tab with `window.open` |

### Why PWAs Can't Open Default Browser Directly
iOS Safari's security model prevents PWAs from programmatically opening external URLs in Safari. The workarounds are:
1. **`location.href`** - Navigates the PWA away, requiring user to tap "back" in Safari to return
2. **`window.open`** - On iOS PWA, this opens an in-app browser sheet (not full Safari)

For bot OAuth flows, option 1 (`location.href`) is preferred because:
- The OAuth callback redirects back to the app
- It ensures full browser compatibility for the OAuth provider

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `src/lib/externalBrowser.ts` | **Create** - New utility for external URL handling |
| `src/components/bots/AddToServerButton.tsx` | **Modify** - Use new utility |
| `src/hooks/useSubscription.ts` | **Modify** - Use new utility (already has partial logic) |
| `src/pages/Checkout.tsx` | **Modify** - Use new utility |
| `src/components/account/DiscordLinkCard.tsx` | **Modify** - Use new utility |
| `package.json` | **Modify** - Add `@capacitor/browser` dependency |

---

## Summary
This solution provides a clean, unified approach to handling external links across all platforms:
- Native apps get the best experience with native in-app browsers
- PWAs navigate away but OAuth callbacks bring users back automatically  
- Regular browsers open new tabs as expected
- The utility is reusable across all external link scenarios
