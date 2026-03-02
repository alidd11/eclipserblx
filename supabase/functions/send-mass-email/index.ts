import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { checkRateLimit, getClientIp, rateLimitResponse, RATE_LIMITS } from "../_shared/rateLimit.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_RECIPIENTS = 500;

function escapeHtml(text: string): string {
  const htmlEntities: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  return text.replace(/[&<>"']/g, (char) => htmlEntities[char] || char);
}

function containsDangerousPatterns(text: string): boolean {
  const dangerousPatterns = [
    /<script[^>]*>.*?<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<iframe/gi,
    /<object/gi,
    /<embed/gi,
    /<form/gi,
    /data:/gi,
  ];
  return dangerousPatterns.some(pattern => pattern.test(text));
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const clientIp = getClientIp(req);
  const rateLimitResult = checkRateLimit({
    ...RATE_LIMITS.AUTH,
    identifier: clientIp,
    action: 'send-mass-email',
  });

  if (!rateLimitResult.allowed) {
    console.log(`[send-mass-email] Rate limit exceeded for IP: ${clientIp}`);
    return rateLimitResponse(rateLimitResult, corsHeaders);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
    });

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Require admin role specifically
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    const isAdmin = roles?.some(r => r.role === "admin");
    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: "Forbidden: Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { emails, subject, content } = await req.json();

    // Validate emails array
    if (!Array.isArray(emails) || emails.length === 0) {
      return new Response(
        JSON.stringify({ error: "No recipients provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (emails.length > MAX_RECIPIENTS) {
      return new Response(
        JSON.stringify({ error: `Maximum ${MAX_RECIPIENTS} recipients allowed` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate each email
    const validEmails = emails.filter((e: unknown): e is string => 
      typeof e === 'string' && EMAIL_REGEX.test(e) && e.length <= 255
    );
    if (validEmails.length === 0) {
      return new Response(
        JSON.stringify({ error: "No valid email addresses provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!subject || typeof subject !== 'string' || subject.length > 200) {
      return new Response(
        JSON.stringify({ error: "Subject is required and must be under 200 characters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!content || typeof content !== 'string' || content.length > 10000) {
      return new Response(
        JSON.stringify({ error: "Content is required and must be under 10000 characters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (containsDangerousPatterns(subject) || containsDangerousPatterns(content)) {
      console.warn(`[send-mass-email] Dangerous patterns detected from admin ${user.id}`);
      return new Response(
        JSON.stringify({ error: "Content contains potentially dangerous code patterns" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const sanitizedSubject = escapeHtml(subject);
    const sanitizedContent = content
      .split('\n')
      .map((line: string) => `<p style="margin: 0 0 14px 0;">${escapeHtml(line)}</p>`)
      .join('');

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0f; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellspacing="0" cellpadding="0" style="background-color: #0a0a0f;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table width="520" cellspacing="0" cellpadding="0" style="max-width: 520px;">
          <tr>
            <td style="padding-bottom: 32px;">
              <span style="font-size: 20px; font-weight: 700; color: #ffffff; letter-spacing: 2px; font-family: Georgia, serif;">ECLIPSE</span>
            </td>
          </tr>
          <tr>
            <td>
              <h2 style="color: #ffffff; font-size: 20px; margin: 0 0 20px 0; font-weight: 600;">${sanitizedSubject}</h2>
              <div style="color: #a3a3a3; font-size: 15px; line-height: 1.7;">
                ${sanitizedContent}
              </div>
            </td>
          </tr>
          <tr>
            <td style="border-top: 1px solid #222; padding-top: 24px; margin-top: 32px;">
              <p style="font-size: 13px; color: #525252; margin: 0 0 8px 0;">
                You're receiving this because you subscribed to Eclipse emails.
              </p>
              <p style="font-size: 11px; color: #404040; margin: 0;">
                <a href="https://eclipserblx.com" style="color: #737373; text-decoration: none;">Website</a> &middot;
                <a href="https://eclipserblx.com/account" style="color: #737373; text-decoration: none;">Preferences</a> &middot;
                <a href="https://eclipserblx.com/privacy-policy" style="color: #737373; text-decoration: none;">Privacy</a>
              </p>
              <p style="font-size: 11px; color: #404040; margin: 12px 0 0 0;">&copy; ${new Date().getFullYear()} Eclipse</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    const batchSize = 50;
    let sent = 0;
    const errors: string[] = [];

    for (let i = 0; i < validEmails.length; i += batchSize) {
      const batch = validEmails.slice(i, i + batchSize);
      
      const results = await Promise.allSettled(
        batch.map(email =>
          resend.emails.send({
            from: "Eclipse <noreply@eclipserblx.com>",
            to: [email],
            subject: subject,
            html: htmlContent,
          })
        )
      );

      results.forEach((result, idx) => {
        if (result.status === "fulfilled") {
          sent++;
        } else {
          errors.push(`${batch[idx]}: send failed`);
          console.error(`Failed to send to ${batch[idx]}`);
        }
      });

      if (i + batchSize < validEmails.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // Audit log
    await supabase.from("audit_logs").insert({
      user_id: user.id,
      action: "mass_email_sent",
      resource: "email_subscriptions",
      details: {
        total_recipients: validEmails.length,
        sent,
        failed: errors.length,
        subject,
      },
    });

    console.log(`Mass email sent: ${sent}/${validEmails.length} successful`);

    return new Response(
      JSON.stringify({
        success: true,
        sent,
        failed: errors.length,
        total: validEmails.length,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in send-mass-email:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
