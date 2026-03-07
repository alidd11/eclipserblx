import "https://esm.sh/@supabase/functions-js@2.4.1"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

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

// Lovable origin IP
const ORIGIN = "https://185.158.133.1";

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const userAgent = request.headers.get("User-Agent") || "";

    const isDynamicPage = /^\\/(products|store)\\/[^/?#]+/.test(url.pathname);
    const isStaticOgPage = STATIC_OG_PATHS.has(url.pathname);

    const isBot = BOT_PATTERNS.some((bot) =>
      userAgent.toLowerCase().includes(bot.toLowerCase())
    );
    const forceOg = url.searchParams.get('__ogtest') === '1';

    // Only intercept if it's a relevant page AND a bot (or force test)
    if ((isDynamicPage || isStaticOgPage) && (isBot || forceOg)) {
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
            headers: { "Content-Type": "text/plain", "X-OG-Worker": "error-" + ogResponse.status },
          });
        }

        return new Response(ogResponse.body, {
          status: 200,
          headers: {
            "Content-Type": "text/html; charset=utf-8",
            "Cache-Control": "public, max-age=300",
            "X-OG-Worker": "served",
          },
        });
      } catch (error) {
        return new Response("OG worker fetch failed: " + error.message, {
          status: 502,
          headers: { "Content-Type": "text/plain", "X-OG-Worker": "catch-error" },
        });
      }
    }

    // For all other requests, proxy to the Lovable origin directly
    // We must use the origin IP to avoid looping back through Cloudflare
    const originUrl = new URL(url.pathname + url.search, ORIGIN);
    const originHeaders = new Headers(request.headers);
    originHeaders.set("Host", url.hostname);

    try {
      const originRes = await fetch(originUrl.toString(), {
        method: request.method,
        headers: originHeaders,
        body: request.method !== "GET" && request.method !== "HEAD" ? request.body : undefined,
        redirect: "manual",
      });

      const responseHeaders = new Headers(originRes.headers);
      responseHeaders.set("X-OG-Worker", "pass");

      return new Response(originRes.body, {
        status: originRes.status,
        headers: responseHeaders,
      });
    } catch (error) {
      return new Response("Origin fetch failed: " + error.message, {
        status: 502,
        headers: { "Content-Type": "text/plain", "X-OG-Worker": "origin-error" },
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
  const CF_ZONE_ID = Deno.env.get('CLOUDFLARE_ZONE_ID')

  if (!CF_API_TOKEN) {
    return new Response(JSON.stringify({ error: 'Missing Cloudflare API token' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

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

  // Get Cloudflare Account ID
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

  // Upload the worker script
  try {
    const formData = new FormData()
    const metadata = { main_module: 'worker.js' }
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
        success: false, error: 'Failed to upload worker', details: uploadData.errors,
      }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Set up Worker Custom Domains (replaces route-based approach)
    const customDomainResults: Array<{ domain: string; success: boolean; action: string; errors?: unknown }> = []
    const domains = ['eclipserblx.com', 'www.eclipserblx.com']

    if (CF_ZONE_ID) {
      // First, list existing custom domains for this worker
      const existingDomainsRes = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/domains`,
        { headers: { 'Authorization': `Bearer ${CF_API_TOKEN}`, 'Content-Type': 'application/json' } }
      )
      const existingDomainsData = await existingDomainsRes.json()
      const existingDomains = existingDomainsData.result || []

      for (const domain of domains) {
        const existing = existingDomains.find((d: any) => d.hostname === domain && d.service === workerName)

        if (existing) {
          customDomainResults.push({ domain, success: true, action: 'already_exists' })
          continue
        }

        // Remove any existing domain binding for this hostname (might be bound to different worker)
        const conflicting = existingDomains.find((d: any) => d.hostname === domain)
        if (conflicting) {
          await fetch(
            `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/domains/${conflicting.id}`,
            { method: 'DELETE', headers: { 'Authorization': `Bearer ${CF_API_TOKEN}` } }
          )
        }

        // Create the custom domain
        const createRes = await fetch(
          `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/domains`,
          {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${CF_API_TOKEN}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              hostname: domain,
              zone_id: CF_ZONE_ID,
              service: workerName,
              environment: 'production',
            }),
          }
        )
        const createData = await createRes.json()
        customDomainResults.push({
          domain,
          success: !!createData.success,
          action: 'created',
          errors: createData.success ? undefined : createData.errors,
        })
      }
    }

    return new Response(JSON.stringify({
      success: true,
      message: `Worker "${workerName}" deployed successfully!`,
      worker_id: uploadData.result?.id,
      custom_domains: customDomainResults,
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (e) {
    return new Response(JSON.stringify({ error: 'Worker deploy failed', detail: String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
