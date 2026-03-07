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

  // Helper for rulesets API
  async function listRulesets(): Promise<any[]> {
    const res = await fetch(`${baseUrl}/rulesets`, { headers })
    const data = await res.json()
    return data.result || []
  }

  async function getOrCreateRuleset(phase: string): Promise<string | null> {
    const rulesets = await listRulesets()
    const existing = rulesets.find((r: any) => r.phase === phase)
    if (existing) return existing.id

    // Create new ruleset for this phase
    const res = await fetch(`${baseUrl}/rulesets`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ name: `Eclipse ${phase}`, kind: 'zone', phase, rules: [] }),
    })
    const data = await res.json()
    return data.result?.id || null
  }

  // ═══════════════════════════════════════════════
  // 1. CACHE RULES (http_request_cache_settings)
  // ═══════════════════════════════════════════════
  try {
    const rulesetId = await getOrCreateRuleset('http_request_cache_settings')
    if (rulesetId) {
      const cacheRules = [
        {
          action: 'set_cache_settings',
          action_parameters: {
            cache: true,
            edge_ttl: { mode: 'override_origin', default: 2592000 }, // 30 days
            browser_ttl: { mode: 'override_origin', default: 31536000 }, // 1 year
          },
          expression: '(starts_with(http.request.uri.path, "/assets/")) or (http.request.uri.path.extension in {"js" "css" "woff2" "webp" "png" "jpg" "svg" "ico" "woff" "ttf"})',
          description: 'Cache static assets aggressively',
          enabled: true,
        },
        {
          action: 'set_cache_settings',
          action_parameters: {
            cache: true,
            edge_ttl: { mode: 'override_origin', default: 31536000 }, // 1 year
            browser_ttl: { mode: 'override_origin', default: 31536000 },
          },
          expression: 'starts_with(http.request.uri.path, "/fonts/")',
          description: 'Cache fonts immutably',
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
      ]

      const res = await fetch(`${baseUrl}/rulesets/${rulesetId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ rules: cacheRules }),
      })
      const data = await res.json()
      results['cache_rules'] = {
        success: !!data.success,
        detail: data.success ? `${cacheRules.length} rules applied` : JSON.stringify(data.errors),
      }
    }
  } catch (e) {
    results['cache_rules'] = { success: false, error: String(e) }
  }

  // ═══════════════════════════════════════════════
  // 2. REDIRECT RULES (http_request_dynamic_redirect)
  // ═══════════════════════════════════════════════
  try {
    const rulesetId = await getOrCreateRuleset('http_request_dynamic_redirect')
    if (rulesetId) {
      const redirectRules = [
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
          description: 'www to root redirect',
          enabled: true,
        },
        {
          action: 'redirect',
          action_parameters: {
            from_value: {
              status_code: 301,
              target_url: {
                expression: 'concat("https://eclipserblx.com", substring(http.request.uri.path, 0, len(http.request.uri.path) - 1))',
              },
              preserve_query_string: true,
            },
          },
          expression: '(http.request.uri.path ne "/") and (ends_with(http.request.uri.path, "/"))',
          description: 'Remove trailing slash',
          enabled: true,
        },
      ]

      const res = await fetch(`${baseUrl}/rulesets/${rulesetId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ rules: redirectRules }),
      })
      const data = await res.json()
      results['redirect_rules'] = {
        success: !!data.success,
        detail: data.success ? `${redirectRules.length} rules applied` : JSON.stringify(data.errors),
      }
    }
  } catch (e) {
    results['redirect_rules'] = { success: false, error: String(e) }
  }

  // ═══════════════════════════════════════════════
  // 3. SECURITY TRANSFORM RULES (http_response_headers_transform)
  // ═══════════════════════════════════════════════
  try {
    const rulesetId = await getOrCreateRuleset('http_response_headers_transform')
    if (rulesetId) {
      const headerRules = [
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
          description: 'Security headers on all responses',
          enabled: true,
        },
      ]

      const res = await fetch(`${baseUrl}/rulesets/${rulesetId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ rules: headerRules }),
      })
      const data = await res.json()
      results['security_headers'] = {
        success: !!data.success,
        detail: data.success ? 'Applied' : JSON.stringify(data.errors),
      }
    }
  } catch (e) {
    results['security_headers'] = { success: false, error: String(e) }
  }

  // ═══════════════════════════════════════════════
  // 4. WAF RATE LIMITING (http_ratelimit)
  // ═══════════════════════════════════════════════
  try {
    const rulesetId = await getOrCreateRuleset('http_ratelimit')
    if (rulesetId) {
      const rateLimitRules = [
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
            mitigation_timeout: 600, // block for 10 min
          },
          expression: '(http.request.uri.path contains "/functions/v1/")',
          description: 'Rate limit edge functions - 60/min per IP',
          enabled: true,
        },
      ]

      const res = await fetch(`${baseUrl}/rulesets/${rulesetId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ rules: rateLimitRules }),
      })
      const data = await res.json()
      results['rate_limiting'] = {
        success: !!data.success,
        detail: data.success ? 'Applied' : JSON.stringify(data.errors),
      }
    }
  } catch (e) {
    results['rate_limiting'] = { success: false, error: String(e) }
  }

  // ═══════════════════════════════════════════════
  // 5. TIERED CACHE (Argo Smart Routing / Tiered Cache)
  // ═══════════════════════════════════════════════
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

  // ═══════════════════════════════════════════════
  // 6. CACHE PURGE (optional, purge all)
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

  // Summary
  const allSuccess = Object.values(results).every(r => r.success)

  return new Response(JSON.stringify({
    success: allSuccess,
    message: allSuccess
      ? 'All Cloudflare optimizations applied successfully!'
      : 'Some settings had issues — see details.',
    results,
  }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
