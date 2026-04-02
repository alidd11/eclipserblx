import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { handleCors, jsonOk, jsonError, internalError } from "../_shared/edge-response.ts";

const SITE_URL = "https://eclipserblx.com";

// ── OAuth 1.0a helpers ──────────────────────────────────────────────────
function percentEncode(str: string): string {
  return encodeURIComponent(str).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
}

async function hmacSha1(key: string, data: string): Promise<string> {
  const encoder = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw", encoder.encode(key),
    { name: "HMAC", hash: "SHA-1" }, false, ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(data));
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

function generateNonce(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(36)).join("").slice(0, 32);
}

async function buildOAuthHeader(method: string, url: string): Promise<string> {
  const consumerKey = Deno.env.get("TWITTER_CONSUMER_KEY")!;
  const consumerSecret = Deno.env.get("TWITTER_CONSUMER_SECRET")!;
  const accessToken = Deno.env.get("TWITTER_ACCESS_TOKEN")!;
  const accessTokenSecret = Deno.env.get("TWITTER_ACCESS_TOKEN_SECRET")!;

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = generateNonce();

  const oauthParams: Record<string, string> = {
    oauth_consumer_key: consumerKey,
    oauth_nonce: nonce,
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: timestamp,
    oauth_token: accessToken,
    oauth_version: "1.0",
  };

  const sortedParams = Object.keys(oauthParams).sort()
    .map((k) => `${percentEncode(k)}=${percentEncode(oauthParams[k])}`).join("&");
  const signatureBase = `${method.toUpperCase()}&${percentEncode(url)}&${percentEncode(sortedParams)}`;
  const signingKey = `${percentEncode(consumerSecret)}&${percentEncode(accessTokenSecret)}`;
  const signature = await hmacSha1(signingKey, signatureBase);

  oauthParams["oauth_signature"] = signature;
  const header = Object.keys(oauthParams).sort()
    .map((k) => `${percentEncode(k)}="${percentEncode(oauthParams[k])}"`).join(", ");
  return `OAuth ${header}`;
}

// ── Smart hashtag selection ─────────────────────────────────────────────
interface Hashtag { id: string; tag: string; category: string; usage_count: number; last_used_at: string | null; }

function scoreHashtag(h: Hashtag): number {
  const recency = h.last_used_at ? (Date.now() - new Date(h.last_used_at).getTime()) / (1000 * 60 * 60) : 9999;
  return recency / (h.usage_count + 1);
}

async function selectHashtags(supabase: ReturnType<typeof createClient>, count: number): Promise<Hashtag[]> {
  const { data: pool } = await supabase.from("twitter_hashtags").select("id, tag, category, usage_count, last_used_at").eq("is_active", true);
  if (!pool || pool.length === 0) return [];

  const { data: recentPosts } = await supabase.from("twitter_posts").select("hashtags_used").order("posted_at", { ascending: false }).limit(5);
  const recentlyUsedTags = new Set<string>();
  if (recentPosts) {
    for (const post of recentPosts) {
      if (post.hashtags_used) for (const tag of post.hashtags_used) recentlyUsedTags.add(tag);
    }
  }

  const scored = pool.map((h) => ({ ...h, score: scoreHashtag(h) })).sort((a, b) => b.score - a.score);
  const selected: Hashtag[] = [];
  const targetCount = Math.min(Math.max(count, 2), 5);

  for (const cat of ["niche", "audience"]) {
    const candidate = scored.find((h) => h.category === cat && !selected.some((s) => s.id === h.id));
    if (candidate) selected.push(candidate);
  }
  for (const h of scored) {
    if (selected.length >= targetCount) break;
    if (selected.some((s) => s.id === h.id)) continue;
    if (recentlyUsedTags.has(h.tag) && selected.length < targetCount - 1) continue;
    selected.push(h);
  }
  for (const h of scored) {
    if (selected.length >= targetCount) break;
    if (!selected.some((s) => s.id === h.id)) selected.push(h);
  }

  return selected.slice(0, targetCount);
}

// ── Time-aware context ──────────────────────────────────────────────────
function getTimeContext(): string {
  const now = new Date();
  const ukHour = (now.getUTCHours() + 1) % 24;
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const day = dayNames[now.getUTCDay()];

  let timeVibe = "";
  if (ukHour >= 6 && ukHour < 10) timeVibe = "early morning \u2014 devs grabbing coffee before opening Studio";
  else if (ukHour >= 10 && ukHour < 13) timeVibe = "mid-morning \u2014 peak dev hours, deep in projects";
  else if (ukHour >= 13 && ukHour < 15) timeVibe = "afternoon \u2014 post-lunch, checking Twitter between builds";
  else if (ukHour >= 15 && ukHour < 18) timeVibe = "late afternoon \u2014 wrapping up, sharing progress";
  else if (ukHour >= 18 && ukHour < 21) timeVibe = "evening \u2014 casual browsing, playing experiences";
  else if (ukHour >= 21 && ukHour < 24) timeVibe = "late night \u2014 the dedicated devs still grinding";
  else timeVibe = "late night/early hours \u2014 only the real ones are up coding";

  let dayVibe = "";
  if (day === "Monday") dayVibe = "Start of the week \u2014 fresh builds, new ideas.";
  else if (day === "Friday") dayVibe = "Friday \u2014 winding down, weekend projects ahead.";
  else if (day === "Saturday" || day === "Sunday") dayVibe = "Weekend \u2014 devs have time to experiment.";
  else dayVibe = `${day} \u2014 mid-week grind.`;

  return `Current vibe: ${timeVibe}. ${dayVibe} Weave this in naturally IF it fits \u2014 a subtle "evening Studio session" or "Friday energy" is perfect. Don't force it.`;
}

// ── AI content generation with product links ────────────────────────────
async function generateTweetContent(supabase: ReturnType<typeof createClient>): Promise<string> {
  const [productsRes, recentTweetsRes, promotionsRes] = await Promise.all([
    supabase.from("products").select("name, slug, price, description, category").eq("is_active", true).eq("moderation_status", "approved").order("created_at", { ascending: false }).limit(15),
    supabase.from("twitter_posts").select("content").order("posted_at", { ascending: false }).limit(15),
    supabase.from("promotions").select("title, description, discount_percent").eq("is_active", true).limit(5),
  ]);

  const products = productsRes.data || [];
  const recentTweets = (recentTweetsRes.data || []).map((t) => t.content);
  const promotions = promotionsRes.data || [];

  const productContext = products.slice(0, 8).map((p) =>
    `- "${p.name}" (\u00A3${p.price}) \u2192 ${SITE_URL}/product/${p.slug}`
  ).join("\n");

  const promoContext = promotions.map((p) =>
    `- ${p.title}: ${p.discount_percent}% off - ${p.description || ""}`
  ).join("\n");

  const recentContext = recentTweets.slice(0, 8).join("\n---\n");
  const timeContext = getTimeContext();

  const prompt = `You are the social media manager for Eclipse (${SITE_URL}), a Roblox & Discord marketplace. You're knowledgeable about the community \u2014 Luau, Studio, DevEx, UGC, and what's trending. Your personality: clever, confident, and professional with a touch of personality. Think "a sharp industry insider who genuinely loves what they do."

${timeContext}

Write ONE tweet (max 200 chars EXCLUDING any link). Leave room for hashtags.

TWEET STYLE \u2014 randomly pick ONE (vary from recent tweets):
1. A sharp observation about Roblox development (e.g. "The gap between 'it works in Studio' and 'it works in-game' is where real developers are made")
2. A thought-provoking question that invites genuine discussion (e.g. "What's the one plugin you couldn't develop without?")
3. A genuinely useful dev insight (specific Luau tips, optimization techniques, lessons learned)
4. Relatable developer moments with wit (the universal experience of debugging at midnight)
5. Product spotlight \u2014 ONLY this style gets a product link. Present as a genuine recommendation
6. Eclipse announcement / promotion (only if an active promotion exists)
7. Community highlight (trending experiences, notable UGC items, community milestones)

VOICE GUIDELINES:
- Professional but personable \u2014 think tech journalist meets enthusiastic developer
- Proper grammar and capitalisation. No slang, no abbreviations like "ngl", "fr", "lowkey", "W", "L"
- Punctuation should be clean \u2014 dashes and ellipses are fine, but maintain clarity
- Can be playful and witty without being informal or sloppy
- Subtle time references when they fit naturally ("evening coding session", "weekend builds")
- The bar: "Would a respected industry account tweet this?" If no, rewrite
- Emojis: 0-2, only when they genuinely enhance the message
- No hashtags (added separately)

HARD RULES:
- NOT every tweet needs a product link \u2014 only style 5 and 6
- NEVER start with "Hey devs!", "BREAKING:", or generic greetings
- Avoid starting with "Just"
- No internet slang or abbreviations
- NEVER repeat or closely resemble recent tweets:
${recentContext}

PRODUCTS (for style 5 ONLY):
${productContext || SITE_URL + "/products"}

ACTIVE PROMOTIONS:
${promoContext || "None"}

Write ONLY the tweet. Nothing else.`;

  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

  const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 400,
      temperature: 0.95,
    }),
  });

  if (!aiResponse.ok) {
    const errText = await aiResponse.text();
    console.error("[auto-post-tweet] AI error:", aiResponse.status, errText);
    throw new Error(`AI generation failed: ${aiResponse.status}`);
  }

  const aiData = await aiResponse.json();
  const generatedText = aiData?.choices?.[0]?.message?.content?.trim() || "";

  if (!generatedText || generatedText.length < 10) {
    throw new Error("AI generated empty or too-short content");
  }

  return generatedText;
}

// ── Post tweet to X API ─────────────────────────────────────────────────
async function postTweet(text: string): Promise<{ tweetId: string | null; success: boolean; error?: string }> {
  const consumerKey = Deno.env.get("TWITTER_CONSUMER_KEY");
  if (!consumerKey) return { tweetId: null, success: false, error: "Twitter credentials not configured" };

  const tweetUrl = "https://api.x.com/2/tweets";
  const oauthHeader = await buildOAuthHeader("POST", tweetUrl);

  const response = await fetch(tweetUrl, {
    method: "POST",
    headers: { Authorization: oauthHeader, "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error("[auto-post-tweet] X API error:", response.status, errorBody);
    return { tweetId: null, success: false, error: `X API ${response.status}: ${errorBody}` };
  }

  const data = await response.json();
  return { tweetId: data?.data?.id ?? null, success: true };
}

// ── Main handler ────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // STEP 1: Check for queued tweet ready to post
    const { data: queuedTweet } = await adminClient
      .from("twitter_posts")
      .select("*")
      .eq("status", "queued")
      .lte("scheduled_for", new Date().toISOString())
      .order("scheduled_for", { ascending: true })
      .limit(1)
      .maybeSingle();

    let tweetContent: string;
    let hashtagsToUse: string[];
    let postId: string | undefined;

    if (queuedTweet) {
      tweetContent = queuedTweet.content;
      hashtagsToUse = queuedTweet.hashtags_used || [];
      postId = queuedTweet.id;
      console.log("[auto-post-tweet] Posting queued tweet:", postId);
    } else {
      console.log("[auto-post-tweet] No queued tweets, generating via AI...");
      tweetContent = await generateTweetContent(adminClient);
      const selected = await selectHashtags(adminClient, 3);
      hashtagsToUse = selected.map((h) => h.tag);
    }

    // Build final tweet (280 char limit)
    const hashtagString = hashtagsToUse.join(" ");
    const separator = hashtagsToUse.length > 0 ? "\n\n" : "";
    const maxLen = 280 - separator.length - hashtagString.length;

    let finalContent = tweetContent.trim();
    if (finalContent.length > maxLen) {
      // Try to truncate before the link if present
      const urlMatch = finalContent.match(/(https?:\/\/\S+)$/);
      if (urlMatch) {
        const url = urlMatch[1];
        const textPart = finalContent.slice(0, finalContent.length - url.length).trim();
        const availableForText = maxLen - url.length - 1; // 1 for space
        const truncatedText = textPart.length > availableForText
          ? textPart.slice(0, availableForText - 3) + "..."
          : textPart;
        finalContent = `${truncatedText} ${url}`;
      } else {
        finalContent = finalContent.slice(0, maxLen - 3) + "...";
      }
    }

    const fullTweet = hashtagsToUse.length > 0
      ? `${finalContent}${separator}${hashtagString}`
      : finalContent;

    // STEP 3: Post to X
    const result = await postTweet(fullTweet);

    if (queuedTweet && postId) {
      await adminClient.from("twitter_posts").update({
        content: fullTweet,
        tweet_id: result.tweetId,
        status: result.success ? "sent" : "failed",
        posted_at: result.success ? new Date().toISOString() : null,
      }).eq("id", postId);
    } else {
      await adminClient.from("twitter_posts").insert({
        content: fullTweet,
        hashtags_used: hashtagsToUse,
        tweet_id: result.tweetId,
        post_type: "automated",
        status: result.success ? "sent" : "failed",
        ai_generated: true,
        posted_at: result.success ? new Date().toISOString() : undefined,
      });
    }

    // Update hashtag usage
    if (result.success && hashtagsToUse.length > 0) {
      const { data: usedTags } = await adminClient
        .from("twitter_hashtags").select("id, tag, usage_count").in("tag", hashtagsToUse);
      if (usedTags) {
        for (const tag of usedTags) {
          await adminClient.from("twitter_hashtags").update({
            usage_count: (tag.usage_count || 0) + 1,
            last_used_at: new Date().toISOString(),
          }).eq("id", tag.id);
        }
      }
    }

    if (!result.success) {
      return jsonError(result.error || "Failed to post tweet", 502);
    }

    return jsonOk({
      success: true,
      tweet_id: result.tweetId,
      content: fullTweet,
      hashtags: hashtagsToUse,
      source: queuedTweet ? "queued" : "ai_generated",
    });
  } catch (err) {
    console.error("[auto-post-tweet] Error:", err);
    return internalError(err);
  }
});
