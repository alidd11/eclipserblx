import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { productId, productName, storeOwnerId, flagReasons } = await req.json();

    if (!productId || !storeOwnerId) {
      return new Response(
        JSON.stringify({ error: "Missing productId or storeOwnerId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    await supabase
      .from("products")
      .update({ file_review_requested_at: new Date().toISOString() })
      .eq("id", productId);

    await supabase
      .from("seller_notifications")
      .insert({
        user_id: storeOwnerId,
        type: "file_review",
        title: "File review required",
        message: `Your product "${productName}" has been flagged by our security scan. Please consent to a file review so our team can check your submission.`,
        product_id: productId,
        action_url: "/seller",
      });

    if (resendApiKey) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("email, display_name")
        .eq("user_id", storeOwnerId)
        .single();

      if (profile?.email) {
        const reasonsList = flagReasons?.length
          ? flagReasons.map((r: string) => `<li>${r}</li>`).join("")
          : "<li>Automated security scan detected potential concerns</li>";

        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "Eclipse <noreply@eclipserblx.com>",
            to: [profile.email],
            subject: `Action required: File review for "${productName}"`,
            html: `
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
              <h1 style="font-size: 22px; font-weight: 600; color: #ffffff; margin: 0 0 20px 0;">File review required</h1>
              <p style="margin: 0 0 16px 0; font-size: 15px; color: #a3a3a3; line-height: 1.6;">
                Hi ${profile.display_name || "Seller"},
              </p>
              <p style="margin: 0 0 16px 0; font-size: 15px; color: #a3a3a3; line-height: 1.6;">
                Your product <strong style="color: #e4e4e7;">"${productName}"</strong> was flagged by our security scan and needs a review.
              </p>
              <p style="margin: 0 0 8px 0; font-size: 14px; color: #e4e4e7;">Flags detected:</p>
              <ul style="margin: 0 0 20px 0; padding-left: 20px; color: #a3a3a3; font-size: 14px; line-height: 1.8;">${reasonsList}</ul>
              <p style="margin: 0 0 20px 0; font-size: 15px; color: #a3a3a3; line-height: 1.6;">
                Log in to your Seller Dashboard and consent to a file review so our team can verify your submission. Until you consent, your product will stay in "pending" and your file won't be accessible to any Eclipse staff.
              </p>
              <a href="https://roleplay-hub-shop.lovable.app/seller" style="display: inline-block; background: #a855f7; color: #ffffff; padding: 12px 28px; text-decoration: none; font-weight: 600; font-size: 14px;">
                Review & Consent
              </a>
              <p style="margin: 24px 0 0 0; font-size: 13px; color: #525252;">
                Your privacy matters. Eclipse staff cannot view your files without your explicit consent.
              </p>
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
            `,
          }),
        });
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Notify seller review error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});