import "https://esm.sh/@supabase/functions-js@2.4.1"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// The worker script to deploy
const WORKER_SCRIPT = `
const SUPABASE_FUNCTION_URL = "https://qlnbergwjfrmgkjhrbkj.supabase.co/functions/v1/og-proxy2";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFsbmJlcmd3amZybWdramhyYmtqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2NDY1NjIsImV4cCI6MjA4MzIyMjU2Mn0.4jHxaV7Mjlw2RbjDz9W8B07-SR_8Z7IeTTXMu8RUZ20";

const BOT_PATTERNS = [
  "Discordbot", "Twitterbot", "facebookexternalhit", "LinkedInBot",
  "Slackbot", "TelegramBot", "WhatsApp", "Googlebot", "bingbot",
  "Applebot", "Embedly", "Iframely", "vkShare", "Pinterestbot",
];

const STATIC_OG_PATHS = new Set([
  '/', '/products', '/stores', '/categories', '/featured',
  '/eclipse-plus', '/faq', '/help-center', '/sell', '/contact',
  '/affiliate', '/advertise', '/jobs',
]);

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const userAgent = request.headers.get("User-Agent") || "";

    const isDynamicPage = /^\\/(products|store)\\/[^/?#]+/.test(url.pathname);
    const isStaticOgPage = STATIC_OG_PATHS.has(url.pathname);

    if (!isDynamicPage && !isStaticOgPage) {
      const res = await fetch(request);
      return new Response(res.body, {
        status: res.status,
        headers: new Headers([...res.headers.entries(), ["X-OG-Worker", "pass-no-match"]]),
      });
    }

    const isBot = BOT_PATTERNS.some((bot) =>
      userAgent.toLowerCase().includes(bot.toLowerCase())
    );

    const forceOg = url.searchParams.get('__ogtest') === '1';

    if (!isBot && !forceOg) {
      const res = await fetch(request);
      return new Response(res.body, {
        status: res.status,
        headers: new Headers([...res.headers.entries(), ["X-OG-Worker", "pass-not-bot"]]),
      });
    }

    const ogUrl = SUPABASE_FUNCTION_URL + "?path=" + encodeURIComponent(url.pathname);

    try {
      const ogResponse = await fetch(ogUrl, {
        headers: {
          "User-Agent": userAgent,
          "X-OG-Worker": "1",
          "apikey": SUPABASE_ANON_KEY,
          "Authorization": "Bearer " + SUPABASE_ANON_KEY,
        },
      });

      if (!ogResponse.ok) {
        const errText = await ogResponse.text();
        return new Response("OG proxy error: " + ogResponse.status + " " + errText, {
          status: 502,
          headers: {
            "Content-Type": "text/plain",
            "X-OG-Worker": "error-" + ogResponse.status,
          },
        });
      }

      return new Response(ogResponse.body, {
        status: ogResponse.status,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "public, max-age=300",
          "X-OG-Worker": "served",
        },
      });
    } catch (error) {
      return new Response("OG worker fetch failed: " + error.message, {
        status: 502,
        headers: {
          "Content-Type": "text/plain",
          "X-OG-Worker": "catch-error",
        },
      });
    }
  },
};
`

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const CF_API_TOKEN = Deno.env.get('CLOUDFLARE_API_TOKEN')
  const CF_ZONE_ID = Deno.env.get('CLOUDFLARE_ZONE_ID') // not used for Workers API but kept for reference

  if (!CF_API_TOKEN) {
    return new Response(JSON.stringify({ error: 'Missing Cloudflare API token' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  // Parse optional worker name from request body
  let workerName = 'eclipse-og-proxy'
  let customScript: string | null = null
  try {
    const body = await req.json()
    if (body.worker_name) workerName = body.worker_name
    if (body.script) customScript = body.script
  } catch {
    // Use defaults
  }

  const scriptToUpload = customScript || WORKER_SCRIPT

  // Get Cloudflare Account ID first
  let accountId: string
  try {
    const accountRes = await fetch('https://api.cloudflare.com/client/v4/accounts', {
      headers: { 'Authorization': `Bearer ${CF_API_TOKEN}` },
    })
    const accountData = await accountRes.json()
    if (!accountData.success || !accountData.result?.length) {
      return new Response(JSON.stringify({ error: 'Could not fetch Cloudflare account ID', details: accountData.errors }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    accountId = accountData.result[0].id
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Failed to get account', detail: String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  // Upload/update the worker script
  try {
    const formData = new FormData()
    
    // Worker metadata
    const metadata = {
      main_module: 'worker.js',
    }
    formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }))
    formData.append('worker.js', new Blob([scriptToUpload], { type: 'application/javascript+module' }), 'worker.js')

    const uploadRes = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/${workerName}`,
      {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${CF_API_TOKEN}` },
        body: formData,
      }
    )
    const uploadData = await uploadRes.json()

    if (!uploadData.success) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to upload worker',
        details: uploadData.errors,
      }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Now set the route(s) for the worker on the zone
    const routeResults: Array<{ pattern: string; success: boolean; action: 'created' | 'updated' | 'skipped'; errors?: unknown }> = []

    if (CF_ZONE_ID) {
      const routePatterns = [
        'eclipserblx.com/products/*',
        'eclipserblx.com/store/*',
        'eclipserblx.com/*',
        'www.eclipserblx.com/products/*',
        'www.eclipserblx.com/store/*',
        'www.eclipserblx.com/*',
      ]

      const routesRes = await fetch(`https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/workers/routes`, {
        headers: { 'Authorization': `Bearer ${CF_API_TOKEN}`, 'Content-Type': 'application/json' },
      })
      const routesData = await routesRes.json()

      if (!routesData.success) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Failed to list existing worker routes',
          details: routesData.errors,
        }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      for (const pattern of routePatterns) {
        const existingRoute = routesData.result?.find((r: { pattern: string }) => r.pattern === pattern)

        if (existingRoute) {
          const updateRouteRes = await fetch(`https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/workers/routes/${existingRoute.id}`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${CF_API_TOKEN}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ pattern, script: workerName }),
          })
          const updateRouteData = await updateRouteRes.json()
          routeResults.push({
            pattern,
            success: !!updateRouteData.success,
            action: 'updated',
            errors: updateRouteData.success ? undefined : updateRouteData.errors,
          })
        } else {
          const createRouteRes = await fetch(`https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/workers/routes`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${CF_API_TOKEN}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ pattern, script: workerName }),
          })
          const createRouteData = await createRouteRes.json()
          routeResults.push({
            pattern,
            success: !!createRouteData.success,
            action: 'created',
            errors: createRouteData.success ? undefined : createRouteData.errors,
          })
        }
      }

      const routeFailure = routeResults.find((r) => !r.success)
      if (routeFailure) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Worker uploaded but route binding failed',
          route_results: routeResults,
        }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
    }

    return new Response(JSON.stringify({
      success: true,
      message: `Worker "${workerName}" deployed successfully!`,
      worker_id: uploadData.result?.id,
      route_results: routeResults,
    }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (e) {
    return new Response(JSON.stringify({ error: 'Worker deploy failed', detail: String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})