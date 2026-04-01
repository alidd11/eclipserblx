

# Smart Hashtag System for Twitter/X Auto-Posting

## Summary
Build a Twitter/X auto-posting system with a smart hashtag engine that tracks usage, rotates hashtags, and maximises discoverability while keeping posts clean and on-brand.

## What gets built

### 1. Database — `twitter_hashtags` + `twitter_posts` tables

**`twitter_hashtags`** — the hashtag pool:
- `id`, `tag` (e.g. `#RobloxDev`), `category` (niche / audience / content), `usage_count`, `last_used_at`, `is_active`
- Pre-seeded with the niche and audience hashtags from your list

**`twitter_posts`** — log of every tweet sent:
- `id`, `content`, `hashtags_used` (text array), `posted_at`, `tweet_id` (from X API), `post_type` (product_drop / store_showcase / announcement / scheduled), `status`

### 2. Edge function — `post-twitter-update`

- Accepts a post type + content payload (title, description, link, optional image)
- **Smart hashtag selection algorithm:**
  1. Always pick 2–5 hashtags
  2. Pull from pool filtered by `is_active = true`
  3. Score each tag: lower `usage_count` + older `last_used_at` = higher priority
  4. Mix categories: at least 1 niche + 1 audience + 1 content-specific (dynamically generated from the tweet topic)
  5. Reject any combo used in the last 5 posts
  6. Append hashtags at the end of the tweet text, separated by spaces
- Posts via X API v2 (`https://api.x.com/2/tweets`) using OAuth 1.0a
- Updates `usage_count` and `last_used_at` on used hashtags
- Logs the post to `twitter_posts`

### 3. Admin UI — `/admin/twitter-posts`

- **Compose tab**: write a tweet, preview with auto-selected hashtags, override if needed, send immediately
- **Hashtag pool tab**: view/add/deactivate hashtags, see usage stats, last used dates
- **Post history tab**: see all sent tweets with status and hashtags used
- **Auto-post toggles**: opt-in triggers for automatic tweets on:
  - New product approved
  - New verified store
  - Platform announcements

### 4. Secrets required

Four Twitter/X API credentials need to be added:
- `TWITTER_CONSUMER_KEY`
- `TWITTER_CONSUMER_SECRET`
- `TWITTER_ACCESS_TOKEN`
- `TWITTER_ACCESS_TOKEN_SECRET`

These will be requested via the secrets tool before implementation.

### 5. Integration hooks

- `notify-product-approved` edge function → optionally triggers `post-twitter-update` with product info
- `post-store-showcase` → optionally triggers a tweet for new verified stores
- `send-community-announcement` → optionally triggers a tweet mirroring the Discord announcement

## Technical details

- OAuth 1.0a signature generation in Deno (using `crypto.subtle.importKey` for HMAC-SHA1)
- No POST body params in OAuth signature base string (X API requirement)
- Tweet character limit: 280 chars total including hashtags — the function trims content to fit
- RLS: admin-only access on both tables via `has_role(auth.uid(), 'admin')`
- No realtime needed

