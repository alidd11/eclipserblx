const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''

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
  const width = url.searchParams.get('w')
  const quality = url.searchParams.get('q') || '80'

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

  // Detect browser WebP/AVIF support from Accept header
  const accept = req.headers.get('Accept') || ''
  const supportsWebP = accept.includes('image/webp')

  try {
    // Use Supabase Storage render endpoint for on-the-fly transforms
    // Convert /storage/v1/object/public/BUCKET/PATH → /storage/v1/render/image/public/BUCKET/PATH
    let fetchUrl = imageUrl
    const parsedUrl = new URL(imageUrl)
    const storagePath = parsedUrl.pathname

    if (storagePath.includes('/storage/v1/object/public/')) {
      const renderPath = storagePath.replace('/storage/v1/object/public/', '/storage/v1/render/image/public/')
      const renderUrl = new URL(renderPath, parsedUrl.origin)

      // Add transform parameters
      if (width) renderUrl.searchParams.set('width', width)
      renderUrl.searchParams.set('quality', quality)
      if (supportsWebP) renderUrl.searchParams.set('format', 'origin')

      fetchUrl = renderUrl.toString()
    }

    const response = await fetch(fetchUrl)
    if (!response.ok) {
      // Fallback: if render endpoint fails, try original URL
      const fallback = await fetch(imageUrl)
      if (!fallback.ok) {
        return new Response(null, {
          status: fallback.status,
          headers: { ...corsHeaders, ...CACHE_HEADERS },
        })
      }
      const contentType = fallback.headers.get('Content-Type') || 'application/octet-stream'
      return new Response(fallback.body, {
        status: 200,
        headers: {
          ...corsHeaders,
          ...CACHE_HEADERS,
          'Content-Type': contentType,
          'Content-Length': fallback.headers.get('Content-Length') || '',
          'ETag': fallback.headers.get('ETag') || '',
        },
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
