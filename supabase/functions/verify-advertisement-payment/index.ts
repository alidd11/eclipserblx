import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[VERIFY-ADVERTISEMENT-PAYMENT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { advertisementId, sessionId } = await req.json();

    if (!advertisementId) {
      throw new Error("Advertisement ID is required");
    }

    logStep("Verification request", { advertisementId, sessionId });

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Fetch advertisement
    const { data: advertisement, error: adError } = await supabaseClient
      .from("discord_advertisements")
      .select("*")
      .eq("id", advertisementId)
      .single();

    if (adError || !advertisement) {
      throw new Error("Advertisement not found");
    }

    // If already paid/posted, return success
    if (advertisement.status === "paid" || advertisement.status === "posted") {
      logStep("Already processed", { status: advertisement.status });
      return new Response(JSON.stringify({ 
        success: true, 
        status: advertisement.status,
        alreadyProcessed: true 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Verify payment with Stripe
    const paymentSessionId = sessionId || advertisement.payment_id;
    if (!paymentSessionId) {
      throw new Error("No payment session found");
    }

    const session = await stripe.checkout.sessions.retrieve(paymentSessionId);

    if (session.payment_status !== "paid") {
      logStep("Payment not completed", { status: session.payment_status });
      return new Response(JSON.stringify({ 
        success: false, 
        message: "Payment not completed",
        status: session.payment_status,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    logStep("Payment verified, updating status");

    // Update advertisement status to paid
    await supabaseClient
      .from("discord_advertisements")
      .update({ status: "paid" })
      .eq("id", advertisementId);

    // Send to Discord webhook
    logStep("Triggering Discord webhook");
    
    const webhookResponse = await fetch(
      `${Deno.env.get("SUPABASE_URL")}/functions/v1/send-advertisement-discord-webhook`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        },
        body: JSON.stringify({ advertisementId }),
      }
    );

    const webhookResult = await webhookResponse.json();
    logStep("Discord webhook result", webhookResult);

    return new Response(JSON.stringify({ 
      success: true, 
      status: "posted",
      discordResult: webhookResult,
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
