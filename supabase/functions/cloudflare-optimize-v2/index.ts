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
          phase,
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
  const cacheRulesPromise = putPhaseRuleset('http_request_cache_settings', [
    {
      action: 'set_cache_settings',
      action_parameters: {
        cache: true,
        edge_ttl: { mode: 'override_origin', default: 2592000 },
        browser_ttl: { mode: 'override_origin', default: 31536000 },
      },
      expression: '(starts_with(http.request.uri.path, "/assets/")) or (http.request.uri.path.extension in {"js" "css" "woff2" "webp" "png" "jpg" "svg" "ico" "woff" "ttf"})',
      description: 'Cache static assets aggressively (30d edge, 1yr browser)',
      enabled: true,
    },
    {
      action: 'set_cache_settings',
      action_parameters: {
        cache: true,
        edge_ttl: { mode: 'override_origin', default: 31536000 },
        browser_ttl: { mode: 'override_origin', default: 31536000 },
      },
      expression: 'starts_with(http.request.uri.path, "/fonts/")',
      description: 'Cache fonts immutably (1yr)',
      enabled: true,
    },
    {
      action: 'set_cache_settings',
      action_parameters: {
        cache: false,
        browser_ttl: { mode: 'bypass' },
      },
      expression: '(http.request.uri.path eq "/") or not (http.request.uri.path contains ".")',
      description: 'Bypass cache for HTML/SPA routes',
      enabled: true,
    },
  ], 'cache_rules')

  // ═══════════════════════════════════════════════
  // 2. REDIRECT RULES
  // ═══════════════════════════════════════════════
  const redirectRulesPromise = putPhaseRuleset('http_request_dynamic_redirect', [
    {
      action: 'redirect',
      action_parameters: {
        from_value: {
          status_code: 301,
          target_url: {
            expression: 'concat("https://eclipserblx.com", http.request.uri.path)',
          },
          preserve_query_string: true,
        },
      },
      expression: '(http.host eq "www.eclipserblx.com")',
      description: 'www to root 301 redirect',
      enabled: true,
    },
    {
      action: 'redirect',
      action_parameters: {
        from_value: {
          status_code: 301,
          target_url: {
            expression: 'regex_replace(http.request.uri.path, "(.+)/$", "${1}")',
          },
          preserve_query_string: true,
        },
      },
      expression: '(http.request.uri.path ne "/") and (ends_with(http.request.uri.path, "/"))',
      description: 'Remove trailing slash',
      enabled: true,
    },
  ], 'redirect_rules')

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
  ], 'security_headers')

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
        characteristics: ['ip.src'],
        period: 60,
        requests_per_period: 60,
        mitigation_timeout: 600,
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
    cacheRulesPromise,
    redirectRulesPromise,
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
