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
    // 1. Get account ID
    const accRes = await fetch('https://api.cloudflare.com/client/v4/accounts', { headers })
    const accData = await accRes.json()
    const accountId = accData.result?.[0]?.id

    // 2. List worker routes on the zone
    const routesRes = await fetch(`https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/workers/routes`, { headers })
    const routesData = await routesRes.json()

    // 3. List workers on the account
    const workersRes = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts`, { headers })
    const workersData = await workersRes.json()

    // 4. Check if there's a Pages project that might conflict
    const pagesRes = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/pages/projects`, { headers })
    const pagesData = await pagesRes.json()

    // 5. Check zone settings for any relevant config
    const zoneSettingsRes = await fetch(`https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/settings`, { headers })
    const zoneSettingsData = await zoneSettingsRes.json()

    // Filter relevant settings
    const relevantSettings = (zoneSettingsData.result || []).filter((s: any) => 
      ['always_use_https', 'ssl', 'rocket_loader'].includes(s.id)
    )

    return new Response(JSON.stringify({
      success: true,
      account_id: accountId,
      worker_routes: routesData.result || [],
      workers: (workersData.result || []).map((w: any) => ({ id: w.id, modified_on: w.modified_on })),
      pages_projects: (pagesData.result || []).map((p: any) => ({ name: p.name, subdomain: p.subdomain, domains: p.domains })),
      relevant_settings: relevantSettings,
    }, null, 2), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
