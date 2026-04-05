

## Enterprise-Level Seller Pro Page Redesign

The current page is a basic comparison table with a centered header — functional but generic. Enterprise pricing pages (Stripe, Linear, Vercel) use distinct visual hierarchy, feature grouping, social proof, and clear value framing.

---

### Problems

1. **Flat comparison table** — 15 rows in a single undifferentiated list. Hard to scan, no feature grouping.
2. **No value framing** — No hero stats ("Save £X/year"), no ROI messaging, no testimonials or social proof.
3. **Weak visual hierarchy** — Free and Pro columns look nearly identical. Pro column should feel premium.
4. **No feature highlights** — Top 3-4 key selling points should be called out above the table as visual cards, not buried in rows.
5. **Active subscription card** uses `Card` wrapper — inconsistent with flattened enterprise style.
6. **CTA is at the bottom** — enterprise pages put the CTA both above and below the fold.
7. **Mobile layout** — 3-column grid is cramped on 440px viewport. Feature labels get cut off.

---

### Planned Changes

#### 1. Hero Section with Value Props
Replace the simple centered text with a stronger hero:
- Large headline: "Grow faster with Eclipse Pro"
- Subline with concrete savings: "Save 5% on every sale. Keep more of what you earn."
- 3 highlight cards below: **Lower Commission (10%)**, **Unlimited Products**, **Priority Review** — each with icon, title, one-line description
- Primary CTA button right in the hero (duplicate at bottom too)

#### 2. Grouped Comparison Table
Split the 15-row flat table into 3-4 labeled sections:
- **Selling** — Commission, file size, images, listings
- **Store Customization** — Themes, nav links, announcement bar, scheduled banner, store pages
- **Growth Tools** — Analytics, discounts, ad credit, priority review
- **Brand** — PRO badge

Each group gets a small section header (`text-xs uppercase tracking-wide text-muted-foreground`). This makes scanning instant.

#### 3. Pro Column Visual Emphasis
- Pro column header gets a subtle `bg-primary/5 border border-primary/20 rounded-xl` wrapper
- "RECOMMENDED" badge on the Pro column
- Pro values rendered in `text-foreground font-medium` vs Free in `text-muted-foreground`

#### 4. Mobile-Responsive Layout
- On mobile (<640px), switch from 3-column grid to a stacked card layout: show Pro features as a checklist with checkmarks, and a collapsible "Compare with Free" section
- Highlight cards stack vertically

#### 5. Active Subscription — Flatten
Replace `Card` wrapper with a clean `border border-primary/20 rounded-xl bg-primary/5 p-4` div, matching the flattened enterprise style.

#### 6. FAQ Section
Add 3-4 common questions at the bottom (collapsible):
- "Can I cancel anytime?"
- "What happens to my products if I downgrade?"
- "Do I keep the PRO badge after cancelling?"
- "How does the ad credit work?"

Uses simple `details/summary` or an accordion pattern.

---

### Technical Details

**File modified:** `src/pages/seller/SellerProPage.tsx` — Full redesign of the page content

- Group `comparisonRows` into sections: `{ section: string, rows: Row[] }[]`
- Add `HighlightCard` inline component for the 3 hero feature cards
- Add FAQ data array with `Collapsible` from radix or simple `details` elements
- Mobile breakpoint: `sm:grid-cols-3` for table, stack on mobile with a different render
- Duplicate CTA in hero and after FAQ
- Remove `Card`/`CardHeader`/`CardContent` wrappers, use plain divs with borders

