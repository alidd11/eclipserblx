
Goal: run a full admin chat + staff messages PWA keyboard stability audit, then implement a hardening pass so the keyboard no longer “disappears” on iOS installed app.

What I already audited
1) Chat layout stack
- `AdminLayout` drives chat pages with `height: var(--chat-vvh, 100dvh)` and sets `--chat-safe-bottom`.
- `useIOSChatKeyboard` updates CSS vars from `visualViewport.resize`.

2) Per-page keyboard logic
- `AdminChat` + `StaffMessages` each also attach their own `visualViewport.resize` listeners and use `useIOSKeyboardFix` (another listener).
- That means multiple independent viewport listeners are firing on the same keyboard transitions.

3) Input behavior differences (important)
- `StaffMessages` input enforces `fontSize: '16px'` (good for iOS).
- `AdminChat` input currently inherits default `Input` size (`text-sm`, effectively ~14px). This is a known iOS trigger for zoom/focus instability and can look like keyboard dismissal/disappearance.
- `LiveChat` already uses 16px and similar keep-visible behavior.

4) Runtime signals
- Console snapshot shows a React ref warning in command palette (`CommandDialog`/`SearchCommandPalette`) unrelated to chat keyboard directly, but worth cleaning to reduce render noise.

Most likely root causes
- Primary: Admin chat input font size below 16px in iOS PWA.
- Secondary: competing keyboard/viewport handlers (`useIOSChatKeyboard` + page-local resize effects + `useIOSKeyboardFix`) causing race conditions during open/close animation.
- Tertiary: slight inconsistency in bottom-safe-area padding behavior between admin/staff chat composers.

Implementation plan
Phase 1 — Stabilize keyboard behavior (highest priority)
1. Enforce iOS-safe input sizing consistently
- Set Admin Chat composer input to guaranteed 16px (match Staff/LiveChat).
- Keep touch focus strategy but avoid redundant focus churn.

2. Remove duplicate viewport race paths
- Keep one authoritative viewport mechanism for chat pages (layout-level CSS var source).
- Remove per-page “extra” resize timers in `AdminChat` and `StaffMessages` that duplicate the same scroll/resize reaction.
- Keep minimal scroll-to-bottom on focus + message change only.

3. Unify composer safe-area behavior
- Use `pb-[var(--chat-safe-bottom,...)]` consistently for both Admin Chat and Staff Messages.
- Avoid branching bottom padding on `isKeyboardVisible` where not needed.

Phase 2 — Harden focus/gesture flow
4. Normalize focus handlers
- Keep synchronous focus on touch/pointer for iOS PWA, but simplify to one deterministic path to prevent focus bounce.
- Ensure input wrappers on both pages are marked `data-gesture-exempt` to avoid accidental gesture interception.

5. Keep-visible behavior simplification
- Replace long staggered timeout chains with short, deterministic “focus + one delayed settle” pattern.
- Ensure mention popup open/close does not reflow input out of viewport.

Phase 3 — Full audit verification (every practical check)
6. Functional checks on both pages (`/admin/admin-chat`, `/admin/staff-messages`)
- First tap focuses input and opens keyboard.
- Type continuously; keyboard stays open.
- Send message; keyboard stays available and input remains visible.
- Open @mention list, select mention, continue typing.
- Add/remove attachment, continue typing.
- Switch between chats/pages; keyboard still stable.
- Background app → foreground; keyboard still works.
- Rotate device portrait/landscape.
- Return from non-chat admin pages back into chat.

7. Regression checks
- Scroll behavior remains smooth (`-webkit-overflow-scrolling: touch`).
- No grey strip/bottom gap regressions.
- No new console errors.

Technical details (for implementation)
- Files to update:
  - `src/pages/admin/AdminChat.tsx`
  - `src/pages/admin/StaffMessages.tsx`
  - `src/hooks/useIOSKeyboardFix.ts` (possibly reduce/remove usage in these two pages)
  - `src/components/admin/AdminLayout.tsx` (if minor safe-area harmonization needed)
  - optional cleanup: `src/components/ui/command.tsx` + `src/components/search/SearchCommandPalette.tsx` (ref warning)
- Guardrails:
  - Keep current auth/permissions untouched.
  - No backend schema/function changes needed.
  - Prefer one viewport source of truth for chat pages.

Expected outcome
- Admin Chat and Staff Messages behave like stable iOS messaging UIs in installed PWA mode: keyboard opens reliably, stays present while typing/sending/mentioning, and composer remains visible without jump/disappear behavior.
