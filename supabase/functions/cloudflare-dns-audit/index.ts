const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type CfRecord = {
  id: string
  type: string
  name: string
  content: string
  proxied: boolean | null
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const CF_API_TOKEN = Deno.env.get('CLOUDFLARE_API_TOKEN')
  const CF_ZONE_ID = Deno.env.get('CLOUDFLARE_ZONE_ID')

  if (!CF_API_TOKEN || !CF_ZONE_ID) {
    return new Response(JSON.stringify({ error: 'Missing Cloudflare credentials' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const headers = {
    Authorization: `Bearer ${CF_API_TOKEN}`,
    'Content-Type': 'application/json',
  }

  let body: { enable_proxy?: boolean } = {}
  try {
    body = await req.json()
  } catch {
    // no body
  }

  try {
    const [zoneRes, listRes] = await Promise.all([
      fetch(`https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}`, { headers }),
      fetch(`https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/dns_records?per_page=500`, { headers }),
    ])

    const zoneData = await zoneRes.json()
    const listData = await listRes.json()

    if (!zoneData.success) {
      return new Response(JSON.stringify({ success: false, error: 'Failed to fetch zone details', details: zoneData.errors }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!listData.success) {
      return new Response(JSON.stringify({ success: false, error: 'Failed to list DNS records', details: listData.errors }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const allRecords: CfRecord[] = listData.result ?? []

    const targetRecords = allRecords.filter((r) =>
      ['A', 'AAAA', 'CNAME'].includes(r.type) &&
      (r.name === 'eclipserblx.com' || r.name === 'www.eclipserblx.com')
    )

    const updates: Array<{ id: string; name: string; type: string; success: boolean; proxied?: boolean | null; errors?: unknown }> = []

    if (body.enable_proxy) {
      for (const record of targetRecords) {
        if (record.proxied === true) {
          updates.push({ id: record.id, name: record.name, type: record.type, success: true, proxied: true })
          continue
        }

        const updateRes = await fetch(
          `https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/dns_records/${record.id}`,
          {
            method: 'PATCH',
            headers,
            body: JSON.stringify({ proxied: true }),
          },
        )
        const updateData = await updateRes.json()
        updates.push({
          id: record.id,
          name: record.name,
          type: record.type,
          success: !!updateData.success,
          proxied: updateData.result?.proxied,
          errors: updateData.success ? undefined : updateData.errors,
        })
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        records: targetRecords,
        updates,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
