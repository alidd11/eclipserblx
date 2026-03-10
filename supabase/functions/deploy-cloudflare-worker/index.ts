const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function buildWorkerScript(): string {
  // Build the worker script as an array of lines to avoid giant single-line strings
  const lines: string[] = [];
  const SU = "https://qlnbergwjfrmgkjhrbkj.supabase.co";
  const AK =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFsbmJlcmd3amZybWdramhyYmtqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2NDY1NjIsImV4cCI6MjA4MzIyMjU2Mn0.4jHxaV7Mjlw2RbjDz9W8B07-SR_8Z7IeTTXMu8RUZ20";
  const SITE = "https://eclipserblx.com";
  const IMG =
    "https://storage.googleapis.com/gpt-engineer-file-uploads/6XoLGVy9Aseup6dIxodIWS9uGsS2/social-images/social-1772684689417-IMG_0084.webp";

  lines.push('const SU="' + SU + '";');
  lines.push('const AK="' + AK + '";');
  lines.push('const SU_URL="' + SITE + '";');
  lines.push('const SN="Eclipse";');
  lines.push('const DI="' + IMG + '";');
  lines.push(
    'const DD="Eclipse is the best Roblox asset marketplace. Buy premium roleplay scripts, vehicles, maps and game assets. Lower fees, instant delivery.";'
  );
  lines.push(
    'const BP=["Discordbot","Twitterbot","facebookexternalhit","LinkedInBot","Slackbot","TelegramBot","WhatsApp","Googlebot","bingbot","Applebot","Embedly","Iframely","vkShare","Pinterestbot"];'
  );
  lines.push(
    'const NB=["Lighthouse","PageSpeed","PTST","Chrome-Lighthouse","Speed Insights"];'
  );

  // Static pages map – split across lines
  lines.push("const SP={");
  const pages: [string, string, string][] = [
    ["/", "Eclipse | Roblox Marketplace — Premium Assets, Lower Fees", "DD"],
    ["/products", "Browse Products | Eclipse", '"Browse hundreds of premium Roblox assets on Eclipse."'],
    ["/stores", "Browse Stores | Eclipse", '"Discover verified Roblox asset stores on Eclipse."'],
    ["/categories", "Categories | Eclipse", '"Browse Roblox assets by category."'],
    ["/featured", "Featured Products | Eclipse", '"Hand-picked featured Roblox assets on Eclipse."'],
    ["/eclipse-plus", "Eclipse+ Membership | Eclipse", '"Get exclusive perks with Eclipse+ membership."'],
    ["/faq", "FAQ | Eclipse", '"Frequently asked questions about Eclipse marketplace."'],
    ["/sell", "Start Selling on Eclipse", '"Sell your Roblox creations on Eclipse."'],
    ["/contact", "Contact Us | Eclipse", '"Get in touch with the Eclipse team."'],
    ["/affiliate", "Affiliate Programme | Eclipse", '"Earn commission by referring to Eclipse."'],
    ["/advertise", "Advertise on Eclipse", '"Promote your Roblox products on Eclipse."'],
    ["/jobs", "Jobs | Eclipse", '"Join the Eclipse team."'],
  ];
  for (const [path, title, desc] of pages) {
    const d = desc === "DD" ? "DD" : desc;
    lines.push('"' + path + '":["' + title + '",' + d + "],");
  }
  lines.push("};");

  lines.push("const MD=['eclipserblx.com','www.eclipserblx.com'];");
  lines.push("const RS=['guard','www','api','admin','mail','stores'];");

  // Helper functions – each on its own line
  lines.push(
    'function e(s){return s.replace(/&/g,"\\&amp;").replace(/</g,"\\&lt;").replace(/>/g,"\\&gt;").replace(/"/g,"\\&quot;");}'
  );

  lines.push("function oh(t,d,img,url,type,ex){");
  lines.push(
    "return'<!DOCTYPE html><html lang=\"en\"><head><meta charset=\"utf-8\"/>'+"
  );
  lines.push("'<title>'+e(t)+'</title>'+");
  lines.push("'<meta name=\"description\" content=\"'+e(d)+'\"/>' +");
  lines.push("'<link rel=\"canonical\" href=\"'+e(url)+'\"/>' +");
  lines.push(
    "'<meta property=\"og:type\" content=\"'+(type||'website')+'\"/>' +"
  );
  lines.push("'<meta property=\"og:site_name\" content=\"'+SN+'\"/>' +");
  lines.push("'<meta property=\"og:title\" content=\"'+e(t)+'\"/>' +");
  lines.push("'<meta property=\"og:description\" content=\"'+e(d)+'\"/>' +");
  lines.push("'<meta property=\"og:image\" content=\"'+e(img)+'\"/>' +");
  lines.push("'<meta property=\"og:image:width\" content=\"1200\"/>' +");
  lines.push("'<meta property=\"og:image:height\" content=\"630\"/>' +");
  lines.push("'<meta property=\"og:url\" content=\"'+e(url)+'\"/>' +");
  lines.push("(ex||'') +");
  lines.push(
    "'<meta name=\"twitter:card\" content=\"summary_large_image\"/>' +"
  );
  lines.push("'<meta name=\"twitter:title\" content=\"'+e(t)+'\"/>' +");
  lines.push(
    "'<meta name=\"twitter:description\" content=\"'+e(d)+'\"/>' +"
  );
  lines.push("'<meta name=\"twitter:image\" content=\"'+e(img)+'\"/>' +");
  lines.push(
    "'<meta http-equiv=\"refresh\" content=\"0;url='+e(url)+'\"/>' +"
  );
  lines.push(
    "'</head><body><p>Redirecting\\u2026</p></body></html>';"
  );
  lines.push("}");

  // DB helper
  lines.push("async function dg(t,s,f){");
  lines.push(
    'var r=await fetch(SU+"/rest/v1/"+t+"?select="+encodeURIComponent(s)+"&"+f,{'
  );
  lines.push(
    'headers:{apikey:AK,Authorization:"Bearer "+AK,Accept:"application/vnd.pgrst.object+json"}});'
  );
  lines.push("if(!r.ok){await r.text();return null;}");
  lines.push("try{return await r.json();}catch(x){return null;}}");

  // Store subdomain check
  lines.push("function isSS(h){");
  lines.push("if(MD.includes(h))return false;");
  lines.push(
    "if(h.endsWith('.eclipserblx.com')){var s=h.replace('.eclipserblx.com','');return!RS.includes(s);}"
  );
  lines.push(
    "if(h.endsWith('.lovable.app')||h.endsWith('.lovableproject.com'))return false;"
  );
  lines.push("return true;}");

  // Product OG
  lines.push("async function pOg(slug){");
  lines.push(
    'var p=await dg("products","name,description,images,price,slug,stores(name)","slug=eq."+slug+"&is_active=eq.true");'
  );
  lines.push("if(!p)return null;");
  lines.push("var sn=p.stores?p.stores.name:null;");
  lines.push(
    'var rd=p.description?p.description.replace(/<[^>]*>/g,"").slice(0,200):"Check out "+p.name+" on Eclipse";'
  );
  lines.push('var d=sn?"By "+sn+" \\u2014 "+rd:rd;');
  lines.push("var img=(p.images&&p.images[0])||DI;");
  lines.push(
    "var pe=p.price!=null?'<meta property=\"product:price:amount\" content=\"'+p.price+'\"/><meta property=\"product:price:currency\" content=\"GBP\"/>':\"\";"
  );
  lines.push(
    'return oh(p.name+" | "+SN,d,img,SU_URL+"/products/"+slug,"product",pe);}'
  );

  // Store OG
  lines.push("async function sOg(slug){");
  lines.push(
    'var s=await dg("stores","name,description,logo_url,banner_url,slug,product_count","slug=eq."+slug+"&is_active=eq.true");'
  );
  lines.push("if(!s)return null;");
  lines.push(
    'var d=s.description?s.description.replace(/<[^>]*>/g,"").slice(0,200):"Browse "+s.name+"\'s products on Eclipse.";'
  );
  lines.push(
    'return oh(s.name+" | "+SN,d,s.banner_url||s.logo_url||DI,SU_URL+"/store/"+slug,"profile","");}'
  );

  // Response helper
  lines.push("function oR(html,tag){");
  lines.push(
    'return new Response(html,{status:200,headers:{"Content-Type":"text/html;charset=utf-8","Cache-Control":"public,max-age=300","X-Eclipse-Worker":tag}});}'
  );

  // Main fetch handler
  lines.push("export default{async fetch(request){try{");
  lines.push('var url=new URL(request.url);');
  lines.push('var ua=request.headers.get("User-Agent")||"";');
  lines.push("var h=url.hostname;var path=url.pathname;");

  // /share/ handler
  lines.push('if(path.startsWith("/share/")){path=path.slice(6);');
  lines.push(
    'var pm=path.match(/^\\/products\\/([a-zA-Z0-9][a-zA-Z0-9\\-_]{0,200})$/);'
  );
  lines.push(
    'if(pm){var html=await pOg(pm[1]);if(html)return oR(html,"og-share-product");}'
  );
  lines.push(
    'var sm=path.match(/^\\/store\\/([a-zA-Z0-9][a-zA-Z0-9\\-_]{0,200})$/);'
  );
  lines.push(
    'if(sm){var html=await sOg(sm[1]);if(html)return oR(html,"og-share-store");}'
  );
  lines.push("var sp=SP[path];");
  lines.push(
    'if(sp)return oR(oh(sp[0],sp[1],DI,SU_URL+path),"og-share-static");'
  );
  lines.push("return Response.redirect(SU_URL+path,302);}");

  // Store subdomain handler
  lines.push("if(isSS(h)){");
  lines.push(
    "var isBot=BP.some(function(b){return ua.toLowerCase().includes(b.toLowerCase());});"
  );
  lines.push("if(!isBot){var r=await fetch(request);return new Response(r.body,{status:r.status,headers:new Headers(r.headers)});}");
  lines.push("var sub=h.replace('.eclipserblx.com','');");
  lines.push(
    'var html=await sOg(sub);if(html)return oR(html,"og-subdomain");var r=await fetch(request);return new Response(r.body,{status:r.status,headers:new Headers(r.headers)});}'
  );

  // Main domain handler
  lines.push(
    'var isDyn=/^\\/(products|store)\\/[^\\/?#]+/.test(path);'
  );
  lines.push("var isStat=SP.hasOwnProperty(path);");
  lines.push("if(!isDyn&&!isStat)return fetch(request);");
  lines.push(
    "if(NB.some(function(p){return ua.toLowerCase().includes(p.toLowerCase());}))return fetch(request);"
  );
  lines.push(
    "var isBot=BP.some(function(b){return ua.toLowerCase().includes(b.toLowerCase());});"
  );
  lines.push("if(!isBot)return fetch(request);");
  lines.push(
    'if(isStat){var sp=SP[path];return oR(oh(sp[0],sp[1],DI,SU_URL+path),"og-static");}'
  );
  lines.push(
    'var pm=path.match(/^\\/products\\/([a-zA-Z0-9][a-zA-Z0-9\\-_]{0,200})$/);'
  );
  lines.push(
    'if(pm){var html=await pOg(pm[1]);if(html)return oR(html,"og-product");}'
  );
  lines.push(
    'var sm=path.match(/^\\/store\\/([a-zA-Z0-9][a-zA-Z0-9\\-_]{0,200})$/);'
  );
  lines.push(
    'if(sm){var html=await sOg(sm[1]);if(html)return oR(html,"og-store");}'
  );
  lines.push("return fetch(request);");
  lines.push(
    '}catch(err){return new Response("Worker error: "+err.message,{status:500});}}};'
  );

  return lines.join("\n");
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
  "Discordbot",
  "Twitterbot",
  "facebookexternalhit",
  "LinkedInBot",
  "Slackbot",
  "TelegramBot",
  "WhatsApp",
  "Googlebot",
  "bingbot",
  "Applebot",
  "Embedly",
  "Iframely",
  "vkShare",
  "Pinterestbot",
];

function wafExpr(): string {
  return BOTS.map((b) => `(http.user_agent contains "${b}")`).join(
    " or "
  );
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
      products: [
        "bic",
        "hot",
        "rateLimit",
        "securityLevel",
        "uaBlock",
        "zoneLockdown",
      ],
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
    if (!full.success)
      return { success: false, error: "fetch ruleset failed" };
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
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const zoneData = await cfApi(
      `https://api.cloudflare.com/client/v4/zones/${cfZoneId}`,
      cfToken
    );
    if (!zoneData.success) {
      return new Response(
        JSON.stringify({ error: "Zone fetch failed" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
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
        headers: {
          "Content-Type": `multipart/form-data; boundary=${boundary}`,
        },
        body,
      }
    );
    if (!upload.success) {
      return new Response(
        JSON.stringify({
          error: "Worker upload failed",
          details: upload.errors,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Ensure routes
    const routesData = await cfApi(
      `https://api.cloudflare.com/client/v4/zones/${cfZoneId}/workers/routes`,
      cfToken
    );
    const existing = Array.isArray(routesData.result)
      ? routesData.result
      : [];
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
          {
            method: "PUT",
            body: JSON.stringify({ pattern, script: workerName }),
          }
        );
        routeResults.push({ pattern, action: "updated" });
      } else {
        await cfApi(
          `https://api.cloudflare.com/client/v4/zones/${cfZoneId}/workers/routes`,
          cfToken,
          {
            method: "POST",
            body: JSON.stringify({ pattern, script: workerName }),
          }
        );
        routeResults.push({ pattern, action: "created" });
      }
    }

    // WAF + redirect rules in parallel
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
          headers: {
            Authorization: `Bearer ${cfToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sbfm_definitely_automated: "allow",
            sbfm_verified_bots: "allow",
            sbfm_static_resource_protection: false,
          }),
        }
      );
      const d = await r.json();
      sbfm = { success: !!d.success };
    } catch {
      // ignore
    }

    // DNS proxy check
    const dnsData = await cfApi(
      `https://api.cloudflare.com/client/v4/zones/${cfZoneId}/dns_records`,
      cfToken
    );
    const dnsResults: Record<string, unknown>[] = [];
    if (dnsData.success) {
      const targets = [
        "eclipserblx.com",
        "www.eclipserblx.com",
        "*.eclipserblx.com",
      ];
      const recs = (dnsData.result || []).filter(
        (r: any) =>
          targets.includes(r.name) &&
          ["A", "AAAA", "CNAME"].includes(r.type)
      );
      for (const rec of recs) {
        if (!rec.proxied) {
          await cfApi(
            `https://api.cloudflare.com/client/v4/zones/${cfZoneId}/dns_records/${rec.id}`,
            cfToken,
            {
              method: "PATCH",
              body: JSON.stringify({ proxied: true }),
            }
          );
          dnsResults.push({
            name: rec.name,
            action: "enabled_proxy",
          });
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
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: "Failed",
        message: (error as Error).message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
