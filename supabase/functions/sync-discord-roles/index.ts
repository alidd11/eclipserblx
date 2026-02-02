import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function logStep(step: string, details?: Record<string, unknown>) {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[sync-discord-roles] ${step}${detailsStr}`);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    logStep("Starting bulk Discord role sync for Eclipse+ subscribers");

    // Query active subscriptions first
    const { data: activeSubscriptions, error: subError } = await supabase
      .from('subscriptions')
      .select('user_id, status, current_period_end')
      .eq('status', 'active');

    if (subError) {
      logStep("Error querying subscriptions", { error: subError.message });
      return new Response(
        JSON.stringify({ error: "Failed to query subscriptions", details: subError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!activeSubscriptions || activeSubscriptions.length === 0) {
      logStep("No active subscriptions found");
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "No active Eclipse+ subscriptions found",
          processed: 0 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logStep("Found active subscriptions", { count: activeSubscriptions.length });

    // Get user IDs with active subscriptions
    const userIds = activeSubscriptions.map(s => s.user_id);

    // Now get profiles for these users that have discord_id linked
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('user_id, email, discord_id, discord_username')
      .in('user_id', userIds)
      .not('discord_id', 'is', null);

    if (profileError) {
      logStep("Error querying profiles", { error: profileError.message });
      return new Response(
        JSON.stringify({ error: "Failed to query profiles", details: profileError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!profiles || profiles.length === 0) {
      logStep("No subscribers with linked Discord accounts");
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "No active subscribers with linked Discord accounts found",
          processed: 0 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create a map for quick subscription lookup
    const subscriptionMap = new Map(
      activeSubscriptions.map(s => [s.user_id, s])
    );

    logStep("Found eligible subscribers with Discord", { count: profiles.length });

    const results = {
      total: profiles.length,
      success: 0,
      failed: 0,
      skipped: 0,
      errors: [] as { user_id: string; discord_id: string; error: string }[],
      successful: [] as { user_id: string; discord_id: string; discord_username: string }[],
    };

    // Process each subscriber
    for (const profile of profiles) {
      const subscription = subscriptionMap.get(profile.user_id);
      
      try {
        logStep("Processing subscriber", { 
          user_id: profile.user_id, 
          discord_id: profile.discord_id,
          discord_username: profile.discord_username 
        });

        const response = await fetch(`${supabaseUrl}/functions/v1/send-discord-webhook`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({
            user_id: profile.user_id,
            event: "subscription_activated",
            subscription_end: subscription?.current_period_end,
            granted_by_admin: false,
          }),
        });

        const result = await response.json();

        if (result.success) {
          results.success++;
          results.successful.push({
            user_id: profile.user_id,
            discord_id: profile.discord_id,
            discord_username: profile.discord_username || 'Unknown'
          });
          logStep("Role assigned successfully", { 
            user_id: profile.user_id, 
            discord_id: profile.discord_id 
          });
        } else if (result.skipped) {
          results.skipped++;
          logStep("Skipped", { 
            user_id: profile.user_id, 
            reason: result.message 
          });
        } else {
          results.failed++;
          results.errors.push({ 
            user_id: profile.user_id,
            discord_id: profile.discord_id,
            error: result.error || result.code || "Unknown error" 
          });
          logStep("Failed to assign role", { 
            user_id: profile.user_id, 
            error: result.error,
            code: result.code
          });
        }

        // Delay to avoid Discord rate limiting (500ms between requests)
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (err) {
        results.failed++;
        const errorMessage = err instanceof Error ? err.message : String(err);
        results.errors.push({ 
          user_id: profile.user_id, 
          discord_id: profile.discord_id,
          error: errorMessage 
        });
        logStep("Error processing subscriber", { 
          user_id: profile.user_id, 
          error: errorMessage 
        });
      }
    }

    logStep("Bulk sync completed", {
      total: results.total,
      success: results.success,
      failed: results.failed,
      skipped: results.skipped
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Processed ${results.total} subscribers: ${results.success} successful, ${results.failed} failed, ${results.skipped} skipped`,
        results 
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
