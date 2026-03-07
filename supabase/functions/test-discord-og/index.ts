const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const body = await req.json().catch(() => ({}))
    const path = body.path || '/products/unmarked-2022-bmw-m3-competition-g80'

    // Test 1: Hit workers.dev directly with __ogtest=1
    const workersDevUrl = `https://eclipse-og-proxy.mqddfqd5gs.workers.dev${path}?__ogtest=1`
    const res1 = await fetch(workersDevUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)' },
      redirect: 'manual',
    })
    const html1 = await res1.text()
    const headers1: Record<string, string> = {}
    res1.headers.forEach((v, k) => { headers1[k] = v })

    // Test 2: Hit eclipserblx.com directly with Discord UA
    const siteUrl = `https://eclipserblx.com${path}`
    const res2 = await fetch(siteUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)' },
      redirect: 'manual',
    })
    const html2 = await res2.text()
    const headers2: Record<string, string> = {}
    res2.headers.forEach((v, k) => { headers2[k] = v })

    // Test 3: Hit og-proxy2 directly
    const ogUrl = `https://qlnbergwjfrmgkjhrbkj.supabase.co/functions/v1/og-proxy2?path=${encodeURIComponent(path)}`
    const res3 = await fetch(ogUrl, {
      headers: {
        'User-Agent': 'Discordbot',
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFsbmJlcmd3amZybWdramhyYmtqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2NDY1NjIsImV4cCI6MjA4MzIyMjU2Mn0.4jHxaV7Mjlw2RbjDz9W8B07-SR_8Z7IeTTXMu8RUZ20',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFsbmJlcmd3amZybWdramhyYmtqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2NDY1NjIsImV4cCI6MjA4MzIyMjU2Mn0.4jHxaV7Mjlw2RbjDz9W8B07-SR_8Z7IeTTXMu8RUZ20',
      },
    })
    const html3 = await res3.text()

    return new Response(JSON.stringify({
      workers_dev: {
        status: res1.status,
        headers: headers1,
        has_og_tags: html1.includes('og:title'),
        x_og_worker: headers1['x-og-worker'] || null,
        sample: html1.slice(0, 600),
      },
      eclipserblx: {
        status: res2.status,
        headers: headers2,
        has_og_tags: html2.includes('og:title'),
        x_og_worker: headers2['x-og-worker'] || null,
        sample: html2.slice(0, 600),
      },
      og_proxy_direct: {
        status: res3.status,
        has_og_tags: html3.includes('og:title'),
        sample: html3.slice(0, 600),
      },
    }, null, 2), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
