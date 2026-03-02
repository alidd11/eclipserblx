import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit, getClientIp, rateLimitResponse, RATE_LIMITS } from '../_shared/rateLimit.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Rate limit - strict for contact forms
    const clientIp = getClientIp(req);
    const rl = checkRateLimit({ ...RATE_LIMITS.AUTH, identifier: clientIp, action: 'ip-shield-contact' });
    if (!rl.allowed) return rateLimitResponse(rl, corsHeaders);

    const authHeader = req.headers.get('Authorization');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user if authenticated
    let userId: string | null = null;
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id || null;
    }

    const { name, email, subject, message } = await req.json();

    if (!name || !email || !subject || !message) {
      return new Response(JSON.stringify({ error: 'All fields are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Input length validation
    if (typeof name !== 'string' || name.length > 100) throw new Error('Name must be under 100 characters');
    if (typeof email !== 'string' || email.length > 255) throw new Error('Invalid email');
    if (typeof subject !== 'string' || subject.length > 200) throw new Error('Subject must be under 200 characters');
    if (typeof message !== 'string' || message.length > 5000) throw new Error('Message must be under 5000 characters');

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) throw new Error('Invalid email format');

    // Save to database
    const { error: dbError } = await supabase
      .from('ip_shield_contact_messages')
      .insert({
        user_id: userId,
        name,
        email,
        subject,
        message,
        status: 'open',
        priority: 'normal',
      });

    if (dbError) {
      console.error('DB error:', dbError);
      return new Response(JSON.stringify({ error: 'Failed to save message' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Send email notification via Resend if key is available
    const resendKey = Deno.env.get('RESEND_API_KEY');
    if (resendKey) {
      try {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'IP Shield <noreply@eclipserblx.com>',
            to: ['legal@eclipserblx.com'],
            subject: `[IP Shield Contact] ${subject}`,
            html: `
              <h2>New IP Shield Contact Message</h2>
              <p><strong>From:</strong> ${escapeHtml(name)} (${escapeHtml(email)})</p>
              <p><strong>Subject:</strong> ${escapeHtml(subject)}</p>
              <hr />
              <p>${escapeHtml(message).replace(/\n/g, '<br />')}</p>
              <hr />
              <p><em>User ID: ${userId || 'Not logged in'}</em></p>
            `,
          }),
        });
      } catch (emailErr) {
        console.error('Email send failed (non-critical):', emailErr);
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
