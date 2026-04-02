import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { handleCors, jsonOk, jsonError, internalError } from "../_shared/edge-response.ts";

const SITE_URL = "https://eclipserblx.com";

// ── Roblox news sources ─────────────────────────────────────────────────
const NEWS_SOURCES = [
  {
    name: "Roblox DevForum Announcements",
    url: "https://devforum.roblox.com/c/updates/announcements/36.json",
    type: "devforum" as const,
  },
  {
    name: "Roblox Blog RSS",
    url: "https://blog.roblox.com/feed/",
    type: "rss" as const,
  },
];

interface NewsItem {
  title: string;
  url: string;
  source: string;
  published_at: string;
}

// ── Fetch DevForum announcements ────────────────────────────────────────
async function fetchDevForumNews(): Promise<NewsItem[]> {
  try {
    const res = await fetch(NEWS_SOURCES[0].url, {
      headers: { "User-Agent": "EclipseBot/1.0" },
    });
    if (!res.ok) {
      console.warn("[queue-roblox-news] DevForum fetch failed:", res.status);
      return [];
    }
    const data = await res.json();
    const topics = data?.topic_list?.topics || [];

    return topics.slice(0, 10).map((t: any) => ({
      title: t.title,
      url: `https://devforum.roblox.com/t/${t.slug}/${t.id}`,
      source: "DevForum",
      published_at: t.created_at || new Date().toISOString(),
    }));
  } catch (e) {
    console.error("[queue-roblox-news] DevForum error:", e);
    return [];
  }
}

// ── Fetch Roblox Blog RSS ───────────────────────────────────────────────
async function fetchBlogNews(): Promise<NewsItem[]> {
  try {
    const res = await fetch(NEWS_SOURCES[1].url, {
      headers: { "User-Agent": "EclipseBot/1.0" },
    });
    if (!res.ok) {
      console.warn("[queue-roblox-news] Blog RSS fetch failed:", res.status);
      return [];
    }
    const xml = await res.text();

    // Simple XML parsing for RSS items
    const items: NewsItem[] = [];
    const itemMatches = xml.match(/<item>[\s\S]*?<\/item>/g) || [];

    for (const item of itemMatches.slice(0, 10)) {
      const titleMatch = item.match(/<title><!\[CDATA\[(.*?)\]\]>|<title>(.*?)<\/title>/);
      const linkMatch = item.match(/<link>(.*?)<\/link>/);
      const pubDateMatch = item.match(/<pubDate>(.*?)<\/pubDate>/);

      if (titleMatch && linkMatch) {
        items.push({
          title: (titleMatch[1] || titleMatch[2] || "").trim(),
          url: linkMatch[1].trim(),
          source: "Roblox Blog",
          published_at: pubDateMatch ? new Date(pubDateMatch[1]).toISOString() : new Date().toISOString(),
        });
      }
    }
    return items;
  } catch (e) {
    console.error("[queue-roblox-news] Blog RSS error:", e);
    return [];
  }
}

// ── Main handler ────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      return jsonError("LOVABLE_API_KEY not configured", 500);
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Fetch real-time Roblox news from multiple sources
    console.log("[queue-roblox-news] Fetching news from Roblox sources...");
    const [devForumNews, blogNews] = await Promise.all([
      fetchDevForumNews(),
      fetchBlogNews(),
    ]);

    const allNews = [...devForumNews, ...blogNews];
    console.log(`[queue-roblox-news] Found ${allNews.length} total news items`);

    if (allNews.length === 0) {
      return jsonOk({ success: true, message: "No news found to queue", queued: 0 });
    }

    // 2. Filter to only recent news (last 48 hours)
    const cutoff = Date.now() - 48 * 60 * 60 * 1000;
    const recentNews = allNews.filter((n) => new Date(n.published_at).getTime() > cutoff);
    console.log(`[queue-roblox-news] ${recentNews.length} items from last 48h`);

    if (recentNews.length === 0) {
      return jsonOk({ success: true, message: "No recent news to queue", queued: 0 });
    }

    // 3. Check which news we've already tweeted about (avoid duplicates)
    const { data: existingPosts } = await adminClient
      .from("twitter_posts")
      .select("content")
      .gte("created_at", new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString())
      .order("created_at", { ascending: false })
      .limit(50);

    const existingContent = (existingPosts || []).map((p) => p.content.toLowerCase());

    // Filter out news we've already covered (check if URL or key title words appear in recent tweets)
    const newItems = recentNews.filter((item) => {
      const titleWords = item.title.toLowerCase().split(" ").filter((w) => w.length > 4);
      return !existingContent.some((existing) =>
        existing.includes(item.url) ||
        titleWords.filter((w) => existing.includes(w)).length >= 3
      );
    });

    console.log(`[queue-roblox-news] ${newItems.length} genuinely new items after dedup`);

    if (newItems.length === 0) {
      return jsonOk({ success: true, message: "All news already covered", queued: 0 });
    }

    // 4. Pick the top 2-3 most interesting items and generate tweets via AI
    const topItems = newItems.slice(0, 3);

    const { data: robloxTags } = await adminClient
      .from("twitter_hashtags")
      .select("tag")
      .eq("is_active", true)
      .in("category", ["niche", "roblox"])
      .limit(3);

    const defaultTags = robloxTags?.map((t) => t.tag) || ["#Roblox", "#RobloxDev"];

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const scheduleTimes = ["09:00", "12:00", "16:00"];
    const queuedTweets: any[] = [];

    for (let i = 0; i < topItems.length; i++) {
      const item = topItems[i];
      const scheduleTime = scheduleTimes[i] || "12:00";
      const isThreadWorthy = item.title.length > 40 || item.source === "Roblox Blog";

      const prompt = isThreadWorthy
        ? `You run the Twitter for Eclipse (${SITE_URL}), a Roblox & Discord marketplace. You're a respected voice in the Roblox dev community \u2014 your followers trust your takes.

Write a 2-tweet THREAD reacting to this news. Read like a dev who genuinely cares.

NEWS:
Title: "${item.title}"
Source: ${item.source}
URL: ${item.url}

FORMAT: Return exactly 2 tweets separated by "---THREAD---"
- Tweet 1: Your immediate reaction + news URL (max 200 chars excl URL). The hook
- Tweet 2: Deeper take, what this means for devs, or a question (max 250 chars). No URL

VOICE:
- React like you actually care \u2014 "this changes everything for small devs" > "exciting update!"
- Reference specific impacts (DevEx, Studio workflow, scripting, UGC)
- Can be opinionated \u2014 "cautiously optimistic" or "honestly this was overdue"
- Natural caps, loose punctuation fine
- 0-1 emoji per tweet
- No hashtags (added separately)
- NEVER start with "BREAKING" or use alarm emojis

Write the 2 tweets separated by ---THREAD---. Nothing else.`
        : `You run Twitter for Eclipse (${SITE_URL}), a Roblox & Discord marketplace. You're deeply embedded in the community and always have a genuine take.

Write a tweet reacting to this news. Sound like a real community member sharing their honest thoughts.

NEWS:
Title: "${item.title}"
Source: ${item.source}
URL: ${item.url}

VOICE:
- React naturally \u2014 excitement, skepticism, curiosity, whatever fits
- Add genuine insight: WHY does this matter for devs/players?
- "finally, devs have been asking for this" > "exciting new feature!"
- Reference Roblox concepts (Luau, Studio, DevEx, UGC, experiences)
- Natural caps, loose punctuation fine
- 0-1 emoji, only if it adds punch
- No hashtags (added separately)
- Max 200 chars (URL doesn't count)
- Include news URL at the end
- NEVER start with "BREAKING" or alarm emojis

Write ONLY the tweet. Nothing else.`;

      try {
        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [{ role: "user", content: prompt }],
            max_tokens: 500,
            temperature: 0.9,
          }),
        });

        if (!aiResponse.ok) {
          console.error(`[queue-roblox-news] AI error for item ${i}:`, aiResponse.status);
          continue;
        }

        const aiData = await aiResponse.json();
        const rawText = aiData?.choices?.[0]?.message?.content?.trim();

        if (!rawText || rawText.length < 15) {
          console.warn(`[queue-roblox-news] AI generated too-short content for item ${i}`);
          continue;
        }

        const hashtagString = defaultTags.slice(0, 3).join(" ");
        const [hours, mins] = scheduleTime.split(":").map(Number);
        const scheduledFor = new Date(tomorrow);
        scheduledFor.setUTCHours(hours, mins, 0, 0);

        if (isThreadWorthy && rawText.includes("---THREAD---")) {
          const parts = rawText.split("---THREAD---").map((p: string) => p.trim()).filter((p: string) => p.length > 10);

          if (parts.length >= 2) {
            const tweet1 = `${parts[0]}\n\n${hashtagString}`;
            const { data: inserted1 } = await adminClient.from("twitter_posts").insert({
              content: tweet1, hashtags_used: defaultTags.slice(0, 3),
              post_type: "news", status: "queued", ai_generated: true,
              scheduled_for: scheduledFor.toISOString(),
            }).select("id").single();

            const replyTime = new Date(scheduledFor.getTime() + 2 * 60 * 1000);
            await adminClient.from("twitter_posts").insert({
              content: parts[1], hashtags_used: [],
              post_type: "news", status: "queued", ai_generated: true,
              scheduled_for: replyTime.toISOString(),
            });

            queuedTweets.push({
              id: inserted1?.id, title: item.title, type: "thread",
              scheduled_for: scheduledFor.toISOString(),
              preview: tweet1.slice(0, 80) + "...",
            });
            console.log(`[queue-roblox-news] Queued thread for "${item.title}" at ${scheduleTime}`);
          } else {
            // Fallback single
            const fullTweet = `${rawText}\n\n${hashtagString}`;
            const { data: inserted } = await adminClient.from("twitter_posts").insert({
              content: fullTweet, hashtags_used: defaultTags.slice(0, 3),
              post_type: "news", status: "queued", ai_generated: true,
              scheduled_for: scheduledFor.toISOString(),
            }).select("id").single();
            queuedTweets.push({ id: inserted?.id, title: item.title, type: "single",
              scheduled_for: scheduledFor.toISOString(), preview: fullTweet.slice(0, 80) + "..." });
          }
        } else {
          const fullTweet = `${rawText}\n\n${hashtagString}`;
          const { data: inserted, error: insertError } = await adminClient.from("twitter_posts").insert({
            content: fullTweet, hashtags_used: defaultTags.slice(0, 3),
            post_type: "news", status: "queued", ai_generated: true,
            scheduled_for: scheduledFor.toISOString(),
          }).select("id").single();

          if (insertError) { console.error(`[queue-roblox-news] Insert error:`, insertError); continue; }
          queuedTweets.push({ id: inserted.id, title: item.title, type: "single",
            scheduled_for: scheduledFor.toISOString(), preview: fullTweet.slice(0, 80) + "..." });
          console.log(`[queue-roblox-news] Queued tweet for "${item.title}" at ${scheduleTime}`);
        }

        if (i < topItems.length - 1) await new Promise((r) => setTimeout(r, 1500));
        // Small delay between AI calls
        if (i < topItems.length - 1) {
          await new Promise((r) => setTimeout(r, 1500));
        }
      } catch (aiErr) {
        console.error(`[queue-roblox-news] Error generating tweet for item ${i}:`, aiErr);
      }
    }

    return jsonOk({
      success: true,
      queued: queuedTweets.length,
      tweets: queuedTweets,
      news_found: allNews.length,
      recent_news: recentNews.length,
      new_items: newItems.length,
    });
  } catch (err) {
    console.error("[queue-roblox-news] Error:", err);
    return internalError(err);
  }
});
