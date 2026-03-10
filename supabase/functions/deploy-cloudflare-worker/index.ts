const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const WORKER_SCRIPT = `
const SUPABASE_URL = "https://qlnbergwjfrmgkjhrbkj.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFsbmJlcmd3amZybWdramhyYmtqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2NDY1NjIsImV4cCI6MjA4MzIyMjU2Mn0.4jHxaV7Mjlw2RbjDz9W8B07-SR_8Z7IeTTXMu8RUZ20";
const SITE_URL = "https://eclipserblx.com";
const SITE_NAME = "Eclipse";
const DEFAULT_IMAGE = "https://storage.googleapis.com/gpt-engineer-file-uploads/6XoLGVy9Aseup6dIxodIWS9uGsS2/social-images/social-1772684689417-IMG_0084.webp";
const DEFAULT_DESC = "Eclipse is the best Roblox asset marketplace. Buy premium roleplay scripts, vehicles, maps and game assets. Lower fees, instant delivery.";
const BOT_PATTERNS = ["Discordbot","Twitterbot","facebookexternalhit","LinkedInBot","Slackbot","TelegramBot","WhatsApp","Googlebot","bingbot","Applebot","Embedly","Iframely","vkShare","Pinterestbot"];
const NOT_BOT_PATTERNS = ["Lighthouse","PageSpeed","PTST","Chrome-Lighthouse","Speed Insights"];
const STATIC_PAGES = {
  "/": { t: "Eclipse | Roblox Marketplace — Premium Assets, Lower Fees", d: DEFAULT_DESC },
  "/products": { t: "Browse Products | Eclipse", d: "Browse hundreds of premium Roblox assets on Eclipse." },
  "/stores": { t: "Browse Stores | Eclipse", d: "Discover verified Roblox asset stores on Eclipse." },
  "/categories": { t: "Categories | Eclipse", d: "Browse Roblox assets by category." },
  "/featured": { t: "Featured Products | Eclipse", d: "Hand-picked featured Roblox assets on Eclipse." },
  "/eclipse-plus": { t: "Eclipse+ Membership | Eclipse", d: "Get exclusive perks with Eclipse+ membership." },
  "/faq": { t: "FAQ | Eclipse", d: "Frequently asked questions about Eclipse marketplace." },
  "/sell": { t: "Start Selling on Eclipse", d: "Sell your Roblox creations on Eclipse." },
  "/contact": { t: "Contact Us | Eclipse", d: "Get in touch with the Eclipse team." },
  "/affiliate": { t: "Affiliate Programme | Eclipse", d: "Earn commission by referring to Eclipse." },
  "/advertise": { t: "Advertise on Eclipse", d: "Promote your Roblox products on Eclipse." },
  "/jobs": { t: "Jobs | Eclipse", d: "Join the Eclipse team." },
};
const MAIN_DOMAINS = ['eclipserblx.com', 'www.eclipserblx.com'];
const RESERVED_SUBS = ['guard','www','api','admin','mail','stores'];
function esc(s){return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");}
function ogHtml(t,d,img,url,type,extra){
  return '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/><title>'+esc(t)+'</title><meta name="description" content="'+esc(d)+'"/><link rel="canonical" href="'+esc(url)+'"/><meta property="og:type" content="'+(type||'website')+'"/><meta property="og:site_name" content="'+SITE_NAME+'"/><meta property="og:title" content="'+esc(t)+'"/><meta property="og:description" content="'+esc(d)+'"/><meta property="og:image" content="'+esc(img)+'"/><meta property="og:image:width" content="1200"/><meta property="og:image:height" content="630"/><meta property="og:url" content="'+esc(url)+'"/>'+(extra||'')+'<meta name="twitter:card" content="summary_large_image"/><meta name="twitter:title" content="'+esc(t)+'"/><meta name="twitter:description" content="'+esc(d)+'"/><meta name="twitter:image" content="'+esc(img)+'"/><meta http-equiv="refresh" content="0;url='+esc(url)+'"/></head><body><p>Redirecting…</p></body></html>';
}
async function dbGet(table,select,filters){
  const r=await fetch(SUPABASE_URL+"/rest/v1/"+table+"?select="+encodeURIComponent(select)+"&"+filters,{
    headers:{apikey:SUPABASE_ANON_KEY,Authorization:"Bearer "+SUPABASE_ANON_KEY,Accept:"application/vnd.pgrst.object+json"}
  });
  if(!r.ok){await r.text();return null;}
  try{return await r.json();}catch{return null;}
}
function isStoreSub(h){
  if(MAIN_DOMAINS.includes(h))return false;
  if(h.endsWith('.eclipserblx.com')){const s=h.replace('.eclipserblx.com','');return !RESERVED_SUBS.includes(s);}
  if(h.endsWith('.lovable.app')||h.endsWith('.lovableproject.com'))return false;
  return true;
}
async function productOg(slug){
  const p=await dbGet("products","name,description,images,price,slug,stores(name)","slug=eq."+slug+"&is_active=eq.true");
  if(!p)return null;
  const sn=p.stores?.name;const rd=p.description?p.description.replace(/<[^>]*>/g,"").slice(0,200):"Check out "+p.name+" on Eclipse";
  const d=sn?"By "+sn+" — "+rd:rd;const img=(p.images&&p.images[0])||DEFAULT_IMAGE;
  const pe=p.price!=null?'<meta property="product:price:amount" content="'+p.price+'"/><meta property="product:price:currency" content="GBP"/>':"";
  return ogHtml(p.name+" | "+SITE_NAME,d,img,SITE_URL+"/products/"+slug,"product",pe);
}
async function storeOg(slug){
  const s=await dbGet("stores","name,description,logo_url,banner_url,slug,product_count","slug=eq."+slug+"&is_active=eq.true");
  if(!s)return null;
  const d=s.description?s.description.replace(/<[^>]*>/g,"").slice(0,200):"Browse "+s.name+"'s products on Eclipse.";
  return ogHtml(s.name+" | "+SITE_NAME,d,s.banner_url||s.logo_url||DEFAULT_IMAGE,SITE_URL+"/store/"+slug,"profile","");
}
function ogResponse(html,tag){return new Response(html,{status:200,headers:{"Content-Type":"text/html;charset=utf-8","Cache-Control":"public,max-age=300","X-Eclipse-Worker":tag}});}
export default {
  async fetch(request){
    try{
      const url=new URL(request.url);const ua=request.headers.get("User-Agent")||"";const h=url.hostname;
      let path=url.pathname;
      // /share/ always serve OG
      if(path.startsWith("/share/")){path=path.slice(6);
        const pm=path.match(/^\\/products\\/([a-zA-Z0-9][a-zA-Z0-9\\-_]{0,200})$/);
        if(pm){const html=await productOg(pm[1]);if(html)return ogResponse(html,"og-share-product");}
        const sm=path.match(/^\\/store\\/([a-zA-Z0-9][a-zA-Z0-9\\-_]{0,200})$/);
        if(sm){const html=await storeOg(sm[1]);if(html)return ogResponse(html,"og-share-store");}
        const sp=STATIC_PAGES[path];
        if(sp)return ogResponse(ogHtml(sp.t,sp.d,DEFAULT_IMAGE,SITE_URL+path),"og-share-static");
        return Response.redirect(SITE_URL+path,302);
      }
      // Store subdomains
      if(isStoreSub(h)){
        const isBot=BOT_PATTERNS.some(b=>ua.toLowerCase().includes(b.toLowerCase()));
        if(!isBot){const r=await fetch(request);r.headers.set("X-Eclipse-Worker","pass-human");return r;}
        const sub=h.replace('.eclipserblx.com','');
        const html=await storeOg(sub);
        if(html)return ogResponse(html,"og-subdomain");
        return fetch(request);
      }
      // Main domain
      const isDyn=/^\\/(products|store)\\/[^/?#]+/.test(path);
      const isStat=STATIC_PAGES.hasOwnProperty(path);
      if(!isDyn&&!isStat){const r=await fetch(request);return r;}
      if(NOT_BOT_PATTERNS.some(p=>ua.toLowerCase().includes(p.toLowerCase())))return fetch(request);
      const isBot=BOT_PATTERNS.some(b=>ua.toLowerCase().includes(b.toLowerCase()));
      if(!isBot)return fetch(request);
      // Bot on main domain
      if(isStat){const sp=STATIC_PAGES[path];return ogResponse(ogHtml(sp.t,sp.d,DEFAULT_IMAGE,SITE_URL+path),"og-static");}
      const pm=path.match(/^\\/products\\/([a-zA-Z0-9][a-zA-Z0-9\\-_]{0,200})$/);
      if(pm){const html=await productOg(pm[1]);if(html)return ogResponse(html,"og-product");}
      const sm=path.match(/^\\/store\\/([a-zA-Z0-9][a-zA-Z0-9\\-_]{0,200})$/);
      if(sm){const html=await storeOg(sm[1]);if(html)return ogResponse(html,"og-store");}
      return fetch(request);
    }catch(e){return new Response("Worker error: "+e.message,{status:500,headers:{"X-Eclipse-Worker":"fatal"}});}
  },
};
`;

// Bot UA patterns for WAF skip rule
const WAF_BOT_EXPRESSIONS = [
  'Discordbot', 'Twitterbot', 'facebookexternalhit', 'LinkedInBot',
  'Slackbot', 'TelegramBot', 'WhatsApp', 'Googlebot', 'bingbot',
  'Applebot', 'Embedly', 'Iframely', 'vkShare', 'Pinterestbot',
];

function buildWafExpression(): string {
  return WAF_BOT_EXPRESSIONS
    .map(bot => `(http.user_agent contains "${bot}")`)
    .join(' or ');
}

async function cfApi(url: string, token: string, options: RequestInit = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  return res.json();
}

async function ensureWafSkipRule(cfApiToken: string, cfZoneId: string) {
  // Get existing custom firewall rulesets for the zone
  const rulesetsData = await cfApi(
    `https://api.cloudflare.com/client/v4/zones/${cfZoneId}/rulesets`,
    cfApiToken
  );

  if (!rulesetsData.success) {
    return { success: false, error: "Failed to list rulesets", details: rulesetsData.errors };
  }

  // Find the zone-level custom firewall ruleset (phase: http_request_firewall_custom)
  const customFwRuleset = rulesetsData.result?.find(
    (rs: any) => rs.phase === "http_request_firewall_custom"
  );

  const wafRuleName = "Skip Bot Fight Mode for Social Crawlers";
  const wafExpression = buildWafExpression();

  const newRule = {
    action: "skip",
    action_parameters: {
      ruleset: "current",
      phases: ["http_request_sbfm"],
      products: ["bic", "hot", "rateLimit", "securityLevel", "uaBlock", "zoneLockdown"],
    },
    expression: wafExpression,
    description: wafRuleName,
    enabled: true,
  };

  if (customFwRuleset) {
    // Get full ruleset with rules
    const fullRuleset = await cfApi(
      `https://api.cloudflare.com/client/v4/zones/${cfZoneId}/rulesets/${customFwRuleset.id}`,
      cfApiToken
    );

    if (!fullRuleset.success) {
      return { success: false, error: "Failed to fetch custom firewall ruleset", details: fullRuleset.errors };
    }

    const existingRules = fullRuleset.result?.rules || [];
    const existingIdx = existingRules.findIndex((r: any) => r.description === wafRuleName);

    let updatedRules;
    if (existingIdx >= 0) {
      // Update existing rule in place
      updatedRules = [...existingRules];
      updatedRules[existingIdx] = { ...updatedRules[existingIdx], ...newRule };
    } else {
      // Prepend new rule (highest priority)
      updatedRules = [newRule, ...existingRules];
    }

    const updateResult = await cfApi(
      `https://api.cloudflare.com/client/v4/zones/${cfZoneId}/rulesets/${customFwRuleset.id}`,
      cfApiToken,
      {
        method: "PUT",
        body: JSON.stringify({
          rules: updatedRules.map((r: any) => ({
            action: r.action,
            action_parameters: r.action_parameters,
            expression: r.expression,
            description: r.description,
            enabled: r.enabled,
          })),
        }),
      }
    );

    return {
      success: !!updateResult.success,
      action: existingIdx >= 0 ? "updated" : "added",
      errors: updateResult.errors,
    };
  } else {
    // Create new custom firewall ruleset with the skip rule
    const createResult = await cfApi(
      `https://api.cloudflare.com/client/v4/zones/${cfZoneId}/rulesets`,
      cfApiToken,
      {
        method: "POST",
        body: JSON.stringify({
          name: "Eclipse Custom WAF Rules",
          kind: "zone",
          phase: "http_request_firewall_custom",
          rules: [newRule],
        }),
      }
    );

    return {
      success: !!createResult.success,
      action: "created_ruleset",
      errors: createResult.errors,
    };
  }
}

async function ensureShareRedirectRule(cfApiToken: string, cfZoneId: string) {
  const phase = "http_request_dynamic_redirect";
  const ruleName = "Eclipse /share/ OG proxy redirect";

  // Get entrypoint ruleset for dynamic redirect phase
  const entrypoint = await cfApi(
    `https://api.cloudflare.com/client/v4/zones/${cfZoneId}/rulesets/phases/${phase}/entrypoint`,
    cfApiToken
  );

  const redirectRule = {
    action: "redirect",
    action_parameters: {
      from_value: {
        status_code: 302,
        target_url: {
          expression: `concat("https://qlnbergwjfrmgkjhrbkj.supabase.co/functions/v1/og-proxy?path=", substring(http.request.uri.path, 6))`,
        },
        preserve_query_string: false,
      },
    },
    expression: `starts_with(http.request.uri.path, "/share/")`,
    description: ruleName,
    enabled: true,
  };

  if (entrypoint.success && entrypoint.result?.id) {
    // Ruleset exists, update it
    const existingRules = entrypoint.result.rules || [];
    const existingIdx = existingRules.findIndex((r: any) => r.description === ruleName);

    let updatedRules;
    if (existingIdx >= 0) {
      updatedRules = [...existingRules];
      updatedRules[existingIdx] = { ...updatedRules[existingIdx], ...redirectRule };
    } else {
      updatedRules = [redirectRule, ...existingRules];
    }

    const updateResult = await cfApi(
      `https://api.cloudflare.com/client/v4/zones/${cfZoneId}/rulesets/${entrypoint.result.id}`,
      cfApiToken,
      {
        method: "PUT",
        body: JSON.stringify({
          rules: updatedRules.map((r: any) => ({
            action: r.action,
            action_parameters: r.action_parameters,
            expression: r.expression,
            description: r.description,
            enabled: r.enabled,
          })),
        }),
      }
    );

    return {
      success: !!updateResult.success,
      action: existingIdx >= 0 ? "updated" : "added",
      errors: updateResult.errors,
    };
  } else {
    // Create new entrypoint ruleset
    const createResult = await cfApi(
      `https://api.cloudflare.com/client/v4/zones/${cfZoneId}/rulesets`,
      cfApiToken,
      {
        method: "POST",
        body: JSON.stringify({
          name: "Eclipse Redirect Rules",
          kind: "zone",
          phase,
          rules: [redirectRule],
        }),
      }
    );

    return {
      success: !!createResult.success,
      action: "created_ruleset",
      errors: createResult.errors,
    };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const cfApiToken = Deno.env.get("CLOUDFLARE_API_TOKEN");
    const cfZoneId = Deno.env.get("CLOUDFLARE_ZONE_ID");

    if (!cfApiToken || !cfZoneId) {
      return new Response(
        JSON.stringify({ error: "Missing Cloudflare credentials" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 1: Get account ID from zone
    const zoneData = await cfApi(`https://api.cloudflare.com/client/v4/zones/${cfZoneId}`, cfApiToken);
    if (!zoneData.success) {
      return new Response(
        JSON.stringify({ error: "Failed to fetch zone info", details: zoneData.errors }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const accountId = zoneData.result.account.id;

    // Step 2: Upload worker script
    const workerName = "eclipse-og-proxy";
    const metadata = JSON.stringify({
      main_module: "worker.js",
      compatibility_date: "2024-01-01",
    });

    const boundary = "----FormBoundary" + Math.random().toString(36).slice(2);
    const body = [
      `--${boundary}`,
      `Content-Disposition: form-data; name="metadata"; filename="metadata.json"`,
      `Content-Type: application/json`,
      ``,
      metadata,
      `--${boundary}`,
      `Content-Disposition: form-data; name="worker.js"; filename="worker.js"`,
      `Content-Type: application/javascript+module`,
      ``,
      WORKER_SCRIPT,
      `--${boundary}--`,
    ].join("\r\n");

    const uploadData = await cfApi(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/${workerName}`,
      cfApiToken,
      {
        method: "PUT",
        headers: { "Content-Type": `multipart/form-data; boundary=${boundary}` },
        body,
      }
    );

    if (!uploadData.success) {
      return new Response(
        JSON.stringify({ error: "Failed to upload worker", details: uploadData.errors }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 3: Ensure OG worker routes exist
    const routesData = await cfApi(
      `https://api.cloudflare.com/client/v4/zones/${cfZoneId}/workers/routes`,
      cfApiToken
    );

    if (!routesData.success) {
      return new Response(
        JSON.stringify({ error: "Failed to fetch worker routes", details: routesData.errors }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const existingRoutes = Array.isArray(routesData.result) ? routesData.result : [];
    const desiredPatterns = ["eclipserblx.com/*", "www.eclipserblx.com/*", "*.eclipserblx.com/*"];

    const routeResults: Array<{
      pattern: string;
      action: "created" | "updated" | "unchanged";
      success: boolean;
      errors?: unknown;
    }> = [];

    for (const pattern of desiredPatterns) {
      const existingRoute = existingRoutes.find((r: any) => r.pattern === pattern);

      if (existingRoute) {
        if (existingRoute.script === workerName) {
          routeResults.push({ pattern, action: "unchanged", success: true });
          continue;
        }

        const updateData = await cfApi(
          `https://api.cloudflare.com/client/v4/zones/${cfZoneId}/workers/routes/${existingRoute.id}`,
          cfApiToken,
          {
            method: "PUT",
            body: JSON.stringify({ pattern, script: workerName }),
          }
        );
        routeResults.push({
          pattern,
          action: "updated",
          success: !!updateData?.success,
          errors: updateData?.errors,
        });
      } else {
        const createData = await cfApi(
          `https://api.cloudflare.com/client/v4/zones/${cfZoneId}/workers/routes`,
          cfApiToken,
          {
            method: "POST",
            body: JSON.stringify({ pattern, script: workerName }),
          }
        );
        routeResults.push({
          pattern,
          action: "created",
          success: !!createData?.success,
          errors: createData?.errors,
        });
      }
    }

    const routeUpdate = routeResults.every((r) => r.success);

    // Step 4: WAF skip rule for social media bots (bypasses Bot Fight Mode)
    const wafResult = await ensureWafSkipRule(cfApiToken, cfZoneId);

    console.log("[WAF] Result:", JSON.stringify(wafResult));

    // Step 5: Redirect rule for /share/ paths (bulletproof fallback)
    const redirectResult = await ensureShareRedirectRule(cfApiToken, cfZoneId);
    console.log("[REDIRECT] Result:", JSON.stringify(redirectResult));

    // Step 6: Configure SBFM to not block bots (allow WAF skip rule to work)
    let sbfmResult: Record<string, unknown> = { success: false, skipped: true };
    try {
      const sbfmRes = await fetch(
        `https://api.cloudflare.com/client/v4/zones/${cfZoneId}/bot_management`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${cfApiToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sbfm_definitely_automated: "allow",
            sbfm_verified_bots: "allow",
            sbfm_static_resource_protection: false,
          }),
        }
      );
      const sbfmText = await sbfmRes.text();
      console.log("[SBFM] Status:", sbfmRes.status, "Response:", sbfmText.slice(0, 500));
      try {
        const sbfmData = JSON.parse(sbfmText);
        sbfmResult = { success: !!sbfmData.success, action: "configured", status: sbfmRes.status, errors: sbfmData.errors };
      } catch {
        sbfmResult = { success: false, status: sbfmRes.status, raw: sbfmText.slice(0, 200) };
      }
    } catch (e) {
      sbfmResult = { success: false, error: (e as Error).message };
    }

    // Step 7: Ensure DNS records are PROXIED (orange cloud) so Cloudflare features work
    let dnsResults: Array<Record<string, unknown>> = [];
    try {
      const dnsData = await cfApi(
        `https://api.cloudflare.com/client/v4/zones/${cfZoneId}/dns_records`,
        cfApiToken
      );
      if (dnsData.success) {
        const targetHostnames = ['eclipserblx.com', 'www.eclipserblx.com'];
        const records = (dnsData.result || []).filter(
          (r: any) => targetHostnames.includes(r.name) && (r.type === 'A' || r.type === 'AAAA' || r.type === 'CNAME')
        );
        
        for (const record of records) {
          if (!record.proxied) {
            console.log(`[DNS] Enabling proxy for ${record.name} (${record.type} → ${record.content})`);
            const updateRes = await cfApi(
              `https://api.cloudflare.com/client/v4/zones/${cfZoneId}/dns_records/${record.id}`,
              cfApiToken,
              {
                method: "PATCH",
                body: JSON.stringify({ proxied: true }),
              }
            );
            dnsResults.push({
              name: record.name,
              type: record.type,
              wasProxied: false,
              nowProxied: true,
              success: !!updateRes.success,
              errors: updateRes.errors,
            });
          } else {
            dnsResults.push({
              name: record.name,
              type: record.type,
              wasProxied: true,
              action: "already_proxied",
            });
          }
        }

        // Also check wildcard *.eclipserblx.com for store subdomains
        const wildcardRecords = (dnsData.result || []).filter(
          (r: any) => r.name === '*.eclipserblx.com' && (r.type === 'A' || r.type === 'AAAA' || r.type === 'CNAME')
        );
        for (const record of wildcardRecords) {
          if (!record.proxied) {
            console.log(`[DNS] Enabling proxy for ${record.name} (${record.type})`);
            const updateRes = await cfApi(
              `https://api.cloudflare.com/client/v4/zones/${cfZoneId}/dns_records/${record.id}`,
              cfApiToken,
              { method: "PATCH", body: JSON.stringify({ proxied: true }) }
            );
            dnsResults.push({ name: record.name, type: record.type, wasProxied: false, nowProxied: true, success: !!updateRes.success, errors: updateRes.errors });
          } else {
            dnsResults.push({ name: record.name, type: record.type, wasProxied: true, action: "already_proxied" });
          }
        }
      }
      console.log("[DNS] Results:", JSON.stringify(dnsResults));
    } catch (e) {
      console.log("[DNS] Error:", (e as Error).message);
      dnsResults = [{ error: (e as Error).message }];
    }

    // Step 8: Check for conflicting Pages projects
    let pagesInfo: Record<string, unknown> = {};
    try {
      const pagesData = await cfApi(
        `https://api.cloudflare.com/client/v4/accounts/${accountId}/pages/projects`,
        cfApiToken
      );
      if (pagesData.success) {
        const projects = (pagesData.result || []).map((p: any) => ({
          name: p.name,
          domains: p.domains,
          production_branch: p.production_branch,
        }));
        const conflicting = projects.filter((p: any) =>
          p.domains?.some((d: string) => d.includes('eclipserblx'))
        );
        pagesInfo = {
          totalProjects: projects.length,
          conflicting: conflicting.length > 0 ? conflicting : "none",
        };
        console.log("[PAGES] Conflicting projects:", JSON.stringify(conflicting));
      }
    } catch (e) {
      pagesInfo = { error: (e as Error).message };
    }

    // Step 9: Get DNS record IPs for debugging
    let dnsDetails: Array<Record<string, unknown>> = [];
    try {
      const dnsData = await cfApi(
        `https://api.cloudflare.com/client/v4/zones/${cfZoneId}/dns_records`,
        cfApiToken
      );
      if (dnsData.success) {
        dnsDetails = (dnsData.result || [])
          .filter((r: any) => ['eclipserblx.com', 'www.eclipserblx.com', '*.eclipserblx.com'].includes(r.name))
          .map((r: any) => ({ name: r.name, type: r.type, content: r.content, proxied: r.proxied }));
      }
      console.log("[DNS-DETAILS]", JSON.stringify(dnsDetails));
    } catch {}

    return new Response(
      JSON.stringify({
        success: true,
        worker: workerName,
        routes: desiredPatterns,
        upload: uploadData.success,
        routeUpdate,
        routeResults,
        wafSkipRule: wafResult,
        shareRedirectRule: redirectResult,
        sbfmConfig: sbfmResult,
        dnsProxy: dnsResults,
        dnsDetails,
        pagesConflict: pagesInfo,
        message: "Worker deployed with full diagnostics",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: "Deployment failed", message: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
