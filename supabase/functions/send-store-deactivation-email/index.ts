import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DeactivationEmailRequest {
  store_id: string;
  reason?: string;
}

function logStep(step: string, details?: Record<string, unknown>) {
  console.log(`[STORE-DEACTIVATION-EMAIL] ${step}`, details ? JSON.stringify(details) : '');
}

function generateEmailHtml(storeName: string, ownerName: string, reason?: string): string {
  return `
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
              <h1 style="font-size: 22px; font-weight: 600; color: #ffffff; margin: 0 0 20px 0;">Store deactivated</h1>
              <p style="margin: 0 0 16px 0; font-size: 15px; color: #a3a3a3; line-height: 1.6;">
                Hi ${ownerName},
              </p>
              <p style="margin: 0 0 16px 0; font-size: 15px; color: #a3a3a3; line-height: 1.6;">
                Your store <strong style="color: #e4e4e7;">${storeName}</strong> has been temporarily deactivated by our admin team.
              </p>
              ${reason ? `
              <p style="margin: 0 0 4px 0; color: #737373; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Reason</p>
              <p style="margin: 0 0 20px 0; font-size: 14px; color: #e4e4e7; line-height: 1.5; padding-left: 12px; border-left: 2px solid #333;">${reason}</p>
              ` : ''}
              <p style="margin: 0 0 12px 0; font-size: 15px; color: #a3a3a3; line-height: 1.6;">
                While deactivated:
              </p>
              <ul style="margin: 0 0 20px 0; padding-left: 20px; color: #a3a3a3; font-size: 14px; line-height: 1.8;">
                <li>Your products won't be visible to customers</li>
                <li>No new purchases can be made</li>
                <li>Existing orders and earnings are safe</li>
                <li>You can still access your seller dashboard</li>
              </ul>
              <p style="margin: 0 0 20px 0; font-size: 15px; color: #a3a3a3; line-height: 1.6;">
                If you think this was a mistake or want to discuss reactivation, get in touch with our support team.
              </p>
              <a href="https://eclipserblx.com/contact" style="display: inline-block; background: #a855f7; color: #ffffff; text-decoration: none; padding: 12px 28px; font-weight: 600; font-size: 14px;">
                Contact Support
              </a>
            </td>
          </tr>
          <tr>
            <td style="border-top: 1px solid #222; padding-top: 24px; margin-top: 32px;">
              <p style="margin: 0; font-size: 11px; color: #404040;">Eclipse &middot; <a href="https://eclipserblx.com" style="color: #737373; text-decoration: none;">eclipserblx.com</a></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { store_id, reason }: DeactivationEmailRequest = await req.json();
    logStep("Processing deactivation email request", { store_id });

    if (!store_id) {
      throw new Error("store_id is required");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: store, error: storeError } = await supabase
      .from("stores")
      .select("name, owner_id")
      .eq("id", store_id)
      .single();

    if (storeError || !store) {
      logStep("Store not found", { error: storeError });
      throw new Error("Store not found");
    }

    const { data: ownerProfile, error: profileError } = await supabase
      .from("profiles")
      .select("email, display_name")
      .eq("user_id", store.owner_id)
      .single();

    if (profileError || !ownerProfile?.email) {
      logStep("Owner email not found", { error: profileError });
      throw new Error("Store owner email not found");
    }

    const ownerName = ownerProfile.display_name || "Seller";
    const ownerEmail = ownerProfile.email;
    const storeName = store.name;

    logStep("Sending deactivation email", { ownerEmail, storeName });

    const emailHtml = generateEmailHtml(storeName, ownerName, reason);

    const emailResponse = await resend.emails.send({
      from: "Eclipse <noreply@eclipserblx.com>",
      to: [ownerEmail],
      subject: `Your store "${storeName}" has been deactivated`,
      html: emailHtml,
    });

    logStep("Email sent successfully", { emailResponse });

    return new Response(
      JSON.stringify({ success: true, message: "Deactivation email sent" }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    logStep("Error sending deactivation email", { error: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);