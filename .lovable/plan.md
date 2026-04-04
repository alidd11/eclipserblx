

# Enterprise-Level Search Improvements

The current search system is functional but has gaps that real marketplaces like BuiltByBit, Gumroad, and Shopify don't have. Here's what to add, ordered by impact.

---

## 1. Full-Text Search with PostgreSQL `tsvector` (Biggest Win)

Currently, search uses `ilike` pattern matching which is slow, can't rank by relevance, and misses partial/plural matches ("script" won't match "scripting").

**Change**: Create a generated `search_vector` column on the `products` table using `tsvector`, with a GIN index. Replace all `ilike` queries with `websearch_to_tsquery` for proper full-text search with ranking.

- Handles typo-tolerant matching via trigram similarity (already have `pg_trgm`)
- Supports stemming ("scripts" matches "scripting")
- Native relevance scoring via `ts_rank_cd`
- Create a database function `search_products_v2` that combines tsvector ranking with trigram fallback

## 2. Search Suggestions / Autocomplete

Users currently see nothing until they type 2+ characters. Enterprise search shows instant suggestions.

**Change**: Create a `popular_searches` materialized view from `search_logs`, refreshed hourly. Add a lightweight edge function or direct query that returns top matching suggestions as the user types (after 1 character). Show these as typeahead pills in the command palette below the input.

## 3. Filters Panel on Search Results Page

The search page only has category chips and a sort dropdown. Enterprise search has a proper filter sidebar/sheet.

**Change**: Add a collapsible filter panel (sheet on mobile) with:
- Price range slider (min/max)
- Rating filter (4+ stars, 3+ stars)
- Free only toggle
- Store/seller filter (top stores as checkboxes)
- "Has reviews" toggle

These filters get encoded as URL params for shareable/bookmarkable search URLs.

## 4. "Did You Mean?" Spell Correction

When a search returns 0 results, suggest corrected queries using trigram similarity against known product names and popular search terms.

**Change**: Create an RPC `suggest_correction(query text)` that uses `similarity()` from `pg_trgm` to find the closest matching product name or popular search term. Display "Did you mean: X?" above empty results.

## 5. Search Analytics Dashboard (Seller-Facing)

Track what buyers search for so sellers can optimize listings.

**Change**: The `search_logs` table already exists. Add a "Search Trends" widget to the seller analytics page showing:
- Top search terms that led to their products
- Search terms with 0 results (opportunity gaps)
- Conversion rate from search to purchase

---

## Technical Details

### Database Migration
```sql
-- Add tsvector column with GIN index
ALTER TABLE products ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'B')
  ) STORED;

CREATE INDEX idx_products_search_vector ON products USING GIN (search_vector);

-- Search RPC with ranking + trigram fallback
CREATE FUNCTION search_products_v2(search_query text, ...)
  RETURNS TABLE(...) AS $$ ... $$;

-- Popular searches materialized view
CREATE MATERIALIZED VIEW popular_searches AS
  SELECT lower(trim(query)) as term, count(*) as search_count
  FROM search_logs
  WHERE created_at > now() - interval '30 days'
  GROUP BY lower(trim(query))
  HAVING count(*) >= 3
  ORDER BY count(*) DESC
  LIMIT 200;

-- Spell correction function
CREATE FUNCTION suggest_correction(query text)
  RETURNS text AS $$ ... $$;
```

### Files to Change
| File | Change |
|------|--------|
| New migration | tsvector column, GIN index, search RPC, materialized view, correction function |
| `src/pages/SearchResults.tsx` | Use new RPC, add filters panel, "did you mean?" UI |
| `src/components/search/SearchCommandPalette.tsx` | Add autocomplete suggestions from popular_searches |
| `src/components/search/SearchFilters.tsx` | New component: price range, rating, free toggle |
| `src/hooks/useSearchSuggestions.ts` | New hook: fetch autocomplete suggestions |
| `supabase/functions/smart-search/index.ts` | Use new RPC instead of raw ilike queries |

### Priority Order
1. Full-text search with tsvector (performance + relevance)
2. Filters panel (immediate UX win)
3. Autocomplete suggestions (polish)
4. Spell correction (polish)
5. Search analytics (seller value-add)

