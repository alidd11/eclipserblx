import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AnnouncementRequest {
  type: 'custom' | 'update' | 'maintenance' | 'event';
  title: string;
  message: string;
  linkUrl?: string;
}

function getEmbedConfig(type: string) {
  switch (type) {
    case 'update':
      return { color: 0x3B82F6, emoji: '🚀', label: 'Platform Update' };
    case 'maintenance':
      return { color: 0xF59E0B, emoji: '🔧', label: 'Maintenance Notice' };
    case 'event':
      return { color: 0x10B981, emoji: '🎉', label: 'Community Event' };
    default:
      return { color: 0x8B5CF6, emoji: '📢', label: 'Announcement' };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch community webhook URL from settings
    const { data: settings } = await supabase
      .from("settings")
      .select("key, value")
      .in("key", ["community_discord_webhook_url", "discord_webhook_url"])
      .order("key");

    const settingsMap: Record<string, string> = {};
    settings?.forEach((s: { key: string; value: string }) => {
      const val = typeof s.value === 'string' ? s.value.replace(/^"|"$/g, '') : s.value;
      settingsMap[s.key] = val;
    });

    // Use dedicated community webhook, fallback to main webhook
    const webhookUrl = settingsMap["community_discord_webhook_url"] || settingsMap["discord_webhook_url"];
    
    if (!webhookUrl) {
      console.error("Community Discord webhook URL not configured");
      return new Response(
        JSON.stringify({ error: "Discord webhook not configured. Please set community_discord_webhook_url in Admin → Discord Settings." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: AnnouncementRequest = await req.json();
    const { type, title, message, linkUrl } = body;

    if (!title || !message) {
      return new Response(
        JSON.stringify({ error: "Title and message are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const config = getEmbedConfig(type);
    
    const fields: Array<{ name: string; value: string; inline: boolean }> = [];
    
    if (linkUrl) {
      fields.push({
        name: "🔗 Learn More",
        value: `[**Click here →**](${linkUrl})`,
        inline: false,
      });
    }

    const embed = {
      title: `${config.emoji} ${title}`,
      description: message,
      color: config.color,
      fields: fields.length > 0 ? fields : undefined,
      footer: {
        text: `Eclipse Marketplace • ${config.label}`,
      },
      timestamp: new Date().toISOString(),
    };

    console.log("Sending community announcement to Discord...", { type, title });

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        embeds: [embed],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Discord webhook error:", errorText);
      return new Response(
        JSON.stringify({ error: "Failed to send Discord message", details: errorText }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Community announcement sent successfully");

    return new Response(
      JSON.stringify({ success: true, message: "Announcement sent to Discord" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error sending community announcement:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
