

## Move Store Info Between Image and Details (with Banner)

Currently the card layout is:
1. Product image (with store name overlaid at bottom)
2. Category, product name, price

The new layout will be:
1. Product image (clean, no overlay)
2. Store banner strip with logo, name, and trust badges
3. Category, product name, price

### Changes

**`src/components/landing/PWARecentReleases.tsx`**

1. Add `banner_url` to the `RecentProduct` interface's `stores` type and to the Supabase select query.
2. Remove the gradient overlay from inside the product image area.
3. Add a new store banner row between the image and the info section -- a short strip (h-8) using the store's `banner_url` as a background with a dark overlay, containing the store logo, name, and verified/trusted badges.
4. If no banner exists, fall back to a flat `bg-muted` strip.

**`src/components/landing/PWALandingHero.tsx`**

Apply the same query and interface changes so the `PWAProductCard` in the featured grid also includes `banner_url` in its store data (for consistency), and restructure its card the same way -- store info between image and details instead of overlaid on the image.

