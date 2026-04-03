

# Add Store Custom Pages to Store Sidebar

## Problem
Published store pages (FAQ, Returns Policy, etc.) don't appear in the store sidebar automatically. Currently, sellers must manually add them as nav links via StoreNavEditor — an extra step most will miss.

## Solution
Fetch all published `store_pages` directly in the StoreSidebar and render them as navigation links in the existing "Pages" group, merged with any custom nav links the seller has added. This means pages appear automatically when published, with no extra configuration needed.

## Changes

### File: `src/components/store/StoreSidebar.tsx`
- Add a query to fetch published `store_pages` for the current store (by slug lookup, similar to the existing nav links query)
- Merge published pages into the "Pages" nav group alongside existing custom nav links
- Deduplicate: if a custom nav link already points to a store page URL, skip the auto-generated entry for that page
- Each page links to `/store/{storeSlug}/page/{pageSlug}`
- The "Pages" group appears whenever there are published pages OR custom nav links (currently only shows for custom nav links)

### No other files need changes
The store page route already exists; this just makes the pages discoverable from the sidebar.

