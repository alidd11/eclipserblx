

## Enterprise-Level Customer-Facing Improvements

After auditing every customer-facing page, here are the remaining areas that feel rough compared to enterprise standards:

---

### 1. Cart Page — Flatten & Tighten
The cart uses heavy `Card` + `CardHeader` wrappers with large icons, inconsistent with the flattened style we applied to the product page.

- Remove `Card`/`CardHeader` wrappers from the items list and order summary — use flat sections with `border-t` dividers
- Replace the 3-column trust badge grid at the bottom (icons + labels) with the same compact inline strip pattern used on store pages
- Tighten header: remove the large `ShoppingBag` icon from the card header, use a simple `text-lg font-semibold` heading
- Normalize "Proceed to Checkout" button to `h-12` (currently `h-12` but uses `gradient-button` glow — keep, it's fine)

### 2. Checkout Page — Remove Visual Noise
- Replace `gaming-card` class with simple `border border-border rounded-xl` for the order summary, discount code, and payment sections — `gaming-card` feels gamey, not enterprise
- Normalize the "Get for Free" button from `h-14` to `h-12`
- Remove large icons from section headings (Tag, CreditCard, Gift icons before "Discount Code" / "Payment") — enterprise sites use text-only headings

### 3. Wishlist Page — Modernize Layout
- The large `Heart` icon (h-8 w-8) in the page header is oversized — reduce to `h-5 w-5` or remove entirely
- Wishlist cards use `Card` wrappers with `hover:shadow-md` — flatten to simple `border-b` list items for a denser, cleaner look
- Product images are `w-32 h-32` (too large) — reduce to `w-20 h-20` for tighter rows

### 4. Order Success Page — Cleaner Confirmation
- Replace `gaming-card` class with flat `border border-border rounded-xl` styling
- The success icon (green circle + CheckCircle) is oversized at `w-20 h-20` — reduce to `w-14 h-14`
- Normalize button order: primary CTA ("View My Downloads") first, secondary ("Continue Shopping") second

### 5. Empty States — Consistent Pattern
- Empty cart uses a `Card` with a gradient top line and oversized `w-20 h-20` icon container — simplify to a flat centered layout without `Card` wrapper, reduce icon to `w-12 h-12`
- Apply the same pattern to Wishlist empty state

---

### Files Changed
- **`src/pages/Cart.tsx`** — Flatten cards, inline trust signals, tighten header
- **`src/pages/Checkout.tsx`** — Replace `gaming-card`, remove heading icons, normalize button height
- **`src/pages/Wishlist.tsx`** — Reduce header icon, flatten card items to list rows, shrink thumbnails
- **`src/pages/OrderSuccess.tsx`** — Replace `gaming-card`, shrink success icon, reorder buttons

### Technical Details
- Replace all `gaming-card` classes in customer pages with `border border-border rounded-xl bg-card`
- Replace `Card`/`CardHeader`/`CardContent` in Cart with plain `div` + `border-t border-border` dividers
- Wishlist items: change from `Card > CardContent > flex` to `div.border-b.border-border.py-4 > flex`, images from `w-32 h-32` to `w-20 h-20`
- Trust signals in Cart: replace 3-column grid with inline flex row matching `StoreTrustSignals` pattern

