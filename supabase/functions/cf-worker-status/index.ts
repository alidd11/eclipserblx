const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function cfApi(url: string, token: string, options: RequestInit = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string> || {}),
    },
  });
  const text = await res.text();
  try { return JSON.parse(text); } catch { return { raw: text.slice(0, 500), status: res.status }; }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const cfToken = Deno.env.get("CLOUDFLARE_API_TOKEN")!;
  const cfZoneId = Deno.env.get("CLOUDFLARE_ZONE_ID")!;
  const results: Record<string, any> = {};

  // Step 1: Find the redirect ruleset and remove the Bot OG Redirect rule
  // Keep only /share/ and www redirects
  const rulesets = await cfApi(`https://api.cloudflare.com/client/v4/zones/${cfZoneId}/rulesets`, cfToken);
  const redirectRuleset = rulesets.result?.find((r: any) => r.phase === "http_request_dynamic_redirect");
  
  if (redirectRuleset) {
    const full = await cfApi(`https://api.cloudflare.com/client/v4/zones/${cfZoneId}/rulesets/${redirectRuleset.id}`, cfToken);
    const existingRules = full.result?.rules || [];
    
    // Remove the "Eclipse Bot OG Redirect" rule but keep the others
    const filteredRules = existingRules.filter((r: any) => r.description !== "Eclipse Bot OG Redirect");
    
    results.removedBotRedirect = {
      before: existingRules.map((r: any) => r.description),
      after: filteredRules.map((r: any) => r.description),
    };

    // Update the ruleset
    const updateRes = await cfApi(
      `https://api.cloudflare.com/client/v4/zones/${cfZoneId}/rulesets/${redirectRuleset.id}`,
      cfToken,
      {
        method: "PUT",
        body: JSON.stringify({
          rules: filteredRules.map((r: any) => ({
            action: r.action,
            action_parameters: r.action_parameters,
            expression: r.expression,
            description: r.description,
            enabled: r.enabled,
          })),
        }),
      }
    );
    results.updateResult = { success: updateRes.success, errors: updateRes.errors };
  }

  // Step 2: Wait for propagation
  await new Promise(r => setTimeout(r, 5000));

  // Step 3: Test bot request
  const botRes = await fetch("https://eclipserblx.com/products/13", {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)" },
    redirect: "manual",
  });
  const botBody = await botRes.text();
  const botHeaders: Record<string, string> = {};
  botRes.headers.forEach((v, k) => { botHeaders[k] = v; });
  results.botTest = {
    status: botRes.status,
    xWorker: botHeaders["x-eclipse-worker"] || null,
    location: botHeaders["location"] || null,
    hasProductOg: botBody.includes("Volvo") || botBody.includes("og:type"),
    first300: botBody.slice(0, 300),
  };

  // Step 4: Test human request
  const humanRes = await fetch("https://eclipserblx.com/products/13", {
    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0" },
    redirect: "manual",
  });
  const humanBody = await humanRes.text();
  const humanHeaders: Record<string, string> = {};
  humanRes.headers.forEach((v, k) => { humanHeaders[k] = v; });
  results.humanTest = {
    status: humanRes.status,
    xWorker: humanHeaders["x-eclipse-worker"] || null,
    first200: humanBody.slice(0, 200),
  };

  // Step 5: Test invalid path (should get 404 from worker)
  const notFoundRes = await fetch("https://eclipserblx.com/nonexistent-abc-xyz", {
    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0" },
    redirect: "manual",
  });
  const notFoundBody = await notFoundRes.text();
  const nfHeaders: Record<string, string> = {};
  notFoundRes.headers.forEach((v, k) => { nfHeaders[k] = v; });
  results.notFoundTest = {
    status: notFoundRes.status,
    xWorker: nfHeaders["x-eclipse-worker"] || null,
    first200: notFoundBody.slice(0, 200),
  };

  return new Response(JSON.stringify(results, null, 2), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
