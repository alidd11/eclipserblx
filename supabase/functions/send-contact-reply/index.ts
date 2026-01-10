import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ReplyRequest {
  messageId: string;
  recipientEmail: string;
  recipientName: string;
  originalSubject: string;
  replyContent: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    // Verify user is staff
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    // Check if user has staff role
    const { data: roles, error: rolesError } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    if (rolesError || !roles || roles.length === 0) {
      throw new Error("Unauthorized - not a staff member");
    }

    const { messageId, recipientEmail, recipientName, originalSubject, replyContent }: ReplyRequest = await req.json();

    if (!messageId || !recipientEmail || !replyContent) {
      throw new Error("Missing required fields");
    }

    console.log(`Sending reply to ${recipientEmail} for message ${messageId}`);

    // Send the email
    const emailResponse = await resend.emails.send({
      from: "Eclipse Support <support@eclipserblx.com>",
      to: [recipientEmail],
      subject: `Re: ${originalSubject}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a; padding: 40px 20px;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #141414; border-radius: 12px; overflow: hidden; border: 1px solid #262626;">
                  <!-- Header -->
                  <tr>
                    <td style="background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); padding: 32px; text-align: center;">
                      <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">Eclipse Support</h1>
                    </td>
                  </tr>
                  
                  <!-- Content -->
                  <tr>
                    <td style="padding: 32px;">
                      <p style="color: #a1a1aa; font-size: 14px; margin: 0 0 8px 0;">Hello ${recipientName || 'there'},</p>
                      <p style="color: #a1a1aa; font-size: 14px; margin: 0 0 24px 0;">Thank you for contacting us. Here is our response to your inquiry:</p>
                      
                      <div style="background-color: #1a1a1a; border-radius: 8px; padding: 20px; border-left: 4px solid #7c3aed;">
                        <p style="color: #e4e4e7; font-size: 15px; line-height: 1.6; margin: 0; white-space: pre-wrap;">${replyContent}</p>
                      </div>
                      
                      <p style="color: #a1a1aa; font-size: 14px; margin: 24px 0 0 0;">If you have any further questions, feel free to reply to this email or visit our support page.</p>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #0f0f0f; padding: 24px 32px; border-top: 1px solid #262626;">
                      <p style="color: #71717a; font-size: 12px; margin: 0; text-align: center;">
                        Eclipse - Premium Digital Products<br>
                        <a href="https://eclipserblx.com" style="color: #7c3aed; text-decoration: none;">eclipserblx.com</a>
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    // Update the message status in the database using service role
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { error: updateError } = await supabaseAdmin
      .from("contact_messages")
      .update({
        status: "responded",
        responded_at: new Date().toISOString(),
        responded_by: user.id,
      })
      .eq("id", messageId);

    if (updateError) {
      console.error("Failed to update message status:", updateError);
    }

    return new Response(JSON.stringify({ success: true, data: emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-contact-reply function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: error.message.includes("Unauthorized") ? 401 : 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);