import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const botToken = Deno.env.get("DISCORD_CUSTOMER_BOT_TOKEN");
    if (!botToken) throw new Error("No bot token");

    const GUILD_ID = "1485822444404080831";
    const headers = { Authorization: `Bot ${botToken}`, "Content-Type": "application/json" };

    // Get existing channels to find ECLIPSE category
    const chRes = await fetch(`https://discord.com/api/v10/guilds/${GUILD_ID}/channels`, { headers });
    const channels = await chRes.json();
    
    const eclipseCategory = channels.find((c: any) => c.type === 4 && c.name?.toUpperCase() === "ECLIPSE");
    if (!eclipseCategory) throw new Error("ECLIPSE category not found");

    // Find Finance Staff role
    const rolesRes = await fetch(`https://discord.com/api/v10/guilds/${GUILD_ID}/roles`, { headers });
    const roles = await rolesRes.json();
    const staffRole = roles.find((r: any) => r.name === "Finance Staff");
    const everyoneRole = roles.find((r: any) => r.name === "@everyone");

    // Create #daily-reports channel under ECLIPSE category, locked to Finance Staff
    const permOverwrites = [];
    if (everyoneRole) {
      permOverwrites.push({ id: everyoneRole.id, type: 0, deny: "1024" }); // deny VIEW
    }
    if (staffRole) {
      permOverwrites.push({ id: staffRole.id, type: 0, allow: "1024" }); // allow VIEW
    }

    const createRes = await fetch(`https://discord.com/api/v10/guilds/${GUILD_ID}/channels`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        name: "daily-reports",
        type: 0,
        parent_id: eclipseCategory.id,
        topic: "Automated daily revenue summaries",
        permission_overwrites: permOverwrites,
      }),
    });

    if (!createRes.ok) {
      const err = await createRes.text();
      throw new Error(`Failed to create channel: ${err}`);
    }

    const newChannel = await createRes.json();
    console.log("Created channel:", newChannel.id);

    // Create webhook for the channel
    const whRes = await fetch(`https://discord.com/api/v10/channels/${newChannel.id}/webhooks`, {
      method: "POST",
      headers,
      body: JSON.stringify({ name: "Eclipse Daily Reports" }),
    });

    if (!whRes.ok) {
      const err = await whRes.text();
      throw new Error(`Failed to create webhook: ${err}`);
    }

    const webhook = await whRes.json();
    const webhookUrl = `https://discord.com/api/webhooks/${webhook.id}/${webhook.token}`;
    console.log("Created webhook for daily-reports");

    // Store in settings
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    await supabase.from("settings").upsert({
      key: "finance_webhook_daily_report",
      value: webhookUrl,
    }, { onConflict: "key" });

    return new Response(JSON.stringify({
      success: true,
      channel_id: newChannel.id,
      message: "Created #daily-reports channel with webhook",
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
