

## Fingerprint-Verified Leak Detection

### Problem

The current `auto-detect-leaks` function only does name-based string matching via Firecrawl — producing `medium` confidence results with no proof. Meanwhile, the existing `report-leak` and `download-asset` functions already have a complete fingerprint system (`ECL_FP:` markers + Lua watermarks) that can definitively identify the buyer who leaked a file. These two systems don't talk to each other.

### How It Will Work

```text
Current flow (name match only):
  Firecrawl search → "medium" confidence → notification

Enhanced flow (name match + fingerprint verification):
  Firecrawl search → found URL →
    ├─ Firecrawl scrape page content →
    │   Extract code blocks / raw text →
    │   Scan for ECL_FP or Lua watermark pattern →
    │     ├─ Found → Cross-reference download_logs →
    │     │   ├─ Buyer identified → "confirmed" + matched_user_id
    │     │   └─ Pattern found but no match → "high"
    │     └─ Not found → stays "medium"
    └─ Insert into leak_scan_results with confidence + buyer info
```

### Database Changes

**Add columns to `leak_scan_results`:**
- `extracted_fingerprint TEXT` — the ECL-XXXXXXXX code found in leaked content
- `matched_user_id UUID` — the identified buyer (FK to profiles)
- `matched_display_name TEXT` — cached display name for UI

### Edge Function Changes (`auto-detect-leaks/index.ts`)

1. **Add fingerprint extraction functions** — port the `extractFingerprint` and `generateWatermarkHash` logic from `report-leak/index.ts` (same regex patterns for `ECL_FP` and Lua watermarks)

2. **After Firecrawl search finds a URL**, use Firecrawl's scrape endpoint to fetch the page content (markdown/text). Scan the scraped content for fingerprint patterns.

3. **If fingerprint found**, cross-reference against `download_logs` + `order_items` for that product (same logic as `report-leak`) to identify the buyer.

4. **Set confidence level based on evidence:**
   - `"confirmed"` — fingerprint found AND buyer identified
   - `"high"` — fingerprint pattern found but no buyer match (e.g., partial data)
   - `"medium"` — name match only, no fingerprint in content

5. **Rate limiting**: Add a 2-second delay between scrape calls to respect Firecrawl limits. Only scrape results from text-heavy sites (pastebin, scriptblox, github) — skip forum listing pages.

### UI Changes (`SellerLeakReports.tsx`)

- Display confidence as color-coded badges: red "Confirmed", orange "High", yellow "Medium"
- Show "Buyer Identified: [display_name]" when `matched_user_id` is present on confirmed results
- Add a filter toggle for confirmed-only results

### Files Changed

- **Migration**: Add 3 columns to `leak_scan_results`
- **Edit**: `supabase/functions/auto-detect-leaks/index.ts` — add fingerprint extraction + scraping + buyer lookup
- **Edit**: `src/pages/seller/SellerLeakReports.tsx` — confidence badges + buyer display

### Risk

Low — additive changes only. The existing name-match flow continues working. Fingerprint verification is an enhancement layer on top. Scraping is best-effort (if it fails, result stays "medium").

