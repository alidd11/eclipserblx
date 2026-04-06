const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const ALLOWED_ORIGIN = SUPABASE_URL.replace('https://', '')

// 1 year cache — images are content-addressed (filename includes timestamp + random)
const CACHE_HEADERS = {
  'Cache-Control': 'public, max-age=31536000, immutable',
  'Vary': 'Accept',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const url = new URL(req.url)
  const imageUrl = url.searchParams.get('url')

  if (!imageUrl) {
    return new Response(JSON.stringify({ error: 'Missing url parameter' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Security: only proxy images from our Supabase storage
  try {
    const parsed = new URL(imageUrl)
    if (!parsed.hostname.endsWith('.supabase.co') && !parsed.hostname.endsWith('.supabase.in')) {
      return new Response(JSON.stringify({ error: 'Forbidden origin' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    if (!parsed.pathname.includes('/storage/v1/object/public/')) {
      return new Response(JSON.stringify({ error: 'Only public storage URLs allowed' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid URL' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    const response = await fetch(imageUrl)
    if (!response.ok) {
      return new Response(null, {
        status: response.status,
        headers: { ...corsHeaders, ...CACHE_HEADERS },
      })
    }

    const contentType = response.headers.get('Content-Type') || 'application/octet-stream'

    return new Response(response.body, {
      status: 200,
      headers: {
        ...corsHeaders,
        ...CACHE_HEADERS,
        'Content-Type': contentType,
        'Content-Length': response.headers.get('Content-Length') || '',
        'ETag': response.headers.get('ETag') || '',
      },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Failed to fetch image' }), {
      status: 502,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
