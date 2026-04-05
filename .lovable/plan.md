

## Fix: Broken Flex Height Chain on Chat/Ticket Pages

### Root Cause

On chat and ticket pages, the flex height chain from the viewport-constrained outer wrapper down to the chat composer is broken at **one specific point** in `LayoutShell.tsx`:

```text
wrapper (max-h: --chat-vvh) ✓
  inner column (flex-1 min-h-0) ✓
    main (flex: 1 1 0%, flex-col) ✓
      div.w-full  ← ✗ BREAKS HERE — plain block div, no flex participation
        div.contentClassName (flex-1 flex-col min-h-0) ✓
          StaffChatRoom / TicketDetail ✓
```

The `<div className="w-full">` on line 142 of `LayoutShell.tsx` is a plain block-level element. It does not participate in the flex column, so `flex-1` on its children has no effect. The chat content cannot fill the available space, causing the black gap.

### Fix (2 files, ~6 lines changed)

**1. `LayoutShell.tsx`** — Add a new prop `chatMode` (boolean) to LayoutShell. When true, the inner `<div className="w-full">` becomes `flex-1 flex flex-col min-h-0 overflow-hidden w-full` so the flex height chain is unbroken. Footer is already hidden on chat pages so no conflict.

```tsx
// Line 142 — change from:
<div className="w-full">

// To:
<div className={cn("w-full", chatMode && "flex-1 flex flex-col min-h-0 overflow-hidden")}>
```

**2. `AdminLayout.tsx`** — Pass `chatMode={isChatPage}` to LayoutShell so it knows when to apply the flex constraint.

This is the minimal, surgical fix — one prop, one conditional class. No structural refactoring needed.

### Technical Detail

- `cn` utility is already imported in LayoutShell
- The `chatMode` prop only needs to be added to the `LayoutShellProps` interface
- The `isChatPage` detection in AdminLayout already covers `/admin/messages`, `/admin/live-chat`, and `/admin/customer-tickets/`

