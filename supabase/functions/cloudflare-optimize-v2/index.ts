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

  // For zone-level rulesets, use the phase endpoint directly (PUT to create/replace)
  async function putPhaseRuleset(phase: string, rules: unknown[], label: string) {
    try {
      const res = await fetch(`${baseUrl}/rulesets/phases/${phase}/entrypoint`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          name: `Eclipse ${label}`,
          rules,
        }),
      })
      const data = await res.json()
      if (!data.success) {
        results[label] = { success: false, error: JSON.stringify(data.errors) }
      } else {
        results[label] = { success: true, detail: `${rules.length} rules applied` }
      }
    } catch (e) {
      results[label] = { success: false, error: String(e) }
    }
  }

  // ═══════════════════════════════════════════════
  // 1. CACHE RULES
  // ═══════════════════════════════════════════════
  // 1. PAGE RULES (Cache + Redirects via legacy API)
  // ═══════════════════════════════════════════════
  async function createPageRule(target: string, actions: unknown[], label: string) {
    try {
      // First delete existing page rules to avoid conflicts
      const listRes = await fetch(`${baseUrl}/pagerules?status=active`, { headers })
      const listData = await listRes.json()
      
      if (listData.success && listData.result) {
        for (const rule of listData.result) {
          if (rule.targets?.[0]?.constraint?.value === target) {
            await fetch(`${baseUrl}/pagerules/${rule.id}`, { method: 'DELETE', headers })
          }
        }
      }

      const res = await fetch(`${baseUrl}/pagerules`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          targets: [{ target: 'url', constraint: { operator: 'matches', value: target } }],
          actions,
          priority: 1,
          status: 'active',
        }),
      })
      const data = await res.json()
      if (!data.success) {
        results[label] = { success: false, error: JSON.stringify(data.errors) }
      } else {
        results[label] = { success: true, detail: 'Page rule created' }
      }
    } catch (e) {
      results[label] = { success: false, error: String(e) }
    }
  }

  // Cache static assets aggressively
  const cacheAssetsPromise = createPageRule(
    'eclipserblx.com/assets/*',
    [
      { id: 'cache_level', value: 'cache_everything' },
      { id: 'edge_cache_ttl', value: 2592000 }, // 30 days
      { id: 'browser_cache_ttl', value: 31536000 }, // 1 year
    ],
    'cache_assets'
  )
  // Note: Free plan allows 3 page rules max. Fonts are served under /assets/ by Vite.

  // www → root redirect
  const wwwRedirectPromise = createPageRule(
    'www.eclipserblx.com/*',
    [
      { id: 'forwarding_url', value: { url: 'https://eclipserblx.com/$1', status_code: 301 } },
    ],
    'www_redirect'
  )

  // ═══════════════════════════════════════════════
  // 3. SECURITY RESPONSE HEADERS
  // ═══════════════════════════════════════════════
  const securityHeadersPromise = putPhaseRuleset('http_response_headers_transform', [
    {
      action: 'rewrite',
      action_parameters: {
        headers: {
          'X-Content-Type-Options': { operation: 'set', value: 'nosniff' },
          'X-Frame-Options': { operation: 'set', value: 'SAMEORIGIN' },
          'Referrer-Policy': { operation: 'set', value: 'strict-origin-when-cross-origin' },
          'Permissions-Policy': { operation: 'set', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
          'X-XSS-Protection': { operation: 'set', value: '1; mode=block' },
        },
      },
      expression: 'true',
      description: 'Add security headers to all responses',
      enabled: true,
    },
    {
      action: 'rewrite',
      action_parameters: {
        headers: {
          'Link': { operation: 'set', value: '<https://eclipserblx.com>; rel="canonical"' },
          'X-Robots-Tag': { operation: 'set', value: 'index, follow, max-image-preview:large, max-snippet:-1' },
        },
      },
      expression: '(http.request.uri.path eq "/") or not (http.request.uri.path contains ".")',
      description: 'SEO headers for HTML pages — allow full indexing and rich previews',
      enabled: true,
    },
    {
      action: 'rewrite',
      action_parameters: {
        headers: {
          'X-Robots-Tag': { operation: 'set', value: 'noindex, nofollow' },
        },
      },
      expression: 'starts_with(http.request.uri.path, "/admin") or starts_with(http.request.uri.path, "/seller/") or starts_with(http.request.uri.path, "/staff/")',
      description: 'Block search engines from indexing admin/staff pages',
      enabled: true,
    },
  ], 'security_and_seo_headers')

  // ═══════════════════════════════════════════════
  // 4. RATE LIMITING
  // ═══════════════════════════════════════════════
  const rateLimitPromise = putPhaseRuleset('http_ratelimit', [
    {
      action: 'block',
      action_parameters: {
        response: {
          status_code: 429,
          content: '{"error":"Rate limit exceeded. Try again later."}',
          content_type: 'application/json',
        },
      },
      ratelimit: {
        characteristics: ['cf.colo.id', 'ip.src'],
        period: 10,
        requests_per_period: 10,
        mitigation_timeout: 10,
      },
      expression: '(http.request.uri.path contains "/functions/v1/")',
      description: 'Rate limit edge functions - 60 req/min per IP',
      enabled: true,
    },
  ], 'rate_limiting')

  // ═══════════════════════════════════════════════
  // 5. TIERED CACHE
  // ═══════════════════════════════════════════════
  const tieredCachePromise = (async () => {
    try {
      const res = await fetch(`${baseUrl}/argo/tiered_caching`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ value: 'on' }),
      })
      const data = await res.json()
      results['tiered_cache'] = {
        success: !!data.success,
        detail: data.success ? 'Enabled' : JSON.stringify(data.errors),
      }
    } catch (e) {
      results['tiered_cache'] = { success: false, error: String(e) }
    }
  })()

  // Run all in parallel
  await Promise.all([
    cacheAssetsPromise,
    wwwRedirectPromise,
    securityHeadersPromise,
    rateLimitPromise,
    tieredCachePromise,
  ])

  // ═══════════════════════════════════════════════
  // 6. OPTIONAL: CACHE PURGE
  // ═══════════════════════════════════════════════
  let body: { purge_cache?: boolean } = {}
  try { body = await req.json() } catch { /* no body */ }

  if (body.purge_cache) {
    try {
      const res = await fetch(`${baseUrl}/purge_cache`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ purge_everything: true }),
      })
      const data = await res.json()
      results['cache_purge'] = {
        success: !!data.success,
        detail: data.success ? 'All cache purged' : JSON.stringify(data.errors),
      }
    } catch (e) {
      results['cache_purge'] = { success: false, error: String(e) }
    }
  }

  const allSuccess = Object.values(results).every(r => r.success)

  return new Response(JSON.stringify({
    success: allSuccess,
    message: allSuccess
      ? 'All Cloudflare optimizations applied successfully!'
      : 'Some settings had issues — see details.',
    results,
  }, null, 2), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
