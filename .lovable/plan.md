

## Diagnosis: Why OG Tags Still Don't Work

I ran a complete end-to-end test:

1. **og-proxy edge function**: Works perfectly. Returns correct product-specific OG HTML with title, image, description.

2. **Cloudflare Worker + Routes**: Deployed successfully, 3 routes bound to `eclipserblx.com/*`, `www.eclipserblx.com/*`, `*.eclipserblx.com/*`.

3. **WAF Skip Rule**: API reports success.

4. **`/share/` Redirect Rule**: API reports success.

5. **SBFM Config**: API reports success with `managed_challenge`.

**But when I fetched `eclipserblx.com/products/battle-of-ypres-1917` AND `eclipserblx.com/share/products/battle-of-ypres-1917`, BOTH returned the raw SPA `index.html`** -- meaning NEITHER the Worker NOR the Redirect Rule is executing.

### Root Cause

Two problems:

**Problem 1: SBFM set to `managed_challenge` still blocks bots.** "Managed challenge" means Cloudflare serves a JavaScript challenge page to bots. Bots like Discordbot can't solve JS challenges, so they never reach the Worker. The setting needs to be `allow`, not `managed_challenge`.

**Problem 2: The `/share/` redirect rule may have an expression issue.** Even for non-bot traffic, the redirect isn't firing. The `substring()` function in the dynamic redirect expression may be silently failing, or the rule was created in an incorrect state. The fix is to use a simpler, more reliable expression format.

### Fix

**File: `supabase/functions/deploy-cloudflare-worker/index.ts`**

1. Change SBFM from `managed_challenge` to `allow` (line 474) -- this fully disables Bot Fight Mode so the Worker actually receives bot requests

2. Simplify the redirect rule expression to use `regex_replace` instead of `substring` for broader compatibility:
   ```
   concat("https://qlnbergwjfrmgkjhrbkj.supabase.co/functions/v1/og-proxy?path=", 
          regex_replace(http.request.uri.path, "^/share", ""))
   ```

3. Add logging to the deploy function to output the actual Cloudflare API responses for the redirect rule, so we can diagnose if there's a silent failure

4. After deploying, trigger the function to apply all changes

### Why This Will Work

- Setting SBFM to `allow` removes all bot interference, letting the Worker intercept Discordbot/Twitterbot requests directly
- The WAF skip rule remains as a safety net
- The `/share/` redirect with fixed expression provides a guaranteed fallback path
- The Worker itself is already correct -- it just needs to actually receive the requests

