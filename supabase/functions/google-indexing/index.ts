import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.12";
import { requireAdmin } from "../_shared/auth-guard.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/** Create a signed JWT for Google APIs using the service account credentials */
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

  // Import PEM private key
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

/** Exchange a signed JWT for a Google access token */
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
    return new Response(null, { headers: corsHeaders }
  const _authCheck = await requireAdmin(req, corsHeaders);
  if ("error" in _authCheck) return _authCheck.error;
);
  }

  try {
    let saJson = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON");
    if (!saJson) throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON not configured");
    saJson = saJson.trim();
    const jsonStart = saJson.indexOf('{');
    const jsonEnd = saJson.lastIndexOf('}');
    if (jsonStart >= 0 && jsonEnd > jsonStart) {
      saJson = saJson.substring(jsonStart, jsonEnd + 1);
    }
    const serviceAccount = JSON.parse(saJson);

    let body: Record<string, unknown> = {};
    try { body = await req.json(); } catch { /* empty body is fine */ }
    const { urls, action, submitSitemap } = body as any;

    const results: Record<string, unknown>[] = [];

    // 1. Submit individual URLs to the Indexing API
    if (urls && Array.isArray(urls) && urls.length > 0) {
      const accessToken = await getAccessToken(
        serviceAccount,
        "https://www.googleapis.com/auth/indexing"
      );

      const type = action === "URL_DELETED" ? "URL_DELETED" : "URL_UPDATED";

      for (const url of urls.slice(0, 200)) {
        try {
          const res = await fetch(
            "https://indexing.googleapis.com/v3/urlNotifications:publish",
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ url, type }),
            }
          );
          const data = await res.json();
          results.push({ url, status: res.status, data });
        } catch (e) {
          results.push({ url, error: String(e) });
        }
      }
    }

    // 2. Submit sitemap to Google Search Console
    let sitemapResult = null;
    if (submitSitemap) {
      try {
        const accessToken = await getAccessToken(
          serviceAccount,
          "https://www.googleapis.com/auth/webmasters"
        );

        const siteUrl = "sc-domain:eclipserblx.com";
        const sitemapUrl = "https://eclipserblx.com/sitemap.xml";

        const res = await fetch(
          `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(
            siteUrl
          )}/sitemaps/${encodeURIComponent(sitemapUrl)}`,
          {
            method: "PUT",
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        );

        sitemapResult = {
          status: res.status,
          ok: res.ok,
          body: res.ok ? "Sitemap submitted" : await res.text(),
        };
      } catch (e) {
        sitemapResult = { error: String(e) };
      }
    }

    return new Response(
      JSON.stringify({ results, sitemapResult }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (e) {
    console.error("google-indexing error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : String(e) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
