import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PRIMARY_ADMIN_EMAIL = 'alicanimir1@gmail.com';

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create client with user's token to verify identity
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify the requesting user
    const { data: { user: requestingUser }, error: authError } = await userClient.auth.getUser();
    if (authError || !requestingUser) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if requesting user is the primary admin
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);
    
    const { data: adminProfile } = await serviceClient
      .from('profiles')
      .select('email')
      .eq('user_id', requestingUser.id)
      .single();

    if (adminProfile?.email !== PRIMARY_ADMIN_EMAIL) {
      console.error('Non-primary admin attempted account deletion:', adminProfile?.email);
      return new Response(
        JSON.stringify({ error: 'Only the primary administrator can delete accounts' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the user ID to delete from request body
    const { userId } = await req.json();
    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'User ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prevent deleting the primary admin
    const { data: targetProfile } = await serviceClient
      .from('profiles')
      .select('email, display_name')
      .eq('user_id', userId)
      .single();

    if (targetProfile?.email === PRIMARY_ADMIN_EMAIL) {
      return new Response(
        JSON.stringify({ error: 'Cannot delete the primary administrator account' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Primary admin deleting user account: ${userId} (${targetProfile?.display_name || targetProfile?.email})`);

    // Delete the user from auth.users (this will cascade to profiles due to trigger/FK)
    const { error: deleteError } = await serviceClient.auth.admin.deleteUser(userId);

    if (deleteError) {
      console.error('Error deleting user:', deleteError);
      return new Response(
        JSON.stringify({ error: deleteError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log the action
    await serviceClient.from('audit_logs').insert({
      user_id: requestingUser.id,
      action: 'account_deleted',
      resource: 'users',
      details: { 
        deleted_user_id: userId, 
        deleted_user_email: targetProfile?.email,
        deleted_user_name: targetProfile?.display_name
      }
    });

    console.log(`Successfully deleted user account: ${userId}`);

    return new Response(
      JSON.stringify({ success: true, message: 'Account deleted successfully' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});