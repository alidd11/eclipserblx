import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const log = (step: string, details?: Record<string, unknown>) => 
  console.log(`[sync-discord-roles] ${step}${details ? ` - ${JSON.stringify(details)}` : ''}`);

async function modifyRole(botToken: string, guildId: string, roleId: string, discordUserId: string, method: "PUT" | "DELETE"): Promise<{ success: boolean; error?: string }> {
  const res = await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${discordUserId}/roles/${roleId}`, {
    method,
    headers: { 'Authorization': `Bot ${botToken}`, 'Content-Type': 'application/json' },
  });
  if (res.status === 204 || (method === "DELETE" && res.status === 404)) return { success: true };
  if (res.status === 404) return { success: false, error: "User not in server" };
  return { success: false, error: await res.text() };
}

Deno.serve(async (req) => {
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
      log("Missing Discord bot token");
      return new Response(JSON.stringify({ error: "Discord bot not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    log("Starting role sync");
    // Get all profiles with linked Discord accounts
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('user_id, discord_id, discord_username')
      .not('discord_id', 'is', null);

    if (profileError) {
      log("Error querying profiles", { error: profileError.message });
      return new Response(JSON.stringify({ error: "Failed to query profiles" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (!profiles?.length) {
      return new Response(JSON.stringify({ success: true, message: "No users with linked Discord", processed: 0 }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    log("Found users", { count: profiles.length });
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
      
      // === MAIN SERVER ROLES ===
      if (mainGuildId) {
        const assign = async (roleId: string | undefined, key: keyof typeof results.mainServer, roleName: string) => {
          if (!roleId) return;
          const r = await modifyRole(botToken, mainGuildId, roleId, discord_id, "PUT");
          r.success ? results.mainServer[key].assigned++ : (results.mainServer[key].failed++, results.errors.push({ user_id, discord_id, role: roleName, server: "main", error: r.error || "Unknown" }));
        };

        if (activeSubscribers.has(user_id)) await assign(eclipsePlusRoleId, "eclipsePlus", "Eclipse+");
        if (storeOwners.has(user_id)) await assign(storeCreatorRoleId, "storeCreator", "Store Creator");

        const orderCount = orderCounts.get(user_id) || 0;
        if (orderCount >= 5) {
          await assign(loyalCustomerRoleId, "loyalCustomer", "Loyal Customer");
          if (customerRoleId) await modifyRole(botToken, mainGuildId, customerRoleId, discord_id, "DELETE");
        } else if (orderCount > 0) {
          await assign(customerRoleId, "customer", "Customer");
        }
      }

      // === STORE SERVER ROLES ===
      for (const store of storeServers) {
        if (!store.discord_guild_id) continue;
        const configs = roleConfigs.filter((rc: any) => rc.store_id === store.id);
        if (!configs.length) continue;
        const userOrders = storeOrderCounts.get(user_id)?.get(store.id) || 0;
        if (!userOrders) continue;

        results.storeServers.processed++;
        for (const cfg of configs) {
          const eligible = (!cfg.min_order_count || userOrders >= cfg.min_order_count) && (!cfg.requires_subscription || activeSubscribers.has(user_id));
          if (eligible) {
            const r = await modifyRole(botToken, store.discord_guild_id, cfg.role_id, discord_id, "PUT");
            r.success ? results.storeServers.rolesAssigned++ : (results.storeServers.rolesFailed++, results.errors.push({ user_id, discord_id, role: cfg.role_name, server: store.name, error: r.error || "Unknown" }));
          }
        }
      }

      await new Promise(r => setTimeout(r, 300)); // Rate limit
    }

    log("Sync completed", { total: results.total, errors: results.errors.length });
    return new Response(JSON.stringify({ success: true, results }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    log("Error", { error: error instanceof Error ? error.message : String(error) });
    return new Response(JSON.stringify({ error: String(error) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});