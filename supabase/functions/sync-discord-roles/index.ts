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
    const mainGuildId = Deno.env.get("DISCORD_GUILD_ID");
    const eclipsePlusRoleId = Deno.env.get("DISCORD_ROLE_ID");
    const storeCreatorRoleId = Deno.env.get("DISCORD_STORE_CREATOR_ROLE_ID");
    const customerRoleId = Deno.env.get("DISCORD_CUSTOMER_ROLE_ID");
    const loyalCustomerRoleId = Deno.env.get("DISCORD_LOYAL_CUSTOMER_ROLE_ID");

    if (!botToken) {
      logStep("Missing Discord bot token");
      return new Response(
        JSON.stringify({ error: "Discord bot not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    logStep("Starting comprehensive Discord role sync (main + store servers)");

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
    const [subscriptionsResult, storesResult, ordersResult, storeServersResult, roleConfigsResult] = await Promise.all([
      supabase.from('subscriptions').select('user_id').eq('status', 'active'),
      supabase.from('stores').select('id, owner_id, discord_guild_id').eq('is_active', true),
      supabase.from('orders').select('user_id, order_items(store_id)').in('status', ['paid', 'completed']),
      supabase.from('stores').select('id, name, discord_guild_id').eq('is_active', true).not('discord_guild_id', 'is', null),
      supabase.from('discord_role_configs').select('*').eq('auto_assign_on_purchase', true),
    ]);

    // Create lookup sets/maps
    const activeSubscribers = new Set(subscriptionsResult.data?.map(s => s.user_id) || []);
    const storeOwners = new Set(storesResult.data?.map(s => s.owner_id) || []);
    
    // Count orders per user (total and per store)
    const orderCounts = new Map<string, number>();
    const storeOrderCounts = new Map<string, Map<string, number>>(); // userId -> storeId -> count
    
    ordersResult.data?.forEach((order: any) => {
      orderCounts.set(order.user_id, (orderCounts.get(order.user_id) || 0) + 1);
      
      // Track per-store orders
      order.order_items?.forEach((item: any) => {
        if (item.store_id) {
          if (!storeOrderCounts.has(order.user_id)) {
            storeOrderCounts.set(order.user_id, new Map());
          }
          const userStoreMap = storeOrderCounts.get(order.user_id)!;
          userStoreMap.set(item.store_id, (userStoreMap.get(item.store_id) || 0) + 1);
        }
      });
    });

    // Store servers with role configs
    const storeServers = storeServersResult.data || [];
    const roleConfigs = roleConfigsResult.data || [];

    const results = {
      total: profiles.length,
      mainServer: {
        eclipsePlus: { assigned: 0, failed: 0 },
        storeCreator: { assigned: 0, failed: 0 },
        loyalCustomer: { assigned: 0, failed: 0 },
        customer: { assigned: 0, failed: 0 },
      },
      storeServers: {
        processed: 0,
        rolesAssigned: 0,
        rolesFailed: 0,
      },
      errors: [] as { user_id: string; discord_id: string; role: string; server: string; error: string }[],
    };

    // Process each user
    for (const profile of profiles) {
      const { user_id, discord_id, discord_username } = profile;
      
      logStep("Processing user", { user_id, discord_id: discord_id.substring(0, 8) + "..." });

      // === MAIN SERVER ROLES ===
      if (mainGuildId) {
        // Eclipse+ Role
        if (eclipsePlusRoleId && activeSubscribers.has(user_id)) {
          const result = await assignDiscordRole(botToken, mainGuildId, eclipsePlusRoleId, discord_id, "Eclipse+");
          if (result.success) {
            results.mainServer.eclipsePlus.assigned++;
          } else {
            results.mainServer.eclipsePlus.failed++;
            results.errors.push({ user_id, discord_id, role: "Eclipse+", server: "main", error: result.error || "Unknown" });
          }
        }

        // Store Creator Role
        if (storeCreatorRoleId && storeOwners.has(user_id)) {
          const result = await assignDiscordRole(botToken, mainGuildId, storeCreatorRoleId, discord_id, "Store Creator");
          if (result.success) {
            results.mainServer.storeCreator.assigned++;
          } else {
            results.mainServer.storeCreator.failed++;
            results.errors.push({ user_id, discord_id, role: "Store Creator", server: "main", error: result.error || "Unknown" });
          }
        }

        // Customer/Loyal Customer Roles
        const orderCount = orderCounts.get(user_id) || 0;
        
        if (orderCount >= 5 && loyalCustomerRoleId) {
          const result = await assignDiscordRole(botToken, mainGuildId, loyalCustomerRoleId, discord_id, "Loyal Customer");
          if (result.success) {
            results.mainServer.loyalCustomer.assigned++;
          } else {
            results.mainServer.loyalCustomer.failed++;
            results.errors.push({ user_id, discord_id, role: "Loyal Customer", server: "main", error: result.error || "Unknown" });
          }
          
          if (customerRoleId) {
            await removeDiscordRole(botToken, mainGuildId, customerRoleId, discord_id);
          }
        } else if (orderCount > 0 && customerRoleId) {
          const result = await assignDiscordRole(botToken, mainGuildId, customerRoleId, discord_id, "Customer");
          if (result.success) {
            results.mainServer.customer.assigned++;
          } else {
            results.mainServer.customer.failed++;
            results.errors.push({ user_id, discord_id, role: "Customer", server: "main", error: result.error || "Unknown" });
          }
        }
      }

      // === STORE SERVER ROLES ===
      for (const store of storeServers) {
        if (!store.discord_guild_id) continue;
        
        // Get role configs for this store
        const storeRoleConfigs = roleConfigs.filter((rc: any) => rc.store_id === store.id);
        if (storeRoleConfigs.length === 0) continue;

        // Get user's order count for this store
        const userStoreOrders = storeOrderCounts.get(user_id)?.get(store.id) || 0;
        if (userStoreOrders === 0) continue; // Skip if user hasn't ordered from this store

        results.storeServers.processed++;

        for (const config of storeRoleConfigs) {
          let eligible = true;

          if (config.min_order_count && userStoreOrders < config.min_order_count) {
            eligible = false;
          }

          if (config.requires_subscription && !activeSubscribers.has(user_id)) {
            eligible = false;
          }

          if (eligible) {
            const result = await assignDiscordRole(botToken, store.discord_guild_id, config.role_id, discord_id, config.role_name);
            if (result.success) {
              results.storeServers.rolesAssigned++;
            } else {
              results.storeServers.rolesFailed++;
              results.errors.push({ 
                user_id, 
                discord_id, 
                role: config.role_name, 
                server: store.name, 
                error: result.error || "Unknown" 
              });
            }
          }
        }
      }

      // Rate limit protection (300ms between users)
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    logStep("Sync completed", {
      total: results.total,
      mainServer: results.mainServer,
      storeServers: results.storeServers,
      errorCount: results.errors.length
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Processed ${results.total} users across main server and ${storeServers.length} store servers`,
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