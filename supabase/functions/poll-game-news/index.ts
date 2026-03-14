import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';
import { sendBotMessage, type DiscordEmbed } from '../_shared/discord-bot.ts';
import { handleCors, jsonOk, jsonError, internalError } from '../_shared/edge-response.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface FeedEntry {
  title: string;
  url: string;
  description?: string;
  thumbnail?: string;
  published?: string;
}

/**
 * Fetch Open Graph image from an article URL
 */
async function fetchOgImage(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const resp = await fetch(url, {
      headers: { 'User-Agent': 'EclipseBot/1.0 (OG Image Fetch)' },
      signal: controller.signal,
      redirect: 'follow',
    });
    clearTimeout(timeout);

    if (!resp.ok) return null;

    // Only read the first ~50KB to find meta tags quickly
    const reader = resp.body?.getReader();
    if (!reader) return null;

    let html = '';
    const decoder = new TextDecoder();
    let bytesRead = 0;
    const maxBytes = 50000;

    while (bytesRead < maxBytes) {
      const { done, value } = await reader.read();
      if (done) break;
      html += decoder.decode(value, { stream: true });
      bytesRead += value.length;
      // Stop early if we've passed </head>
      if (html.includes('</head>')) break;
    }
    reader.cancel();

    // Try og:image first, then twitter:image (multiple attribute orderings)
    const ogPatterns = [
      /<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i,
      /<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i,
      /<meta[^>]*property='og:image'[^>]*content='([^']+)'/i,
    ];
    for (const pat of ogPatterns) {
      const m = html.match(pat);
      if (m?.[1] && m[1].startsWith('http')) return m[1];
    }

    const twPatterns = [
      /<meta[^>]*name=["']twitter:image["'][^>]*content=["']([^"']+)["']/i,
      /<meta[^>]*content=["']([^"']+)["'][^>]*name=["']twitter:image["']/i,
      /<meta[^>]*name=["']twitter:image:src["'][^>]*content=["']([^"']+)["']/i,
    ];
    for (const pat of twPatterns) {
      const m = html.match(pat);
      if (m?.[1] && m[1].startsWith('http')) return m[1];
    }

    // Last resort: look for any large image in first <img> tags
    const imgMatch = html.match(/<img[^>]*src=["'](https?:\/\/[^"']+)["'][^>]*>/i);
    if (imgMatch?.[1]) return imgMatch[1];

    return null;
  } catch {
    return null;
  }
}

/**
 * Parse RSS/Atom XML into feed entries
 */
function parseRSSXml(xml: string): FeedEntry[] {
  const entries: FeedEntry[] = [];

  // Try RSS <item> tags first
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];
    const title = extractTag(block, 'title');
    const link = extractTag(block, 'link') || extractNamespacedLink(block) || extractTag(block, 'guid');
    const desc = extractTag(block, 'description') || extractTag(block, 'content:encoded');
    const pubDate = extractTag(block, 'pubDate') || extractTag(block, 'dc:date');
    const thumb = extractMediaThumbnail(block) || extractEnclosure(block);
    if (title && link) {
      entries.push({
        title: stripCdata(title),
        url: link.trim(),
        description: desc ? stripHtml(stripCdata(desc)).substring(0, 200) : undefined,
        thumbnail: thumb || undefined,
        published: pubDate || undefined,
      });
    }
  }

  // Fallback: Atom <entry> tags
  if (entries.length === 0) {
    const entryRegex = /<entry>([\s\S]*?)<\/entry>/gi;
    while ((match = entryRegex.exec(xml)) !== null) {
      const block = match[1];
      const title = extractTag(block, 'title');
      const link = extractAtomLink(block);
      const desc = extractTag(block, 'summary') || extractTag(block, 'content');
      const pubDate = extractTag(block, 'published') || extractTag(block, 'updated');
      if (title && link) {
        entries.push({
          title: stripCdata(title),
          url: link.trim(),
          description: desc ? stripHtml(stripCdata(desc)).substring(0, 200) : undefined,
          published: pubDate || undefined,
        });
      }
    }
  }

  return entries;
}

/**
 * Parse JSON feeds (e.g., Rockstar Newswire, Fortnite API)
 */
function parseJsonFeed(data: unknown, feedUrl: string): FeedEntry[] {
  const entries: FeedEntry[] = [];
  const root = data as Record<string, unknown>;

  // Handle Fortnite API format: { data: { br: { motds: [...] } } }
  if (root?.data && (root.data as Record<string, unknown>)?.br) {
    const br = (root.data as Record<string, unknown>).br as Record<string, unknown>;
    const motds = (br.motds ?? []) as Array<Record<string, unknown>>;
    for (const motd of motds.slice(0, 5)) {
      const title = (motd.title ?? '') as string;
      const id = (motd.id ?? '') as string;
      if (!title || !id) continue;
      entries.push({
        title,
        url: `https://www.fortnite.com/news?id=${id}`,
        description: ((motd.body ?? '') as string).substring(0, 200) || undefined,
        thumbnail: (motd.tileImage ?? motd.image ?? '') as string || undefined,
      });
    }
    return entries;
  }

  // Handle array of posts (generic JSON feeds)
  const posts = Array.isArray(data)
    ? data
    : root?.items ?? root?.posts ?? root?.data ?? [];

  if (!Array.isArray(posts)) return entries;

  for (const post of posts.slice(0, 10)) {
    const p = post as Record<string, unknown>;
    const title = (p.title ?? p.headline ?? '') as string;
    const url = (p.url ?? p.link ?? p.uri ?? '') as string;
    if (!title || !url) continue;

    entries.push({
      title,
      url: url.startsWith('http') ? url : `https://www.rockstargames.com${url}`,
      description: ((p.description ?? p.summary ?? p.preview_body ?? '') as string).substring(0, 200) || undefined,
      thumbnail: (p.image ?? p.preview_image ?? p.thumbnail_url ?? '') as string || undefined,
      published: (p.published_at ?? p.created ?? p.date ?? '') as string || undefined,
    });
  }

  return entries;
}

function extractTag(block: string, tag: string): string | null {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
  const m = block.match(regex);
  return m ? m[1].trim() : null;
}

function extractAtomLink(block: string): string | null {
  const m = block.match(/<link[^>]*href=["']([^"']+)["'][^>]*\/?>/i);
  return m ? m[1] : null;
}

/**
 * Extract links with namespace prefixes (e.g. <a10:link href="..."/>
 */
function extractNamespacedLink(block: string): string | null {
  const m = block.match(/<[a-z0-9]+:link[^>]*href=["']([^"']+)["'][^>]*\/?>/i);
  return m ? m[1] : null;
}

function extractMediaThumbnail(block: string): string | null {
  const m = block.match(/<media:thumbnail[^>]*url=["']([^"']+)["']/i)
    || block.match(/<media:content[^>]*url=["']([^"']+)["']/i);
  return m ? m[1] : null;
}

function extractEnclosure(block: string): string | null {
  const m = block.match(/<enclosure[^>]*url=["']([^"']+)["']/i);
  return m ? m[1] : null;
}

function stripCdata(text: string): string {
  return text.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim();
}

function stripHtml(text: string): string {
  return text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Build a visually rich Discord embed with large banner image
 */
async function buildEmbed(
  entry: FeedEntry,
  feed: { name: string; icon_url?: string; embed_color?: number }
): Promise<DiscordEmbed> {
  const feedColor = feed.embed_color || 0x00b4d8;
  const feedIcon = feed.icon_url || undefined;

  // Resolve image: article thumbnail → OG image scrape → feed icon fallback
  let imageUrl: string | null = null;

  if (entry.thumbnail && entry.thumbnail.startsWith('http')) {
    imageUrl = entry.thumbnail;
  }

  if (!imageUrl) {
    console.log(`[poll-game-news] No thumbnail for "${entry.title}", fetching OG image from ${entry.url}`);
    imageUrl = await fetchOgImage(entry.url);
    if (imageUrl) {
      console.log(`[poll-game-news] Found OG image: ${imageUrl}`);
    }
  }

  // Build description with a "Read more" link
  const cleanDesc = entry.description?.replace(/\s+/g, ' ').trim();
  const descText = cleanDesc && cleanDesc.length > 10
    ? `${cleanDesc}${cleanDesc.length >= 195 ? '…' : ''}\n\n**[Read full article →](${entry.url})**`
    : `**[Read full article →](${entry.url})**`;

  const embed: DiscordEmbed = {
    title: entry.title.substring(0, 256),
    url: entry.url,
    description: descText,
    color: feedColor,
    author: {
      name: `📰 ${feed.name}`,
      icon_url: feedIcon,
      url: entry.url,
    },
    footer: {
      text: feed.name,
      icon_url: feedIcon,
    },
  // Safe timestamp parsing - avoid Invalid Date crashes
  const parsedDate = entry.published ? new Date(entry.published) : null;
  const validTimestamp = parsedDate && !isNaN(parsedDate.getTime())
    ? parsedDate.toISOString()
    : new Date().toISOString();
    
    timestamp: validTimestamp,
  };

  // Large banner image (always try to include one)
  if (imageUrl) {
    embed.image = { url: imageUrl };
  } else if (feedIcon) {
    // Last resort: show feed icon as thumbnail on the right
    embed.thumbnail = { url: feedIcon };
  }

  return embed;
}

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

    // Parse optional config from request body
    let delayMs = 2000;
    try {
      const body = await req.json();
      if (body?.delay_ms && typeof body.delay_ms === 'number') {
        delayMs = Math.min(body.delay_ms, 90000); // cap at 90s
      }
    } catch { /* no body or invalid JSON, use defaults */ }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get all enabled feeds
    const { data: feeds, error: feedsErr } = await supabase
      .from('game_news_feeds')
      .select('*')
      .eq('enabled', true);

    if (feedsErr) {
      console.error('[poll-game-news] Error fetching feeds:', feedsErr);
      return jsonError('Failed to fetch feeds', 500);
    }

    if (!feeds || feeds.length === 0) {
      return jsonOk({ message: 'No enabled feeds', posted: 0 });
    }

    let totalPosted = 0;

    for (const feed of feeds) {
      try {
        console.log(`[poll-game-news] Checking feed: ${feed.name} (${feed.feed_url})`);

        // Fetch the feed
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);
        const resp = await fetch(feed.feed_url, {
          headers: { 'User-Agent': 'EclipseBot/1.0 GameNewsFeed' },
          signal: controller.signal,
        });
        clearTimeout(timeout);

        if (!resp.ok) {
          console.error(`[poll-game-news] Feed ${feed.name} returned ${resp.status}`);
          continue;
        }

        const contentType = resp.headers.get('content-type') || '';
        const body = await resp.text();
        let entries: FeedEntry[] = [];

        if (contentType.includes('json') || feed.feed_type === 'json') {
          try {
            entries = parseJsonFeed(JSON.parse(body), feed.feed_url);
          } catch {
            console.error(`[poll-game-news] Failed to parse JSON for ${feed.name}`);
            continue;
          }
        } else {
          entries = parseRSSXml(body);
        }

        if (entries.length === 0) {
          console.log(`[poll-game-news] No entries found for ${feed.name}`);
          continue;
        }

        // Only process the latest 5 entries to avoid spam on first run
        const recentEntries = entries.slice(0, 5);

        // Check which have already been posted
        const urls = recentEntries.map(e => e.url);
        const { data: existing } = await supabase
          .from('game_news_posted')
          .select('article_url')
          .eq('feed_id', feed.id)
          .in('article_url', urls);

        const existingUrls = new Set((existing || []).map(e => e.article_url));

        // Filter out financial/earnings reports (boring corporate stuff)
        const SKIP_PATTERNS = [
          /fiscal\s*year/i, /quarterly\s*results/i, /Q[1-4]\s*FY/i,
          /earnings\s*report/i, /financial\s*results/i, /reports?\s*Q[1-4]/i,
          /investor\s*relations/i, /annual\s*report/i,
        ];
        const newEntries = recentEntries
          .filter(e => !existingUrls.has(e.url))
          .filter(e => !SKIP_PATTERNS.some(p => p.test(e.title) || p.test(e.description || '')));

        // Post new entries (oldest first so newest appears last in Discord)
        for (const entry of newEntries.reverse()) {
          const embed = await buildEmbed(entry, {
            name: feed.name,
            icon_url: feed.icon_url || undefined,
            embed_color: feed.embed_color || undefined,
          });

          const content = feed.ping_role_id ? `<@&${feed.ping_role_id}>` : undefined;

          const result = await sendBotMessage(feed.discord_channel_id, {
            content,
            embeds: [embed],
          });

          if (result.success) {
            await supabase.from('game_news_posted').insert({
              feed_id: feed.id,
              article_url: entry.url,
              article_title: entry.title.substring(0, 500),
            });
            totalPosted++;
            console.log(`[poll-game-news] Posted: ${entry.title}`);
          } else {
            console.error(`[poll-game-news] Failed to post: ${result.error}`);
          }

          // Delay between posts to avoid Discord rate limits
          await new Promise(r => setTimeout(r, 2000));
        }

        // Update last_checked_at
        await supabase
          .from('game_news_feeds')
          .update({ last_checked_at: new Date().toISOString(), updated_at: new Date().toISOString() })
          .eq('id', feed.id);

      } catch (err) {
        console.error(`[poll-game-news] Error processing feed ${feed.name}:`, err);
      }
    }

    return jsonOk({ message: 'Feed check complete', posted: totalPosted, feeds_checked: feeds.length });
  } catch (error) {
    return internalError(error);
  }
});
