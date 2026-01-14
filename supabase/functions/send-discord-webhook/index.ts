import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WebhookPayload {
  event: 'subscription_activated' | 'subscription_deactivated';
  discord_id: string;
  user_email: string;
  customer_id?: string;
  subscription_end?: string;
  granted_by_admin: boolean;
  timestamp: string;
}

function logStep(step: string, details?: Record<string, unknown>) {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[send-discord-webhook] ${step}${detailsStr}`);
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const webhookUrl = Deno.env.get("DISCORD_WEBHOOK_URL");
    const webhookSecret = Deno.env.get("DISCORD_WEBHOOK_SECRET");

    if (!webhookUrl || !webhookSecret) {
      logStep("ERROR: Missing Discord webhook configuration");
      return new Response(
        JSON.stringify({ error: "Discord webhook not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { 
      user_id, 
      event, 
      subscription_end, 
      granted_by_admin = false 
    } = await req.json();

    logStep("Received request", { user_id, event, granted_by_admin });

    if (!user_id || !event) {
      return new Response(
        JSON.stringify({ error: "user_id and event are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!['subscription_activated', 'subscription_deactivated'].includes(event)) {
      return new Response(
        JSON.stringify({ error: "Invalid event type" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user profile with Discord ID
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('email, customer_id, discord_id, discord_username')
      .eq('user_id', user_id)
      .maybeSingle();

    if (profileError) {
      logStep("Error fetching profile", { error: profileError.message });
      return new Response(
        JSON.stringify({ error: "Failed to fetch user profile" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!profile) {
      logStep("Profile not found", { user_id });
      return new Response(
        JSON.stringify({ error: "User profile not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!profile.discord_id) {
      logStep("User has no Discord ID linked", { user_id });
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "User has not linked their Discord account",
          skipped: true 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build the webhook payload
    const timestamp = new Date().toISOString();
    const payload: WebhookPayload = {
      event,
      discord_id: profile.discord_id,
      user_email: profile.email,
      customer_id: profile.customer_id || undefined,
      subscription_end: subscription_end || undefined,
      granted_by_admin,
      timestamp,
    };

    logStep("Sending webhook", { discord_id: profile.discord_id, event });

    // Generate HMAC signature
    const signedPayload = `${Math.floor(Date.now() / 1000)}.${JSON.stringify(payload)}`;
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(webhookSecret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const signatureBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(signedPayload));
    const signature = Array.from(new Uint8Array(signatureBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    const unixTimestamp = Math.floor(Date.now() / 1000).toString();

    // Send the webhook
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Eclipse-Signature': signature,
        'X-Eclipse-Timestamp': unixTimestamp,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logStep("Webhook request failed", { 
        status: response.status, 
        error: errorText 
      });
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Webhook delivery failed",
          status: response.status,
          details: errorText
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logStep("Webhook sent successfully", { 
      discord_id: profile.discord_id, 
      event 
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Discord webhook sent for ${event}`,
        discord_id: profile.discord_id
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("Unexpected error", { error: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
