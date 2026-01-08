const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface IpApiResponse {
  status: string;
  proxy: boolean;
  hosting: boolean;
  query: string;
  message?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get client IP from headers
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() 
      || req.headers.get('x-real-ip') 
      || req.headers.get('cf-connecting-ip')
      || 'unknown';

    console.log(`Checking VPN status for IP: ${clientIp}`);

    // Skip check for localhost/development IPs
    if (clientIp === 'unknown' || clientIp === '127.0.0.1' || clientIp.startsWith('192.168.') || clientIp.startsWith('10.') || clientIp.startsWith('172.')) {
      console.log('Skipping VPN check for local/private IP');
      return new Response(
        JSON.stringify({ isVpn: false, ip: clientIp, skipped: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use ip-api.com for VPN/proxy detection (free tier includes proxy detection)
    // Fields: proxy (VPN/proxy), hosting (datacenter/hosting provider)
    const apiUrl = `http://ip-api.com/json/${clientIp}?fields=status,proxy,hosting,query,message`;
    
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      console.error('ip-api.com request failed:', response.status);
      // Fail open - don't block on API errors
      return new Response(
        JSON.stringify({ isVpn: false, ip: clientIp, error: 'API unavailable' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data: IpApiResponse = await response.json();
    console.log('ip-api.com response:', JSON.stringify(data));

    if (data.status !== 'success') {
      console.error('ip-api.com error:', data.message);
      // Fail open
      return new Response(
        JSON.stringify({ isVpn: false, ip: clientIp, error: data.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if IP is a VPN/proxy or from a hosting provider (datacenter)
    const isVpn = data.proxy === true || data.hosting === true;

    console.log(`IP ${clientIp} - VPN/Proxy: ${data.proxy}, Hosting: ${data.hosting}, isVpn: ${isVpn}`);

    return new Response(
      JSON.stringify({
        isVpn,
        ip: clientIp,
        details: {
          proxy: data.proxy,
          hosting: data.hosting,
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error in check-vpn:', error);
    // Fail open - don't block users due to errors
    return new Response(
      JSON.stringify({ isVpn: false, error: 'Check failed' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
