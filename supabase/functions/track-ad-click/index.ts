import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { checkRateLimit, getClientIp, rateLimitResponse, RATE_LIMITS } from "../_shared/rateLimit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[TRACK-AD-CLICK] ${step}${detailsStr}`);
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Parse user agent for device type
const getDeviceType = (ua: string): string => {
  if (/tablet|ipad|playbook|silk/i.test(ua)) return 'tablet';
  if (/mobile|iphone|ipod|android|blackberry|opera mini|iemobile/i.test(ua)) return 'mobile';
  return 'desktop';
};

// Validate URL to prevent open redirect
const isValidRedirectUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    // Only allow http/https protocols
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Rate limit: 60 clicks/min per IP to prevent click fraud
  const clientIp = getClientIp(req);
  const rateLimitResult = checkRateLimit({
    ...RATE_LIMITS.API,
    identifier: clientIp,
    action: 'track-ad-click',
  });

  if (!rateLimitResult.allowed) {
    return rateLimitResponse(rateLimitResult, corsHeaders);
  }

  const FALLBACK_URL = "https://eclipserblx.com/";

  try {
    logStep("Function started");

    const url = new URL(req.url);
    const adId = url.searchParams.get('id');
    
    if (!adId || !UUID_REGEX.test(adId)) {
      logStep("Invalid ad ID");
      return new Response(null, { status: 302, headers: { ...corsHeaders, "Location": FALLBACK_URL } });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Get the advertisement and its redirect URL
    const { data: ad, error: adError } = await supabaseAdmin
      .from("discord_advertisements")
      .select("id, link_url, user_id, status")
      .eq("id", adId)
      .maybeSingle();

    if (adError || !ad || ad.status !== 'posted') {
      return new Response(null, { status: 302, headers: { ...corsHeaders, "Location": FALLBACK_URL } });
    }

    // Extract visitor info
    const userAgent = req.headers.get("user-agent") || "";
    const referrer = req.headers.get("referer") || null;
    const deviceType = getDeviceType(userAgent);
    
    // Generate visitor ID from IP + user agent + date (for unique click tracking)
    const visitorId = btoa(clientIp + userAgent.substring(0, 100) + new Date().toDateString()).substring(0, 32);

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
        referrer: referrer ? referrer.substring(0, 500) : null,
        user_agent: userAgent.substring(0, 500),
        device_type: deviceType,
      });

    // Atomic increment via database function
    await supabaseAdmin.rpc('increment_ad_clicks', {
      p_ad_id: adId,
      p_is_unique: isUniqueClick,
    });

    logStep("Click recorded", { adId, isUniqueClick, deviceType });

    // Validate redirect URL to prevent open redirect attacks
    const redirectUrl = ad.link_url && isValidRedirectUrl(ad.link_url) ? ad.link_url : FALLBACK_URL;

    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        "Location": redirectUrl,
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  } catch (error) {
    logStep("ERROR", { message: error instanceof Error ? error.message : String(error) });
    return new Response(null, {
      status: 302,
      headers: { ...corsHeaders, "Location": FALLBACK_URL },
    });
  }
});
