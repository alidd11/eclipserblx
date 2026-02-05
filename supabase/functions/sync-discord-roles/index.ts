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

async function assignDiscordRole(
  botToken: string,
  guildId: string,
  roleId: string,
  discordUserId: string,
  roleName: string
): Promise<{ success: boolean; error?: string }> {
  const discordApiUrl = `https://discord.com/api/v10/guilds/${guildId}/members/${discordUserId}/roles/${roleId}`;
  
  const response = await fetch(discordApiUrl, {
    method: "PUT",
    headers: {
      'Authorization': `Bot ${botToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (response.status === 204) {
    return { success: true };
  }

  if (response.status === 404) {
    return { success: false, error: "User not in server" };
  }

  const errorText = await response.text();
  return { success: false, error: errorText };
}

async function removeDiscordRole(
  botToken: string,
  guildId: string,
  roleId: string,
  discordUserId: string
): Promise<{ success: boolean; error?: string }> {
  const discordApiUrl = `https://discord.com/api/v10/guilds/${guildId}/members/${discordUserId}/roles/${roleId}`;
  
  const response = await fetch(discordApiUrl, {
    method: "DELETE",
    headers: {
      'Authorization': `Bot ${botToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (response.status === 204 || response.status === 404) {
    return { success: true };
  }

  const errorText = await response.text();
  return { success: false, error: errorText };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const botToken = Deno.env.get("DISCORD_CUSTOMER_BOT_TOKEN");
    const guildId = Deno.env.get("DISCORD_GUILD_ID");
    const eclipsePlusRoleId = Deno.env.get("DISCORD_ROLE_ID");
    const storeCreatorRoleId = Deno.env.get("DISCORD_STORE_CREATOR_ROLE_ID");
    const customerRoleId = Deno.env.get("DISCORD_CUSTOMER_ROLE_ID");
    const loyalCustomerRoleId = Deno.env.get("DISCORD_LOYAL_CUSTOMER_ROLE_ID");

    if (!botToken || !guildId) {
      logStep("Missing Discord bot configuration");
      return new Response(
        JSON.stringify({ error: "Discord bot not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    logStep("Starting comprehensive Discord role sync");

    // Get all profiles with linked Discord accounts
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('user_id, discord_id, discord_username')
      .not('discord_id', 'is', null);

    if (profileError) {
      logStep("Error querying profiles", { error: profileError.message });
      return new Response(
        JSON.stringify({ error: "Failed to query profiles", details: profileError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!profiles || profiles.length === 0) {
      logStep("No users with linked Discord accounts found");
      return new Response(
        JSON.stringify({ success: true, message: "No users with linked Discord accounts", processed: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logStep("Found users with Discord linked", { count: profiles.length });

    // Fetch all relevant data in parallel
    const userIds = profiles.map(p => p.user_id);

    const [subscriptionsResult, storesResult, ordersResult] = await Promise.all([
      supabase.from('subscriptions').select('user_id').eq('status', 'active'),
      supabase.from('stores').select('owner_id').eq('is_active', true),
      supabase.from('orders').select('user_id').in('status', ['paid', 'completed']),
    ]);

    // Create lookup sets/maps
    const activeSubscribers = new Set(subscriptionsResult.data?.map(s => s.user_id) || []);
    const storeOwners = new Set(storesResult.data?.map(s => s.owner_id) || []);
    
    // Count orders per user
    const orderCounts = new Map<string, number>();
    ordersResult.data?.forEach(order => {
      orderCounts.set(order.user_id, (orderCounts.get(order.user_id) || 0) + 1);
    });

    const results = {
      total: profiles.length,
      eclipsePlus: { assigned: 0, failed: 0 },
      storeCreator: { assigned: 0, failed: 0 },
      loyalCustomer: { assigned: 0, failed: 0 },
      customer: { assigned: 0, failed: 0 },
      errors: [] as { user_id: string; discord_id: string; role: string; error: string }[],
    };

    // Process each user
    for (const profile of profiles) {
      const { user_id, discord_id, discord_username } = profile;
      
      logStep("Processing user", { user_id, discord_id: discord_id.substring(0, 8) + "..." });

      // Eclipse+ Role
      if (eclipsePlusRoleId && activeSubscribers.has(user_id)) {
        const result = await assignDiscordRole(botToken, guildId, eclipsePlusRoleId, discord_id, "Eclipse+");
        if (result.success) {
          results.eclipsePlus.assigned++;
        } else {
          results.eclipsePlus.failed++;
          results.errors.push({ user_id, discord_id, role: "Eclipse+", error: result.error || "Unknown" });
        }
      }

      // Store Creator Role
      if (storeCreatorRoleId && storeOwners.has(user_id)) {
        const result = await assignDiscordRole(botToken, guildId, storeCreatorRoleId, discord_id, "Store Creator");
        if (result.success) {
          results.storeCreator.assigned++;
        } else {
          results.storeCreator.failed++;
          results.errors.push({ user_id, discord_id, role: "Store Creator", error: result.error || "Unknown" });
        }
      }

      // Customer/Loyal Customer Roles
      const orderCount = orderCounts.get(user_id) || 0;
      
      if (orderCount >= 5 && loyalCustomerRoleId) {
        // Assign Loyal Customer
        const result = await assignDiscordRole(botToken, guildId, loyalCustomerRoleId, discord_id, "Loyal Customer");
        if (result.success) {
          results.loyalCustomer.assigned++;
        } else {
          results.loyalCustomer.failed++;
          results.errors.push({ user_id, discord_id, role: "Loyal Customer", error: result.error || "Unknown" });
        }
        
        // Remove regular Customer role
        if (customerRoleId) {
          await removeDiscordRole(botToken, guildId, customerRoleId, discord_id);
        }
      } else if (orderCount > 0 && customerRoleId) {
        // Assign Customer role (1-4 orders)
        const result = await assignDiscordRole(botToken, guildId, customerRoleId, discord_id, "Customer");
        if (result.success) {
          results.customer.assigned++;
        } else {
          results.customer.failed++;
          results.errors.push({ user_id, discord_id, role: "Customer", error: result.error || "Unknown" });
        }
      }

      // Rate limit protection (500ms between users)
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    logStep("Sync completed", {
      total: results.total,
      eclipsePlus: results.eclipsePlus,
      storeCreator: results.storeCreator,
      loyalCustomer: results.loyalCustomer,
      customer: results.customer,
      errorCount: results.errors.length
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Processed ${results.total} users`,
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
