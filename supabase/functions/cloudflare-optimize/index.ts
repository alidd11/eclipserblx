import "https://esm.sh/@supabase/functions-js@2.4.1"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const CF_API_TOKEN = Deno.env.get('CLOUDFLARE_API_TOKEN')
  const CF_ZONE_ID = Deno.env.get('CLOUDFLARE_ZONE_ID')

  if (!CF_API_TOKEN || !CF_ZONE_ID) {
    return new Response(JSON.stringify({ error: 'Missing Cloudflare credentials' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  const baseUrl = `https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}`
  const headers = {
    'Authorization': `Bearer ${CF_API_TOKEN}`,
    'Content-Type': 'application/json',
  }

  const results: Record<string, { success: boolean; detail?: string; error?: string }> = {}

  // Helper to make CF API calls
  async function cfPatch(endpoint: string, body: unknown, label: string) {
    try {
      const res = await fetch(`${baseUrl}${endpoint}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(body),
      })
      const data = await res.json()
      results[label] = { success: data.success, detail: data.success ? 'Applied' : JSON.stringify(data.errors) }
    } catch (e) {
      results[label] = { success: false, error: String(e) }
    }
  }

  // 1. Speed Settings
  await Promise.all([
    cfPatch('/settings/brotli', { value: 'on' }, 'brotli'),
    cfPatch('/settings/early_hints', { value: 'on' }, 'early_hints'),
    cfPatch('/settings/http3', { value: 'on' }, 'http3'),
    cfPatch('/settings/0rtt', { value: 'on' }, '0rtt'),
    cfPatch('/settings/minify', { value: { js: 'on', css: 'on', html: 'on' } }, 'auto_minify'),
    cfPatch('/settings/rocket_loader', { value: 'off' }, 'rocket_loader_off'),
    cfPatch('/settings/websockets', { value: 'on' }, 'websockets'),
    cfPatch('/settings/speed_brain', { value: 'on' }, 'speed_brain'),
    cfPatch('/settings/fonts', { value: 'off' }, 'cf_fonts_off'),
  ])

  // 2. SSL/TLS Settings
  await Promise.all([
    cfPatch('/settings/ssl', { value: 'full' }, 'ssl_full_strict'),
    cfPatch('/settings/min_tls_version', { value: '1.2' }, 'min_tls_1.2'),
    cfPatch('/settings/tls_1_3', { value: 'on' }, 'tls_1.3'),
    cfPatch('/settings/always_use_https', { value: 'on' }, 'always_https'),
    cfPatch('/settings/browser_check', { value: 'on' }, 'browser_integrity_check'),
    cfPatch('/settings/security_level', { value: 'medium' }, 'security_level_medium'),
    cfPatch('/settings/challenge_ttl', { value: 1800 }, 'challenge_passage_30min'),
  ])

  // 3. SEO & Crawler Settings
  await Promise.all([
    cfPatch('/settings/always_online', { value: 'on' }, 'always_online'),
    cfPatch('/settings/email_obfuscation', { value: 'on' }, 'email_obfuscation'),
    cfPatch('/settings/server_side_exclude', { value: 'on' }, 'server_side_excludes'),
    cfPatch('/settings/hotlink_protection', { value: 'off' }, 'hotlink_protection_off'),
  ])

  // 4. Enable Crawler Hints (IndexNow integration)
  try {
    const crawlerRes = await fetch(`${baseUrl}/flags/products/crawler_hints/changes`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ feature_flag: 'crawler_hints', value: true }),
    })
    const crawlerData = await crawlerRes.json()
    results['crawler_hints'] = { 
      success: !!crawlerData.success, 
      detail: crawlerData.success ? 'Enabled' : JSON.stringify(crawlerData.errors || crawlerData) 
    }
  } catch (e) {
    results['crawler_hints'] = { success: false, error: String(e) }
  }

  // 4. HSTS
  try {
    const hstsRes = await fetch(`${baseUrl}/settings/security_header`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({
        value: {
          strict_transport_security: {
            enabled: true,
            max_age: 31536000,
            include_subdomains: true,
            preload: true,
            nosniff: true,
          }
        }
      }),
    })
    const hstsData = await hstsRes.json()
    results['hsts'] = { success: hstsData.success, detail: hstsData.success ? 'Applied' : JSON.stringify(hstsData.errors) }
  } catch (e) {
    results['hsts'] = { success: false, error: String(e) }
  }

  // 5. Browser Cache TTL (1 year = 31536000 seconds)
  await cfPatch('/settings/browser_cache_ttl', { value: 31536000 }, 'browser_cache_ttl_1yr')

  // Summary
  const allSuccess = Object.values(results).every(r => r.success)

  return new Response(JSON.stringify({
    success: allSuccess,
    message: allSuccess ? 'All Cloudflare optimizations applied successfully!' : 'Some settings failed — see details.',
    results,
  }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})