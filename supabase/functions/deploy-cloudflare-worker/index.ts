const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function getWorkerScript(): string {
  const SUPABASE_URL = "https://qlnbergwjfrmgkjhrbkj.supabase.co";
  const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFsbmJlcmd3amZybWdramhyYmtqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2NDY1NjIsImV4cCI6MjA4MzIyMjU2Mn0.4jHxaV7Mjlw2RbjDz9W8B07-SR_8Z7IeTTXMu8RUZ20";
  const SITE_URL = "https://eclipserblx.com";
  const DEFAULT_IMAGE = "https://storage.googleapis.com/gpt-engineer-file-uploads/6XoLGVy9Aseup6dIxodIWS9uGsS2/social-images/social-1772684689417-IMG_0084.webp";

  return `
const SU="${SUPABASE_URL}";const AK="${ANON_KEY}";const SU_URL="${SITE_URL}";const SN="Eclipse";
const DI="${DEFAULT_IMAGE}";
const DD="Eclipse is the best Roblox asset marketplace. Buy premium roleplay scripts, vehicles, maps and game assets. Lower fees, instant delivery.";
const BP=["Discordbot","Twitterbot","facebookexternalhit","LinkedInBot","Slackbot","TelegramBot","WhatsApp","Googlebot","bingbot","Applebot","Embedly","Iframely","vkShare","Pinterestbot"];
const NB=["Lighthouse","PageSpeed","PTST","Chrome-Lighthouse","Speed Insights"];
const SP={"/":["Eclipse | Roblox Marketplace — Premium Assets, Lower Fees",DD],"/products":["Browse Products | Eclipse","Browse hundreds of premium Roblox assets on Eclipse."],"/stores":["Browse Stores | Eclipse","Discover verified Roblox asset stores on Eclipse."],"/categories":["Categories | Eclipse","Browse Roblox assets by category."],"/featured":["Featured Products | Eclipse","Hand-picked featured Roblox assets on Eclipse."],"/eclipse-plus":["Eclipse+ Membership | Eclipse","Get exclusive perks with Eclipse+ membership."],"/faq":["FAQ | Eclipse","Frequently asked questions about Eclipse marketplace."],"/sell":["Start Selling on Eclipse","Sell your Roblox creations on Eclipse."],"/contact":["Contact Us | Eclipse","Get in touch with the Eclipse team."],"/affiliate":["Affiliate Programme | Eclipse","Earn commission by referring to Eclipse."],"/advertise":["Advertise on Eclipse","Promote your Roblox products on Eclipse."],"/jobs":["Jobs | Eclipse","Join the Eclipse team."]};
const MD=['eclipserblx.com','www.eclipserblx.com'];
const RS=['guard','www','api','admin','mail','stores'];
function e(s){return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");}
function oh(t,d,img,url,type,ex){return'<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/><title>'+e(t)+'</title><meta name="description" content="'+e(d)+'"/><link rel="canonical" href="'+e(url)+'"/><meta property="og:type" content="'+(type||'website')+'"/><meta property="og:site_name" content="'+SN+'"/><meta property="og:title" content="'+e(t)+'"/><meta property="og:description" content="'+e(d)+'"/><meta property="og:image" content="'+e(img)+'"/><meta property="og:image:width" content="1200"/><meta property="og:image:height" content="630"/><meta property="og:url" content="'+e(url)+'"/>'+(ex||'')+'<meta name="twitter:card" content="summary_large_image"/><meta name="twitter:title" content="'+e(t)+'"/><meta name="twitter:description" content="'+e(d)+'"/><meta name="twitter:image" content="'+e(img)+'"/><meta http-equiv="refresh" content="0;url='+e(url)+'"/></head><body><p>Redirecting…</p></body></html>';}
async function dg(t,s,f){const r=await fetch(SU+"/rest/v1/"+t+"?select="+encodeURIComponent(s)+"&"+f,{headers:{apikey:AK,Authorization:"Bearer "+AK,Accept:"application/vnd.pgrst.object+json"}});if(!r.ok){await r.text();return null;}try{return await r.json();}catch{return null;}}
function isSS(h){if(MD.includes(h))return false;if(h.endsWith('.eclipserblx.com')){const s=h.replace('.eclipserblx.com','');return!RS.includes(s);}if(h.endsWith('.lovable.app')||h.endsWith('.lovableproject.com'))return false;return true;}
async function pOg(slug){const p=await dg("products","name,description,images,price,slug,stores(name)","slug=eq."+slug+"&is_active=eq.true");if(!p)return null;const sn=p.stores?.name;const rd=p.description?p.description.replace(/<[^>]*>/g,"").slice(0,200):"Check out "+p.name+" on Eclipse";const d=sn?"By "+sn+" — "+rd:rd;const img=(p.images&&p.images[0])||DI;const pe=p.price!=null?'<meta property="product:price:amount" content="'+p.price+'"/><meta property="product:price:currency" content="GBP"/>':"";return oh(p.name+" | "+SN,d,img,SU_URL+"/products/"+slug,"product",pe);}
async function sOg(slug){const s=await dg("stores","name,description,logo_url,banner_url,slug,product_count","slug=eq."+slug+"&is_active=eq.true");if(!s)return null;const d=s.description?s.description.replace(/<[^>]*>/g,"").slice(0,200):"Browse "+s.name+"'s products on Eclipse.";return oh(s.name+" | "+SN,d,s.banner_url||s.logo_url||DI,SU_URL+"/store/"+slug,"profile","");}
function oR(html,tag){return new Response(html,{status:200,headers:{"Content-Type":"text/html;charset=utf-8","Cache-Control":"public,max-age=300","X-Eclipse-Worker":tag}});}
export default{async fetch(request){try{const url=new URL(request.url);const ua=request.headers.get("User-Agent")||"";const h=url.hostname;let path=url.pathname;if(path.startsWith("/share/")){path=path.slice(6);const pm=path.match(/^\\/products\\/([a-zA-Z0-9][a-zA-Z0-9\\-_]{0,200})$/);if(pm){const html=await pOg(pm[1]);if(html)return oR(html,"og-share-product");}const sm=path.match(/^\\/store\\/([a-zA-Z0-9][a-zA-Z0-9\\-_]{0,200})$/);if(sm){const html=await sOg(sm[1]);if(html)return oR(html,"og-share-store");}const sp=SP[path];if(sp)return oR(oh(sp[0],sp[1],DI,SU_URL+path),"og-share-static");return Response.redirect(SU_URL+path,302);}if(isSS(h)){const isBot=BP.some(b=>ua.toLowerCase().includes(b.toLowerCase()));if(!isBot){const r=await fetch(request);r.headers.set("X-Eclipse-Worker","pass-human");return r;}const sub=h.replace('.eclipserblx.com','');const html=await sOg(sub);if(html)return oR(html,"og-subdomain");return fetch(request);}const isDyn=/^\\/(products|store)\\/[^/?#]+/.test(path);const isStat=SP.hasOwnProperty(path);if(!isDyn&&!isStat)return fetch(request);if(NB.some(p=>ua.toLowerCase().includes(p.toLowerCase())))return fetch(request);const isBot=BP.some(b=>ua.toLowerCase().includes(b.toLowerCase()));if(!isBot)return fetch(request);if(isStat){const sp=SP[path];return oR(oh(sp[0],sp[1],DI,SU_URL+path),"og-static");}const pm=path.match(/^\\/products\\/([a-zA-Z0-9][a-zA-Z0-9\\-_]{0,200})$/);if(pm){const html=await pOg(pm[1]);if(html)return oR(html,"og-product");}const sm=path.match(/^\\/store\\/([a-zA-Z0-9][a-zA-Z0-9\\-_]{0,200})$/);if(sm){const html=await sOg(sm[1]);if(html)return oR(html,"og-store");}return fetch(request);}catch(err){return new Response("Worker error: "+err.message,{status:500,headers:{"X-Eclipse-Worker":"fatal"}});}}};
`;
}

const WAF_BOT_EXPRESSIONS = [
  'Discordbot', 'Twitterbot', 'facebookexternalhit', 'LinkedInBot',
  'Slackbot', 'TelegramBot', 'WhatsApp', 'Googlebot', 'bingbot',
  'Applebot', 'Embedly', 'Iframely', 'vkShare', 'Pinterestbot',
];

function buildWafExpression(): string {
  return WAF_BOT_EXPRESSIONS.map(bot => `(http.user_agent contains "${bot}")`).join(' or ');
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

async function ensureWafSkipRule(token: string, zoneId: string) {
  const rulesetsData = await cfApi(`https://api.cloudflare.com/client/v4/zones/${zoneId}/rulesets`, token);
  if (!rulesetsData.success) return { success: false, error: "Failed to list rulesets" };

  const customFwRuleset = rulesetsData.result?.find((rs: any) => rs.phase === "http_request_firewall_custom");
  const wafRuleName = "Skip Bot Fight Mode for Social Crawlers";
  const newRule = {
    action: "skip",
    action_parameters: { ruleset: "current", phases: ["http_request_sbfm"], products: ["bic", "hot", "rateLimit", "securityLevel", "uaBlock", "zoneLockdown"] },
    expression: buildWafExpression(),
    description: wafRuleName,
    enabled: true,
  };

  if (customFwRuleset) {
    const full = await cfApi(`https://api.cloudflare.com/client/v4/zones/${zoneId}/rulesets/${customFwRuleset.id}`, token);
    if (!full.success) return { success: false, error: "Failed to fetch ruleset" };
    const rules = full.result?.rules || [];
    const idx = rules.findIndex((r: any) => r.description === wafRuleName);
    const updated = [...rules];
    if (idx >= 0) updated[idx] = { ...updated[idx], ...newRule }; else updated.unshift(newRule);
    const res = await cfApi(`https://api.cloudflare.com/client/v4/zones/${zoneId}/rulesets/${customFwRuleset.id}`, token, {
      method: "PUT",
      body: JSON.stringify({ rules: updated.map((r: any) => ({ action: r.action, action_parameters: r.action_parameters, expression: r.expression, description: r.description, enabled: r.enabled })) }),
    });
    return { success: !!res.success, action: idx >= 0 ? "updated" : "added" };
  }

  const res = await cfApi(`https://api.cloudflare.com/client/v4/zones/${zoneId}/rulesets`, token, {
    method: "POST",
    body: JSON.stringify({ name: "Eclipse Custom WAF Rules", kind: "zone", phase: "http_request_firewall_custom", rules: [newRule] }),
  });
  return { success: !!res.success, action: "created_ruleset" };
}

async function ensureRedirectRule(token: string, zoneId: string) {
  const phase = "http_request_dynamic_redirect";
  const ruleName = "Eclipse /share/ OG proxy redirect";
  const entrypoint = await cfApi(`https://api.cloudflare.com/client/v4/zones/${zoneId}/rulesets/phases/${phase}/entrypoint`, token);

  const rule = {
    action: "redirect",
    action_parameters: { from_value: { status_code: 302, target_url: { expression: `concat("https://qlnbergwjfrmgkjhrbkj.supabase.co/functions/v1/og-proxy?path=", substring(http.request.uri.path, 6))` }, preserve_query_string: false } },
    expression: `starts_with(http.request.uri.path, "/share/")`,
    description: ruleName,
    enabled: true,
  };

  if (entrypoint.success && entrypoint.result?.id) {
    const rules = entrypoint.result.rules || [];
    const idx = rules.findIndex((r: any) => r.description === ruleName);
    const updated = [...rules];
    if (idx >= 0) updated[idx] = { ...updated[idx], ...rule }; else updated.unshift(rule);
    const res = await cfApi(`https://api.cloudflare.com/client/v4/zones/${zoneId}/rulesets/${entrypoint.result.id}`, token, {
      method: "PUT",
      body: JSON.stringify({ rules: updated.map((r: any) => ({ action: r.action, action_parameters: r.action_parameters, expression: r.expression, description: r.description, enabled: r.enabled })) }),
    });
    return { success: !!res.success, action: idx >= 0 ? "updated" : "added" };
  }

  const res = await cfApi(`https://api.cloudflare.com/client/v4/zones/${zoneId}/rulesets`, token, {
    method: "POST",
    body: JSON.stringify({ name: "Eclipse Redirect Rules", kind: "zone", phase, rules: [rule] }),
  });
  return { success: !!res.success, action: "created_ruleset" };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const cfToken = Deno.env.get("CLOUDFLARE_API_TOKEN");
    const cfZoneId = Deno.env.get("CLOUDFLARE_ZONE_ID");
    if (!cfToken || !cfZoneId) {
      return new Response(JSON.stringify({ error: "Missing Cloudflare credentials" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const zoneData = await cfApi(`https://api.cloudflare.com/client/v4/zones/${cfZoneId}`, cfToken);
    if (!zoneData.success) return new Response(JSON.stringify({ error: "Zone fetch failed" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const accountId = zoneData.result.account.id;

    // Upload worker
    const workerName = "eclipse-og-proxy";
    const script = getWorkerScript();
    const boundary = "----FB" + Math.random().toString(36).slice(2);
    const body = `--${boundary}\r\nContent-Disposition: form-data; name="metadata"; filename="metadata.json"\r\nContent-Type: application/json\r\n\r\n${JSON.stringify({ main_module: "worker.js", compatibility_date: "2024-01-01" })}\r\n--${boundary}\r\nContent-Disposition: form-data; name="worker.js"; filename="worker.js"\r\nContent-Type: application/javascript+module\r\n\r\n${script}\r\n--${boundary}--`;

    const upload = await cfApi(`https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/${workerName}`, cfToken, {
      method: "PUT",
      headers: { "Content-Type": `multipart/form-data; boundary=${boundary}` },
      body,
    });
    if (!upload.success) return new Response(JSON.stringify({ error: "Worker upload failed", details: upload.errors }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Routes
    const routesData = await cfApi(`https://api.cloudflare.com/client/v4/zones/${cfZoneId}/workers/routes`, cfToken);
    const existing = Array.isArray(routesData.result) ? routesData.result : [];
    const patterns = ["eclipserblx.com/*", "www.eclipserblx.com/*", "*.eclipserblx.com/*"];
    const routeResults = [];
    for (const pattern of patterns) {
      const ex = existing.find((r: any) => r.pattern === pattern);
      if (ex?.script === workerName) { routeResults.push({ pattern, action: "unchanged" }); continue; }
      if (ex) {
        await cfApi(`https://api.cloudflare.com/client/v4/zones/${cfZoneId}/workers/routes/${ex.id}`, cfToken, { method: "PUT", body: JSON.stringify({ pattern, script: workerName }) });
        routeResults.push({ pattern, action: "updated" });
      } else {
        await cfApi(`https://api.cloudflare.com/client/v4/zones/${cfZoneId}/workers/routes`, cfToken, { method: "POST", body: JSON.stringify({ pattern, script: workerName }) });
        routeResults.push({ pattern, action: "created" });
      }
    }

    // WAF + Redirect + SBFM in parallel
    const [waf, redirect] = await Promise.all([
      ensureWafSkipRule(cfToken, cfZoneId),
      ensureRedirectRule(cfToken, cfZoneId),
    ]);

    let sbfm = { success: false as boolean };
    try {
      const r = await fetch(`https://api.cloudflare.com/client/v4/zones/${cfZoneId}/bot_management`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${cfToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ sbfm_definitely_automated: "allow", sbfm_verified_bots: "allow", sbfm_static_resource_protection: false }),
      });
      const d = await r.json();
      sbfm = { success: !!d.success };
    } catch {}

    // DNS proxy check
    const dnsData = await cfApi(`https://api.cloudflare.com/client/v4/zones/${cfZoneId}/dns_records`, cfToken);
    const dnsResults: any[] = [];
    if (dnsData.success) {
      const targets = ['eclipserblx.com', 'www.eclipserblx.com', '*.eclipserblx.com'];
      for (const rec of (dnsData.result || []).filter((r: any) => targets.includes(r.name) && ['A', 'AAAA', 'CNAME'].includes(r.type))) {
        if (!rec.proxied) {
          await cfApi(`https://api.cloudflare.com/client/v4/zones/${cfZoneId}/dns_records/${rec.id}`, cfToken, { method: "PATCH", body: JSON.stringify({ proxied: true }) });
          dnsResults.push({ name: rec.name, proxied: true, action: "enabled" });
        } else {
          dnsResults.push({ name: rec.name, proxied: true, action: "ok" });
        }
      }
    }

    return new Response(JSON.stringify({
      success: true, worker: workerName, upload: upload.success,
      routes: routeResults, waf, redirect, sbfm, dns: dnsResults,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    return new Response(JSON.stringify({ error: "Failed", message: (error as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
