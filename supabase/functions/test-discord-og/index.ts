const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { path } = await req.json().catch(() => ({ path: '/products/unmarked-2022-bmw-m3-competition-g80' }))
    const target = `https://eclipserblx.com${path}`

    const res = await fetch(target, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)',
      },
    })

    const [html, dnsRes] = await Promise.all([
      res.text(),
      fetch('https://dns.google/resolve?name=eclipserblx.com&type=NS'),
    ])
    const dns = await dnsRes.json()

    const titleMatch = html.match(/<title>([^<]+)<\/title>/i)
    const ogTitleMatch = html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i)
    const ogImageMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i)

    return new Response(JSON.stringify({
      success: true,
      url: target,
      status: res.status,
      title: titleMatch?.[1] ?? null,
      og_title: ogTitleMatch?.[1] ?? null,
      og_image: ogImageMatch?.[1] ?? null,
      public_ns: (dns.Answer || []).map((a: any) => a.data),
      sample: html.slice(0, 800),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
