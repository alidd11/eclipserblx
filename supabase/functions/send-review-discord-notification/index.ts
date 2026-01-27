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

    // Get the main Eclipse review webhook URL from settings
    const { data: webhookSetting } = await supabase
      .from("settings")
      .select("value")
      .eq("key", "review_discord_webhook_url")
      .maybeSingle();

    // Parse the webhook URL (it may be JSON-encoded)
    let mainWebhookUrl = webhookSetting?.value;
    if (typeof mainWebhookUrl === "string") {
      try {
        mainWebhookUrl = JSON.parse(mainWebhookUrl);
      } catch {
        // It's already a plain string
      }
    }

    // Fetch reviewer display name from profiles
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name, email")
      .eq("user_id", userId)
      .maybeSingle();

    const reviewerName = profile?.display_name || profile?.email?.split("@")[0] || "Anonymous";

    // Fetch product details including seller's webhook if it's a seller product
    let productName = "General";
    let sellerWebhookUrl: string | null = null;
    let storeName: string | null = null;

    if (productId) {
      const { data: product } = await supabase
        .from("products")
        .select("name, is_seller_product, store_id, stores(name, review_discord_webhook_url)")
        .eq("id", productId)
        .maybeSingle();
      
      if (product?.name) {
        productName = product.name;
      }

      // Check if this is a seller product and get seller's review webhook
      if (product?.is_seller_product && product.store_id) {
        const storesArray = product.stores as unknown as { 
          name?: string; 
          review_discord_webhook_url?: string 
        }[] | null;
        sellerWebhookUrl = storesArray?.[0]?.review_discord_webhook_url || null;
        storeName = storesArray?.[0]?.name || null;
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

    // Build base Discord embed
    const buildEmbed = (footerText: string) => ({
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
        ...(title ? [{
          name: "Title",
          value: title,
          inline: false,
        }] : []),
        {
          name: "Review",
          value: `"${truncatedContent}"`,
          inline: false,
        },
      ],
      footer: { text: footerText },
      timestamp: new Date().toISOString(),
    });

    // Helper function to add heart reaction to a message
    const addHeartReaction = async (webhookUrl: string, messageId: string, channelId: string) => {
      const botToken = Deno.env.get("DISCORD_BOT_TOKEN");
      if (!botToken) {
        console.log("No DISCORD_BOT_TOKEN configured, skipping reaction");
        return;
      }
      
      try {
        // Add heart reaction (❤️ = %E2%9D%A4%EF%B8%8F URL encoded)
        const reactionUrl = `https://discord.com/api/v10/channels/${channelId}/messages/${messageId}/reactions/%E2%9D%A4%EF%B8%8F/@me`;
        const reactionResponse = await fetch(reactionUrl, {
          method: "PUT",
          headers: {
            "Authorization": `Bot ${botToken}`,
            "Content-Type": "application/json",
          },
        });
        
        if (reactionResponse.ok || reactionResponse.status === 204) {
          console.log("Heart reaction added successfully", { messageId });
        } else {
          console.log("Failed to add heart reaction (non-fatal)", { 
            status: reactionResponse.status,
            messageId 
          });
        }
      } catch (error) {
        console.log("Failed to add reaction (non-fatal)", { error: String(error) });
      }
    };

    const results = {
      mainWebhook: { sent: false, skipped: false, error: null as string | null },
      sellerWebhook: { sent: false, skipped: false, error: null as string | null },
    };

    // Send to main Eclipse webhook
    if (mainWebhookUrl) {
      try {
        // Add ?wait=true to get message ID back
        const webhookUrlWithWait = mainWebhookUrl.includes('?') 
          ? `${mainWebhookUrl}&wait=true` 
          : `${mainWebhookUrl}?wait=true`;

        const discordResponse = await fetch(webhookUrlWithWait, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            embeds: [buildEmbed("Eclipse Store • Reviews")],
          }),
        });

        if (discordResponse.ok) {
          console.log("Main review notification sent successfully");
          results.mainWebhook.sent = true;
          
          // Add heart reaction
          try {
            const messageData = await discordResponse.json();
            if (messageData.id && messageData.channel_id) {
              await addHeartReaction(mainWebhookUrl, messageData.id, messageData.channel_id);
            }
          } catch (parseError) {
            console.log("Could not parse response for reaction (non-fatal)");
          }
        } else {
          const errorText = await discordResponse.text();
          console.error("Main Discord webhook failed:", discordResponse.status, errorText);
          results.mainWebhook.error = errorText;
        }
      } catch (error) {
        console.error("Main webhook error:", error);
        results.mainWebhook.error = error instanceof Error ? error.message : "Unknown error";
      }
    } else {
      console.log("No main review webhook URL configured, skipping");
      results.mainWebhook.skipped = true;
    }

    // Send to seller webhook if configured
    if (sellerWebhookUrl) {
      try {
        // Add ?wait=true to get message ID back
        const sellerWebhookWithWait = sellerWebhookUrl.includes('?') 
          ? `${sellerWebhookUrl}&wait=true` 
          : `${sellerWebhookUrl}?wait=true`;

        const sellerResponse = await fetch(sellerWebhookWithWait, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            embeds: [buildEmbed(`${storeName || 'Your Store'} • Eclipse Store`)],
          }),
        });

        if (sellerResponse.ok) {
          console.log("Seller review notification sent successfully");
          results.sellerWebhook.sent = true;
          
          // Add heart reaction
          try {
            const messageData = await sellerResponse.json();
            if (messageData.id && messageData.channel_id) {
              await addHeartReaction(sellerWebhookUrl, messageData.id, messageData.channel_id);
            }
          } catch (parseError) {
            console.log("Could not parse seller response for reaction (non-fatal)");
          }
        } else {
          const errorText = await sellerResponse.text();
          console.error("Seller Discord webhook failed:", sellerResponse.status, errorText);
          results.sellerWebhook.error = errorText;
        }
      } catch (error) {
        console.error("Seller webhook error:", error);
        results.sellerWebhook.error = error instanceof Error ? error.message : "Unknown error";
      }
    } else {
      console.log("No seller review webhook configured, skipping seller notification");
      results.sellerWebhook.skipped = true;
    }

    console.log("Review notification processing complete:", results);

    return new Response(
      JSON.stringify({ success: true, results }),
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
