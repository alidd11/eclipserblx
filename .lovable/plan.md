## Enterprise-Level Seller Products + Support Pages

### A. Seller Products Page

**Current problems:**
- Search wrapped in a `Card` with padding — unnecessary wrapper for a single input
- Stats cards missing — no at-a-glance product counts (Live, Pending, Inactive)
- Desktop table wrapped in `Card > CardHeader > CardContent` — heavy nesting
- Mobile cards use `Card > CardContent` — heavy for a list item
- "Product Moderation" info banner uses `Card` with large icon — should be a subtle inline note
- Pagination text is verbose

**Planned changes:**

1. **Add inline stats row** — Compact horizontal stats (Total, Live, Pending, Inactive) as a simple flex row with text, not cards. Positioned between header and search.

2. **Flatten search** — Remove `Card` wrapper, just a bare `Input` with search icon directly in the page flow.

3. **Flatten desktop table** — Remove `Card`/`CardHeader`/`CardContent` wrappers. Use a plain `div` with `border border-border rounded-xl overflow-hidden`. Table header uses `bg-muted/50` for subtle differentiation.

4. **Flatten mobile cards** — Replace `Card > CardContent` with `div.border-b.border-border.py-3` items (borderless list pattern matching enterprise style).

5. **Moderation notice** — Replace the `Card` info banner with a small `text-xs text-muted-foreground` note with an inline info icon, below the table.

6. **Tighten pagination** — Compact layout with page numbers.

---

### B. Seller Support (Ticket System)

**Current problems:**
- 3 stat `Card` components with `CardHeader`/`CardContent` — heavy for simple counts
- Ticket list items use `Card > CardContent` wrappers — heavy for a list
- Empty state uses `Card > CardContent` — unnecessary
- Category icon has `p-2 bg-muted rounded-lg` wrapper — slightly heavy

**Planned changes:**

1. **Flatten stats** — Replace 3 stat cards with a compact inline flex row: "3 open · 1 awaiting · 5 resolved" using colored text, no cards.

2. **Flatten ticket list** — Replace `Card > CardContent` per ticket with `div.border-b.border-border.py-3` items. Remove the icon's bg-muted wrapper.

3. **Flatten empty state** — Remove Card wrapper, use plain centered div.

4. **Tighten ticket detail dialog** — Replace `Card.bg-muted/50` for original message with a plain `div.border-l-2.border-border.pl-3` blockquote style. Replace resolution Card with same border-l pattern using green border.

---

### Technical Details

**Files modified:**
- `src/pages/seller/SellerProducts.tsx` — Flatten search/table/cards/moderation notice
- `src/pages/seller/SellerSupport.tsx` — Flatten stats/ticket list/detail dialog
