

# Centralise Store Data Access

## Problem

Store data fetching is duplicated across 6+ pages, each with inconsistent query logic:

| Page | Checks `is_active` | Checks `status=approved` | Checks `seller_agreements` |
|------|-------|--------|---------|
| StorePage | Yes | Yes | Yes |
| StoreAbout | Yes | No | No |
| StoreReviewsPage | Yes | No | No |
| StoreCustomPage | No | No | No |
| StoreStandalonePage | Via hook | Via hook | Via hook |
| ProductDetail (via store join) | No | No | No |

This inconsistency is why "Store Not Found" errors occur -- some pages miss critical filters, and changes to access rules require updating every page individually.

## Solution

Create a single `usePublicStore(slug)` hook that all store-facing pages use.

### 1. Create `src/hooks/usePublicStore.ts`

A centralised hook that:
- Queries `stores` with `is_active = true` and `status = 'approved'`
- Checks `seller_agreements` for a valid ToS signature
- Uses a consistent React Query key (`['public-store', slug]`) so data is shared/cached across pages
- Returns `{ store, isLoading, error, notFound }` 
- Uses `PUBLIC_STORE_COLUMNS` by default, with an optional minimal mode for pages that need fewer columns

### 2. Refactor all public store pages

Replace the inline queries in each page with `usePublicStore`:

- **StorePage.tsx** -- remove the 30-line inline query + agreement check, use the hook
- **StoreAbout.tsx** -- replace inline query
- **StoreReviewsPage.tsx** -- replace inline query (currently missing `status=approved` check)
- **StoreCustomPage.tsx** -- replace inline store lookup (currently missing both `is_active` and `status` checks)
- **ProductDetail.tsx** -- no change needed (store data comes via join on the product query)

### 3. Shared "Store Not Found" component

Create a small `StoreNotFound` component used by all pages, replacing 5 different inline "not found" UIs with one consistent design.

## Technical details

```text
src/hooks/usePublicStore.ts        -- NEW: centralised hook
src/components/store/StoreNotFound.tsx -- NEW: shared fallback UI
src/pages/StorePage.tsx            -- refactor to use hook
src/pages/StoreAbout.tsx           -- refactor to use hook  
src/pages/StoreReviewsPage.tsx     -- refactor to use hook
src/pages/StoreCustomPage.tsx      -- refactor to use hook
```

No database changes required -- the recent `seller_agreements` RLS migration already ensures anon users can read agreement records.

