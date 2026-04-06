import { checkRateLimit, getClientIp, rateLimitResponse, RATE_LIMITS } from '../_shared/rateLimit.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function escapeHtml(text: string): string {
  return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Rate limit
  const clientIp = getClientIp(req);
  const rl = checkRateLimit({ ...RATE_LIMITS.EXPENSIVE, identifier: clientIp, action: 'notify-missing-files' });
  if (!rl.allowed) return rateLimitResponse(rl, corsHeaders);

  try {
    // Auth guard: require service-role key
    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "");
    if (token !== Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")) {
      return new Response(JSON.stringify({ error: "Forbidden" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY not configured");
    }

    const { sellers } = await req.json();

    if (!Array.isArray(sellers) || sellers.length === 0 || sellers.length > 100) {
      return new Response(JSON.stringify({ error: "Invalid sellers array (1-100)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const results = [];

    for (const seller of sellers) {
      const { email, displayName, storeName, productNames } = seller;

      if (!email || typeof email !== 'string') continue;

      const safeDisplayName = escapeHtml(String(displayName || 'Seller').substring(0, 100));
      const safeStoreName = escapeHtml(String(storeName || 'Your Store').substring(0, 100));
      const safeProducts = Array.isArray(productNames) 
        ? productNames.slice(0, 50).map((name: string) => `<li style="color: #a3a3a3; font-size: 14px; line-height: 1.8;">${escapeHtml(String(name).substring(0, 200))}</li>`).join("")
        : "";

      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Eclipse <noreply@eclipserblx.com>",
          to: [email],
          subject: `Action required: Products missing files — ${safeStoreName}`,
          html: `
<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; background-color: #0a0a0f; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellspacing="0" cellpadding="0" style="background-color: #0a0a0f;">
    <tr><td align="center" style="padding: 40px 20px;">
      <table width="520" cellspacing="0" cellpadding="0" style="max-width: 520px;">
        <tr><td style="padding-bottom: 32px;"><span style="font-size: 20px; font-weight: 700; color: #ffffff; letter-spacing: 2px; font-family: Georgia, serif;">ECLIPSE</span></td></tr>
        <tr><td>
          <h1 style="font-size: 22px; font-weight: 600; color: #ffffff; margin: 0 0 20px 0;">Products hidden — missing files</h1>
          <p style="margin: 0 0 16px 0; font-size: 15px; color: #a3a3a3; line-height: 1.6;">Hi ${safeDisplayName},</p>
          <p style="margin: 0 0 16px 0; font-size: 15px; color: #a3a3a3; line-height: 1.6;">During a routine check, we found that some of your products in <strong style="color: #e4e4e7;">&quot;${safeStoreName}&quot;</strong> don't have a downloadable file attached.</p>
          <p style="margin: 0 0 8px 0; font-size: 14px; color: #e4e4e7;">Affected products:</p>
          <ul style="margin: 0 0 20px 0; padding-left: 20px;">${safeProducts}</ul>
          <p style="margin: 0 0 20px 0; font-size: 15px; color: #a3a3a3; line-height: 1.6;">To get your products back on sale, log in and upload the required files.</p>
          <a href="https://eclipserblx.com/seller/products" style="display: inline-block; background: #a855f7; color: #ffffff; padding: 12px 28px; text-decoration: none; font-weight: 600; font-size: 14px;">Go to My Products</a>
        </td></tr>
        <tr><td style="border-top: 1px solid #222; padding-top: 24px;"><p style="margin: 0 0 12px 0; font-size: 10px; color: #404040; line-height: 1.4;">This email is intended solely for the named addressee. If you have received this message in error, please notify the sender immediately and delete it. Do not copy, distribute, or take action based on its contents.</p><p style="margin: 0; font-size: 11px; color: #404040;">Eclipse &middot; <a href="https://eclipserblx.com" style="color: #737373; text-decoration: none;">eclipserblx.com</a></p></td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
        }),
      });

      results.push({ email, status: res.ok ? "sent" : "failed" });
    }

    return new Response(JSON.stringify({ results }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
