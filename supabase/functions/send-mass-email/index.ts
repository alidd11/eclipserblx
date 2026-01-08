import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface MassEmailRequest {
  emails: string[];
  subject: string;
  content: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify the user is an admin
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

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

    // Check if user is admin
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

    const { emails, subject, content }: MassEmailRequest = await req.json();

    if (!emails || emails.length === 0) {
      return new Response(
        JSON.stringify({ error: "No recipients provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!subject || !content) {
      return new Response(
        JSON.stringify({ error: "Subject and content are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Format the content as HTML with Eclipse Purple & Obsidian branding
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0f; font-family: 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0a0a0f;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="520" cellspacing="0" cellpadding="0" style="max-width: 520px; background: linear-gradient(180deg, #151518 0%, #0d0d10 100%); border: 1px solid rgba(168, 85, 247, 0.2); border-radius: 16px; overflow: hidden;">
          
          <!-- Header with gradient accent -->
          <tr>
            <td style="background: linear-gradient(135deg, rgba(168, 85, 247, 0.15) 0%, rgba(168, 85, 247, 0.05) 50%, transparent 100%); padding: 32px 40px 24px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center">
                    <table role="presentation" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="background: linear-gradient(135deg, #a855f7 0%, #9333ea 100%); width: 44px; height: 44px; border-radius: 10px; text-align: center; vertical-align: middle;">
                          <span style="font-size: 22px; font-weight: 800; color: #ffffff; font-family: Georgia, serif;">E</span>
                        </td>
                        <td style="padding-left: 12px;">
                          <span style="font-size: 24px; font-weight: 700; color: #ffffff; letter-spacing: 2px; font-family: Georgia, serif;">ECLIPSE</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 32px 40px;">
              <h2 style="color: #ffffff; font-size: 22px; margin: 0 0 20px 0; font-weight: 600; font-family: Georgia, serif;">${subject}</h2>
              <div style="color: #a3a3a3; font-size: 15px; line-height: 1.7;">
                ${content.split('\n').map(line => `<p style="margin: 0 0 16px 0;">${line}</p>`).join('')}
              </div>
            </td>
          </tr>
          
          <!-- Divider -->
          <tr>
            <td style="padding: 0 40px;">
              <hr style="border: none; border-top: 1px solid rgba(168, 85, 247, 0.15); margin: 0;">
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td align="center" style="padding: 24px 40px 32px;">
              <p style="font-size: 13px; color: #525252; margin: 0 0 16px 0;">
                You're receiving this because you subscribed to Eclipse emails.
              </p>
              <table role="presentation" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="padding-right: 20px;">
                    <a href="https://eclipserblx.com" style="font-size: 12px; color: #a855f7; text-decoration: none;">Website</a>
                  </td>
                  <td style="border-left: 1px solid #333; padding-left: 20px; padding-right: 20px;">
                    <a href="https://eclipserblx.com/account" style="font-size: 12px; color: #a855f7; text-decoration: none;">Preferences</a>
                  </td>
                  <td style="border-left: 1px solid #333; padding-left: 20px;">
                    <a href="https://eclipserblx.com/privacy-policy" style="font-size: 12px; color: #a855f7; text-decoration: none;">Privacy</a>
                  </td>
                </tr>
              </table>
              <p style="font-size: 11px; color: #404040; margin: 20px 0 0 0;">© ${new Date().getFullYear()} Eclipse. Premium Roblox assets for UK roleplay.</p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    // Send emails in batches of 50 to avoid rate limits
    const batchSize = 50;
    let sent = 0;
    const errors: string[] = [];

    for (let i = 0; i < emails.length; i += batchSize) {
      const batch = emails.slice(i, i + batchSize);
      
      // Send individually for better tracking
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
          errors.push(`${batch[idx]}: ${result.reason}`);
          console.error(`Failed to send to ${batch[idx]}:`, result.reason);
        }
      });

      // Small delay between batches
      if (i + batchSize < emails.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // Log the mass email send as audit
    await supabase.from("audit_logs").insert({
      user_id: user.id,
      action: "mass_email_sent",
      resource: "email_subscriptions",
      details: {
        total_recipients: emails.length,
        sent: sent,
        failed: errors.length,
        subject: subject,
      },
    });

    console.log(`Mass email sent: ${sent}/${emails.length} successful`);

    return new Response(
      JSON.stringify({
        success: true,
        sent,
        failed: errors.length,
        total: emails.length,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in send-mass-email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
};

serve(handler);
