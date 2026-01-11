import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit, getClientIp, rateLimitResponse, RATE_LIMITS } from '../_shared/rateLimit.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ContactMessagePayload {
  name: string;
  email: string;
  subject: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Rate limit check - prevent abuse of notification system
    const clientIp = getClientIp(req);
    const rateLimitResult = checkRateLimit({
      ...RATE_LIMITS.WRITE,
      identifier: clientIp,
      action: 'notify-contact',
    });

    if (!rateLimitResult.allowed) {
      console.log(`Rate limit exceeded for notify-contact: ${clientIp}`);
      return rateLimitResponse(rateLimitResult, corsHeaders);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { name, email, subject }: ContactMessagePayload = await req.json();

    console.log(`New contact message from ${name} (${email}): ${subject}`);

    // Get all staff user IDs
    const { data: staffRoles, error: staffError } = await supabase
      .from('user_roles')
      .select('user_id');

    if (staffError) {
      console.error('Error fetching staff:', staffError);
      throw staffError;
    }

    if (!staffRoles || staffRoles.length === 0) {
      console.log('No staff members found');
      return new Response(
        JSON.stringify({ success: true, message: 'No staff to notify' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const staffIds = [...new Set(staffRoles.map(r => r.user_id))];
    console.log(`Notifying ${staffIds.length} staff members`);

    // Create in-app notifications for all staff
    const notifications = staffIds.map(userId => ({
      user_id: userId,
      title: 'New Contact Message',
      message: `${name} sent a message: "${subject}"`,
      type: 'contact',
      link: '/admin/contact-messages',
    }));

    const { error: notifError } = await supabase
      .from('notifications')
      .insert(notifications);

    if (notifError) {
      console.error('Error creating notifications:', notifError);
    }

    // Send push notifications to all staff
    const pushPayload = {
      title: '📬 New Contact Message',
      body: `${name}: ${subject}`,
      tag: `contact-message-${Date.now()}`,
      url: '/admin/contact-messages',
      requireInteraction: true,
    };

    const pushResponse = await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({
        user_ids: staffIds,
        payload: pushPayload,
      }),
    });

    const pushResult = await pushResponse.json();
    console.log('Push notification result:', pushResult);

    return new Response(
      JSON.stringify({ success: true, notified: staffIds.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in notify-new-contact-message:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
