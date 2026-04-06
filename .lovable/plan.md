

## AI-Powered Content Verification for Leak Detection

### Problem

The current auto-detect-leaks system flags results based purely on product name appearing in a search result snippet. This creates false positives when:
- A forum post merely *discusses* a product without sharing it
- A review or tutorial references the product name
- The search result is a legitimate listing on another platform

### Solution

Add a Gemini AI verification step between Firecrawl search results and notification. For each candidate result, send the snippet + page context to Gemini and ask it to classify whether the content represents an actual leak (shared/redistributed asset) vs. legitimate mention.

```text
Current flow:
  Firecrawl search → name match → notify seller

New flow:
  Firecrawl search → name match →
    AI verification (Gemini) →
      ├─ "leak" → proceed with fingerprint check + notify
      ├─ "suspicious" → lower confidence, still record
      └─ "legitimate" → skip entirely, don't notify
```

### Database Changes

Add one column to `leak_scan_results`:
- `ai_verdict TEXT` — stores the AI classification ("leak", "suspicious", "legitimate")

### Edge Function Changes (`auto-detect-leaks/index.ts`)

1. Add `verifyWithAI()` function that calls the Lovable AI gateway (`https://ai.gateway.lovable.dev/v1/chat/completions`) using `LOVABLE_API_KEY` with `google/gemini-2.5-flash` (fast + cheap, sufficient for classification)

2. The prompt sends: product name, source domain, page title, snippet — asks Gemini to classify as `leak`, `suspicious`, or `legitimate` with a one-sentence reason

3. Uses tool-calling (structured output) to ensure clean JSON response: `{ verdict: "leak"|"suspicious"|"legitimate", reason: "..." }`

4. Integration into the scan loop:
   - After getting each search result, call `verifyWithAI()` before fingerprint scraping
   - If verdict is `"legitimate"` → skip entirely (no insert, no notification)
   - If verdict is `"suspicious"` → insert with confidence `"low"`, no notification
   - If verdict is `"leak"` → proceed with existing fingerprint check flow
   - Store `ai_verdict` in the database row

5. Add 1-second delay between AI calls to respect rate limits

### UI Changes (`SellerLeakReports.tsx`)

- Add a `"Low"` confidence badge (grey) for AI-flagged suspicious results
- Show the AI reason text as a tooltip or subtitle on each result
- Only results classified as actual leaks trigger seller notifications

### Files Changed

- **Migration**: Add `ai_verdict` column to `leak_scan_results`
- **Edit**: `supabase/functions/auto-detect-leaks/index.ts` — add AI verification step
- **Edit**: `src/pages/seller/SellerLeakReports.tsx` — add low-confidence badge + AI reason display

### Risk

Low — additive only. If the AI gateway is unavailable or rate-limited, the function falls back to the existing behavior (treats result as a leak). No existing notifications are suppressed retroactively.

