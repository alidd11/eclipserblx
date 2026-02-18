

# Seller Tickets: Better Detail View

## Problem
The current ticket detail uses a `Dialog` (modal) which is cramped on mobile — text gets truncated, the chat area is tiny, and you have to scroll through multiple dense sections in a small viewport.

## Solution
Replace the Dialog-based ticket detail with a **full-screen Drawer** (bottom sheet) on mobile that uses the full viewport height, giving much more room for the conversation and ticket info.

### Changes

**1. Convert Dialog to Drawer (src/pages/admin/SellerTickets.tsx)**

- Replace the `Dialog` + `DialogContent` wrapper with the existing `Drawer` + `DrawerContent` component (from vaul)
- Use `h-[95dvh]` so it covers nearly the full screen on mobile
- Reorganize the layout:
  - **Compact header**: Ticket number + status badges + close button in one tight row
  - **Subject + category** on the next line (no truncation)
  - **Collapsible seller info**: Use an `Accordion` or a small toggle so it doesn't eat space by default — show seller name inline, expand for email/Discord/Roblox/store details
  - **Larger chat area**: Give the `ScrollArea` for messages `flex-1` so it fills all remaining space
  - **Sticky input bar**: Keep the message input + status controls pinned at the bottom

**2. Ticket list cards — show more text**
- Remove `truncate` from the subject line in the ticket list so full subjects are visible
- Use `line-clamp-2` instead so up to 2 lines show before ellipsis

### Technical Details

- Import `Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription` from `@/components/ui/drawer`
- The Drawer's `DrawerContent` already handles safe-area-inset-bottom for iOS
- Keep the resolve sub-dialog as a regular `Dialog` since it's a small confirmation
- Seller info section will use a `Collapsible` from Radix (already installed) — collapsed by default showing just the seller name, expandable to show full details
- Messages `ScrollArea` gets `flex-1 min-h-0` to fill available space
- No database changes needed

