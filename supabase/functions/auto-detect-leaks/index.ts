import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const LEAK_SITES = [
  "v3rmillion.net",
  "robloxscripts.com",
  "pastebin.com",
  "scriptblox.com",
  "rscripts.net",
  "github.com",
];

const SCRAPABLE_DOMAINS = [
  "pastebin.com",
  "scriptblox.com",
  "rscripts.net",
  "github.com",
];

const MAX_PRODUCTS_PER_STORE = 10;

// --- Fingerprint extraction (ported from report-leak) ---

function extractFingerprint(text: string): string | null {
  const binMatch = text.match(/ECL_FP:(ECL-[A-Z0-9]{8})/);
  if (binMatch) return binMatch[1];

  const luaMatch = text.match(/local _=string\.char\(([0-9,]+)\)/);
  if (luaMatch) {
    try {
      const chars = luaMatch[1].split(",").map(Number);
      return String.fromCharCode(...chars);
    } catch { /* ignore */ }
  }

  return null;
}

function generateWatermarkHash(userId: string, orderId: string, productId: string): string {
  const raw = `${userId}:${orderId}:${productId}`;
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    const char = raw.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  const hex = Math.abs(hash).toString(36).toUpperCase();
  return `ECL-${hex.padStart(8, "0").slice(0, 8)}`;
}

async function identifyBuyer(
  supabase: any,
  fingerprint: string,
  productId: string
): Promise<{ userId: string | null; displayName: string | null }> {
  const { data: logs } = await supabase
    .from("download_logs")
    .select("user_id, profiles!inner(display_name)")
    .eq("product_id", productId)
    .order("downloaded_at", { ascending: false })
    .limit(100);

  if (!logs) return { userId: null, displayName: null };

  for (const log of logs) {
    const { data: orderItems } = await supabase
      .from("order_items")
      .select("id, order_id")
      .eq("product_id", productId);

    if (orderItems) {
      for (const oi of orderItems) {
        const candidate = generateWatermarkHash(log.user_id, oi.order_id, productId);
        if (candidate === fingerprint) {
          return {
            userId: log.user_id,
            displayName: (log as any).profiles?.display_name || null,
          };
        }
      }
    }
  }

  return { userId: null, displayName: null };
}

async function scrapeAndExtractFingerprint(
  firecrawlKey: string,
  url: string
): Promise<string | null> {
  try {
    const res = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${firecrawlKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url,
        formats: ["markdown"],
        onlyMainContent: true,
      }),
    });

    if (!res.ok) {
      console.error(`Firecrawl scrape failed for ${url}: ${res.status}`);
      return null;
    }

    const data = await res.json();
    const content = data.data?.markdown || data.markdown || "";
    return extractFingerprint(content);
  } catch (err) {
    console.error(`Scrape error for ${url}:`, err);
    return null;
  }
}

// --- Multi-factor confidence scoring ---

const SITE_TIERS: Record<string, number> = {
  "v3rmillion.net": 90,
  "robloxscripts.com": 90,
  "rscripts.net": 90,
  "scriptblox.com": 90,
  "pastebin.com": 55,
  "github.com": 55,
};

const LEAK_KEYWORDS = [
  "free download", "leaked", "cracked", "get it here", "paste",
  "script hub", "free script", "download free", "leaked script",
  "free model", "rip", "stolen", "nulled", "bypass",
];

function calculateConfidenceScore(
  productName: string,
  snippet: string,
  title: string,
  domain: string
): { score: number; factors: { uniqueness: number; relevance: number; reputation: number } } {
  // 1. Product Name Uniqueness (0–100)
  const words = productName.trim().split(/\s+/);
  const hasSpecialChars = /[0-9\-_\.\/]/.test(productName);
  const hasVersion = /v\d|ver|edition|mk\d|mod/i.test(productName);
  let uniqueness = 15;
  if (words.length === 2) uniqueness = 35;
  if (words.length >= 3) uniqueness = 75;
  if (hasSpecialChars || hasVersion) uniqueness = Math.max(uniqueness, 90);
  if (words.length === 1 && productName.length > 12) uniqueness = Math.max(uniqueness, 50);

  // 2. Snippet Relevance (0–100)
  const lowerSnippet = snippet.toLowerCase();
  const lowerTitle = title.toLowerCase();
  const lowerName = productName.toLowerCase();
  let relevance = 5;
  if (lowerSnippet.includes(lowerName)) relevance += 40;
  else if (lowerTitle.includes(lowerName)) relevance += 15;
  const keywordHits = LEAK_KEYWORDS.filter(kw => lowerSnippet.includes(kw) || lowerTitle.includes(kw));
  if (keywordHits.length > 0) relevance += Math.min(30, keywordHits.length * 10);
  if (snippet.length > 50 && lowerSnippet.includes(lowerName)) relevance += 15;
  relevance = Math.min(100, relevance);

  // 3. Site Reputation (0–100)
  const cleanDomain = domain.replace(/^www\./, "");
  const reputation = Object.entries(SITE_TIERS).find(([d]) => cleanDomain.includes(d))?.[1] ?? 25;

  const score = Math.round(uniqueness * 0.35 + relevance * 0.35 + reputation * 0.30);
  return { score, factors: { uniqueness, relevance, reputation } };
}

function scoreToConfidence(score: number): string {
  if (score >= 70) return "high";
  if (score >= 40) return "medium";
  return "low";
}

// --- AI-powered content verification ---

async function verifyWithAI(
  lovableApiKey: string,
  productName: string,
  sourceDomain: string,
  title: string,
  snippet: string
): Promise<{ verdict: "leak" | "suspicious" | "legitimate"; reason: string }> {
  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are a content moderation classifier for a Roblox asset marketplace. Your job is to determine whether a web page is sharing/redistributing a seller's product (a leak) or merely mentioning it legitimately.

A "leak" means the page is distributing, sharing download links, or hosting the actual asset files (scripts, models, maps, etc.) without authorization.
A "suspicious" result means the page might be a leak but there isn't enough evidence from the snippet alone.
A "legitimate" result means the page is a review, tutorial, discussion, or the seller's own listing.

Respond using the provided tool.`,
          },
          {
            role: "user",
            content: `Product name: "${productName}"
Source domain: ${sourceDomain}
Page title: "${title}"
Snippet: "${snippet}"

Is this page leaking the product, suspicious, or a legitimate mention?`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "classify_result",
              description: "Classify whether a search result represents a leak, is suspicious, or is legitimate.",
              parameters: {
                type: "object",
                properties: {
                  verdict: {
                    type: "string",
                    enum: ["leak", "suspicious", "legitimate"],
                    description: "The classification of the search result.",
                  },
                  reason: {
                    type: "string",
                    description: "A one-sentence explanation for the classification.",
                  },
                },
                required: ["verdict", "reason"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "classify_result" } },
      }),
    });

    if (!res.ok) {
      console.error(`AI verification failed: ${res.status}`);
      return { verdict: "leak", reason: "AI verification unavailable, defaulting to leak" };
    }

    const data = await res.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (toolCall?.function?.arguments) {
      const parsed = JSON.parse(toolCall.function.arguments);
      return {
        verdict: parsed.verdict || "leak",
        reason: parsed.reason || "",
      };
    }

    return { verdict: "leak", reason: "Could not parse AI response, defaulting to leak" };
  } catch (err) {
    console.error("AI verification error:", err);
    return { verdict: "leak", reason: "AI verification error, defaulting to leak" };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY");
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!firecrawlKey) {
      console.error("FIRECRAWL_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Firecrawl not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    // Get stores with leak_scan_enabled
    const { data: stores, error: storesErr } = await supabase
      .from("stores")
      .select("id, owner_id, store_name")
      .eq("leak_scan_enabled", true);

    if (storesErr) throw storesErr;
    if (!stores?.length) {
      return new Response(
        JSON.stringify({ message: "No stores to scan", scanned: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check Pro subscription for each store owner
    const proStores: typeof stores = [];
    for (const store of stores) {
      const { data: sub } = await supabase
        .from("seller_subscriptions")
        .select("id")
        .eq("user_id", store.owner_id)
        .eq("status", "active")
        .maybeSingle();

      if (sub) proStores.push(store);
    }

    if (!proStores.length) {
      return new Response(
        JSON.stringify({ message: "No Pro stores to scan", scanned: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let totalNewResults = 0;

    for (const store of proStores) {
      const { data: products } = await supabase
        .from("products")
        .select("id, name")
        .eq("store_id", store.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(MAX_PRODUCTS_PER_STORE);

      if (!products?.length) continue;

      for (const product of products) {
        const siteQuery = LEAK_SITES.map((s) => `site:${s}`).join(" OR ");
        const query = `"${product.name}" (${siteQuery})`;

        try {
          const searchRes = await fetch("https://api.firecrawl.dev/v1/search", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${firecrawlKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ query, limit: 5 }),
          });

          if (!searchRes.ok) {
            const errBody = await searchRes.text();
            console.error(`Firecrawl search failed for "${product.name}": ${searchRes.status} ${errBody}`);
            continue;
          }

          const searchData = await searchRes.json();
          const results = searchData.data || [];

          for (const result of results) {
            if (!result.url) continue;

            const domain = new URL(result.url).hostname.replace(/^www\./, "");
            const snippet = result.description || result.title || "";
            const title = result.title || "";

            // --- AI Verification Step ---
            let aiVerdict: { verdict: string; reason: string } = { verdict: "leak", reason: "" };

            if (lovableApiKey) {
              aiVerdict = await verifyWithAI(lovableApiKey, product.name, domain, title, snippet);
              console.log(`AI verdict for ${result.url}: ${aiVerdict.verdict} — ${aiVerdict.reason}`);

              // Skip legitimate results entirely
              if (aiVerdict.verdict === "legitimate") {
                console.log(`Skipping legitimate result: ${result.url}`);
                continue;
              }

              // Rate limit between AI calls
              await new Promise((r) => setTimeout(r, 1000));
            }

            // Suspicious results get recorded with low confidence, no notification
            const isSuspicious = aiVerdict.verdict === "suspicious";

            // --- Fingerprint check (only for leak verdict) ---
            let confidence = isSuspicious ? "low" : "medium";
            let extractedFingerprint: string | null = null;
            let matchedUserId: string | null = null;
            let matchedDisplayName: string | null = null;

            if (!isSuspicious) {
              const isScrapable = SCRAPABLE_DOMAINS.some((d) => domain.includes(d));

              if (isScrapable) {
                extractedFingerprint = await scrapeAndExtractFingerprint(firecrawlKey, result.url);

                if (extractedFingerprint) {
                  const buyer = await identifyBuyer(supabase, extractedFingerprint, product.id);
                  matchedUserId = buyer.userId;
                  matchedDisplayName = buyer.displayName;
                  confidence = matchedUserId ? "confirmed" : "high";
                }

                await new Promise((r) => setTimeout(r, 2000));
              }
            }

            // Insert result (deduplicate by unique constraint on source_url)
            const { error: insertErr } = await supabase
              .from("leak_scan_results")
              .insert({
                store_id: store.id,
                product_id: product.id,
                source_url: result.url,
                source_domain: domain,
                matched_query: query,
                snippet: snippet.substring(0, 500),
                confidence,
                extracted_fingerprint: extractedFingerprint,
                matched_user_id: matchedUserId,
                matched_display_name: matchedDisplayName,
                ai_verdict: aiVerdict.verdict,
              });

            if (insertErr) {
              if (insertErr.code === "23505") continue; // duplicate
              console.error("Insert error:", insertErr.message);
              continue;
            }

            totalNewResults++;

            // Only notify for actual leak verdicts (not suspicious)
            if (!isSuspicious) {
              const notifTitle = confidence === "confirmed"
                ? `CONFIRMED leak: ${product.name} \u2014 buyer identified`
                : confidence === "high"
                  ? `Likely leak detected: ${product.name} (fingerprint found)`
                  : `Potential leak detected: ${product.name}`;

              await supabase.from("seller_notifications").insert({
                user_id: store.owner_id,
                type: "leak_detected",
                title: notifTitle,
                message: `Found on ${domain}: ${snippet.substring(0, 100)}`,
                action_url: "/seller/security",
              });
            }
          }

          // Rate limit between products
          await new Promise((r) => setTimeout(r, 1000));
        } catch (searchErr) {
          console.error(`Search error for "${product.name}":`, searchErr);
        }
      }
    }

    console.log(`Scan complete. ${totalNewResults} new results found across ${proStores.length} stores.`);

    return new Response(
      JSON.stringify({
        message: "Scan complete",
        storesScanned: proStores.length,
        newResults: totalNewResults,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Auto-detect-leaks error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
