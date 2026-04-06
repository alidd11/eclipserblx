import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit, getClientIp, rateLimitResponse, RATE_LIMITS } from '../_shared/rateLimit.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function escapeHtml(text: string): string {
  return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Rate limit
  const clientIp = getClientIp(req);
  const rl = checkRateLimit({ ...RATE_LIMITS.WRITE, identifier: clientIp, action: 'notify-seller-review' });
  if (!rl.allowed) return rateLimitResponse(rl, corsHeaders);

  try {
    // Auth guard: require service-role key
    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "");
    if (token !== Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")) {
      return new Response(JSON.stringify({ error: "Forbidden" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { productId, productName, storeOwnerId, flagReasons } = await req.json();

    if (!productId || !UUID_REGEX.test(productId) || !storeOwnerId || !UUID_REGEX.test(storeOwnerId)) {
      return new Response(
        JSON.stringify({ error: "Invalid productId or storeOwnerId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const safeName = typeof productName === 'string' ? productName.substring(0, 200) : 'Unknown';

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
        message: `Your product "${safeName}" has been flagged by our security scan. Please consent to a file review so our team can check your submission.`,
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
        // Sanitize flag reasons to prevent XSS in email
        const safeReasons = Array.isArray(flagReasons) 
          ? flagReasons.slice(0, 10).map((r: string) => escapeHtml(String(r).substring(0, 200)))
          : [];
        const reasonsList = safeReasons.length > 0
          ? safeReasons.map(r => `<li>${r}</li>`).join("")
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
            subject: `Action required: File review for "${escapeHtml(safeName)}"`,
            html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; background-color: #0a0a0f; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellspacing="0" cellpadding="0" style="background-color: #0a0a0f;">
    <tr><td align="center" style="padding: 40px 20px;">
      <table width="520" cellspacing="0" cellpadding="0" style="max-width: 520px;">
        <tr><td style="padding-bottom: 32px;"><span style="font-size: 20px; font-weight: 700; color: #ffffff; letter-spacing: 2px; font-family: Georgia, serif;">ECLIPSE</span></td></tr>
        <tr><td>
          <h1 style="font-size: 22px; font-weight: 600; color: #ffffff; margin: 0 0 20px 0;">File review required</h1>
          <p style="margin: 0 0 16px 0; font-size: 15px; color: #a3a3a3; line-height: 1.6;">Hi ${escapeHtml(profile.display_name || "Seller")},</p>
          <p style="margin: 0 0 16px 0; font-size: 15px; color: #a3a3a3; line-height: 1.6;">Your product <strong style="color: #e4e4e7;">&quot;${escapeHtml(safeName)}&quot;</strong> was flagged by our security scan and needs a review.</p>
          <p style="margin: 0 0 8px 0; font-size: 14px; color: #e4e4e7;">Flags detected:</p>
          <ul style="margin: 0 0 20px 0; padding-left: 20px; color: #a3a3a3; font-size: 14px; line-height: 1.8;">${reasonsList}</ul>
          <p style="margin: 0 0 20px 0; font-size: 15px; color: #a3a3a3; line-height: 1.6;">Log in to your Seller Dashboard and consent to a file review.</p>
          <a href="https://eclipserblx.com/seller" style="display: inline-block; background: #a855f7; color: #ffffff; padding: 12px 28px; text-decoration: none; font-weight: 600; font-size: 14px;">Review &amp; Consent</a>
          <p style="margin: 24px 0 0 0; font-size: 13px; color: #525252;">Your privacy matters. Eclipse staff cannot view your files without your explicit consent.</p>
        </td></tr>
        <tr><td style="border-top: 1px solid #222; padding-top: 24px;"><p style="margin: 0 0 12px 0; font-size: 10px; color: #404040; line-height: 1.4;">This email is intended solely for the named addressee. If you have received this message in error, please notify the sender immediately and delete it. Do not copy, distribute, or take action based on its contents.</p><p style="margin: 0; font-size: 11px; color: #404040;">Eclipse &middot; <a href="https://eclipserblx.com" style="color: #737373; text-decoration: none;">eclipserblx.com</a></p></td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
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
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
