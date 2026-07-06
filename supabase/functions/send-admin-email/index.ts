import { Resend } from "https://esm.sh/resend@4.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { checkRateLimit, getClientIp, rateLimitResponse, RATE_LIMITS } from '../_shared/rateLimit.ts';

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_RECIPIENTS = 500;

const LOG = (step: string, d?: unknown) => {
  const s = d ? ` - ${JSON.stringify(d)}` : '';
  console.log(`[SEND-ADMIN-EMAIL] ${step}${s}`);
};

function escapeHtml(text: string): string {
  const entities: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return text.replace(/[&<>"']/g, (c) => entities[c] || c);
}

function containsDangerousPatterns(text: string): boolean {
  return [/<script/gi, /javascript:/gi, /on\w+\s*=/gi, /<iframe/gi, /<object/gi, /<embed/gi, /<form/gi].some(p => p.test(text));
}

// ─── Email wrapper (Eclipse branding) ───
function wrapInBranding(bodyHtml: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#0a0a0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellspacing="0" cellpadding="0" style="background-color:#0a0a0f;"><tr><td align="center" style="padding:40px 20px;">
<table width="520" cellspacing="0" cellpadding="0" style="max-width:520px;">
<tr><td style="padding-bottom:32px;"><span style="font-size:20px;font-weight:700;color:#ffffff;letter-spacing:2px;font-family:Georgia,serif;">ECLIPSE</span></td></tr>
<tr><td>${bodyHtml}</td></tr>
<tr><td style="border-top:1px solid #222;padding-top:24px;margin-top:32px;">
<p style="margin:0;font-size:11px;color:#404040;">Eclipse &middot; <a href="https://eclipserblx.com" style="color:#737373;text-decoration:none;">eclipserblx.com</a></p>
</td></tr></table></td></tr></table></body></html>`;
}

// ─── Template generators ───

function storeDeactivationHtml(storeName: string, ownerName: string, reason?: string): string {
  return wrapInBranding(`
    <h1 style="font-size:22px;font-weight:600;color:#ffffff;margin:0 0 20px 0;">Store deactivated</h1>
    <p style="margin:0 0 16px 0;font-size:15px;color:#a3a3a3;line-height:1.6;">Hi ${escapeHtml(ownerName)},</p>
    <p style="margin:0 0 16px 0;font-size:15px;color:#a3a3a3;line-height:1.6;">Your store <strong style="color:#e4e4e7;">${escapeHtml(storeName)}</strong> has been temporarily deactivated by our admin team.</p>
    ${reason ? `<p style="margin:0 0 4px 0;color:#737373;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Reason</p><p style="margin:0 0 20px 0;font-size:14px;color:#e4e4e7;line-height:1.5;padding-left:12px;border-left:2px solid #333;">${escapeHtml(reason)}</p>` : ''}
    <ul style="margin:0 0 20px 0;padding-left:20px;color:#a3a3a3;font-size:14px;line-height:1.8;">
      <li>Your products won't be visible to customers</li><li>No new purchases can be made</li>
      <li>Existing orders and earnings are safe</li><li>You can still access your seller dashboard</li>
    </ul>
    <a href="https://eclipserblx.com/contact" style="display:inline-block;background:#a855f7;color:#ffffff;text-decoration:none;padding:12px 28px;font-weight:600;font-size:14px;">Contact Support</a>
  `);
}

function storeReactivationHtml(storeName: string, ownerName: string): string {
  return wrapInBranding(`
    <h1 style="font-size:22px;font-weight:600;color:#ffffff;margin:0 0 20px 0;">Store reactivated</h1>
    <p style="margin:0 0 16px 0;font-size:15px;color:#a3a3a3;line-height:1.6;">Hi ${escapeHtml(ownerName)},</p>
    <p style="margin:0 0 16px 0;font-size:15px;color:#a3a3a3;line-height:1.6;">Your store <strong style="color:#e4e4e7;">${escapeHtml(storeName)}</strong> is back up and live on the marketplace.</p>
  `);
}

function massEmailHtml(subject: string, content: string): string {
  const sanitizedContent = content.split('\n').map((line: string) => `<p style="margin:0 0 14px 0;">${escapeHtml(line)}</p>`).join('');
  return wrapInBranding(`
    <h2 style="color:#ffffff;font-size:20px;margin:0 0 20px 0;font-weight:600;">${escapeHtml(subject)}</h2>
    <div style="color:#a3a3a3;font-size:15px;line-height:1.7;">${sanitizedContent}</div>
  `);
}

// ─── Handlers ───

async function handleStoreEmail(supabase: any, body: any, emailType: 'deactivation' | 'reactivation'): Promise<Response> {
  const { store_id, reason } = body;
  if (!store_id) throw new Error("store_id is required");

  const { data: store } = await supabase.from("stores").select("name, owner_id").eq("id", store_id).single();
  if (!store) throw new Error("Store not found");

  const { data: profile } = await supabase.from("profiles").select("email, display_name").eq("user_id", store.owner_id).single();
  if (!profile?.email) throw new Error("Store owner email not found");

  const ownerName = profile.display_name || "Seller";
  const html = emailType === 'deactivation'
    ? storeDeactivationHtml(store.name, ownerName, reason)
    : storeReactivationHtml(store.name, ownerName);

  const subject = emailType === 'deactivation'
    ? `Your store "${store.name}" has been deactivated`
    : `Your store "${store.name}" has been reactivated`;

  await resend.emails.send({ from: "Eclipse <noreply@eclipserblx.com>", to: [profile.email], subject, html });
  return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

async function handleMassEmail(supabase: any, body: any, userId: string): Promise<Response> {
  const { emails, subject, content } = body;

  if (!Array.isArray(emails) || emails.length === 0) throw new Error("No recipients provided");
  if (emails.length > MAX_RECIPIENTS) throw new Error(`Maximum ${MAX_RECIPIENTS} recipients allowed`);
  if (!subject || typeof subject !== 'string' || subject.length > 200) throw new Error("Invalid subject");
  if (!content || typeof content !== 'string' || content.length > 10000) throw new Error("Invalid content");
  if (containsDangerousPatterns(subject) || containsDangerousPatterns(content)) throw new Error("Content contains dangerous patterns");

  const validEmails = emails.filter((e: unknown): e is string => typeof e === 'string' && EMAIL_REGEX.test(e) && e.length <= 255);
  if (validEmails.length === 0) throw new Error("No valid email addresses");

  const htmlContent = massEmailHtml(subject, content);
  let sent = 0;
  const errors: string[] = [];

  for (let i = 0; i < validEmails.length; i += 50) {
    const batch = validEmails.slice(i, i + 50);
    const results = await Promise.allSettled(
      batch.map(email => resend.emails.send({ from: "Eclipse <noreply@eclipserblx.com>", to: [email], subject, html: htmlContent }))
    );
    results.forEach((r, idx) => { if (r.status === "fulfilled") sent++; else errors.push(`${batch[idx]}: failed`); });
    if (i + 50 < validEmails.length) await new Promise(r => setTimeout(r, 100));
  }

  await supabase.from("audit_logs").insert({ user_id: userId, action: "mass_email_sent", resource: "email_subscriptions", details: { total_recipients: validEmails.length, sent, failed: errors.length, subject } });

  return new Response(JSON.stringify({ success: true, sent, failed: errors.length, total: validEmails.length }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

async function handleCompensationEmail(supabase: any, body: any, userId: string): Promise<Response> {
  const { to, subject, html } = body;
  if (!to || !EMAIL_REGEX.test(to)) throw new Error("Invalid email");
  if (!subject || subject.length > 200) throw new Error("Invalid subject");
  if (!html || html.length > 50000) throw new Error("Invalid email body");

  const { error } = await resend.emails.send({ from: "Eclipse <noreply@eclipserblx.com>", to: [to], subject, html });
  if (error) throw new Error(JSON.stringify(error));

  await supabase.from("audit_logs").insert({ user_id: userId, action: "compensation_email_sent", resource: "emails", details: { to, subject } });
  return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

// ─── Main handler ───

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const clientIp = getClientIp(req);
    const rl = checkRateLimit({ ...RATE_LIMITS.AUTH, identifier: clientIp, action: 'send-admin-email' });
    if (!rl.allowed) return rateLimitResponse(rl, corsHeaders);

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

    // Auth required for ALL email types. Store emails may be called by internal
    // functions using the service role key; user-triggered types require admin.
    const authHeader = req.headers.get("Authorization");
    const body = await req.json();
    const emailType: string = body.email_type;

    if (!emailType) throw new Error("email_type is required");
    if (!authHeader) throw new Error("Unauthorized");
    const token = authHeader.replace("Bearer ", "");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const isServiceRole = token === serviceKey;

    LOG("Request", { emailType });

    // Store emails require service-role (internal callers only)
    if (emailType === 'store_deactivation' || emailType === 'store_reactivation') {
      if (!isServiceRole) throw new Error("Unauthorized");
      return await handleStoreEmail(supabase, body, emailType === 'store_deactivation' ? 'deactivation' : 'reactivation');
    }

    // All other types require auth + admin (service role allowed too)
    let user: { id: string } | null = null;
    if (!isServiceRole) {
      const { data: { user: u }, error: authError } = await supabase.auth.getUser(token);
      if (authError || !u) throw new Error("Unauthorized");
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", u.id);
      const isAdmin = roles?.some(r => ['admin', 'staff', 'moderator', 'head_moderator'].includes(r.role));
      if (!isAdmin) throw new Error("Forbidden: Staff access required");
      user = { id: u.id };
    } else {
      user = { id: 'service_role' };
    }

    switch (emailType) {
      case 'mass_email':
        return await handleMassEmail(supabase, body, user.id);
      case 'compensation':
        return await handleCompensationEmail(supabase, body, user.id);
      default:
        throw new Error(`Unknown email_type: ${emailType}`);
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    LOG("ERROR", { message: msg });
    return new Response(JSON.stringify({ error: msg }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 });
  }
});
