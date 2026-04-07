
# Early Access — Enterprise Product Drop System

## Research Summary
Top platforms (Nike SNKRS, Shopify, SNIPES Reserve, Supreme) use multi-strategy early access:
- **Timed windows** — hours/days before public release (current feature, basic)
- **Loyalty-gated** — only repeat customers or high-spend buyers
- **Follower-gated** — only store followers get early access
- **Password/link-gated** — private access via secret link

## What Changes

### Seller EarlyAccessCard → Enterprise "Launch Strategy" Card
Replace the simple toggle + hours input with a multi-option card:

| Strategy | Description | Who Gets Access |
|----------|-------------|-----------------|
| **Timed Window** | Access X hours before public release | All eligible customers |
| **Followers Only** | Only store followers see it early | Users who follow the store |
| **Repeat Buyers** | Customers with 2+ orders from this store | Loyal customers |
| **Private Link** | Generate a secret URL for VIP sharing | Anyone with the link |

### Database
- Add `early_access_strategy` column to `products` (`timed`, `followers`, `repeat_buyers`, `private_link`) — defaults to `timed` for backwards compatibility
- Add `early_access_link_token` for private link strategy

### UI Changes
- Replace `EarlyAccessCard` with new `LaunchStrategyCard` — radio-style strategy picker with description cards
- Timed: keeps the hours input
- Followers: no extra config needed
- Repeat Buyers: optional min-order threshold (default 2)
- Private Link: auto-generates a shareable URL with copy button

### Files
| File | Change |
|------|--------|
| Migration | Add `early_access_strategy`, `early_access_min_orders`, `early_access_link_token` to products |
| `src/components/seller/EarlyAccessCard.tsx` | Replace with `LaunchStrategyCard` |
| `src/pages/seller/SellerProductEditor.tsx` | Wire new component |
| `src/pages/seller/product-editor/types.ts` | Update form types |
| `src/pages/seller/product-editor/useProductEditorData.ts` | Map new fields |
