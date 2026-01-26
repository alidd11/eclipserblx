import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { checkRateLimit, getClientIp, rateLimitResponse, RATE_LIMITS } from '../_shared/rateLimit.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get client IP from headers (Supabase/Cloudflare provides this)
    const clientIp = getClientIp(req);

    // Rate limit check - prevent DDoS on this endpoint
    const rateLimitResult = checkRateLimit({
      ...RATE_LIMITS.READ,
      identifier: clientIp,
      action: 'check-ip-ban',
    });

    if (!rateLimitResult.allowed) {
      console.log(`Rate limit exceeded for IP: ${clientIp}`);
      return rateLimitResponse(rateLimitResult, corsHeaders);
    }

    console.log(`Checking IP ban for: ${clientIp}`);

    // Create Supabase client with service role for checking bans
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Try to get authenticated user from the request
    const authHeader = req.headers.get('Authorization');
    let userId: string | null = null;
    
    if (authHeader) {
      const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } }
      });
      const { data: { user } } = await userClient.auth.getUser();
      userId = user?.id || null;
    }

    // Log user IP if authenticated (throttled to once per hour per user)
    if (userId && clientIp && clientIp !== 'unknown') {
      // Check if we already logged this user's IP in the last hour
      const { data: recentLog } = await supabase
        .from('user_ip_logs')
        .select('id')
        .eq('user_id', userId)
        .eq('ip_address', clientIp)
        .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())
        .limit(1)
        .maybeSingle();

      // Only log if no recent entry exists
      if (!recentLog) {
        await supabase.from('user_ip_logs').insert({
          user_id: userId,
          ip_address: clientIp,
          action: 'page_visit',
        });
        console.log(`Logged IP ${clientIp} for user ${userId}`);
      }
    }

    // Check if IP is banned and ban is active (not expired)
    const { data: ban, error } = await supabase
      .from('ip_bans')
      .select('id, ip_address, reason, expires_at')
      .eq('ip_address', clientIp)
      .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error checking IP ban:', error);
      // Don't block on error - fail open for availability
      return new Response(
        JSON.stringify({ banned: false, ip: clientIp }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (ban) {
      console.log(`IP ${clientIp} is banned. Reason: ${ban.reason || 'No reason provided'}`);
      return new Response(
        JSON.stringify({
          banned: true,
          ip: clientIp,
          reason: ban.reason || 'Your IP address has been banned.',
          expires_at: ban.expires_at,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`IP ${clientIp} is not banned`);
    return new Response(
      JSON.stringify({ banned: false, ip: clientIp }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
        } 
      }
    );

  } catch (error) {
    console.error('Unexpected error in check-ip-ban:', error);
    // Fail open - don't block users due to errors
    return new Response(
      JSON.stringify({ banned: false, error: 'Check failed' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
