import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.12";
import { requireAdmin } from "../_shared/auth-guard.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

async function createGoogleJWT(
  serviceAccount: { client_email: string; private_key: string },
  scope: string
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: serviceAccount.client_email,
    scope,
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };

  const enc = (obj: unknown) =>
    btoa(JSON.stringify(obj))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

  const signingInput = `${enc(header)}.${enc(payload)}`;

  const pemBody = serviceAccount.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s/g, "");
  const binaryKey = Uint8Array.from(atob(pemBody), (c) => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    binaryKey,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    new TextEncoder().encode(signingInput)
  );

  const sig64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  return `${signingInput}.${sig64}`;
}

async function getAccessToken(
  serviceAccount: { client_email: string; private_key: string },
  scope: string
): Promise<string> {
  const jwt = await createGoogleJWT(serviceAccount, scope);
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Token exchange failed (${res.status}): ${t}`);
  }
  const data = await res.json();
  return data.access_token;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let saJson = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON");
    if (!saJson) throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON not configured");
    saJson = saJson.trim();
    // Debug: log first 20 chars to identify format issues
    console.log("Secret starts with:", saJson.substring(0, 20), "length:", saJson.length);
    // Try to find the JSON object within the string
    const jsonStart = saJson.indexOf('{');
    const jsonEnd = saJson.lastIndexOf('}');
    if (jsonStart >= 0 && jsonEnd > jsonStart) {
      saJson = saJson.substring(jsonStart, jsonEnd + 1);
    }
    const serviceAccount = JSON.parse(saJson);

    const accessToken = await getAccessToken(
      serviceAccount,
      "https://www.googleapis.com/auth/webmasters.readonly"
    );

    const siteUrl = "sc-domain:eclipserblx.com";

    // 1. Get URL inspection results / indexing coverage via Search Analytics
    const endDate = new Date().toISOString().split("T")[0];
    const startDate = new Date(Date.now() - 28 * 86400000)
      .toISOString()
      .split("T")[0];

    // Search Analytics — top pages by clicks
    const analyticsRes = await fetch(
      `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(
        siteUrl
      )}/searchAnalytics/query`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          startDate,
          endDate,
          dimensions: ["page"],
          rowLimit: 100,
        }),
      }
    );

    const analytics = analyticsRes.ok ? await analyticsRes.json() : null;

    // 2. Get sitemaps status
    const sitemapsRes = await fetch(
      `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(
        siteUrl
      )}/sitemaps`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    const sitemaps = sitemapsRes.ok ? await sitemapsRes.json() : null;

    // 3. Summary stats
    const summaryRes = await fetch(
      `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(
        siteUrl
      )}/searchAnalytics/query`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          startDate,
          endDate,
          dimensions: ["date"],
          rowLimit: 28,
        }),
      }
    );

    const summary = summaryRes.ok ? await summaryRes.json() : null;

    return new Response(
      JSON.stringify({
        analytics: analytics?.rows || [],
        sitemaps: sitemaps?.sitemap || [],
        dailyStats: summary?.rows || [],
        period: { startDate, endDate },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (e) {
    console.error("google-search-console error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : String(e) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
