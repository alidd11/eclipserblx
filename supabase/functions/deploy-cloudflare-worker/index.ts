const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const WORKER_SCRIPT = `
const SUPABASE_FUNCTION_URL = "https://qlnbergwjfrmgkjhrbkj.supabase.co/functions/v1/og-proxy";

const BOT_PATTERNS = [
  "Discordbot", "Twitterbot", "facebookexternalhit", "LinkedInBot",
  "Slackbot", "TelegramBot", "WhatsApp", "Googlebot", "bingbot",
  "Applebot", "Embedly", "Iframely", "vkShare", "Pinterestbot",
];

const NOT_BOT_PATTERNS = [
  "Lighthouse", "PageSpeed", "PTST", "Chrome-Lighthouse", "Speed Insights",
];

const STATIC_OG_PATHS = new Set([
  '/', '/products', '/stores', '/categories', '/featured',
  '/eclipse-plus', '/faq', '/help-center', '/sell', '/contact',
  '/affiliate', '/advertise', '/jobs',
]);

const MAIN_DOMAINS = ['eclipserblx.com', 'www.eclipserblx.com'];
const RESERVED_SUBS = ['guard', 'www', 'api', 'admin', 'mail', 'stores'];

function isStoreHostname(hostname) {
  if (MAIN_DOMAINS.includes(hostname)) return false;
  if (hostname.endsWith('.eclipserblx.com')) {
    const sub = hostname.replace('.eclipserblx.com', '');
    return !RESERVED_SUBS.includes(sub);
  }
  // Any other hostname = custom domain
  if (hostname.endsWith('.lovable.app') || hostname.endsWith('.lovableproject.com')) return false;
  return true;
}

async function serveOg(path, userAgent, hostname) {
  let ogUrl = SUPABASE_FUNCTION_URL + "?path=" + encodeURIComponent(path);
  if (hostname) ogUrl += "&hostname=" + encodeURIComponent(hostname);
  const ogResponse = await fetch(ogUrl, {
    headers: { "User-Agent": userAgent },
  });
  return new Response(ogResponse.body, {
    status: ogResponse.status,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  });
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const userAgent = request.headers.get("User-Agent") || "";
    const hostname = url.hostname;

    // --- Store subdomain / custom domain ---
    if (isStoreHostname(hostname)) {
      const isTestingTool = NOT_BOT_PATTERNS.some((p) =>
        userAgent.toLowerCase().includes(p.toLowerCase())
      );
      if (isTestingTool) return fetch(request);

      const isBot = BOT_PATTERNS.some((bot) =>
        userAgent.toLowerCase().includes(bot.toLowerCase())
      );
      if (!isBot) return fetch(request);

      try {
        return await serveOg(url.pathname, userAgent, hostname);
      } catch (e) {
        return fetch(request);
      }
    }

    // --- /share/ prefix — ALWAYS proxy (guaranteed OG tags) ---
    if (url.pathname.startsWith("/share/")) {
      const realPath = url.pathname.replace(/^\\/share/, "");
      try {
        return await serveOg(realPath, userAgent, null);
      } catch (error) {
        return Response.redirect(url.origin + realPath, 302);
      }
    }

    const isDynamicPage = /^\\/(products|store)\\/[^/?#]+/.test(url.pathname);
    const isStaticOgPage = STATIC_OG_PATHS.has(url.pathname);

    if (!isDynamicPage && !isStaticOgPage) return fetch(request);

    const isTestingTool = NOT_BOT_PATTERNS.some((p) =>
      userAgent.toLowerCase().includes(p.toLowerCase())
    );
    if (isTestingTool) return fetch(request);

    const isBot = BOT_PATTERNS.some((bot) =>
      userAgent.toLowerCase().includes(bot.toLowerCase())
    );
    if (!isBot) return fetch(request);

    try {
      return await serveOg(url.pathname, userAgent, null);
    } catch (error) {
      return fetch(request);
    }
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

    // Step 5: Redirect rule for /share/ paths (bulletproof fallback)
    const redirectResult = await ensureShareRedirectRule(cfApiToken, cfZoneId);

    // Step 6: Configure SBFM to not block bots (allow WAF skip rule to work)
    let sbfmResult: Record<string, unknown> = { success: false, skipped: true };
    try {
      const sbfmRes = await fetch(
        `https://api.cloudflare.com/client/v4/zones/${cfZoneId}/bot_management/config`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${cfApiToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sbfm_definitely_automated: "managed_challenge",
            sbfm_likely_automated: "managed_challenge",
            sbfm_verified_bots: "allow",
            sbfm_static_resource_protection: false,
            enable_js: true,
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
        message: "Worker deployed with WAF skip rule, SBFM config, and /share/ redirect — bots always get OG tags",
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
