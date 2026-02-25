import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { Resend } from "https://esm.sh/resend@4.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SEND-IP-EMAIL] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY not configured");

    const resend = new Resend(RESEND_API_KEY);

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    ).auth.getUser(token);

    if (authError || !user) throw new Error("Not authenticated");

    const body = await req.json();
    const { action } = body;

    if (action === 'send') {
      return await handleSendEmail(body, user, supabaseClient, resend);
    } else if (action === 'reply') {
      return await handleReplyEmail(body, user, supabaseClient, resend);
    } else if (action === 'create_thread') {
      return await handleCreateThread(body, user, supabaseClient);
    } else if (action === 'update_thread_status') {
      return await handleUpdateThreadStatus(body, user, supabaseClient);
    }

    throw new Error("Invalid action. Use: send, reply, create_thread, update_thread_status");
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// ─── CREATE THREAD ───

async function handleCreateThread(body: any, user: any, supabaseClient: any) {
  const { subject, thread_type, recipient_email, recipient_name, takedown_id, complaint_id, registry_id, creator_id } = body;

  if (!subject || !recipient_email) {
    throw new Error("subject and recipient_email are required");
  }

  const { data: thread, error } = await supabaseClient
    .from('ip_email_threads')
    .insert({
      creator_id: creator_id || user.id,
      subject,
      thread_type: thread_type || 'general',
      recipient_email,
      recipient_name: recipient_name || null,
      takedown_id: takedown_id || null,
      complaint_id: complaint_id || null,
      registry_id: registry_id || null,
    })
    .select()
    .single();

  if (error) {
    logStep("Thread creation error", { error });
    throw new Error("Failed to create email thread");
  }

  logStep("Thread created", { id: thread.id, subject });

  return new Response(
    JSON.stringify({ success: true, thread }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

// ─── SEND NEW EMAIL (creates message in thread) ───

async function handleSendEmail(body: any, user: any, supabaseClient: any, resend: any) {
  const { thread_id, subject, body_html, body_text, recipient_email, recipient_name, sender_name } = body;

  if (!thread_id || !body_html || !recipient_email) {
    throw new Error("thread_id, body_html, and recipient_email are required");
  }

  // Get sender profile
  const { data: profile } = await supabaseClient
    .from('profiles')
    .select('display_name, email, username')
    .eq('user_id', user.id)
    .single();

  const senderEmail = 'legal@eclipserblx.com';
  const senderDisplayName = sender_name || profile?.display_name || 'Eclipse IP Shield';

  // Send via Resend
  const emailSubject = subject || `IP Shield Correspondence`;

  logStep("Sending email", { to: recipient_email, subject: emailSubject });

  const { data: emailResult, error: emailError } = await resend.emails.send({
    from: `Eclipse IP Shield <${senderEmail}>`,
    to: [recipient_email],
    replyTo: senderEmail,
    subject: emailSubject,
    html: wrapEmailHtml(body_html),
    text: body_text || undefined,
  });

  if (emailError) {
    logStep("Email send error", { error: emailError });

    // Save as failed message
    await supabaseClient.from('ip_email_messages').insert({
      thread_id,
      sender_id: user.id,
      sender_email: senderEmail,
      sender_name: senderDisplayName,
      recipient_email,
      recipient_name: recipient_name || null,
      direction: 'outbound',
      subject: emailSubject,
      body_html,
      body_text: body_text || null,
      status: 'failed',
      error_message: JSON.stringify(emailError),
    });

    throw new Error("Failed to send email");
  }

  // Save as sent message
  const { data: message, error: dbError } = await supabaseClient
    .from('ip_email_messages')
    .insert({
      thread_id,
      sender_id: user.id,
      sender_email: senderEmail,
      sender_name: senderDisplayName,
      recipient_email,
      recipient_name: recipient_name || null,
      direction: 'outbound',
      subject: emailSubject,
      body_html,
      body_text: body_text || null,
      status: 'sent',
      resend_message_id: emailResult?.id || null,
      sent_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (dbError) logStep("DB save error", { error: dbError });

  logStep("Email sent successfully", { resend_id: emailResult?.id });

  return new Response(
    JSON.stringify({ success: true, message, resend_id: emailResult?.id }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

// ─── REPLY TO THREAD ───

async function handleReplyEmail(body: any, user: any, supabaseClient: any, resend: any) {
  // Reply is essentially the same as send, but we fetch thread context
  const { thread_id, body_html, body_text } = body;

  if (!thread_id || !body_html) {
    throw new Error("thread_id and body_html are required");
  }

  // Get thread details
  const { data: thread, error: threadError } = await supabaseClient
    .from('ip_email_threads')
    .select('*')
    .eq('id', thread_id)
    .single();

  if (threadError || !thread) throw new Error("Thread not found");

  // Use the thread's recipient and subject
  return await handleSendEmail({
    thread_id,
    subject: `Re: ${thread.subject}`,
    body_html,
    body_text,
    recipient_email: thread.recipient_email,
    recipient_name: thread.recipient_name,
  }, user, supabaseClient, resend);
}

// ─── UPDATE THREAD STATUS ───

async function handleUpdateThreadStatus(body: any, _user: any, supabaseClient: any) {
  const { thread_id, status } = body;

  if (!thread_id || !status) throw new Error("thread_id and status are required");

  const validStatuses = ['open', 'closed', 'archived'];
  if (!validStatuses.includes(status)) {
    throw new Error(`Invalid status. Use: ${validStatuses.join(', ')}`);
  }

  const { error } = await supabaseClient
    .from('ip_email_threads')
    .update({ status })
    .eq('id', thread_id);

  if (error) throw new Error("Failed to update thread status");

  logStep("Thread status updated", { thread_id, status });

  return new Response(
    JSON.stringify({ success: true }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

// ─── EMAIL HTML WRAPPER ───

function wrapEmailHtml(innerHtml: string): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; color: #1a1a2e;">
      ${innerHtml}
      <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 24px 0 16px;" />
      <p style="color: #999; font-size: 11px; line-height: 1.4;">
        This email was sent via Eclipse IP Shield — Digital rights protection for creators.<br/>
        If you received this in error, please contact legal@eclipserblx.com.
      </p>
    </div>
  `;
}
