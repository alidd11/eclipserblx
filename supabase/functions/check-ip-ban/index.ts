import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() 
      || req.headers.get('x-real-ip') 
      || req.headers.get('cf-connecting-ip')
      || 'unknown';

    console.log(`Checking IP ban for: ${clientIp}`);

    // Create Supabase client with service role for checking bans
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

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
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
