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
    return new Response(JSON.stringify({ error: "DISCORD_CUSTOMER_BOT_TOKEN not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { guild_id, category_name, channels } = await req.json();

    if (!guild_id || !category_name || !channels?.length) {
      return new Response(JSON.stringify({ error: "guild_id, category_name, and channels[] are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const headers = {
      Authorization: `Bot ${BOT_TOKEN}`,
      "Content-Type": "application/json",
    };

    // 1. Create the category (type 4)
    console.log(`Creating category: ${category_name}`);
    const categoryRes = await fetch(`${DISCORD_API}/guilds/${guild_id}/channels`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        name: category_name,
        type: 4,
      }),
    });

    if (!categoryRes.ok) {
      const err = await categoryRes.text();
      throw new Error(`Failed to create category [${categoryRes.status}]: ${err}`);
    }

    const category = await categoryRes.json();
    console.log(`Category created: ${category.id}`);

    // 2. Create each text channel under the category
    const created: { name: string; id: string }[] = [];

    for (const channelName of channels) {
      console.log(`Creating channel: ${channelName}`);
      const channelRes = await fetch(`${DISCORD_API}/guilds/${guild_id}/channels`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          name: channelName,
          type: 0,
          parent_id: category.id,
        }),
      });

      if (!channelRes.ok) {
        const err = await channelRes.text();
        console.error(`Failed to create channel ${channelName}: ${err}`);
        continue;
      }

      const channel = await channelRes.json();
      created.push({ name: channel.name, id: channel.id });
    }

    return new Response(JSON.stringify({
      success: true,
      category: { name: category.name, id: category.id },
      channels: created,
    }), {
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
