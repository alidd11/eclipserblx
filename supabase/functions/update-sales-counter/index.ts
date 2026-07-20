import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireServiceRole } from "../_shared/auth-guard.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOG = (step: string, d?: unknown) => {
  const s = d ? ` - ${JSON.stringify(d)}` : "";
  console.log(`[SALES-COUNTER] ${step}${s}`);
};

const GUILD_ID = "1485822444404080831";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  const _unauth = requireServiceRole(req, corsHeaders);
  if (_unauth) return _unauth;

  try {
    const botToken = Deno.env.get("DISCORD_CUSTOMER_BOT_TOKEN");
    if (!botToken) throw new Error("DISCORD_CUSTOMER_BOT_TOKEN not set");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const discordHeaders = {
      Authorization: `Bot ${botToken}`,
      "Content-Type": "application/json",
    };

    // Check if we already have a channel ID stored
    const { data: existing } = await supabase
      .from("settings")
      .select("value")
      .eq("key", "finance_sales_counter_channel_id")
      .maybeSingle();

    let channelId = existing?.value
      ? (typeof existing.value === "string" ? existing.value.replace(/"/g, "") : String(existing.value))
      : null;

    // If no channel exists yet, create one
    if (!channelId) {
      LOG("Creating sales counter voice channel");

      // Find ECLIPSE category
      const chRes = await fetch(`https://discord.com/api/v10/guilds/${GUILD_ID}/channels`, {
        headers: discordHeaders,
      });
      const channels = await chRes.json();
      const eclipseCategory = channels.find((c: any) => c.type === 4 && c.name?.toUpperCase() === "ECLIPSE");
      if (!eclipseCategory) throw new Error("ECLIPSE category not found");

      // Find Finance Staff role and @everyone for permissions
      const rolesRes = await fetch(`https://discord.com/api/v10/guilds/${GUILD_ID}/roles`, {
        headers: discordHeaders,
      });
      const roles = await rolesRes.json();
      const staffRole = roles.find((r: any) => r.name === "Finance Staff");
      const everyoneRole = roles.find((r: any) => r.name === "@everyone");

      const permOverwrites: any[] = [];
      if (everyoneRole) {
        // Deny CONNECT (1048576) but allow VIEW (1024) so they can see the name
        permOverwrites.push({ id: everyoneRole.id, type: 0, allow: "1024", deny: "1048576" });
      }
      if (staffRole) {
        permOverwrites.push({ id: staffRole.id, type: 0, allow: "1049600" }); // VIEW + CONNECT
      }

      const createRes = await fetch(`https://discord.com/api/v10/guilds/${GUILD_ID}/channels`, {
        method: "POST",
        headers: discordHeaders,
        body: JSON.stringify({
          name: "Total Sales : \u00A30.00",
          type: 2, // Voice channel
          parent_id: eclipseCategory.id,
          permission_overwrites: permOverwrites,
        }),
      });

      if (!createRes.ok) {
        const err = await createRes.text();
        throw new Error(`Failed to create voice channel: ${err}`);
      }

      const newChannel = await createRes.json();
      channelId = newChannel.id;
      LOG("Created voice channel", { channelId });

      // Store channel ID in settings
      await supabase.from("settings").upsert(
        { key: "finance_sales_counter_channel_id", value: channelId },
        { onConflict: "key" }
      );
    }

    // Calculate total sales
    const { data: orders } = await supabase
      .from("orders")
      .select("total")
      .in("status", ["paid", "completed"]);

    const totalSales = (orders || []).reduce((sum, o) => sum + (o.total || 0), 0);
    const formatted = totalSales.toLocaleString("en-GB", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    const newName = `Total Sales : \u00A3${formatted}`;
    LOG("Updating channel name", { channelId, newName, totalSales });

    // Update channel name
    const updateRes = await fetch(`https://discord.com/api/v10/channels/${channelId}`, {
      method: "PATCH",
      headers: discordHeaders,
      body: JSON.stringify({ name: newName }),
    });

    if (!updateRes.ok) {
      const err = await updateRes.text();
      // 429 = rate limited, not a real error
      if (updateRes.status === 429) {
        LOG("Rate limited, will update on next trigger", { err });
        return new Response(JSON.stringify({ success: true, rateLimited: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`Failed to update channel: ${err}`);
    }

    LOG("Channel updated successfully");

    return new Response(JSON.stringify({ success: true, totalSales, channelId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    LOG("Error", { error: String(error) });
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
