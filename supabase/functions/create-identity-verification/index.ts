import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { checkRateLimit, getClientIp, rateLimitResponse, RATE_LIMITS } from '../_shared/rateLimit.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-IDENTITY-VERIFICATION] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Rate limit - identity verification is expensive
    const clientIp = getClientIp(req);
    const rl = checkRateLimit({ ...RATE_LIMITS.EXPENSIVE, identifier: clientIp, action: 'create-identity-verification' });
    if (!rl.allowed) return rateLimitResponse(rl, corsHeaders);

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

    // Check if user already has a verified session
    const { data: existingVerified } = await supabaseClient
      .from('identity_verifications')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'verified')
      .limit(1);

    if (existingVerified && existingVerified.length > 0) {
      return new Response(JSON.stringify({ error: "Already verified" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Validate origin
    const rawOrigin = req.headers.get("origin");
    const allowedOrigins = ["https://eclipserblx.com", "https://www.eclipserblx.com"];
    const origin = rawOrigin && allowedOrigins.some(o => rawOrigin.startsWith(o))
      ? rawOrigin
      : "https://eclipserblx.com";

    // Create Stripe Identity VerificationSession with document + selfie
    const session = await stripe.identity.verificationSessions.create({
      type: 'document',
      metadata: {
        user_id: user.id,
      },
      options: {
        document: {
          require_matching_selfie: true,
        },
      },
      return_url: `${origin}/ip-shield?verification=complete`,
    });

    logStep("Created verification session", { sessionId: session.id });

    // Store the session in the database
    const { error: insertError } = await supabaseClient
      .from('identity_verifications')
      .insert({
        user_id: user.id,
        stripe_session_id: session.id,
        status: session.status,
      });

    if (insertError) {
      logStep("Warning: Failed to save session", { error: insertError.message });
    }

    return new Response(JSON.stringify({
      url: session.url,
      sessionId: session.id,
      clientSecret: session.client_secret,
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
