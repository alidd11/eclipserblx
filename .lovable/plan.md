

## Problem

Two distinct issues causing the persistent bottom gap:

### 1. Chat pages: input bar gap after keyboard dismissal
The `useIOSChatKeyboard` hook sets `--chat-safe-bottom` to `calc(env(safe-area-inset-bottom) + 4px)` when keyboard is closed. On notched iPhones, that's ~38px of bottom padding on the input bar — the visible "big gap."

### 2. Non-chat admin pages: double safe-area padding
`AdminLayout` applies safe-area padding in **two** places simultaneously for non-chat pages:
- `mainClassName`: `pb-[env(safe-area-inset-bottom)]`
- `contentClassName`: `pb-[calc(1rem+env(safe-area-inset-bottom))]`

This stacks to ~68px+ of bottom padding on notched devices.

---

## Fix

### A. Simplify `useIOSChatKeyboard` (1 file)
- **Keyboard closed**: set `--chat-safe-bottom` to `env(safe-area-inset-bottom)` (remove the extra `+ 4px`)
- **Keyboard open**: set `--chat-safe-bottom` to `4px` (just a small gap, since the keyboard itself provides the bottom boundary)
- This eliminates the extra gap without removing safe-area protection

### B. Fix double safe-area in `AdminLayout` (1 file)
- Remove `pb-[env(safe-area-inset-bottom)]` from the non-chat `mainClassName`
- Keep the `contentClassName` version which already includes page padding + safe-area
- This single change fixes all non-chat admin pages

### C. Same fix in `SellerLayout` if duplicated there
- Check and apply identical pattern

---

### Files to change
1. `src/hooks/useIOSChatKeyboard.ts` — remove `+ 4px` from keyboard-closed value
2. `src/components/admin/AdminLayout.tsx` — remove double safe-area from non-chat mainClassName
3. `src/components/seller/SellerLayout.tsx` — same if applicable

No functional changes to chat features (mentions, reactions, replies, attachments all untouched).

