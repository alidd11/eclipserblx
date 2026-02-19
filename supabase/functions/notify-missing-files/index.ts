import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY not configured");
    }

    const { sellers } = await req.json();

    const results = [];

    for (const seller of sellers) {
      const { email, displayName, storeName, productNames } = seller;

      const productList = productNames
        .map((name: string) => `<li style="color: #a3a3a3; font-size: 14px; line-height: 1.8;">${name}</li>`)
        .join("");

      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Eclipse <noreply@eclipserblx.com>",
          to: [email],
          subject: `Action required: Products missing files — ${storeName}`,
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
              <h1 style="font-size: 22px; font-weight: 600; color: #ffffff; margin: 0 0 20px 0;">Products hidden — missing files</h1>
              <p style="margin: 0 0 16px 0; font-size: 15px; color: #a3a3a3; line-height: 1.6;">
                Hi ${displayName},
              </p>
              <p style="margin: 0 0 16px 0; font-size: 15px; color: #a3a3a3; line-height: 1.6;">
                During a routine check, we found that some of your products in <strong style="color: #e4e4e7;">"${storeName}"</strong> don't have a downloadable file attached. These products have been temporarily hidden from the marketplace until the files are uploaded.
              </p>
              <p style="margin: 0 0 8px 0; font-size: 14px; color: #e4e4e7;">Affected products:</p>
              <ul style="margin: 0 0 20px 0; padding-left: 20px;">${productList}</ul>
              <p style="margin: 0 0 20px 0; font-size: 15px; color: #a3a3a3; line-height: 1.6;">
                To get your products back on sale, log in to your Seller Dashboard and upload the required files for each product. Once uploaded, they'll be automatically re-reviewed.
              </p>
              <a href="https://roleplay-hub-shop.lovable.app/seller/products" style="display: inline-block; background: #a855f7; color: #ffffff; padding: 12px 28px; text-decoration: none; font-weight: 600; font-size: 14px;">
                Go to My Products
              </a>
              <p style="margin: 24px 0 0 0; font-size: 13px; color: #525252;">
                If you believe this is an error, please contact us through your Seller Dashboard.
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

      const data = await res.json();
      results.push({ email, status: res.ok ? "sent" : "failed", data });
    }

    return new Response(JSON.stringify({ results }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
