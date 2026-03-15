

## Plan: Replace product name search with URL-based product lookup

### Problem
The current `/showcase` command accepts a product name string, which is fragile due to case sensitivity, partial matches, and ambiguity. Sellers should instead paste their product or store URL.

### Changes

**1. Update command registration** (`supabase/functions/register-discord-commands/index.ts`)
- Rename the `product` option to `url` with description like "Product or store URL from Eclipse (e.g. eclipserblx.com/products/123)"
- Keep it as a STRING type, optional

**2. Update showcase handler** (`supabase/functions/discord-customer-bot/index.ts`)
- Replace the `productSearch` parameter with a `url` parameter
- Parse the URL to extract:
  - Product number from `/products/{number}` pattern
  - Store slug from `/store/{slug}` pattern
- If a product URL is provided, look up by `product_number` directly (exact match, no case sensitivity issues)
- If a store URL is provided, auto-select "store" showcase type
- If neither pattern matches, return a helpful error: "Please provide a valid Eclipse product or store URL"
- Remove the `ilike` name search entirely

**3. Auto-detect showcase type from URL**
- If user provides a `/products/...` URL → treat as product showcase
- If user provides a `/store/...` URL → treat as store showcase
- The `type` option becomes optional/secondary — URL takes priority

### Deployment
- Redeploy both edge functions
- Re-register Discord commands to update the option name/description

