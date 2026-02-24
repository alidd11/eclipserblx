import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { Resend } from "https://esm.sh/resend@4.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[FILE-DMCA-TAKEDOWN] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY not configured");

    const resend = new Resend(RESEND_API_KEY);

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { takedown_id } = await req.json();
    if (!takedown_id) throw new Error("takedown_id is required");

    logStep("Filing DMCA for takedown", { takedown_id });

    // Fetch the takedown request with creator profile
    const { data: takedown, error: fetchError } = await supabaseClient
      .from("takedown_requests")
      .select("*")
      .eq("id", takedown_id)
      .single();

    if (fetchError || !takedown) throw new Error("Takedown request not found");

    // Get creator profile
    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("display_name, email, username")
      .eq("user_id", takedown.creator_id)
      .single();

    if (!profile) throw new Error("Creator profile not found");

    const creatorName = profile.display_name || profile.username || "IP Shield User";
    const creatorEmail = profile.email;

    // Build the DMCA notice email for Roblox
    const dmcaNotice = `
Dear Roblox Trust & Safety Team,

I am writing on behalf of ${creatorName} as their authorised agent through Eclipse IP Shield, a digital rights protection service.

DMCA TAKEDOWN NOTICE
Case Reference: ${takedown.case_number}

IDENTIFICATION OF COPYRIGHTED WORK:
${takedown.original_work_description || 'The original copyrighted work is registered with Eclipse IP Shield.'}

IDENTIFICATION OF INFRINGING MATERIAL:
Platform: ${takedown.target_platform === 'roblox' ? 'Roblox' : takedown.target_platform}
URL: ${takedown.infringing_url || 'See details below'}

EVIDENCE:
${takedown.evidence_notes || 'Evidence has been collected through automated detection systems and manual review.'}

STATEMENTS:
1. I have a good faith belief that use of the copyrighted materials described above is not authorised by the copyright owner, its agent, or the law.
2. The information in this notification is accurate.
3. I am authorised to act on behalf of the owner of an exclusive right that is allegedly infringed.

CONTACT INFORMATION:
Name: Eclipse IP Shield (Agent for ${creatorName})
Email: legal@eclipserblx.com
Reference: ${takedown.case_number}

This notice is sent under the Digital Millennium Copyright Act (DMCA), 17 U.S.C. § 512(c).

Regards,
Eclipse IP Shield
legal@eclipserblx.com
    `.trim();

    // Send the DMCA notice via email
    // In production, this would go to Roblox's DMCA email (dmca@roblox.com)
    // For now, we send to our legal team for review and forwarding
    const { error: emailError } = await resend.emails.send({
      from: "Eclipse IP Shield <legal@eclipserblx.com>",
      to: ["legal@eclipserblx.com"],
      replyTo: creatorEmail,
      subject: `DMCA Takedown Notice - ${takedown.case_number} - ${takedown.target_platform}`,
      text: dmcaNotice,
    });

    if (emailError) {
      logStep("Email send error", { error: emailError });
      throw new Error("Failed to send DMCA notice email");
    }

    // Also send confirmation to the creator
    await resend.emails.send({
      from: "Eclipse IP Shield <noreply@eclipserblx.com>",
      to: [creatorEmail],
      subject: `DMCA Takedown Filed - ${takedown.case_number}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1a1a2e;">⚖️ DMCA Takedown Filed</h2>
          <p>Hi ${creatorName},</p>
          <p>Your DMCA takedown request has been filed on your behalf through Eclipse IP Shield.</p>
          <div style="background: #f4f4f8; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <p style="margin: 4px 0;"><strong>Case Number:</strong> ${takedown.case_number}</p>
            <p style="margin: 4px 0;"><strong>Platform:</strong> ${takedown.target_platform}</p>
            <p style="margin: 4px 0;"><strong>Infringing URL:</strong> ${takedown.infringing_url || 'N/A'}</p>
            <p style="margin: 4px 0;"><strong>Status:</strong> Notice Sent</p>
          </div>
          <p>Our team will review and forward the DMCA notice to the relevant platform. You'll be notified of any updates.</p>
          <p style="color: #666; font-size: 12px;">Eclipse IP Shield — Protecting your creative work.</p>
        </div>
      `,
    });

    // Update the takedown request status
    await supabaseClient
      .from("takedown_requests")
      .update({
        status: "notice_sent",
        filing_method: "agent",
        dmca_sent_at: new Date().toISOString(),
        dmca_sent_to_email: "legal@eclipserblx.com",
        notice_sent_at: new Date().toISOString(),
        agent_authorization: true,
      })
      .eq("id", takedown_id);

    logStep("DMCA notice sent successfully", { case_number: takedown.case_number });

    return new Response(
      JSON.stringify({
        success: true,
        case_number: takedown.case_number,
        message: "DMCA notice has been filed and sent for review.",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
