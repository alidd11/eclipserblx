import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const INDEXNOW_KEY = 'eclipse-rblx-indexnow-2026';
const SEARCH_ENGINES = [
  'https://api.indexnow.org/indexnow',
  'https://www.bing.com/indexnow',
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { urls } = await req.json();

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return new Response(
        JSON.stringify({ error: 'urls array is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Ensure all URLs are properly formatted
    const formattedUrls = urls.map((url: string) =>
      url.startsWith('http') ? url : `https://eclipserblx.com${url}`
    );

    const payload = {
      host: 'eclipserblx.com',
      key: INDEXNOW_KEY,
      keyLocation: `https://eclipserblx.com/${INDEXNOW_KEY}.txt`,
      urlList: formattedUrls,
    };

    // Submit to all IndexNow endpoints in parallel
    const results = await Promise.allSettled(
      SEARCH_ENGINES.map(async (engine) => {
        const res = await fetch(engine, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        return { engine, status: res.status, ok: res.ok };
      })
    );

    const summary = results.map((r) =>
      r.status === 'fulfilled' ? r.value : { engine: 'unknown', error: r.reason?.message }
    );

    console.log('IndexNow submissions:', JSON.stringify(summary));

    return new Response(
      JSON.stringify({ success: true, submitted: formattedUrls.length, results: summary }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('IndexNow error:', err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
