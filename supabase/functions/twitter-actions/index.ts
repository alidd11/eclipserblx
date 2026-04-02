import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { handleCors, jsonOk, jsonError, internalError, unauthorized } from "../_shared/edge-response.ts";

// ── OAuth 1.0a helpers (shared with post-twitter-update) ────────────────
function percentEncode(str: string): string {
  return encodeURIComponent(str).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
}

async function hmacSha1(key: string, data: string): Promise<string> {
  const encoder = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw", encoder.encode(key), { name: "HMAC", hash: "SHA-1" }, false, ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(data));
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

function generateNonce(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(36)).join("").slice(0, 32);
}

async function buildOAuthHeader(method: string, url: string, queryParams?: Record<string, string>): Promise<string> {
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

  // For GET requests with query params, include them in signature base
  const allParams = { ...oauthParams, ...(method === "GET" ? queryParams : {}) };
  const sortedParams = Object.keys(allParams).sort().map((k) => `${percentEncode(k)}=${percentEncode(allParams[k])}`).join("&");

  const signatureBase = `${method.toUpperCase()}&${percentEncode(url)}&${percentEncode(sortedParams)}`;
  const signingKey = `${percentEncode(consumerSecret)}&${percentEncode(accessTokenSecret)}`;
  const signature = await hmacSha1(signingKey, signatureBase);

  oauthParams["oauth_signature"] = signature;
  const header = Object.keys(oauthParams).sort().map((k) => `${percentEncode(k)}="${percentEncode(oauthParams[k])}"`).join(", ");
  return `OAuth ${header}`;
}

function checkTwitterCreds(): boolean {
  return !!(
    Deno.env.get("TWITTER_CONSUMER_KEY") &&
    Deno.env.get("TWITTER_CONSUMER_SECRET") &&
    Deno.env.get("TWITTER_ACCESS_TOKEN") &&
    Deno.env.get("TWITTER_ACCESS_TOKEN_SECRET")
  );
}

// ── Twitter API v2 actions ──────────────────────────────────────────────

async function likeTweet(tweetId: string, userId: string): Promise<Response> {
  const url = `https://api.x.com/2/users/${userId}/likes`;
  const auth = await buildOAuthHeader("POST", url);
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: auth, "Content-Type": "application/json" },
    body: JSON.stringify({ tweet_id: tweetId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Like failed [${res.status}]: ${JSON.stringify(data)}`);
  return jsonOk({ success: true, action: "liked", data });
}

async function unlikeTweet(tweetId: string, userId: string): Promise<Response> {
  const url = `https://api.x.com/2/users/${userId}/likes/${tweetId}`;
  const auth = await buildOAuthHeader("DELETE", url);
  const res = await fetch(url, { method: "DELETE", headers: { Authorization: auth } });
  const data = await res.json();
  if (!res.ok) throw new Error(`Unlike failed [${res.status}]: ${JSON.stringify(data)}`);
  return jsonOk({ success: true, action: "unliked", data });
}

async function retweet(tweetId: string, userId: string): Promise<Response> {
  const url = `https://api.x.com/2/users/${userId}/retweets`;
  const auth = await buildOAuthHeader("POST", url);
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: auth, "Content-Type": "application/json" },
    body: JSON.stringify({ tweet_id: tweetId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Retweet failed [${res.status}]: ${JSON.stringify(data)}`);
  return jsonOk({ success: true, action: "retweeted", data });
}

async function unretweet(tweetId: string, userId: string): Promise<Response> {
  const url = `https://api.x.com/2/users/${userId}/retweets/${tweetId}`;
  const auth = await buildOAuthHeader("DELETE", url);
  const res = await fetch(url, { method: "DELETE", headers: { Authorization: auth } });
  const data = await res.json();
  if (!res.ok) throw new Error(`Unretweet failed [${res.status}]: ${JSON.stringify(data)}`);
  return jsonOk({ success: true, action: "unretweeted", data });
}

async function replyToTweet(tweetId: string, text: string): Promise<Response> {
  const url = "https://api.x.com/2/tweets";
  const auth = await buildOAuthHeader("POST", url);
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: auth, "Content-Type": "application/json" },
    body: JSON.stringify({ text, reply: { in_reply_to_tweet_id: tweetId } }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Reply failed [${res.status}]: ${JSON.stringify(data)}`);
  return jsonOk({ success: true, action: "replied", data });
}

async function deleteTweet(tweetId: string): Promise<Response> {
  const url = `https://api.x.com/2/tweets/${tweetId}`;
  const auth = await buildOAuthHeader("DELETE", url);
  const res = await fetch(url, { method: "DELETE", headers: { Authorization: auth } });
  const data = await res.json();
  if (!res.ok) throw new Error(`Delete failed [${res.status}]: ${JSON.stringify(data)}`);
  return jsonOk({ success: true, action: "deleted", data });
}

async function getTimeline(userId: string, maxResults = 20): Promise<Response> {
  const baseUrl = `https://api.x.com/2/users/${userId}/tweets`;
  const queryParams: Record<string, string> = {
    max_results: String(maxResults),
    "tweet.fields": "created_at,public_metrics,referenced_tweets,conversation_id",
    "user.fields": "name,username,profile_image_url,verified",
    expansions: "author_id",
  };
  const qs = Object.entries(queryParams).map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join("&");
  const fullUrl = `${baseUrl}?${qs}`;
  const auth = await buildOAuthHeader("GET", baseUrl, queryParams);
  const res = await fetch(fullUrl, { headers: { Authorization: auth } });
  const data = await res.json();
  if (!res.ok) throw new Error(`Timeline failed [${res.status}]: ${JSON.stringify(data)}`);
  return jsonOk({ success: true, data });
}

async function getMentions(userId: string, maxResults = 20): Promise<Response> {
  const baseUrl = `https://api.x.com/2/users/${userId}/mentions`;
  const queryParams: Record<string, string> = {
    max_results: String(maxResults),
    "tweet.fields": "created_at,public_metrics,referenced_tweets,conversation_id,in_reply_to_user_id",
    "user.fields": "name,username,profile_image_url",
    expansions: "author_id",
  };
  const qs = Object.entries(queryParams).map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join("&");
  const fullUrl = `${baseUrl}?${qs}`;
  const auth = await buildOAuthHeader("GET", baseUrl, queryParams);
  const res = await fetch(fullUrl, { headers: { Authorization: auth } });
  const data = await res.json();
  if (!res.ok) throw new Error(`Mentions failed [${res.status}]: ${JSON.stringify(data)}`);
  return jsonOk({ success: true, data });
}

async function getAuthenticatedUserId(): Promise<string> {
  const url = "https://api.x.com/2/users/me";
  const auth = await buildOAuthHeader("GET", url);
  const res = await fetch(url, { headers: { Authorization: auth } });
  const data = await res.json();
  if (!res.ok) throw new Error(`User lookup failed [${res.status}]: ${JSON.stringify(data)}`);
  return data.data.id;
}

// ── Main handler ────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
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

    if (!checkTwitterCreds()) {
      return jsonError("Twitter API credentials not configured", 400);
    }

    const body = await req.json();
    const { action, tweet_id, text } = body as {
      action: string;
      tweet_id?: string;
      text?: string;
    };

    if (!action) return jsonError("action is required");

    // Get our Twitter user ID for actions that need it
    let twitterUserId: string | undefined;
    if (["like", "unlike", "retweet", "unretweet", "timeline", "mentions"].includes(action)) {
      twitterUserId = await getAuthenticatedUserId();
    }

    switch (action) {
      case "like":
        if (!tweet_id) return jsonError("tweet_id is required");
        return await likeTweet(tweet_id, twitterUserId!);

      case "unlike":
        if (!tweet_id) return jsonError("tweet_id is required");
        return await unlikeTweet(tweet_id, twitterUserId!);

      case "retweet":
        if (!tweet_id) return jsonError("tweet_id is required");
        return await retweet(tweet_id, twitterUserId!);

      case "unretweet":
        if (!tweet_id) return jsonError("tweet_id is required");
        return await unretweet(tweet_id, twitterUserId!);

      case "reply":
        if (!tweet_id) return jsonError("tweet_id is required");
        if (!text || text.trim().length === 0) return jsonError("text is required for reply");
        return await replyToTweet(tweet_id, text.trim());

      case "delete":
        if (!tweet_id) return jsonError("tweet_id is required");
        return await deleteTweet(tweet_id);

      case "timeline":
        return await getTimeline(twitterUserId!);

      case "mentions":
        return await getMentions(twitterUserId!);

      default:
        return jsonError(`Unknown action: ${action}`);
    }
  } catch (err) {
    console.error("[twitter-actions] Error:", err);
    return internalError(err, err instanceof Error ? err.message : "Twitter action failed");
  }
});
