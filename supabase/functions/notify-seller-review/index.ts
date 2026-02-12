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

    // Set file_review_requested_at on the product
    await supabase
      .from("products")
      .update({ file_review_requested_at: new Date().toISOString() })
      .eq("id", productId);

    // Create in-app notification
    await supabase
      .from("seller_notifications")
      .insert({
        user_id: storeOwnerId,
        type: "file_review",
        title: "File Review Required",
        message: `Your product "${productName}" has been flagged by our automated security scan. Please consent to a file review so our team can verify your submission.`,
        product_id: productId,
        action_url: "/seller",
      });

    // Send email notification if Resend is configured
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
            subject: `Action Required: Product Review for "${productName}"`,
            html: `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #f59e0b;">⚠️ File Review Required</h2>
                <p>Hi ${profile.display_name || "Seller"},</p>
                <p>Your product <strong>"${productName}"</strong> has been flagged by our automated security scan for review.</p>
                <h3>Flags detected:</h3>
                <ul>${reasonsList}</ul>
                <p>To proceed with moderation, please log in to your Seller Dashboard and consent to a file review. Until you consent, your product will remain in "pending" status and your file will not be accessible to any Eclipse staff.</p>
                <p style="margin-top: 24px;">
                  <a href="https://roleplay-hub-shop.lovable.app/seller" 
                     style="background: #f59e0b; color: #000; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
                    Review & Consent
                  </a>
                </p>
                <p style="margin-top: 24px; color: #888; font-size: 12px;">
                  Your privacy matters. Eclipse staff cannot view your files without your explicit consent.
                </p>
              </div>
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
