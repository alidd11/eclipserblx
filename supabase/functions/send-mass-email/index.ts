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

    // Format the content as HTML with Eclipse branding
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
          <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <!-- Header -->
            <div style="text-align: center; margin-bottom: 32px;">
              <h1 style="color: #a855f7; font-size: 28px; font-weight: bold; margin: 0;">Eclipse</h1>
              <p style="color: #71717a; font-size: 14px; margin: 8px 0 0 0;">Premium Roblox Assets</p>
            </div>
            
            <!-- Content -->
            <div style="background-color: #18181b; border-radius: 12px; padding: 32px; border: 1px solid #27272a;">
              <h2 style="color: #fafafa; font-size: 20px; margin: 0 0 16px 0;">${subject}</h2>
              <div style="color: #a1a1aa; font-size: 16px; line-height: 1.6;">
                ${content.split('\n').map(line => `<p style="margin: 0 0 12px 0;">${line}</p>`).join('')}
              </div>
            </div>
            
            <!-- Footer -->
            <div style="text-align: center; margin-top: 32px; padding-top: 24px; border-top: 1px solid #27272a;">
              <p style="color: #71717a; font-size: 12px; margin: 0 0 8px 0;">
                You're receiving this because you subscribed to Eclipse emails.
              </p>
              <p style="color: #71717a; font-size: 12px; margin: 0;">
                <a href="https://eclipserblx.com/account" style="color: #a855f7; text-decoration: underline;">Manage preferences</a>
              </p>
              <p style="color: #52525b; font-size: 11px; margin: 16px 0 0 0;">
                © ${new Date().getFullYear()} Eclipse. All rights reserved.
              </p>
            </div>
          </div>
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
