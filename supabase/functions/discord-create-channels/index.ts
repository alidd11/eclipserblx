import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DISCORD_API = "https://discord.com/api/v10";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const BOT_TOKEN = Deno.env.get("DISCORD_CUSTOMER_BOT_TOKEN");
  if (!BOT_TOKEN) {
    return new Response(JSON.stringify({ error: "Bot token not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { action, guild_id } = await req.json();

    const headers = {
      Authorization: `Bot ${BOT_TOKEN}`,
      "Content-Type": "application/json",
    };

    if (action === "setup") {
      // Step 1: Create "Finance Staff" role
      console.log("Creating Finance Staff role...");
      const roleRes = await fetch(`${DISCORD_API}/guilds/${guild_id}/roles`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          name: "Finance Staff",
          color: 0x2ecc71, // Green
          hoist: true,
          mentionable: false,
          permissions: "0",
        }),
      });
      if (!roleRes.ok) throw new Error(`Role creation failed: ${await roleRes.text()}`);
      const role = await roleRes.json();
      console.log(`Finance Staff role created: ${role.id}`);

      // Step 2: Get existing channels to find the ECLIPSE category
      const channelsRes = await fetch(`${DISCORD_API}/guilds/${guild_id}/channels`, { headers });
      const allChannels = await channelsRes.json();
      const eclipseCategory = allChannels.find(
        (c: any) => c.type === 4 && c.name.toUpperCase() === "ECLIPSE"
      );

      if (!eclipseCategory) {
        throw new Error("ECLIPSE category not found");
      }

      // Step 3: Create #payouts and #security channels
      const newChannels = ["payouts", "security"];
      const created: any[] = [];

      for (const name of newChannels) {
        const res = await fetch(`${DISCORD_API}/guilds/${guild_id}/channels`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            name,
            type: 0,
            parent_id: eclipseCategory.id,
          }),
        });
        if (!res.ok) {
          console.error(`Failed to create #${name}: ${await res.text()}`);
          continue;
        }
        const ch = await res.json();
        created.push({ name: ch.name, id: ch.id });
      }

      // Step 4: Lock ALL channels in the category to Finance Staff only
      // Get all channels under the ECLIPSE category (including existing ones)
      const eclipseChannels = allChannels
        .filter((c: any) => c.parent_id === eclipseCategory.id)
        .concat(created.map((c) => ({ id: c.id })));

      // Also lock the category itself
      const channelsToLock = [
        { id: eclipseCategory.id },
        ...eclipseChannels,
      ];

      // Remove duplicates by id
      const uniqueIds = [...new Set(channelsToLock.map((c: any) => c.id))];

      for (const channelId of uniqueIds) {
        // Deny @everyone (role id = guild id) VIEW_CHANNEL
        await fetch(`${DISCORD_API}/channels/${channelId}/permissions/${guild_id}`, {
          method: "PUT",
          headers,
          body: JSON.stringify({
            id: guild_id,
            type: 0, // role
            deny: "1024", // VIEW_CHANNEL
            allow: "0",
          }),
        });

        // Allow Finance Staff role VIEW_CHANNEL + READ_MESSAGE_HISTORY
        await fetch(`${DISCORD_API}/channels/${channelId}/permissions/${role.id}`, {
          method: "PUT",
          headers,
          body: JSON.stringify({
            id: role.id,
            type: 0,
            allow: "66560", // VIEW_CHANNEL (1024) + READ_MESSAGE_HISTORY (65536)
            deny: "0",
          }),
        });
      }

      // Step 5: Create webhooks for all 5 channels
      const allEclipseChannels = allChannels
        .filter((c: any) => c.parent_id === eclipseCategory.id && c.type === 0);
      // Add newly created channels
      for (const c of created) {
        if (!allEclipseChannels.find((e: any) => e.id === c.id)) {
          allEclipseChannels.push(c);
        }
      }

      const webhooks: Record<string, { id: string; url: string }> = {};

      for (const ch of allEclipseChannels) {
        const whRes = await fetch(`${DISCORD_API}/channels/${ch.id}/webhooks`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            name: `Eclipse ${ch.name} Alerts`,
          }),
        });

        if (!whRes.ok) {
          console.error(`Webhook for #${ch.name} failed: ${await whRes.text()}`);
          continue;
        }

        const wh = await whRes.json();
        webhooks[ch.name] = { id: wh.id, url: wh.url };
      }

      return new Response(JSON.stringify({
        success: true,
        role: { name: role.name, id: role.id },
        new_channels: created,
        webhooks,
        message: "All channels locked to Finance Staff role. Webhooks created.",
      }, null, 2), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
