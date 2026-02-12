import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ReactivationEmailRequest {
  store_id: string;
}

function logStep(step: string, details?: Record<string, unknown>) {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STORE-REACTIVATION-EMAIL] ${step}${detailsStr}`);
}

function generateEmailHtml(storeName: string, ownerName: string): string {
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
              <h1 style="font-size: 22px; font-weight: 600; color: #ffffff; margin: 0 0 20px 0;">Store reactivated</h1>
              <p style="margin: 0 0 16px 0; font-size: 15px; color: #a3a3a3; line-height: 1.6;">
                Hi ${ownerName},
              </p>
              <p style="margin: 0 0 16px 0; font-size: 15px; color: #a3a3a3; line-height: 1.6;">
                Your store <strong style="color: #e4e4e7;">${storeName}</strong> is back up and live on the marketplace. Your products are visible again and you can resume selling straight away.
              </p>
              <p style="margin: 0 0 24px 0; font-size: 14px; color: #737373; line-height: 1.6;">
                You might want to check your store dashboard to make sure your products and settings are up to date.
              </p>
            </td>
          </tr>
          <tr>
            <td style="border-top: 1px solid #222; padding-top: 24px;">
              <p style="margin: 0 0 8px 0; font-size: 13px; color: #525252;">Questions? Get in touch with our support team.</p>
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
    const { store_id }: ReactivationEmailRequest = await req.json();
    logStep("Processing reactivation email request", { store_id });

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
      throw new Error(`Failed to fetch store: ${storeError?.message || "Store not found"}`);
    }

    logStep("Fetched store details", { storeName: store.name, ownerId: store.owner_id });

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("email, display_name")
      .eq("user_id", store.owner_id)
      .single();

    if (profileError || !profile) {
      throw new Error(`Failed to fetch owner profile: ${profileError?.message || "Profile not found"}`);
    }

    const ownerEmail = profile.email;
    const ownerName = profile.display_name || "Store Owner";

    logStep("Fetched owner profile", { ownerEmail, ownerName });

    if (!ownerEmail) {
      throw new Error("Owner email not found");
    }

    const emailHtml = generateEmailHtml(store.name, ownerName);

    const emailResponse = await resend.emails.send({
      from: "Eclipse <noreply@eclipserblx.com>",
      to: [ownerEmail],
      subject: `Your store "${store.name}" has been reactivated`,
      html: emailHtml,
    });

    logStep("Email sent successfully", { emailResponse });

    return new Response(JSON.stringify({ success: true, emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    logStep("Error sending reactivation email", { error: error.message });
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);