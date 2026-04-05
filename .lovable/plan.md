

## Enterprise-Level Sidebar Overhaul

Redesign the customer sidebar to feel like a premium SaaS product (think Linear, Notion, Discord) rather than a simple nav menu.

### Current Issues
- Group headers feel lightweight (small uppercase labels)
- Quick stats pills with borders look cluttered
- No visual hierarchy between primary and secondary actions
- Missing subtle polish (hover states, micro-animations, spacing rhythm)
- Sign-out removed but no footer content — sidebar ends abruptly

### Design Direction

```text
┌──────────────────────────┐
│ ◐ Eclipse            ◀  │  ← Branded header (unchanged)
├──────────────────────────┤
│  [Avatar] DisplayName    │
│           @username      │
│           £0.00 · + Add  │  ← Tighter profile row
│                          │
│  ⚡ Seller Dashboard     │  ← CTA (unchanged)
├──────────────────────────┤
│  🏠 Home            ←── │  ← Active: filled bg + left accent
│  🛡 Admin Dashboard      │
│                          │
│  MY ACCOUNT         ───  │  ← Divider line instead of chevron
│    👤 Profile            │
│    🔔 Notifications  3   │
│    🛒 Cart               │
│                          │
│  EXPLORE            ───  │
│    ▦ All Products        │
│    🏪 All Stores         │
│    ...                   │
│                          │
├──────────────────────────┤
│  6 orders · 0 wishlist   │  ← Stats moved to footer as subtle text
│  v2.4 · Status: Online   │
└──────────────────────────┘
```

### Changes — Single file: `CustomerSidebar.tsx`

1. **Remove quick stats pills from profile section** — Move orders/wishlist count to a minimal footer row (text only, no borders/pills)

2. **Replace group chevron toggles with cleaner dividers** — Use a thin `border-t` separator between groups instead of collapsible chevrons. Groups stay always-open (remove Collapsible wrapper). This matches Linear/Notion where sidebar sections are always visible.

3. **Refine nav item hover states** — Add `group` class with subtle left-border reveal on hover (2px primary, opacity transition). Remove the current heavy `border-l-[3px]` active style and replace with a softer `bg-primary/10` fill + `font-semibold` text treatment.

4. **Add a polished footer** — Below the nav, add a slim footer showing: orders count, wishlist count (as plain text links), app version, and a green status dot — all in `text-[11px] text-muted-foreground`.

5. **Tighten spacing** — Reduce nav item vertical padding from `py-2.5` to `py-2`. Reduce group gaps. Overall sidebar feels denser and more professional.

6. **Remove the X close button reference** — Already done, just ensure no remnants.

### What stays the same
- Profile section layout (avatar + name + balance)
- Seller Dashboard CTA gradient button
- Collapsed sidebar behavior
- All navigation links and routes
- Mobile drawer behavior

