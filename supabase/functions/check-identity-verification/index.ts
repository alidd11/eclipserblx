import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-IDENTITY-VERIFICATION] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const user = userData.user;
    if (!user?.id) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id });

    // Check for already-verified local record first
    const { data: verifiedLocal } = await supabaseClient
      .from('identity_verifications')
      .select('id, verified_at')
      .eq('user_id', user.id)
      .eq('status', 'verified')
      .limit(1);

    if (verifiedLocal && verifiedLocal.length > 0) {
      logStep("Already verified locally");
      return new Response(JSON.stringify({
        verified: true,
        status: 'verified',
        verifiedAt: verifiedLocal[0].verified_at,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Check pending sessions against Stripe
    const { data: pendingSessions } = await supabaseClient
      .from('identity_verifications')
      .select('id, stripe_session_id, status')
      .eq('user_id', user.id)
      .neq('status', 'verified')
      .order('created_at', { ascending: false })
      .limit(5);

    if (!pendingSessions || pendingSessions.length === 0) {
      logStep("No verification sessions found");
      return new Response(JSON.stringify({
        verified: false,
        status: 'none',
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Check the most recent session with Stripe
    let latestStatus = 'none';
    for (const session of pendingSessions) {
      try {
        const stripeSession = await stripe.identity.verificationSessions.retrieve(session.stripe_session_id);
        logStep("Stripe session status", { sessionId: session.stripe_session_id, status: stripeSession.status });

        // Update local record
        const updateData: Record<string, unknown> = {
          status: stripeSession.status,
          updated_at: new Date().toISOString(),
        };
        if (stripeSession.status === 'verified') {
          updateData.verified_at = new Date().toISOString();
        }

        await supabaseClient
          .from('identity_verifications')
          .update(updateData)
          .eq('id', session.id);

        if (stripeSession.status === 'verified') {
          return new Response(JSON.stringify({
            verified: true,
            status: 'verified',
            verifiedAt: updateData.verified_at,
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          });
        }

        // Return the most recent non-verified status
        latestStatus = stripeSession.status;
        break;
      } catch (err) {
        logStep("Warning: Failed to check session", { sessionId: session.stripe_session_id, error: String(err) });
      }
    }

    return new Response(JSON.stringify({
      verified: false,
      status: latestStatus,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
