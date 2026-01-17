import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ReviewNotificationPayload {
  reviewId: string;
  rating: number;
  title?: string;
  content: string;
  userId: string;
  productId?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload: ReviewNotificationPayload = await req.json();
    const { reviewId, rating, title, content, userId, productId } = payload;

    console.log("Received review notification request:", { reviewId, rating, userId, productId });

    // Get the review webhook URL from settings
    const { data: webhookSetting, error: settingsError } = await supabase
      .from("settings")
      .select("value")
      .eq("key", "review_discord_webhook_url")
      .maybeSingle();

    if (settingsError) {
      console.error("Error fetching webhook setting:", settingsError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch webhook setting" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse the webhook URL (it may be JSON-encoded)
    let webhookUrl = webhookSetting?.value;
    if (typeof webhookUrl === "string") {
      try {
        webhookUrl = JSON.parse(webhookUrl);
      } catch {
        // It's already a plain string
      }
    }

    if (!webhookUrl) {
      console.log("No review webhook URL configured, skipping notification");
      return new Response(
        JSON.stringify({ skipped: true, message: "No webhook URL configured" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch reviewer display name from profiles
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name, email")
      .eq("user_id", userId)
      .maybeSingle();

    const reviewerName = profile?.display_name || profile?.email?.split("@")[0] || "Anonymous";

    // Fetch product name if productId exists
    let productName = "General";
    if (productId) {
      const { data: product } = await supabase
        .from("products")
        .select("name")
        .eq("id", productId)
        .maybeSingle();
      
      if (product?.name) {
        productName = product.name;
      }
    }

    // Generate star rating display
    const starsFilled = "★".repeat(rating);
    const starsEmpty = "☆".repeat(5 - rating);
    const starsDisplay = `${starsFilled}${starsEmpty} (${rating}/5)`;

    // Truncate content if too long
    const truncatedContent = content.length > 500 
      ? content.substring(0, 497) + "..." 
      : content;

    // Build Discord embed
    const embed = {
      title: "⭐ New Review",
      color: 0xf59e0b, // Amber color
      fields: [
        {
          name: "Rating",
          value: starsDisplay,
          inline: true,
        },
        {
          name: "Product",
          value: productName,
          inline: true,
        },
        {
          name: "Reviewer",
          value: reviewerName,
          inline: true,
        },
      ],
      timestamp: new Date().toISOString(),
    };

    // Add title if provided
    if (title) {
      embed.fields.push({
        name: "Title",
        value: title,
        inline: false,
      });
    }

    // Add review content
    embed.fields.push({
      name: "Review",
      value: `"${truncatedContent}"`,
      inline: false,
    });

    // Send to Discord
    const discordResponse = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        embeds: [embed],
      }),
    });

    if (!discordResponse.ok) {
      const errorText = await discordResponse.text();
      console.error("Discord webhook failed:", discordResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: "Discord webhook failed", details: errorText }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Review notification sent successfully for review:", reviewId);

    return new Response(
      JSON.stringify({ success: true, message: "Review notification sent" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in send-review-discord-notification:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
