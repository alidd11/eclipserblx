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
  const headers = { 'Authorization': `Bearer ${CF_API_TOKEN}`, 'Content-Type': 'application/json' }

  try {
    // Get account ID
    const accRes = await fetch('https://api.cloudflare.com/client/v4/accounts', { headers })
    const accData = await accRes.json()
    const accountId = accData.result[0].id

    // 1. Delete existing A records for eclipserblx.com and www
    const listRes = await fetch(`https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/dns_records?per_page=500`, { headers })
    const listData = await listRes.json()
    const toDelete = (listData.result || []).filter((r: any) =>
      ['A', 'AAAA', 'CNAME'].includes(r.type) &&
      (r.name === 'eclipserblx.com' || r.name === 'www.eclipserblx.com')
    )

    const deleteResults = []
    for (const record of toDelete) {
      const delRes = await fetch(`https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/dns_records/${record.id}`, {
        method: 'DELETE', headers,
      })
      const delData = await delRes.json()
      deleteResults.push({ id: record.id, name: record.name, type: record.type, deleted: delData.success })
    }

    // 2. Now create Worker Custom Domains
    const domainResults = []
    for (const domain of ['eclipserblx.com', 'www.eclipserblx.com']) {
      const createRes = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/domains`, {
        method: 'PUT', headers,
        body: JSON.stringify({
          hostname: domain,
          zone_id: CF_ZONE_ID,
          service: 'eclipse-og-proxy',
          environment: 'production',
        }),
      })
      const createData = await createRes.json()
      domainResults.push({ domain, success: createData.success, errors: createData.errors, result: createData.result })
    }

    return new Response(JSON.stringify({ deleteResults, domainResults }, null, 2), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
