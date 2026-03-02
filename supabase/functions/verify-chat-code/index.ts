import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { checkRateLimit, getClientIp, rateLimitResponse, RATE_LIMITS } from '../_shared/rateLimit.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// BOT-XXXX-XXXX-XXXX format
const BOT_CODE_REGEX = /^BOT-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Rate limit
    const clientIp = getClientIp(req);
    const rl = checkRateLimit({ ...RATE_LIMITS.WRITE, identifier: clientIp, action: 'verify-chat-code' });
    if (!rl.allowed) return rateLimitResponse(rl, corsHeaders);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    const supabaseService = createClient(supabaseUrl, supabaseServiceKey);
    
    // Auth check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized', verified: false, masked_code: '' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized', verified: false, masked_code: '' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { code, conversationId } = await req.json();

    // Input validation
    if (!code || typeof code !== 'string' || code.length > 50) {
      return new Response(
        JSON.stringify({ error: 'Invalid code format', verified: false, masked_code: '' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!conversationId || typeof conversationId !== 'string' || !UUID_REGEX.test(conversationId)) {
      return new Response(
        JSON.stringify({ error: 'Invalid conversation ID', verified: false, masked_code: '' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const normalizedCode = code.toUpperCase().trim();

    // Validate code format
    if (!BOT_CODE_REGEX.test(normalizedCode)) {
      return new Response(
        JSON.stringify({ error: 'Invalid code format', verified: false, masked_code: '' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Mask the code for display
    const maskCode = (c: string): string => {
      const parts = c.split('-');
      if (parts.length === 4 && parts[0] === 'BOT') {
        return `BOT-****-****-${parts[3].slice(-2)}**`;
      }
      return '*'.repeat(c.length);
    };

    const maskedCode = maskCode(normalizedCode);

    // Look up the code - must belong to the authenticated user
    const { data: codeData, error: codeError } = await supabaseService
      .from('bot_installation_codes')
      .select('id, installation_code, product_name, user_id, is_used, status')
      .eq('installation_code', normalizedCode)
      .eq('user_id', user.id)
      .single();

    if (codeError || !codeData) {
      // Insert a verification message even if failed
      await supabaseService.from('chat_messages').insert({
        conversation_id: conversationId,
        message: `[Code Verification] ${maskedCode}`,
        sender_type: 'customer',
        sender_id: user.id,
        message_type: 'code_verification',
        secure_data: {
          verified: false,
          masked_code: maskedCode,
          error: 'Code not found or does not belong to this account'
        }
      });

      return new Response(
        JSON.stringify({ 
          verified: false, 
          masked_code: maskedCode,
          error: 'Code not found or does not belong to your account'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Insert verification message
    await supabaseService.from('chat_messages').insert({
      conversation_id: conversationId,
      message: `[Code Verification] ${maskedCode}`,
      sender_type: 'customer',
      sender_id: user.id,
      message_type: 'code_verification',
      secure_data: {
        verified: true,
        masked_code: maskedCode,
        product_name: codeData.product_name,
        code_id: codeData.id,
        status: codeData.status
      }
    });

    return new Response(
      JSON.stringify({ 
        verified: true, 
        masked_code: maskedCode,
        product_name: codeData.product_name
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in verify-chat-code:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', verified: false, masked_code: '' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
