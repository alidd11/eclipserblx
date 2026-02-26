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

    const platformName = takedown.target_platform === 'roblox' ? 'Roblox' : takedown.target_platform;
    const platformEmail = takedown.target_platform === 'roblox' ? 'dmca@roblox.com' : 'the appropriate abuse contact';
    const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    // Build the DMCA notice in proper legal format per 17 U.S.C. § 512(c)(3)
    // PII is redacted — Eclipse IP Shield acts as authorised agent
    const dmcaNotice = `
DMCA TAKEDOWN NOTICE PURSUANT TO 17 U.S.C. § 512(c)(3)

Date: ${today}
Case Reference: ${takedown.case_number}

To: ${platformName} Trust & Safety / DMCA Agent
Via: ${platformEmail}

Dear Sir/Madam,

I, the undersigned, am the authorised agent of the copyright owner ("Claimant") acting through Eclipse IP Shield, a digital rights protection service. The Claimant's identity is held on file under case reference ${takedown.case_number} and will be disclosed to the service provider upon lawful request.

This letter constitutes a notification of claimed infringement under the Digital Millennium Copyright Act, 17 U.S.C. § 512(c)(3).

─────────────────────────────────────────────

1. IDENTIFICATION OF THE COPYRIGHTED WORK CLAIMED TO HAVE BEEN INFRINGED
(§ 512(c)(3)(A)(ii))

${takedown.original_work_description || 'The original copyrighted work is registered with Eclipse IP Shield. Full details, including proof of ownership, are available upon request.'}

─────────────────────────────────────────────

2. IDENTIFICATION OF THE MATERIAL THAT IS CLAIMED TO BE INFRINGING
(§ 512(c)(3)(A)(iii))

Platform: ${platformName}
URL / Location of Infringing Material: ${takedown.infringing_url || 'Provided in accompanying evidence'}

The above material is an unauthorised reproduction and/or derivative of the Claimant's copyrighted work.

─────────────────────────────────────────────

3. SUPPORTING EVIDENCE

${takedown.evidence_notes || 'Evidence of original ownership and infringement has been collected through automated detection systems and manual review. Supporting documentation is available upon request.'}

─────────────────────────────────────────────

4. CONTACT INFORMATION OF THE COMPLAINING PARTY
(§ 512(c)(3)(A)(iv))

Name: Eclipse IP Shield (Authorised Agent)
Email: legal@eclipserblx.com
Case Reference: ${takedown.case_number}

Note: The Claimant's personal identifying information is held confidentially by Eclipse IP Shield and will be provided to the service provider's designated agent upon valid legal request, in accordance with applicable data protection obligations.

─────────────────────────────────────────────

5. STATEMENTS UNDER PENALTY OF PERJURY
(§ 512(c)(3)(A)(v) & (vi))

I hereby state that:

(a) I have a good faith belief that use of the material described above is not authorised by the copyright owner, its agent, or the law.

(b) The information in this notification is accurate, and under penalty of perjury, I am authorised to act on behalf of the owner of an exclusive right that is allegedly infringed.

─────────────────────────────────────────────

6. REQUESTED ACTION

We respectfully request that you:
  (i)   Expeditiously remove or disable access to the infringing material identified above;
  (ii)  Notify the uploader of this takedown notice in accordance with § 512(g); and
  (iii) Preserve any associated account and upload data for potential further legal proceedings.

─────────────────────────────────────────────

This notice is made in good faith and in compliance with the requirements of the Digital Millennium Copyright Act, 17 U.S.C. § 512(c).

Respectfully submitted,

Eclipse IP Shield
Authorised Agent for the Claimant
legal@eclipserblx.com
Ref: ${takedown.case_number}
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
          <p><strong>Your personal information has been redacted</strong> from the DMCA notice. Eclipse IP Shield is listed as the authorised agent. Your identity is held confidentially and will only be disclosed upon valid legal request.</p>
          <p>Our team will review and forward the DMCA notice to the relevant platform. You'll be notified of any updates.</p>
          <p style="color: #666; font-size: 12px;">Eclipse IP Shield — Protecting your creative work and your privacy.</p>
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

    // Create email thread + messages for correspondence tracking
    try {
      const { data: thread } = await supabaseClient
        .from("ip_email_threads")
        .insert({
          creator_id: takedown.creator_id,
          subject: `DMCA Takedown Notice - ${takedown.case_number}`,
          thread_type: 'dmca_takedown',
          takedown_id: takedown_id,
          recipient_email: 'legal@eclipserblx.com',
          recipient_name: 'Eclipse Legal Team',
        })
        .select()
        .single();

      if (thread) {
        // Log the DMCA notice as outbound message
        await supabaseClient.from("ip_email_messages").insert({
          thread_id: thread.id,
          sender_id: takedown.creator_id,
          sender_email: 'legal@eclipserblx.com',
          sender_name: 'Eclipse IP Shield (Authorised Agent)',
          recipient_email: 'legal@eclipserblx.com',
          recipient_name: 'Eclipse Legal Team',
          direction: 'outbound',
          subject: `DMCA Takedown Notice - ${takedown.case_number} - ${takedown.target_platform}`,
          body_html: `<pre style="white-space: pre-wrap; font-family: inherit;">${dmcaNotice}</pre>`,
          body_text: dmcaNotice,
          status: 'sent',
          sent_at: new Date().toISOString(),
        });

        // Log the confirmation email to creator
        await supabaseClient.from("ip_email_messages").insert({
          thread_id: thread.id,
          sender_id: null,
          sender_email: 'noreply@eclipserblx.com',
          sender_name: 'Eclipse IP Shield',
          recipient_email: creatorEmail,
          recipient_name: creatorName,
          direction: 'outbound',
          subject: `DMCA Takedown Filed - ${takedown.case_number}`,
          body_html: `<p>Your DMCA takedown request (${takedown.case_number}) has been filed on your behalf.</p><p><strong>Platform:</strong> ${takedown.target_platform}</p>`,
          status: 'sent',
          sent_at: new Date().toISOString(),
        });
      }
    } catch (threadErr) {
      logStep("Email thread creation warning (non-blocking)", { error: String(threadErr) });
    }

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
