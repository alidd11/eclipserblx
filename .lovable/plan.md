

## Improve Ticket Pages Layout

The current ticket detail page has separate Cards for the message area and reply input, and the messages container uses `max-h-[50vh]` which can be too restrictive on mobile (especially with the header and stats taking space). The ticket list page also feels fragmented with separate stat cards and ticket cards.

### Changes

**1. `SupportTicketDetail.tsx` -- Unified chat-style layout**
- Remove the separate Card wrappers for messages and reply input
- Use a single unified container that fills available viewport height
- Replace `max-h-[50vh]` with a flex layout: header at top, messages area grows to fill space (`flex-1 overflow-y-auto`), reply input pinned at bottom
- This mimics a native messaging app where the conversation scrolls freely and the input stays fixed
- Structure:
```text
┌─────────────────────┐
│ Back + Title + Badge │  (fixed)
├─────────────────────┤
│                     │
│   Messages scroll   │  (flex-1, overflow-y-auto)
│                     │
├─────────────────────┤
│ Reply input         │  (fixed at bottom)
└─────────────────────┘
```

**2. `SupportTickets.tsx` -- Consolidated list page**
- Merge the 3 stat counters into a single compact row inside one card (inline badges/chips instead of 3 separate cards)
- This saves vertical space and feels more integrated
- Keep the ticket list as-is (each ticket is a navigable item, separate cards make sense there)

**3. `TicketCard.tsx` -- No changes needed**
- Individual ticket cards work well as tappable list items

### Technical details

- The detail page will use `h-[calc(100dvh-var(--header-height,64px)-var(--tab-bar-height,0px))]` with `flex flex-col` to create a full-height chat layout
- Messages area: `flex-1 min-h-0 overflow-y-auto` with padding
- Reply area: pinned at bottom with border-top separator instead of a separate card
- Stats on list page: single card with 3 inline sections divided by borders

