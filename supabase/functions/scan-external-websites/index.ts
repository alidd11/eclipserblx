import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SCAN-EXTERNAL] ${step}${detailsStr}`);
};

// Known sites where Roblox content gets stolen/leaked
const SEARCH_SITES = [
  { name: 'Darkblox', domain: 'darkblox.gg', searchUrl: 'https://darkblox.gg' },
  { name: 'ScriptBlox', domain: 'scriptblox.com', searchUrl: 'https://scriptblox.com' },
  { name: 'Pastebin', domain: 'pastebin.com', searchUrl: 'https://pastebin.com' },
  { name: 'V3rmillion', domain: 'v3rmillion.net', searchUrl: 'https://v3rmillion.net' },
  { name: 'RBLXTrade', domain: 'rblx.trade', searchUrl: 'https://rblx.trade' },
  { name: 'RoDevs', domain: 'rodevs.com', searchUrl: 'https://rodevs.com' },
];

interface ScanRequest {
  query?: string; // Name-based search
  url?: string;   // Direct URL scan
  registry_entry_id?: string;
  creator_id: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    if (!FIRECRAWL_API_KEY) throw new Error("FIRECRAWL_API_KEY not configured");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    ).auth.getUser(token);

    if (authError || !user) throw new Error("Not authenticated");

    const body: ScanRequest = await req.json();
    const { query, url, registry_entry_id } = body;
    const creator_id = user.id;

    if (!query && !url) throw new Error("Either 'query' or 'url' is required");

    logStep("Scan started", { query, url, registry_entry_id });

    const detections: any[] = [];

    if (url) {
      // ─── DIRECT URL SCAN ───
      logStep("Scanning specific URL", { url });
      const scrapeResult = await firecrawlScrape(FIRECRAWL_API_KEY, url);
      if (scrapeResult) {
        const domain = new URL(url).hostname;
        detections.push({
          creator_id,
          registry_entry_id: registry_entry_id || null,
          source_website: domain,
          source_url: url,
          page_title: scrapeResult.metadata?.title || null,
          matched_content: (scrapeResult.markdown || '').substring(0, 2000),
          match_type: 'url_scan',
          confidence_score: 80, // High confidence since user provided the URL
          scraped_content: (scrapeResult.markdown || '').substring(0, 5000),
          status: 'detected',
        });
      }
    }

    if (query) {
      // ─── NAME-BASED SEARCH across known sites ───
      logStep("Searching external sites for query", { query });

      // Use Firecrawl search to find matches across known sites
      const siteQueries = SEARCH_SITES.map(site => `site:${site.domain} ${query}`);
      
      // Also do a general web search for "<game name> roblox script" / "roblox leak"
      const generalQueries = [
        `"${query}" roblox script free`,
        `"${query}" roblox leaked`,
        `"${query}" roblox copy download`,
      ];

      const allQueries = [...siteQueries, ...generalQueries];

      // Run searches in batches of 3 to avoid rate limits
      for (let i = 0; i < allQueries.length; i += 3) {
        const batch = allQueries.slice(i, i + 3);
        const results = await Promise.allSettled(
          batch.map(q => firecrawlSearch(FIRECRAWL_API_KEY, q, 5))
        );

        for (const result of results) {
          if (result.status !== 'fulfilled' || !result.value?.data) continue;

          for (const item of result.value.data) {
            if (!item.url) continue;

            // Skip roblox.com results (those are handled by the Roblox scanner)
            const itemDomain = new URL(item.url).hostname;
            if (itemDomain.includes('roblox.com')) continue;

            // Dedup by URL
            if (detections.some(d => d.source_url === item.url)) continue;

            // Score the match based on content relevance
            const score = scoreExternalMatch(query, item);

            if (score >= 30) {
              detections.push({
                creator_id,
                registry_entry_id: registry_entry_id || null,
                source_website: itemDomain,
                source_url: item.url,
                page_title: item.title || null,
                matched_content: (item.description || item.markdown || '').substring(0, 2000),
                match_type: 'name_match',
                confidence_score: score,
                scraped_content: (item.markdown || '').substring(0, 5000),
                status: 'detected',
              });
            }
          }
        }

        // Small delay between batches
        if (i + 3 < allQueries.length) {
          await new Promise(r => setTimeout(r, 500));
        }
      }
    }

    logStep("Scan complete", { detections_found: detections.length });

    // Save detections to database
    if (detections.length > 0) {
      const { error: insertError } = await supabaseClient
        .from('ip_external_detections')
        .insert(detections);

      if (insertError) {
        logStep("Error saving detections", { error: insertError });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        detections_found: detections.length,
        detections: detections.map(d => ({
          source_website: d.source_website,
          source_url: d.source_url,
          page_title: d.page_title,
          confidence_score: d.confidence_score,
          match_type: d.match_type,
        })),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// ─── FIRECRAWL API HELPERS ───

async function firecrawlScrape(apiKey: string, url: string) {
  try {
    const res = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url,
        formats: ['markdown'],
        onlyMainContent: true,
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.data || data;
  } catch {
    return null;
  }
}

async function firecrawlSearch(apiKey: string, query: string, limit: number) {
  try {
    const res = await fetch('https://api.firecrawl.dev/v1/search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query, limit }),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// ─── SCORING ───

function scoreExternalMatch(query: string, result: any): number {
  const q = query.toLowerCase();
  const title = (result.title || '').toLowerCase();
  const desc = (result.description || '').toLowerCase();
  const content = (result.markdown || '').toLowerCase();
  const url = (result.url || '').toLowerCase();

  let score = 0;

  // Exact name in title = strong signal
  if (title.includes(q)) score += 40;
  else if (title.includes(q.split(' ')[0])) score += 15;

  // Name in URL
  if (url.includes(q.replace(/\s+/g, '-')) || url.includes(q.replace(/\s+/g, ''))) score += 20;

  // Name in description
  if (desc.includes(q)) score += 15;

  // Keywords suggesting stolen/leaked content
  const suspiciousKeywords = ['free', 'leak', 'copy', 'download', 'script', 'exploit', 'crack', 'stolen', 'rip'];
  const foundKeywords = suspiciousKeywords.filter(k => 
    title.includes(k) || desc.includes(k) || content.substring(0, 500).includes(k)
  );
  score += Math.min(foundKeywords.length * 5, 20);

  // Known infringing site boost
  const knownBadDomains = ['darkblox', 'scriptblox', 'v3rmillion', 'pastebin'];
  if (knownBadDomains.some(d => url.includes(d))) score += 10;

  return Math.min(score, 100);
}
