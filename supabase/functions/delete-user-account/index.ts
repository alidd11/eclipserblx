import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { checkRateLimit, getClientIp, rateLimitResponse, RATE_LIMITS } from '../_shared/rateLimit.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PRIMARY_ADMIN_EMAIL = (Deno.env.get('PRIMARY_ADMIN_EMAIL') || '').trim().toLowerCase();
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Rate limit - very strict for destructive operations
    const clientIp = getClientIp(req);
    const rl = checkRateLimit({ ...RATE_LIMITS.AUTH, identifier: clientIp, action: 'delete-user-account' });
    if (!rl.allowed) return rateLimitResponse(rl, corsHeaders);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const serviceClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    // Authenticate with service role for reliability
    const token = authHeader.replace('Bearer ', '');
    const { data: { user: requestingUser }, error: authError } = await serviceClient.auth.getUser(token);
    if (authError || !requestingUser) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if requesting user is the primary admin
    const { data: adminProfile } = await serviceClient
      .from('profiles')
      .select('email')
      .eq('user_id', requestingUser.id)
      .single();

    if (!PRIMARY_ADMIN_EMAIL || (adminProfile?.email || '').toLowerCase() !== PRIMARY_ADMIN_EMAIL) {
      console.error('Non-primary admin attempted account deletion:', requestingUser.id);
      return new Response(
        JSON.stringify({ error: 'Only the primary administrator can delete accounts' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get and validate the user ID to delete
    const { userId } = await req.json();
    if (!userId || typeof userId !== 'string' || !UUID_REGEX.test(userId)) {
      return new Response(
        JSON.stringify({ error: 'Invalid user ID format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prevent deleting the primary admin
    const { data: targetProfile } = await serviceClient
      .from('profiles')
      .select('email, display_name')
      .eq('user_id', userId)
      .single();

    if (!targetProfile) {
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (PRIMARY_ADMIN_EMAIL && (targetProfile.email || '').toLowerCase() === PRIMARY_ADMIN_EMAIL) {
      return new Response(
        JSON.stringify({ error: 'Cannot delete the primary administrator account' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prevent deleting own account through this endpoint
    if (userId === requestingUser.id) {
      return new Response(
        JSON.stringify({ error: 'Cannot delete your own account through this endpoint' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Primary admin deleting user account: ${userId}`);

    // Delete the user from auth.users (cascades to profiles)
    const { error: deleteError } = await serviceClient.auth.admin.deleteUser(userId);

    if (deleteError) {
      console.error('Error deleting user:', deleteError);
      return new Response(
        JSON.stringify({ error: 'Failed to delete account' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Audit log
    await serviceClient.from('audit_logs').insert({
      user_id: requestingUser.id,
      action: 'account_deleted',
      resource: 'users',
      details: { 
        deleted_user_id: userId, 
        deleted_user_name: targetProfile.display_name,
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
