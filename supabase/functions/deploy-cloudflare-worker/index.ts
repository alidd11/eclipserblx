const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function buildWorkerScript(): string {
  const OG_PROXY = "https://qlnbergwjfrmgkjhrbkj.supabase.co/functions/v1/og-proxy";
  const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFsbmJlcmd3amZybWdramhyYmtqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2NDY1NjIsImV4cCI6MjA4MzIyMjU2Mn0.4jHxaV7Mjlw2RbjDz9W8B07-SR_8Z7IeTTXMu8RUZ20";
  const SITE = "https://eclipserblx.com";
  const ORIGIN = "https://roleplay-hub-shop.lovable.app";

  // Use a clean, readable script instead of line-by-line concatenation
  return `
const OG_PROXY = "${OG_PROXY}";
const ANON_KEY = "${ANON_KEY}";
const SITE_URL = "${SITE}";
const ORIGIN_URL = "${ORIGIN}";

const BOT_PATTERNS = [
  "Discordbot", "Twitterbot", "facebookexternalhit", "LinkedInBot",
  "Slackbot", "TelegramBot", "WhatsApp", "Googlebot", "bingbot",
  "Applebot", "Embedly", "Iframely", "vkShare", "Pinterestbot"
];

const NOT_BOT_PATTERNS = [
  "Lighthouse", "PageSpeed", "PTST", "Chrome-Lighthouse", "Speed Insights"
];

const STATIC_OG_PATHS = new Set([
  "/", "/products", "/stores", "/categories", "/featured",
  "/eclipse-plus", "/faq", "/help-center", "/sell", "/contact",
  "/affiliate", "/advertise", "/jobs"
]);

const MAIN_DOMAINS = ["eclipserblx.com", "www.eclipserblx.com"];
const RESERVED_SUBS = ["guard", "www", "api", "admin", "mail", "stores", "staff", "tracker", "forms"];

const SUPABASE_REST = "https://qlnbergwjfrmgkjhrbkj.supabase.co/rest/v1";

// Routes eligible for data injection
var DATA_INJECT_ROUTES = {
  "/": true,
  "/products": true,
  "/categories": true,
  "/featured": true
};

async function fetchInitialData(path) {
  try {
    var headers = { "apikey": ANON_KEY, "Authorization": "Bearer " + ANON_KEY, "Accept": "application/json" };
    if (path === "/" || path === "/products" || path === "/featured") {
      var res = await fetch(SUPABASE_REST + "/products?select=id,name,slug,product_number,price,images,average_rating,category_id,is_resellable,categories(name),stores(name,logo_url,is_verified,eclipse_plus_discount_enabled)&is_active=eq.true&order=created_at.desc&limit=12", { headers: headers });
      if (!res.ok) { await res.text(); return null; }
      var products = await res.json();
      return { products: products, route: path, ts: Date.now() };
    }
    if (path === "/categories") {
      var res = await fetch(SUPABASE_REST + "/categories?select=id,name,slug,description,icon,display_order,parent_id&order=display_order.asc&limit=50", { headers: headers });
      if (!res.ok) { await res.text(); return null; }
      var categories = await res.json();
      return { categories: categories, route: path, ts: Date.now() };
    }
    return null;
  } catch (e) {
    return null;
  }
}

async function injectDataIntoHtml(response, data) {
  var html = await response.text();
  var script = '<script>window.__INITIAL_DATA__=' + JSON.stringify(data).replace(/</g, "\\u003c") + ';<\/script>';
  html = html.replace('</head>', script + '</head>');
  return html;
}

function isStoreHostname(hostname) {
  if (MAIN_DOMAINS.includes(hostname)) return false;
  if (hostname.endsWith(".eclipserblx.com")) {
    var sub = hostname.replace(".eclipserblx.com", "");
    return !RESERVED_SUBS.includes(sub);
  }
  if (hostname.endsWith(".lovable.app") || hostname.endsWith(".lovableproject.com")) return false;
  return true;
}

function isBot(ua) {
  var lower = ua.toLowerCase();
  return BOT_PATTERNS.some(function(b) { return lower.includes(b.toLowerCase()); });
}

function isTestingTool(ua) {
  var lower = ua.toLowerCase();
  return NOT_BOT_PATTERNS.some(function(b) { return lower.includes(b.toLowerCase()); });
}

async function serveOg(path, hostname) {
  var ogUrl = OG_PROXY + "?path=" + encodeURIComponent(path);
  if (hostname) ogUrl += "&hostname=" + encodeURIComponent(hostname);
  var res = await fetch(ogUrl, {
    headers: { "apikey": ANON_KEY, "Authorization": "Bearer " + ANON_KEY }
  });
  if (!res.ok) return null;
  var html = await res.text();
  if (!html || html.length < 100 || !html.includes("og:title")) return null;
  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=300",
      "X-Eclipse-Worker": "og-served"
    }
  });
}

// Private routes that should never be indexed
var NOINDEX_PREFIXES = ["/admin", "/seller", "/account", "/auth", "/guard", "/cart", "/checkout"];

function isNoindexRoute(path) {
  return NOINDEX_PREFIXES.some(function(p) { return path === p || path.startsWith(p + "/"); });
}

function injectCanonical(html, path) {
  // Replace hardcoded canonical with the correct one for this path
  var canonical = SITE_URL + (path === "/" ? "/" : path.replace(/\\/$/, ""));
  html = html.replace(/<link rel="canonical"[^>]*>/, '<link rel="canonical" href="' + canonical + '" />');
  // Also fix og:url
  html = html.replace(/<meta property="og:url"[^>]*>/, '<meta property="og:url" content="' + canonical + '" />');
  return html;
}

function buildOriginRequest(request, originUrl, forwardedHost) {
  var headers = new Headers(request.headers);
  // Never forward incoming Host header when proxying to ORIGIN_URL
  headers.delete("host");
  headers.set("X-Forwarded-Host", forwardedHost);
  return new Request(originUrl, {
    method: request.method,
    headers: headers,
    body: request.body,
    redirect: "manual"
  });
}

function toOriginUrl(location) {
  var u = new URL(location, ORIGIN_URL);
  return ORIGIN_URL + u.pathname + u.search;
}

async function fetchOrigin(request, tag) {
  var url = new URL(request.url);
  var hostname = url.hostname;
  var path = url.pathname;

  // Always proxy to explicit origin host (never to incoming host)
  var originUrl = ORIGIN_URL + url.pathname + url.search;
  var newReq = buildOriginRequest(request, originUrl, hostname);
  newReq.headers.set("X-Eclipse-Worker", "rewriting");
  var r = await fetch(newReq);

  // Follow internal redirects via ORIGIN_URL to avoid worker self-recursion
  var maxRedirects = 5;
  while (r.status >= 300 && r.status < 400 && r.headers.get("Location") && maxRedirects-- > 0) {
    var loc = r.headers.get("Location");
    var nextOriginUrl = toOriginUrl(loc);
    var nextReq = buildOriginRequest(request, nextOriginUrl, hostname);
    nextReq.headers.set("X-Eclipse-Worker", "rewriting");
    r = await fetch(nextReq);
  }

  var h = new Headers(r.headers);
  h.set("X-Eclipse-Worker", tag);
  h.delete("Location");
  var finalStatus = r.status >= 300 && r.status < 400 ? 200 : r.status;

  // Add noindex header for private routes
  if (isNoindexRoute(path)) {
    h.set("X-Robots-Tag", "noindex, nofollow");
  }

  // Inject correct canonical into HTML responses
  var ct = (h.get("Content-Type") || "");
  if (ct.includes("text/html")) {
    var body = await r.text();
    body = injectCanonical(body, path);
    return new Response(body, { status: finalStatus, headers: h });
  }

  return new Response(r.body, { status: finalStatus, headers: h });
}

const DEAD_PREFIXES = [
  "/forum/", "/blog/", "/wp-admin/", "/wp-content/",
  "/wp-includes/", "/wp-login.php", "/xmlrpc.php"
];

var VALID_ROUTE_PATTERNS = [
  /^\\/$/,
  /^\\/auth$/,
  /^\\/auth\\/discord\\/callback$/,
  /^\\/auth\\/roblox\\/callback$/,
  /^\\/complete-profile$/,
  /^\\/account$/,
  /^\\/messages$/,
  /^\\/purchases$/,
  /^\\/downloads$/,
  /^\\/orders$/,
  /^\\/products$/,
  /^\\/search$/,
  /^\\/featured$/,
  /^\\/categories$/,
  /^\\/products\\/[^/?#]+$/,
  /^\\/cart$/,
  /^\\/checkout$/,
  /^\\/order-success$/,
  /^\\/chat-history$/,
  /^\\/support\\/tickets$/,
  /^\\/support\\/tickets\\/[^/?#]+$/,
  /^\\/support\\/chat$/,
  /^\\/support$/,
  /^\\/jobs$/,
  /^\\/refunds$/,
  /^\\/privacy$/,
  /^\\/terms$/,
  /^\\/dmca$/,
  /^\\/ip-shield$/,
  /^\\/ip-dashboard$/,
  /^\\/ip-shield\\/dashboard(\\/.*)?$/,
  /^\\/ip-staff(\\/.*)?$/,
  /^\\/faq$/,
  /^\\/help-center(\\/.*)?$/,
  /^\\/contact$/,
  /^\\/status$/,
  /^\\/bot-installation$/,
  /^\\/bot-dashboard$/,
  /^\\/notifications$/,
  /^\\/eclipse-plus$/,
  /^\\/marketplace$/,
  /^\\/stores$/,
  /^\\/affiliate$/,
  
  /^\\/advertise$/,
  /^\\/credits$/,
  /^\\/sell$/,
  /^\\/live-chat$/,
  /^\\/wishlist$/,
  /^\\/store-messages$/,
  /^\\/account\\/advertisements$/,
  /^\\/account\\/ad-analytics$/,
  /^\\/account\\/following$/,
  /^\\/seller(\\/.*)?$/,
  /^\\/store\\/[^/?#]+(\\/.*)?$/,
  /^\\/admin(\\/.*)?$/,
  /^\\/guard(\\/.*)?$/,
  /^\\/share\\/.+$/
];

var STATIC_ASSET_RE = /\\.(js|mjs|css|png|jpg|jpeg|gif|svg|webp|avif|ico|woff2?|ttf|eot|map|json|txt|xml|webmanifest)$/i;

function isValidRoute(pathname) {
  return VALID_ROUTE_PATTERNS.some(function(re) { return re.test(pathname); });
}

function serve404() {
  var html = '<!DOCTYPE html><html lang="en"><head>' +
    '<meta charset="utf-8"/><title>Page Not Found | Eclipse</title>' +
    '<meta name="robots" content="noindex"/>' +
    '<meta http-equiv="refresh" content="3;url=https://eclipserblx.com/"/>' +
    '</head><body style="font-family:system-ui;text-align:center;padding:60px 20px;background:#0a0a0a;color:#fff">' +
    '<h1>404 \\u2014 Page Not Found</h1>' +
    '<p>The page you\\u2019re looking for doesn\\u2019t exist. Redirecting to <a href="https://eclipserblx.com/" style="color:#7c3aed">Eclipse</a>\\u2026</p>' +
    '</body></html>';
  return new Response(html, {
    status: 404,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "X-Robots-Tag": "noindex",
      "Cache-Control": "public, max-age=60",
      "X-Eclipse-Worker": "404-not-found"
    }
  });
}

export default {
  async fetch(request) {
    // Loop guard — if we already processed this request, bail immediately
    if (request.headers.get("X-Eclipse-Worker")) {
      return new Response("Loop detected", { status: 508, headers: { "X-Eclipse-Worker": "loop-guard" } });
    }

    try {
      var url = new URL(request.url);
      var ua = request.headers.get("User-Agent") || "";
      var hostname = url.hostname;
      var path = url.pathname;

      // Return 410 Gone for known dead paths (speeds up Google deindexing)
      if (DEAD_PREFIXES.some(function(p) { return path.startsWith(p) || path === p.replace(/\\/$/, ""); })) {
        return new Response("410 Gone", { status: 410, headers: { "Content-Type": "text/plain", "X-Robots-Tag": "noindex" } });
      }
      if (path.startsWith("/share/")) {
        var realPath = path.slice(6);
        var ogRes = await serveOg(realPath, null);
        if (ogRes) return ogRes;
        return Response.redirect(SITE_URL + realPath, 302);
      }

      // Store subdomain / custom domain (all paths valid — store SPA handles routing)
      if (isStoreHostname(hostname)) {
        if (isTestingTool(ua)) return fetchOrigin(request, "pass-store-test");
        if (!isBot(ua)) return fetchOrigin(request, "pass-store-human");
        var ogRes = await serveOg(path, hostname);
        if (ogRes) return ogRes;
        return fetchOrigin(request, "pass-store-miss");
      }

      // PWA bootstrap files — bypass CF internal fetch cache entirely
      var PWA_BOOTSTRAP = ["/sw.js", "/custom-sw.js", "/registerSW.js", "/offline.html", "/manifest.webmanifest", "/manifest-admin.json"];
      if (PWA_BOOTSTRAP.indexOf(path) !== -1) {
        var pwaOriginUrl = ORIGIN_URL + url.pathname + url.search;
        var pwaReq = buildOriginRequest(request, pwaOriginUrl, hostname);
        // cacheTtl: 0 forces CF to bypass its internal edge cache for this fetch
        var pwaRes = await fetch(pwaReq, { cf: { cacheTtl: 0, cacheEverything: false } });
        var pwaHeaders = new Headers(pwaRes.headers);
        pwaHeaders.set("X-Eclipse-Worker", "pass-pwa-bootstrap");
        if (path.endsWith(".js") || path === "/offline.html") {
          pwaHeaders.set("Cache-Control", "no-store, no-cache, must-revalidate");
          pwaHeaders.set("Pragma", "no-cache");
        }
        return new Response(pwaRes.body, { status: pwaRes.status, headers: pwaHeaders });
      }

      // Sitemap & robots.txt — proxy to edge function / return inline
      if (path === "/sitemap.xml") {
        var smRes = await fetch("https://qlnbergwjfrmgkjhrbkj.supabase.co/functions/v1/sitemap", {
          headers: { "apikey": ANON_KEY, "Authorization": "Bearer " + ANON_KEY }
        });
        var smHeaders = new Headers(smRes.headers);
        smHeaders.set("X-Eclipse-Worker", "sitemap");
        smHeaders.set("Cache-Control", "public, max-age=3600, stale-while-revalidate=600");
        return new Response(smRes.body, { status: smRes.status, headers: smHeaders });
      }

      if (path === "/robots.txt") {
        var robotsTxt = "User-agent: *\\nAllow: /\\nDisallow: /admin\\nDisallow: /auth\\nDisallow: /seller\\nDisallow: /guard\\nDisallow: /cart\\nDisallow: /checkout\\nDisallow: /account\\n\\nSitemap: https://eclipserblx.com/sitemap.xml\\n";
        return new Response(robotsTxt, {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "public, max-age=86400",
            "X-Eclipse-Worker": "robots"
          }
        });
      }

      // Hashed assets — immutable cache (content-addressed filenames change per build)
      if (STATIC_ASSET_RE.test(path) || path.startsWith("/assets/")) {
        var assetRes = await fetchOrigin(request, "pass-asset");
        var assetHeaders = new Headers(assetRes.headers);
        if (/\\/assets\\/[^/]+\\.[a-f0-9]{8,}\\.(js|css)$/i.test(path)) {
          assetHeaders.set("Cache-Control", "public, max-age=31536000, immutable");
        }
        return new Response(assetRes.body, { status: assetRes.status, headers: assetHeaders });
      }

      // Route validation: return 404 for unknown paths on main domain
      if (!isValidRoute(path)) {
        return serve404();
      }

      // OG handling for bots on known pages
      var isDynamic = /^\\/(products|store|categories)\\/[^\\/?#]+/.test(path);
      var isStatic = STATIC_OG_PATHS.has(path);
      if (!isDynamic && !isStatic) return fetchOrigin(request, "pass-valid-no-og");
      if (isTestingTool(ua)) return fetchOrigin(request, "pass-test-tool");
      if (!isBot(ua)) {
        // Data injection for human users on key routes
        if (DATA_INJECT_ROUTES[path]) {
          var data = await fetchInitialData(path);
          if (data) {
            var originRes = await fetchOrigin(request, "pass-human-injected");
            var injectedHtml = await injectDataIntoHtml(originRes, data);
            var injHeaders = new Headers(originRes.headers);
            injHeaders.set("X-Eclipse-Worker", "data-injected");
            injHeaders.set("Cache-Control", "public, max-age=60, stale-while-revalidate=30");
            return new Response(injectedHtml, { status: originRes.status, headers: injHeaders });
          }
        }
        return fetchOrigin(request, "pass-human");
      }

      // Bot detected on a relevant page — serve OG
      var ogRes = await serveOg(path, null);
      if (ogRes) return ogRes;
      return fetchOrigin(request, "pass-og-miss");

    } catch (err) {
      return new Response("Worker error: " + err.message, {
        status: 500,
        headers: { "X-Eclipse-Worker": "error" }
      });
    }
  }
};
`;
}

async function cfApi(
  url: string,
  token: string,
  options: RequestInit = {}
) {
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

const BOTS = [
  "Discordbot", "Twitterbot", "facebookexternalhit", "LinkedInBot",
  "Slackbot", "TelegramBot", "WhatsApp", "Googlebot", "bingbot",
  "Applebot", "Embedly", "Iframely", "vkShare", "Pinterestbot",
];

function wafExpr(): string {
  return BOTS.map((b) => `(http.user_agent contains "${b}")`).join(" or ");
}

async function ensureWafSkipRule(token: string, zoneId: string) {
  const data = await cfApi(
    `https://api.cloudflare.com/client/v4/zones/${zoneId}/rulesets`,
    token
  );
  if (!data.success) return { success: false, error: "list failed" };

  const rs = data.result?.find(
    (r: any) => r.phase === "http_request_firewall_custom"
  );
  const name = "Skip Bot Fight Mode for Social Crawlers";
  const rule = {
    action: "skip",
    action_parameters: {
      ruleset: "current",
      phases: ["http_request_sbfm"],
      products: ["bic", "hot", "rateLimit", "securityLevel", "uaBlock", "zoneLockdown"],
    },
    expression: wafExpr(),
    description: name,
    enabled: true,
  };

  if (rs) {
    const full = await cfApi(
      `https://api.cloudflare.com/client/v4/zones/${zoneId}/rulesets/${rs.id}`,
      token
    );
    if (!full.success) return { success: false, error: "fetch ruleset failed" };
    const rules = full.result?.rules || [];
    const idx = rules.findIndex((r: any) => r.description === name);
    const updated = [...rules];
    if (idx >= 0) updated[idx] = { ...updated[idx], ...rule };
    else updated.unshift(rule);
    const res = await cfApi(
      `https://api.cloudflare.com/client/v4/zones/${zoneId}/rulesets/${rs.id}`,
      token,
      {
        method: "PUT",
        body: JSON.stringify({
          rules: updated.map((r: any) => ({
            action: r.action,
            action_parameters: r.action_parameters,
            expression: r.expression,
            description: r.description,
            enabled: r.enabled,
          })),
        }),
      }
    );
    return { success: !!res.success, action: idx >= 0 ? "updated" : "added" };
  }

  const res = await cfApi(
    `https://api.cloudflare.com/client/v4/zones/${zoneId}/rulesets`,
    token,
    {
      method: "POST",
      body: JSON.stringify({
        name: "Eclipse Custom WAF Rules",
        kind: "zone",
        phase: "http_request_firewall_custom",
        rules: [rule],
      }),
    }
  );
  return { success: !!res.success, action: "created" };
}

async function ensureRedirectRule(token: string, zoneId: string) {
  const phase = "http_request_dynamic_redirect";
  const ep = await cfApi(
    `https://api.cloudflare.com/client/v4/zones/${zoneId}/rulesets/phases/${phase}/entrypoint`,
    token
  );

  const OG_PROXY = "https://qlnbergwjfrmgkjhrbkj.supabase.co/functions/v1/og-proxy";

  // Bot UA detection expression for Cloudflare Rules
  const botExpr = [
    'http.user_agent contains "Discordbot"',
    'http.user_agent contains "Twitterbot"',
    'http.user_agent contains "facebookexternalhit"',
    'http.user_agent contains "LinkedInBot"',
    'http.user_agent contains "Slackbot"',
    'http.user_agent contains "TelegramBot"',
    'http.user_agent contains "WhatsApp"',
    'http.user_agent contains "Embedly"',
    'http.user_agent contains "Iframely"',
    'http.user_agent contains "vkShare"',
    'http.user_agent contains "Pinterestbot"',
  ].join(" or ");

  // IMPORTANT: Bot redirect rules are REMOVED because they execute BEFORE the Worker
  // in Cloudflare's request pipeline, causing 302s instead of the Worker serving 200 with OG tags.
  // The Worker itself handles bot detection and serves OG content directly.
  const botRedirectName = "Eclipse Bot OG Redirect";
  const shareName = "Eclipse /share/ OG proxy redirect";

  // No managed redirect rules needed — Worker handles everything
  const desiredRules: any[] = [];

  if (ep.success && ep.result?.id) {
    const existingRules = ep.result.rules || [];
    // Remove our old managed rules that conflict with Worker, keep others
    const otherRules = existingRules.filter(
      (r: any) => r.description !== botRedirectName && r.description !== shareName
    );
    const allRules = [...desiredRules, ...otherRules];

    const res = await cfApi(
      `https://api.cloudflare.com/client/v4/zones/${zoneId}/rulesets/${ep.result.id}`,
      token,
      {
        method: "PUT",
        body: JSON.stringify({
          rules: allRules.map((r: any) => ({
            action: r.action,
            action_parameters: r.action_parameters,
            expression: r.expression,
            description: r.description,
            enabled: r.enabled,
          })),
        }),
      }
    );
    return { success: !!res.success, rules: desiredRules.length };
  }

  const res = await cfApi(
    `https://api.cloudflare.com/client/v4/zones/${zoneId}/rulesets`,
    token,
    {
      method: "POST",
      body: JSON.stringify({
        name: "Eclipse Redirect Rules",
        kind: "zone",
        phase,
        rules: desiredRules,
      }),
    }
  );
  return { success: !!res.success, action: "created" };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const cfToken = Deno.env.get("CLOUDFLARE_API_TOKEN");
    const cfZoneId = Deno.env.get("CLOUDFLARE_ZONE_ID");
    if (!cfToken || !cfZoneId) {
      return new Response(
        JSON.stringify({ error: "Missing Cloudflare credentials" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const zoneData = await cfApi(
      `https://api.cloudflare.com/client/v4/zones/${cfZoneId}`,
      cfToken
    );
    if (!zoneData.success) {
      return new Response(
        JSON.stringify({ error: "Zone fetch failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const accountId = zoneData.result.account.id;
    const workerName = "eclipse-og-proxy";

    // Upload worker script
    const script = buildWorkerScript();
    const boundary = "----FB" + Math.random().toString(36).slice(2);
    const metadata = JSON.stringify({
      main_module: "worker.js",
      compatibility_date: "2024-01-01",
    });
    const body = [
      `--${boundary}`,
      'Content-Disposition: form-data; name="metadata"; filename="metadata.json"',
      "Content-Type: application/json",
      "",
      metadata,
      `--${boundary}`,
      'Content-Disposition: form-data; name="worker.js"; filename="worker.js"',
      "Content-Type: application/javascript+module",
      "",
      script,
      `--${boundary}--`,
    ].join("\r\n");

    const upload = await cfApi(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/${workerName}`,
      cfToken,
      {
        method: "PUT",
        headers: { "Content-Type": `multipart/form-data; boundary=${boundary}` },
        body,
      }
    );
    if (!upload.success) {
      return new Response(
        JSON.stringify({ error: "Worker upload failed", details: upload.errors }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Ensure routes
    const routesData = await cfApi(
      `https://api.cloudflare.com/client/v4/zones/${cfZoneId}/workers/routes`,
      cfToken
    );
    const existing = Array.isArray(routesData.result) ? routesData.result : [];
    const patterns = [
      "eclipserblx.com/*",
      "www.eclipserblx.com/*",
      "*.eclipserblx.com/*",
    ];
    const routeResults: { pattern: string; action: string }[] = [];
    for (const pattern of patterns) {
      const ex = existing.find((r: any) => r.pattern === pattern);
      if (ex?.script === workerName) {
        routeResults.push({ pattern, action: "unchanged" });
        continue;
      }
      if (ex) {
        await cfApi(
          `https://api.cloudflare.com/client/v4/zones/${cfZoneId}/workers/routes/${ex.id}`,
          cfToken,
          { method: "PUT", body: JSON.stringify({ pattern, script: workerName }) }
        );
        routeResults.push({ pattern, action: "updated" });
      } else {
        await cfApi(
          `https://api.cloudflare.com/client/v4/zones/${cfZoneId}/workers/routes`,
          cfToken,
          { method: "POST", body: JSON.stringify({ pattern, script: workerName }) }
        );
        routeResults.push({ pattern, action: "created" });
      }
    }

    // WAF + redirect rules
    const [waf, redirect] = await Promise.all([
      ensureWafSkipRule(cfToken, cfZoneId),
      ensureRedirectRule(cfToken, cfZoneId),
    ]);

    // SBFM config
    let sbfm: Record<string, unknown> = { success: false };
    try {
      const r = await fetch(
        `https://api.cloudflare.com/client/v4/zones/${cfZoneId}/bot_management`,
        {
          method: "PUT",
          headers: { Authorization: `Bearer ${cfToken}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            sbfm_definitely_automated: "allow",
            sbfm_verified_bots: "allow",
            sbfm_static_resource_protection: false,
          }),
        }
      );
      const d = await r.json();
      sbfm = { success: !!d.success };
    } catch { /* ignore */ }

    // Check page rules that might override workers
    const pageRulesData = await cfApi(
      `https://api.cloudflare.com/client/v4/zones/${cfZoneId}/pagerules`,
      cfToken
    );
    const pageRules = Array.isArray(pageRulesData.result) ? pageRulesData.result : [];

    // Check for Pages projects that might override Worker Routes
    let pagesProjects: unknown[] = [];
    try {
      const pagesData = await cfApi(
        `https://api.cloudflare.com/client/v4/accounts/${accountId}/pages/projects`,
        cfToken
      );
      if (pagesData.success && Array.isArray(pagesData.result)) {
        pagesProjects = pagesData.result.map((p: any) => ({
          name: p.name,
          subdomain: p.subdomain,
          domains: p.domains,
          production_branch: p.production_branch,
        }));
      }
    } catch { /* ignore */ }

    // DNS proxy check — include record type and content for diagnosis
    const dnsData = await cfApi(
      `https://api.cloudflare.com/client/v4/zones/${cfZoneId}/dns_records`,
      cfToken
    );
    const dnsResults: Record<string, unknown>[] = [];
    if (dnsData.success) {
      const recs = (dnsData.result || []).filter(
        (r: any) => ["A", "AAAA", "CNAME"].includes(r.type)
      );
      for (const rec of recs) {
        dnsResults.push({
          name: rec.name,
          type: rec.type,
          content: rec.content,
          proxied: rec.proxied,
        });
      }
    }

    // ─── POST-DEPLOY HEALTH CHECKS ───────────────────────────────
    const ts = Date.now();
    const healthChecks: Record<string, unknown> = {};
    
    // Wait for worker propagation
    await new Promise(r => setTimeout(r, 3000));
    
    // Check sw.js
    try {
      const swResp = await fetch(`https://eclipserblx.com/sw.js?cb=${ts}`, {
        headers: { "User-Agent": "Eclipse-Deploy-Check/1.0" },
        redirect: "manual",
      });
      const swBody = await swResp.text();
      healthChecks["sw.js"] = {
        status: swResp.status,
        hasLatestCache: swBody.includes("eclipse-v6") || swBody.includes("eclipse-v5"),
        noIndexHtmlPrecache: !swBody.includes('"index.html"'),
        contentLength: swBody.length,
      };
    } catch (e) {
      healthChecks["sw.js"] = { error: (e as Error).message };
    }
    
    // Check offline.html
    try {
      const offResp = await fetch(`https://eclipserblx.com/offline.html?cb=${ts}`, {
        headers: { "User-Agent": "Eclipse-Deploy-Check/1.0" },
        redirect: "manual",
      });
      healthChecks["offline.html"] = { status: offResp.status, ok: offResp.status === 200 };
      await offResp.text();
    } catch (e) {
      healthChecks["offline.html"] = { error: (e as Error).message };
    }
    
    // Check homepage
    try {
      const homeResp = await fetch(`https://eclipserblx.com/?cb=${ts}`, {
        headers: { "User-Agent": "Eclipse-Deploy-Check/1.0" },
        redirect: "manual",
      });
      healthChecks["homepage"] = { status: homeResp.status, ok: homeResp.status < 500 };
      await homeResp.text();
    } catch (e) {
      healthChecks["homepage"] = { error: (e as Error).message };
    }

    return new Response(
      JSON.stringify({
        success: true,
        worker: workerName,
        upload: upload.success,
        routes: routeResults,
        waf,
        redirect,
        sbfm,
        healthChecks,
        dns: dnsResults,
        pagesProjects,
        pageRules: pageRules.map((r: any) => ({
          id: r.id,
          targets: r.targets,
          actions: r.actions?.map((a: any) => ({ id: a.id, value: a.value })),
          status: r.status,
        })),
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: "Failed", message: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
