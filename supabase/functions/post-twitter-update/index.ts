import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { handleCors, jsonOk, jsonError, internalError, unauthorized } from "../_shared/edge-response.ts";

// ── OAuth 1.0a helpers ──────────────────────────────────────────────────
function percentEncode(str: string): string {
  return encodeURIComponent(str).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
}

async function hmacSha1(key: string, data: string): Promise<string> {
  const encoder = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(key),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(data));
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

function generateNonce(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(36)).join("").slice(0, 32);
}

interface OAuthParams {
  method: string;
  url: string;
  consumerKey: string;
  consumerSecret: string;
  accessToken: string;
  accessTokenSecret: string;
}

async function buildOAuthHeader(params: OAuthParams): Promise<string> {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = generateNonce();

  const oauthParams: Record<string, string> = {
    oauth_consumer_key: params.consumerKey,
    oauth_nonce: nonce,
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: timestamp,
    oauth_token: params.accessToken,
    oauth_version: "1.0",
  };

  // X API v2: do NOT include POST body params in signature base string
  const sortedParams = Object.keys(oauthParams).sort().map((k) => `${percentEncode(k)}=${percentEncode(oauthParams[k])}`).join("&");

  const signatureBase = `${params.method.toUpperCase()}&${percentEncode(params.url)}&${percentEncode(sortedParams)}`;
  const signingKey = `${percentEncode(params.consumerSecret)}&${percentEncode(params.accessTokenSecret)}`;
  const signature = await hmacSha1(signingKey, signatureBase);

  oauthParams["oauth_signature"] = signature;

  const header = Object.keys(oauthParams).sort().map((k) => `${percentEncode(k)}="${percentEncode(oauthParams[k])}"`).join(", ");

  return `OAuth ${header}`;
}

// ── Smart hashtag selection ─────────────────────────────────────────────
interface Hashtag {
  id: string;
  tag: string;
  category: string;
  usage_count: number;
  last_used_at: string | null;
}

function scoreHashtag(h: Hashtag): number {
  const recency = h.last_used_at ? (Date.now() - new Date(h.last_used_at).getTime()) / (1000 * 60 * 60) : 9999;
  // Higher score = better candidate (less used + older)
  return recency / (h.usage_count + 1);
}

async function selectHashtags(
  supabase: ReturnType<typeof createClient>,
  count: number,
): Promise<Hashtag[]> {
  // Get active hashtags
  const { data: pool, error } = await supabase
    .from("twitter_hashtags")
    .select("id, tag, category, usage_count, last_used_at")
    .eq("is_active", true);

  if (error || !pool || pool.length === 0) return [];

  // Get last 5 posts' hashtags to avoid repeating combos
  const { data: recentPosts } = await supabase
    .from("twitter_posts")
    .select("hashtags_used")
    .order("posted_at", { ascending: false })
    .limit(5);

  const recentlyUsedTags = new Set<string>();
  if (recentPosts) {
    for (const post of recentPosts) {
      if (post.hashtags_used) {
        for (const tag of post.hashtags_used) {
          recentlyUsedTags.add(tag);
        }
      }
    }
  }

  // Score and sort
  const scored = pool
    .map((h) => ({ ...h, score: scoreHashtag(h) }))
    .sort((a, b) => b.score - a.score);

  const selected: Hashtag[] = [];
  const categories = new Set<string>();
  const targetCount = Math.min(Math.max(count, 2), 5);

  // First pass: ensure category diversity (at least 1 niche + 1 audience if available)
  for (const cat of ["niche", "audience"]) {
    const candidate = scored.find(
      (h) => h.category === cat && !selected.some((s) => s.id === h.id),
    );
    if (candidate) {
      selected.push(candidate);
      categories.add(cat);
    }
  }

  // Second pass: fill remaining slots with highest-scored, avoiding over-representation of recently used
  for (const h of scored) {
    if (selected.length >= targetCount) break;
    if (selected.some((s) => s.id === h.id)) continue;

    // Deprioritise but don't exclude recently used tags
    if (recentlyUsedTags.has(h.tag) && selected.length < targetCount - 1) continue;

    selected.push(h);
  }

  // Fill any remaining if we skipped too many recently-used
  for (const h of scored) {
    if (selected.length >= targetCount) break;
    if (!selected.some((s) => s.id === h.id)) {
      selected.push(h);
    }
  }

  return selected.slice(0, targetCount);
}

// ── Main handler ────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    // Auth check - admin only
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return unauthorized();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify caller is admin
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) return unauthorized();

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) return jsonError("Admin access required", 403, "FORBIDDEN");

    // Parse request
    const body = await req.json();
    const {
      content,
      post_type = "scheduled",
      hashtag_count = 3,
      override_hashtags,
    }: {
      content: string;
      post_type?: string;
      hashtag_count?: number;
      override_hashtags?: string[];
    } = body;

    if (!content || content.trim().length === 0) {
      return jsonError("Content is required");
    }

    // Select hashtags
    let hashtagsToUse: string[];
    if (override_hashtags && override_hashtags.length > 0) {
      hashtagsToUse = override_hashtags.slice(0, 5);
    } else {
      const selected = await selectHashtags(adminClient, hashtag_count);
      hashtagsToUse = selected.map((h) => h.tag);
    }

    // Build tweet text (280 char limit)
    const hashtagString = hashtagsToUse.join(" ");
    const separator = hashtagsToUse.length > 0 ? "\n\n" : "";
    const maxContentLength = 280 - separator.length - hashtagString.length;

    let tweetContent = content.trim();
    if (tweetContent.length > maxContentLength) {
      tweetContent = tweetContent.slice(0, maxContentLength - 3) + "...";
    }
    const fullTweet = hashtagsToUse.length > 0
      ? `${tweetContent}${separator}${hashtagString}`
      : tweetContent;

    // Post to X API
    const consumerKey = Deno.env.get("TWITTER_CONSUMER_KEY");
    const consumerSecret = Deno.env.get("TWITTER_CONSUMER_SECRET");
    const accessToken = Deno.env.get("TWITTER_ACCESS_TOKEN");
    const accessTokenSecret = Deno.env.get("TWITTER_ACCESS_TOKEN_SECRET");

    let tweetId: string | null = null;
    let postStatus = "sent";

    if (!consumerKey || !consumerSecret || !accessToken || !accessTokenSecret) {
      // Secrets not configured yet — save as draft
      postStatus = "draft";
      console.warn("[post-twitter-update] Twitter API credentials not configured, saving as draft");
    } else {
      const tweetUrl = "https://api.x.com/2/tweets";
      const oauthHeader = await buildOAuthHeader({
        method: "POST",
        url: tweetUrl,
        consumerKey,
        consumerSecret,
        accessToken,
        accessTokenSecret,
      });

      const tweetResponse = await fetch(tweetUrl, {
        method: "POST",
        headers: {
          Authorization: oauthHeader,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: fullTweet }),
      });

      if (!tweetResponse.ok) {
        const errorBody = await tweetResponse.text();
        console.error("[post-twitter-update] X API error:", tweetResponse.status, errorBody);
        postStatus = "failed";

        // Still log the attempt
        await adminClient.from("twitter_posts").insert({
          content: fullTweet,
          hashtags_used: hashtagsToUse,
          post_type,
          status: postStatus,
        });

        return jsonError(`X API error: ${tweetResponse.status} - ${errorBody}`, 502);
      }

      const tweetData = await tweetResponse.json();
      tweetId = tweetData?.data?.id ?? null;
    }

    // Log the post
    await adminClient.from("twitter_posts").insert({
      content: fullTweet,
      hashtags_used: hashtagsToUse,
      tweet_id: tweetId,
      post_type,
      status: postStatus,
    });

    // Update hashtag usage stats (only for non-override hashtags)
    if (!override_hashtags) {
      const { data: usedTags } = await adminClient
        .from("twitter_hashtags")
        .select("id, tag, usage_count")
        .in("tag", hashtagsToUse);

      if (usedTags) {
        for (const tag of usedTags) {
          await adminClient
            .from("twitter_hashtags")
            .update({
              usage_count: (tag.usage_count || 0) + 1,
              last_used_at: new Date().toISOString(),
            })
            .eq("id", tag.id);
        }
      }
    }

    return jsonOk({
      success: true,
      tweet_id: tweetId,
      status: postStatus,
      content: fullTweet,
      hashtags: hashtagsToUse,
    });
  } catch (err) {
    return internalError(err);
  }
});
