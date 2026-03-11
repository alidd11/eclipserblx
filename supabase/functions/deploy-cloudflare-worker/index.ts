const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function buildWorkerScript(): string {
  const OG_PROXY = "https://qlnbergwjfrmgkjhrbkj.supabase.co/functions/v1/og-proxy";
  const SITE = "https://eclipserblx.com";

  // Use a clean, readable script instead of line-by-line concatenation
  return `
const OG_PROXY = "${OG_PROXY}";
const SITE_URL = "${SITE}";

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
const RESERVED_SUBS = ["guard", "www", "api", "admin", "mail", "stores"];

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
  var res = await fetch(ogUrl);
  if (!res.ok) return null;
  var html = await res.text();
  if (!html || html.length < 100) return null;
  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=300",
      "X-Eclipse-Worker": "og-served"
    }
  });
}

async function passthrough(request, tag) {
  var r = await fetch(request);
  var h = new Headers(r.headers);
  h.set("X-Eclipse-Worker", tag);
  return new Response(r.body, { status: r.status, headers: h });
}

export default {
  async fetch(request) {
    try {
      var url = new URL(request.url);
      var ua = request.headers.get("User-Agent") || "";
      var hostname = url.hostname;
      var path = url.pathname;

      // /share/ prefix — ALWAYS proxy (guaranteed OG tags for any visitor)
      if (path.startsWith("/share/")) {
        var realPath = path.slice(6);
        var ogRes = await serveOg(realPath, null);
        if (ogRes) return ogRes;
        return Response.redirect(SITE_URL + realPath, 302);
      }

      // Store subdomain / custom domain
      if (isStoreHostname(hostname)) {
        if (isTestingTool(ua)) return passthrough(request, "pass-store-test");
        if (!isBot(ua)) return passthrough(request, "pass-store-human");
        var ogRes = await serveOg(path, hostname);
        if (ogRes) return ogRes;
        return passthrough(request, "pass-store-miss");
      }

      // Main domain — only intercept relevant paths
      var isDynamic = /^\\/(products|store)\\/[^\\/?#]+/.test(path);
      var isStatic = STATIC_OG_PATHS.has(path);
      if (!isDynamic && !isStatic) return passthrough(request, "pass-no-match");
      if (isTestingTool(ua)) return passthrough(request, "pass-test-tool");
      if (!isBot(ua)) return passthrough(request, "pass-human");

      // Bot detected on a relevant page — serve OG
      var ogRes = await serveOg(path, null);
      if (ogRes) return ogRes;
      return passthrough(request, "pass-og-miss");

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
  const name = "Eclipse /share/ OG proxy redirect";
  const ep = await cfApi(
    `https://api.cloudflare.com/client/v4/zones/${zoneId}/rulesets/phases/${phase}/entrypoint`,
    token
  );

  const rule = {
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
    description: name,
    enabled: true,
  };

  if (ep.success && ep.result?.id) {
    const rules = ep.result.rules || [];
    const idx = rules.findIndex((r: any) => r.description === name);
    const updated = [...rules];
    if (idx >= 0) updated[idx] = { ...updated[idx], ...rule };
    else updated.unshift(rule);
    const res = await cfApi(
      `https://api.cloudflare.com/client/v4/zones/${zoneId}/rulesets/${ep.result.id}`,
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
        name: "Eclipse Redirect Rules",
        kind: "zone",
        phase,
        rules: [rule],
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

    // DNS proxy check
    const dnsData = await cfApi(
      `https://api.cloudflare.com/client/v4/zones/${cfZoneId}/dns_records`,
      cfToken
    );
    const dnsResults: Record<string, unknown>[] = [];
    if (dnsData.success) {
      const targets = ["eclipserblx.com", "www.eclipserblx.com", "*.eclipserblx.com"];
      const recs = (dnsData.result || []).filter(
        (r: any) => targets.includes(r.name) && ["A", "AAAA", "CNAME"].includes(r.type)
      );
      for (const rec of recs) {
        if (!rec.proxied) {
          await cfApi(
            `https://api.cloudflare.com/client/v4/zones/${cfZoneId}/dns_records/${rec.id}`,
            cfToken,
            { method: "PATCH", body: JSON.stringify({ proxied: true }) }
          );
          dnsResults.push({ name: rec.name, action: "enabled_proxy" });
        } else {
          dnsResults.push({ name: rec.name, action: "ok" });
        }
      }
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
        dns: dnsResults,
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
