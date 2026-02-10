import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    
    // Support both single image and batch
    const images: { imageBase64: string; hash?: string }[] = body.images
      ? body.images
      : body.imageBase64
        ? [{ imageBase64: body.imageBase64, hash: body.hash }]
        : [];

    if (images.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No images provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client for cache lookups
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const results: { isNSFW: boolean; reason: string; hash?: string; cached?: boolean }[] = [];
    const uncachedImages: { imageBase64: string; hash?: string; index: number }[] = [];

    // Step 1: Check cache for all images with hashes
    for (let i = 0; i < images.length; i++) {
      const img = images[i];
      if (img.hash) {
        const { data: cached } = await supabase
          .from('nsfw_scan_cache')
          .select('is_nsfw, reason')
          .eq('image_hash', img.hash)
          .maybeSingle();

        if (cached) {
          console.log(`Cache hit for hash ${img.hash.substring(0, 8)}...`);
          // Increment scan count
          await supabase
            .from('nsfw_scan_cache')
            .update({ scan_count: cached.scan_count ? cached.scan_count + 1 : 2 })
            .eq('image_hash', img.hash);
          
          results[i] = { isNSFW: cached.is_nsfw, reason: cached.reason || '', hash: img.hash, cached: true };
          continue;
        }
      }
      uncachedImages.push({ ...img, index: i });
    }

    // Step 2: If all cached, return early
    if (uncachedImages.length === 0) {
      console.log('All images served from cache');
      const response = images.length === 1 ? results[0] : { results };
      return new Response(JSON.stringify(response), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Step 3: Batch AI scan for uncached images
    // Build content array with all uncached images in a single request
    const contentParts: any[] = [
      {
        type: 'text',
        text: uncachedImages.length === 1
          ? 'Analyze this image for NSFW content. Respond only with the JSON format specified.'
          : `Analyze these ${uncachedImages.length} images for NSFW content. Respond with a JSON array of results, one per image, in order.`
      }
    ];

    for (const img of uncachedImages) {
      contentParts.push({
        type: 'image_url',
        image_url: { url: img.imageBase64 }
      });
    }

    const systemPrompt = uncachedImages.length === 1
      ? `You are a content moderation system. Analyze the provided image and determine if it contains NSFW content.

NSFW content includes:
- Nudity or sexually explicit content
- Graphic violence or gore
- Drug use imagery
- Hate symbols or extremist content
- Shocking or disturbing imagery

Respond with ONLY a JSON object: {"isNSFW": true/false, "reason": "brief reason if NSFW, otherwise empty string"}
Be strict but fair. If in doubt, err on the side of caution.`
      : `You are a content moderation system. Analyze each provided image and determine if it contains NSFW content.

NSFW content includes:
- Nudity or sexually explicit content
- Graphic violence or gore
- Drug use imagery
- Hate symbols or extremist content
- Shocking or disturbing imagery

Respond with ONLY a JSON array of objects, one per image in order: [{"isNSFW": true/false, "reason": "brief reason if NSFW, otherwise empty string"}, ...]
Be strict but fair.`;

    console.log(`Scanning ${uncachedImages.length} uncached image(s) via AI...`);

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: contentParts }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', errorText);
      // Fill uncached with safe defaults
      for (const img of uncachedImages) {
        results[img.index] = { isNSFW: false, reason: '', hash: img.hash };
      }
      const finalResponse = images.length === 1 ? results[0] : { results };
      return new Response(JSON.stringify(finalResponse), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    console.log('AI response:', content);

    // Parse response
    let parsedResults: { isNSFW: boolean; reason: string }[] = [];
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/) || content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        parsedResults = Array.isArray(parsed) ? parsed : [parsed];
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
    }

    // Map results back and cache them
    for (let i = 0; i < uncachedImages.length; i++) {
      const img = uncachedImages[i];
      const aiResult = parsedResults[i] || { isNSFW: false, reason: '' };
      const result = {
        isNSFW: aiResult.isNSFW === true,
        reason: aiResult.reason || '',
        hash: img.hash,
      };
      results[img.index] = result;

      // Cache the result
      if (img.hash) {
        await supabase
          .from('nsfw_scan_cache')
          .upsert({
            image_hash: img.hash,
            is_nsfw: result.isNSFW,
            reason: result.reason,
            scanned_at: new Date().toISOString(),
          }, { onConflict: 'image_hash' })
          .then(({ error }) => {
            if (error) console.error('Cache write error:', error);
          });
      }
    }

    const finalResponse = images.length === 1 ? results[0] : { results };
    return new Response(JSON.stringify(finalResponse), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in check-nsfw function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
