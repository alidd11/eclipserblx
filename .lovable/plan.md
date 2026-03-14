

## Game News Feed to Discord

### Approach: RSS Polling via Edge Function + pg_cron

The simplest and most reliable approach is polling RSS feeds from game news sources and posting new articles to a Discord channel using your existing Eclipse Portal Bot infrastructure.

### How it works

1. **New database table** `game_news_feeds` stores RSS feed URLs and the target Discord channel ID
2. **New database table** `game_news_posted` tracks which articles have already been posted (deduplication by URL)
3. **New edge function** `poll-game-news` fetches configured RSS feeds, parses them, checks for new entries, and posts embeds to Discord via the existing `sendBotMessage` utility
4. **pg_cron job** runs the edge function every 5-10 minutes
5. **Admin UI** to configure feeds (RSS URL, channel ID, optional role ping)

### RSS Sources for GTA / Gaming

Common RSS feeds that can be configured:
- Rockstar Newswire: `https://www.rockstargames.com/newswire/get-posts.json`
- GTA news aggregators with RSS
- Any gaming site with an RSS/Atom feed

### Database

```text
game_news_feeds
├── id (uuid)
├── name (text) — e.g. "GTA News"
├── feed_url (text) — RSS/JSON feed URL
├── discord_channel_id (text) — target channel
├── ping_role_id (text, nullable) — optional role to ping
├── enabled (boolean, default true)
├── check_interval_minutes (int, default 10)
└── created_at / updated_at

game_news_posted
├── id (uuid)
├── feed_id (uuid → game_news_feeds)
├── article_url (text, unique)
├── article_title (text)
├── posted_at (timestamptz)
```

### Edge Function: `poll-game-news`

- Reads all enabled feeds from `game_news_feeds`
- Fetches each RSS/JSON feed, parses entries
- Checks `game_news_posted` to skip already-sent articles
- For new articles: posts a Discord embed (title, description, link, thumbnail) via `sendBotMessage`
- Records the article in `game_news_posted`

### Admin Configuration

Add a section in the existing Discord settings or a new admin page where you can:
- Add/remove RSS feeds
- Set the target Discord channel per feed
- Optionally set a role to ping
- Enable/disable individual feeds

### Technical Details

- Reuses the existing `sendBotMessage` from `_shared/discord-bot.ts` and `DISCORD_CUSTOMER_BOT_TOKEN`
- pg_cron already enabled in the project — just add a new scheduled job
- RSS parsing done in Deno using built-in XML parsing or a lightweight library
- The embed will include: article title, snippet, link, thumbnail image, and source footer

