

## Multi-Factor Confidence Scoring for Leak Detection

### Problem

Current confidence assignment is binary — `medium` for all name-matched leaks, `low` for AI-suspicious. No consideration of whether the product name is generic (e.g. "Car" vs "XR-7 Hyperion Cruiser"), how relevant the snippet actually is, or whether the site is a known piracy hub vs a general paste site.

### Solution

Add a `calculateConfidenceScore()` function that computes a 0–100 numeric score from three weighted signals, then maps that score to low/medium/high before fingerprint verification can upgrade it further.

```text
Score = (nameUniqueness × 0.35) + (snippetRelevance × 0.35) + (siteReputation × 0.30)

  0–39  → "low"
  40–69 → "medium"
  70–100 → "high"

Fingerprint match still overrides to "high" or "confirmed" as before.
```

### Three Scoring Factors

**1. Product Name Uniqueness (35%)**
- Single common word ("Car", "Map", "Script") → 15/100
- Two words, still generic ("Cool Car") → 35/100
- 3+ words or contains unique identifiers ("XR-7 Hyperion Cruiser") → 75/100
- Contains version numbers, brand prefixes, special chars → 90/100
- Measured purely by string analysis — no API call needed

**2. Snippet Relevance (35%)**
- Exact product name appears in snippet → +40
- Download/leak keywords present ("free download", "leaked", "cracked", "get it here", "paste", "script hub") → +30
- Snippet length > 50 chars with product context → +15
- Product name only in title, not snippet → +15
- No meaningful match beyond search engine coincidence → +5

**3. Site Reputation (30%)**
- Tier 1 — dedicated piracy sites (`v3rmillion.net`, `robloxscripts.com`, `rscripts.net`, `scriptblox.com`) → 90/100
- Tier 2 — general paste/code sites (`pastebin.com`, `github.com`) → 55/100
- Tier 3 — unknown/other domains → 25/100

### Database Changes

Add one column to `leak_scan_results`:
- `confidence_score INTEGER` — stores the raw 0–100 numeric score

### Edge Function Changes

1. Add `calculateConfidenceScore(productName, snippet, title, domain)` — pure function, no API call
2. Call it for every result that passes AI verification (leak or suspicious)
3. Use the mapped confidence level as the base, then fingerprint can still upgrade to high/confirmed
4. Store `confidence_score` alongside existing `confidence` string
5. For suspicious AI verdicts: cap score at 39 max (always stays "low")

### UI Changes

- Show the numeric score (e.g. "Score: 72/100") as a subtitle under the confidence badge
- Add a tooltip on the confidence badge explaining which factors contributed

### Files Changed

- **Migration**: Add `confidence_score` column to `leak_scan_results`
- **Edit**: `supabase/functions/auto-detect-leaks/index.ts` — add scoring function + integrate
- **Edit**: `src/pages/seller/SellerLeakReports.tsx` — show numeric score

### Risk

None — purely additive scoring layer. Existing fingerprint overrides still take priority. No notifications suppressed that weren't already.

