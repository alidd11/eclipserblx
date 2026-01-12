import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VerifyCodeRequest {
  code: string;
  conversationId: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Create service client for database operations
    const supabaseService = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get the user from the auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized', verified: false, masked_code: '' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create user client to get the authenticated user
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      console.error('Auth error:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized', verified: false, masked_code: '' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const { code, conversationId }: VerifyCodeRequest = await req.json();

    if (!code || !conversationId) {
      return new Response(
        JSON.stringify({ error: 'Missing code or conversationId', verified: false, masked_code: '' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Verifying code for user ${user.id} in conversation ${conversationId}`);

    // Mask the code for display (BOT-XXXX-XXXX-XXXX -> BOT-****-****-****)
    const maskCode = (code: string): string => {
      const parts = code.split('-');
      if (parts.length === 4 && parts[0] === 'BOT') {
        return `BOT-****-****-${parts[3].slice(-2)}**`;
      }
      // Fallback: show first 4 and last 2 chars
      if (code.length > 6) {
        return code.slice(0, 4) + '*'.repeat(code.length - 6) + code.slice(-2);
      }
      return '*'.repeat(code.length);
    };

    const maskedCode = maskCode(code.toUpperCase());

    // Look up the code in the database
    // The code must belong to the authenticated user
    const { data: codeData, error: codeError } = await supabaseService
      .from('bot_installation_codes')
      .select('id, installation_code, product_name, user_id, is_used, status')
      .eq('installation_code', code.toUpperCase())
      .eq('user_id', user.id)
      .single();

    if (codeError || !codeData) {
      console.log('Code not found or does not belong to user:', codeError?.message);
      
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

    console.log('Code verified successfully:', codeData.id);

    // Insert a verification message in the chat
    const { error: insertError } = await supabaseService.from('chat_messages').insert({
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

    if (insertError) {
      console.error('Error inserting verification message:', insertError);
    }

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
