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
      <title>Your Store Has Been Reactivated</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f5;">
      <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
          <td align="center" style="padding: 40px 20px;">
            <table role="presentation" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
              <tr>
                <td style="padding: 40px 40px 20px 40px; text-align: center;">
                  <div style="width: 60px; height: 60px; background: linear-gradient(135deg, #22c55e, #16a34a); border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
                    <span style="font-size: 28px;">✓</span>
                  </div>
                  <h1 style="margin: 0 0 10px 0; font-size: 24px; color: #18181b; font-weight: 600;">
                    Your Store Has Been Reactivated
                  </h1>
                </td>
              </tr>
              <tr>
                <td style="padding: 0 40px 30px 40px;">
                  <p style="margin: 0 0 15px 0; font-size: 16px; color: #3f3f46; line-height: 1.6;">
                    Hi ${ownerName},
                  </p>
                  <p style="margin: 0 0 15px 0; font-size: 16px; color: #3f3f46; line-height: 1.6;">
                    Great news! Your store <strong style="color: #18181b;">${storeName}</strong> has been reactivated and is now live on our marketplace.
                  </p>
                  <p style="margin: 0 0 15px 0; font-size: 16px; color: #3f3f46; line-height: 1.6;">
                    Your products are now visible to customers and you can resume selling immediately.
                  </p>
                  <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 15px; margin: 20px 0;">
                    <p style="margin: 0; font-size: 14px; color: #166534;">
                      <strong>What's next?</strong><br>
                      Check your store dashboard to ensure all your products and settings are up to date.
                    </p>
                  </div>
                </td>
              </tr>
              <tr>
                <td style="padding: 20px 40px 40px 40px; border-top: 1px solid #e4e4e7;">
                  <p style="margin: 0; font-size: 14px; color: #71717a; text-align: center;">
                    If you have any questions, please contact our support team.
                  </p>
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

    // Fetch store details
    const { data: store, error: storeError } = await supabase
      .from("stores")
      .select("name, owner_id")
      .eq("id", store_id)
      .single();

    if (storeError || !store) {
      throw new Error(`Failed to fetch store: ${storeError?.message || "Store not found"}`);
    }

    logStep("Fetched store details", { storeName: store.name, ownerId: store.owner_id });

    // Fetch owner profile
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

    // Send the email
    const emailHtml = generateEmailHtml(store.name, ownerName);

    const emailResponse = await resend.emails.send({
      from: "Eclipse <noreply@eclipserblx.com>",
      to: [ownerEmail],
      subject: `Your Store "${store.name}" Has Been Reactivated`,
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
