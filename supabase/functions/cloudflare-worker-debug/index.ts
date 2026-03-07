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
    return new Response(JSON.stringify({ error: 'Missing credentials' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const headers = {
    Authorization: `Bearer ${CF_API_TOKEN}`,
    'Content-Type': 'application/json',
  }

  try {
    const accRes = await fetch('https://api.cloudflare.com/client/v4/accounts', { headers })
    const accData = await accRes.json()
    const accountId = accData.result?.[0]?.id

    // Get worker subdomain
    const subdomainRes = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/subdomain`, { headers })
    const subdomainData = await subdomainRes.json()

    // Get the worker script content to verify
    const scriptRes = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/eclipse-og-proxy`, {
      headers: { 'Authorization': `Bearer ${CF_API_TOKEN}` },
    })
    const scriptContent = await scriptRes.text()

    // Enable workers.dev route for the worker
    const enableRes = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/eclipse-og-proxy/subdomain`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ enabled: true }),
    })
    const enableData = await enableRes.json()

    // Check zone page rules that might interfere
    const pageRulesRes = await fetch(`https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/pagerules`, { headers })
    const pageRulesData = await pageRulesRes.json()

    return new Response(JSON.stringify({
      success: true,
      workers_subdomain: subdomainData.result,
      worker_script_length: scriptContent.length,
      worker_script_preview: scriptContent.slice(0, 500),
      workers_dev_enabled: enableData,
      page_rules: pageRulesData.result,
    }, null, 2), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
