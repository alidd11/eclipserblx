import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[TRACK-AD-CLICK] ${step}${detailsStr}`);
};

// Parse user agent for device type
const getDeviceType = (ua: string): string => {
  if (/tablet|ipad|playbook|silk/i.test(ua)) return 'tablet';
  if (/mobile|iphone|ipod|android|blackberry|opera mini|iemobile/i.test(ua)) return 'mobile';
  return 'desktop';
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const url = new URL(req.url);
    const adId = url.searchParams.get('id');
    
    if (!adId) {
      logStep("Missing ad ID");
      return new Response("Missing advertisement ID", { status: 400 });
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(adId)) {
      logStep("Invalid ad ID format");
      return new Response("Invalid advertisement ID", { status: 400 });
    }

    logStep("Processing click for ad", { adId });

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get the advertisement and its redirect URL
    const { data: ad, error: adError } = await supabaseAdmin
      .from("discord_advertisements")
      .select("id, link_url, user_id, status")
      .eq("id", adId)
      .maybeSingle();

    if (adError || !ad) {
      logStep("Advertisement not found", { adId, error: adError });
      return new Response("Advertisement not found", { status: 404 });
    }

    // Only track clicks for posted ads
    if (ad.status !== 'posted') {
      logStep("Ad not in posted status", { status: ad.status });
      return new Response("Advertisement not active", { status: 404 });
    }

    // Extract visitor info
    const userAgent = req.headers.get("user-agent") || "";
    const referrer = req.headers.get("referer") || null;
    const deviceType = getDeviceType(userAgent);
    
    // Generate a simple visitor ID from user agent + date (for unique click tracking)
    const visitorId = btoa(userAgent + new Date().toDateString()).substring(0, 32);

    // Check if this is a unique click (same visitor hasn't clicked today)
    const { data: existingClick } = await supabaseAdmin
      .from("advertisement_clicks")
      .select("id")
      .eq("advertisement_id", adId)
      .eq("visitor_id", visitorId)
      .gte("clicked_at", new Date(new Date().setHours(0, 0, 0, 0)).toISOString())
      .maybeSingle();

    const isUniqueClick = !existingClick;

    // Record the click
    await supabaseAdmin
      .from("advertisement_clicks")
      .insert({
        advertisement_id: adId,
        visitor_id: visitorId,
        referrer: referrer,
        user_agent: userAgent.substring(0, 500), // Limit length
        device_type: deviceType,
      });

    // Update the advertisement click counts using RPC for atomic increment
    // First, get current values to increment
    const { data: currentAd } = await supabaseAdmin
      .from("discord_advertisements")
      .select("total_clicks, unique_clicks")
      .eq("id", adId)
      .single();

    const updateData: Record<string, unknown> = {
      total_clicks: (currentAd?.total_clicks || 0) + 1,
      last_clicked_at: new Date().toISOString(),
    };

    if (isUniqueClick) {
      updateData.unique_clicks = (currentAd?.unique_clicks || 0) + 1;
    }

    await supabaseAdmin
      .from("discord_advertisements")
      .update(updateData)
      .eq("id", adId);

    logStep("Click recorded successfully", { 
      adId, 
      isUniqueClick, 
      deviceType,
      redirectTo: ad.link_url 
    });

    // Redirect to the advertisement's link URL or a fallback
    const redirectUrl = ad.link_url || Deno.env.get("SUPABASE_URL")?.replace('.supabase.co', '.lovable.app') || "/";

    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        "Location": redirectUrl,
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    
    // On error, redirect to home page
    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        "Location": "/",
      },
    });
  }
});
