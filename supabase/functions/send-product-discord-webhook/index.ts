import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ProductPayload {
  product_id: string;
  product_name: string;
  product_slug: string;
  product_price: number;
  product_description?: string;
  product_images?: string[];
  category_name?: string;
  category_slug?: string;
  robux_price?: number;
  robux_enabled?: boolean;
}

interface WebhookField {
  id: string;
  name: string;
  value: string;
  inline: boolean;
  enabled: boolean;
}

interface WebhookTemplate {
  title: string;
  titleEmoji: string;
  color: string;
  threadNameFormat: string;
  showTimestamp: boolean;
  showThumbnail: boolean;
  showMainImage: boolean;
  showAdditionalImages: boolean;
  fields: WebhookField[];
}

const DEFAULT_TEMPLATE: WebhookTemplate = {
  title: "{titleEmoji} Eclipse - {product_name}",
  titleEmoji: "🏠",
  color: "#9b59b6",
  threadNameFormat: "Eclipse - {product_name}",
  showTimestamp: true,
  showThumbnail: true,
  showMainImage: true,
  showAdditionalImages: true,
  fields: [
    {
      id: "product_info",
      name: "📦 Product Information",
      value: "The following product is made for Roblox.\n\n{product_description}",
      inline: false,
      enabled: true,
    },
    {
      id: "category_info",
      name: "📋 {category_name} Info",
      value: "This product is from our {category_name} collection.",
      inline: false,
      enabled: true,
    },
    {
      id: "purchase_locations",
      name: "🛒 Purchase Locations",
      value: "{robux_line}💷 **{gbp_price}** - Our Store\n🌙 **{eclipse_plus_price}** - Eclipse+ Members (30% off)",
      inline: false,
      enabled: true,
    },
    {
      id: "support",
      name: "💬 Need Help?",
      value: "For assistance, contact our support team.",
      inline: false,
      enabled: true,
    },
  ],
};

// Helper to convert category name to slug format
function categoryNameToSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "_")
    .replace(/-+/g, "_")
    .replace(/^_+|_+$/g, "");
}

// Apply placeholders to a string
function applyPlaceholders(
  text: string,
  payload: ProductPayload,
  extras: {
    gbpPrice: string;
    eclipsePlusPrice: string;
    robuxPrice: string | null;
    robuxLine: string;
    description: string;
    productUrl: string;
  }
): string {
  return text
    .replace(/{product_name}/g, payload.product_name)
    .replace(/{product_description}/g, extras.description)
    .replace(/{product_url}/g, extras.productUrl)
    .replace(/{category_name}/g, payload.category_name || "Products")
    .replace(/{gbp_price}/g, extras.gbpPrice)
    .replace(/{eclipse_plus_price}/g, extras.eclipsePlusPrice)
    .replace(/{robux_price}/g, extras.robuxPrice || "")
    .replace(/{robux_line}/g, extras.robuxLine);
}

// Delete existing Discord thread if it exists
async function deleteExistingThread(threadId: string, botToken: string): Promise<boolean> {
  try {
    console.log(`Attempting to delete existing Discord thread: ${threadId}`);
    
    const response = await fetch(`https://discord.com/api/v10/channels/${threadId}`, {
      method: "DELETE",
      headers: {
        "Authorization": `Bot ${botToken}`,
        "Content-Type": "application/json",
      },
    });

    if (response.ok || response.status === 204) {
      console.log(`Successfully deleted Discord thread: ${threadId}`);
      return true;
    }

    // Thread might already be deleted or bot lacks permissions
    if (response.status === 404) {
      console.log(`Thread ${threadId} not found (already deleted)`);
      return true; // Consider this a success - thread is gone
    }

    const errorText = await response.text();
    console.error(`Failed to delete thread ${threadId}: ${response.status} - ${errorText}`);
    return false;
  } catch (error) {
    console.error(`Error deleting thread ${threadId}:`, error);
    return false;
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("send-product-discord-webhook: Starting...");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const discordBotToken = Deno.env.get("DISCORD_BOT_TOKEN");
    const supabase = createClient(supabaseUrl, supabaseKey);

    const payload: ProductPayload = await req.json();
    console.log("Received payload:", JSON.stringify(payload));

    // Check if product has existing Discord thread and delete it
    if (payload.product_id && discordBotToken) {
      const { data: existingProduct } = await supabase
        .from("products")
        .select("discord_thread_id, discord_message_id")
        .eq("id", payload.product_id)
        .maybeSingle();

      if (existingProduct?.discord_thread_id) {
        console.log(`Product has existing Discord thread: ${existingProduct.discord_thread_id}`);
        await deleteExistingThread(existingProduct.discord_thread_id, discordBotToken);
        // Small delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    // Determine the category slug for webhook lookup
    let categorySlug = payload.category_slug;
    if (!categorySlug && payload.category_name) {
      categorySlug = categoryNameToSlug(payload.category_name);
    }

    console.log("Looking up webhook for category slug:", categorySlug);

    // Build the settings key for this category
    const settingsKey = categorySlug ? `product_webhook_${categorySlug}` : null;

    if (!settingsKey) {
      console.log("No category provided, skipping webhook");
      return new Response(
        JSON.stringify({ skipped: true, message: "No category provided" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch the webhook URL and template from settings
    const { data: settingsData, error: settingsError } = await supabase
      .from("settings")
      .select("key, value")
      .in("key", [settingsKey, "product_webhook_template"]);

    if (settingsError) {
      console.error("Failed to fetch settings:", settingsError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch settings", details: settingsError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse settings
    let webhookUrl: string | null = null;
    let template: WebhookTemplate = DEFAULT_TEMPLATE;

    for (const setting of settingsData || []) {
      if (setting.key === settingsKey && setting.value) {
        webhookUrl = String(setting.value).replace(/^"|"$/g, "").trim();
      } else if (setting.key === "product_webhook_template" && setting.value) {
        try {
          const parsed = typeof setting.value === "string"
            ? JSON.parse(setting.value.replace(/^"|"$/g, ""))
            : setting.value;
          template = parsed as WebhookTemplate;
        } catch (e) {
          console.log("Failed to parse template, using default:", e);
        }
      }
    }

    if (!webhookUrl) {
      console.log(`No webhook configured for category: ${categorySlug} (key: ${settingsKey})`);
      return new Response(
        JSON.stringify({ skipped: true, message: `No webhook URL configured for category: ${payload.category_name || categorySlug}` }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!webhookUrl.startsWith("https://discord.com/api/webhooks/")) {
      console.log("Invalid webhook URL:", webhookUrl);
      return new Response(
        JSON.stringify({ skipped: true, message: "Invalid webhook URL" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Using template and webhook for category "${payload.category_name}"`);

    // Prepare placeholder values - Discord field limit is 1024 chars
    const rawDescription = payload.product_description
      ? payload.product_description.replace(/<[^>]*>/g, "")
      : "A new product is now available on Eclipse!";
    const description = rawDescription.length > 1000 
      ? rawDescription.substring(0, 997) + "..." 
      : rawDescription;

    const gbpPrice = `£${payload.product_price.toFixed(2)}`;
    const eclipsePlusPrice = `£${(payload.product_price * 0.7).toFixed(2)}`;
    const robuxPrice = payload.robux_enabled && payload.robux_price 
      ? `R$${payload.robux_price.toLocaleString()}` 
      : null;
    const robuxLine = robuxPrice 
      ? `🔵 **${robuxPrice}** - Eclipse Roblox Hub\n` 
      : "";
    const productUrl = `https://eclipserblx.com/products/${payload.product_slug}`;

    const placeholderExtras = {
      gbpPrice,
      eclipsePlusPrice,
      robuxPrice,
      robuxLine,
      description,
      productUrl,
    };

    // Build embed title
    const embedTitle = applyPlaceholders(
      template.title.replace(/{titleEmoji}/g, template.titleEmoji),
      payload,
      placeholderExtras
    );

    // Build embed fields from template
    const embedFields: Array<{ name: string; value: string; inline: boolean }> = [];
    for (const field of template.fields) {
      if (!field.enabled) continue;

      // Skip category info field if no category
      if (field.id === "category_info" && !payload.category_name) continue;

      const fieldName = applyPlaceholders(field.name, payload, placeholderExtras);
      const fieldValue = applyPlaceholders(field.value, payload, placeholderExtras);

      embedFields.push({
        name: fieldName,
        value: fieldValue,
        inline: field.inline,
      });
    }

    // Parse color (hex to int)
    const colorInt = parseInt(template.color.replace("#", ""), 16) || 0x9b59b6;

    // Build embed
    const embed: Record<string, unknown> = {
      title: embedTitle,
      url: productUrl,
      color: colorInt,
      fields: embedFields,
    };

    // Add timestamp if enabled
    if (template.showTimestamp) {
      embed.timestamp = new Date().toISOString();
    }

    // Add thumbnail if enabled and images available
    if (template.showThumbnail && payload.product_images && payload.product_images.length > 0) {
      embed.thumbnail = { url: payload.product_images[0] };
    }

    // Add main image if enabled
    if (template.showMainImage && payload.product_images && payload.product_images.length > 0) {
      embed.image = { url: payload.product_images[0] };
    }

    // Build the embeds array
    const embeds = [embed];

    // Add additional images as separate embeds if enabled (up to 9 more for a total of 10 - Discord's limit)
    // NOTE: Omitting the 'url' property prevents Discord from grouping images into a grid
    if (template.showAdditionalImages && payload.product_images && payload.product_images.length > 1) {
      const additionalImages = payload.product_images.slice(1, 10);
      for (const imageUrl of additionalImages) {
        embeds.push({
          image: { url: imageUrl },
          color: colorInt,
        });
      }
    }

    console.log(`Sending webhook to Discord forum channel for category: ${payload.category_name}`);

    // Build thread name from template
    const threadName = applyPlaceholders(template.threadNameFormat, payload, placeholderExtras);

    // For forum channels, we need to create a new thread using thread_name
    const forumPayload: Record<string, unknown> = {
      embeds,
      thread_name: threadName,
    };

    // Send to Discord forum channel with ?wait=true to get the response
    const webhookUrlWithWait = webhookUrl.includes("?") 
      ? `${webhookUrl}&wait=true` 
      : `${webhookUrl}?wait=true`;

    const response = await fetch(webhookUrlWithWait, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(forumPayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Discord webhook failed:", response.status, errorText);
      return new Response(
        JSON.stringify({
          error: "Discord webhook failed",
          status: response.status,
          details: errorText,
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse the response to get message and thread IDs
    let newThreadId: string | null = null;
    let newMessageId: string | null = null;

    try {
      const responseData = await response.json();
      console.log("Discord webhook response:", JSON.stringify(responseData));
      
      // For forum webhooks, channel_id is the thread ID
      newMessageId = responseData.id || null;
      newThreadId = responseData.channel_id || null;
      
      console.log(`New Discord thread ID: ${newThreadId}, message ID: ${newMessageId}`);
    } catch (e) {
      console.log("Could not parse webhook response:", e);
    }

    // Update the product with the new Discord thread/message IDs
    if (payload.product_id && (newThreadId || newMessageId)) {
      const { error: updateError } = await supabase
        .from("products")
        .update({
          discord_thread_id: newThreadId,
          discord_message_id: newMessageId,
        })
        .eq("id", payload.product_id);

      if (updateError) {
        console.error("Failed to update product with Discord IDs:", updateError);
      } else {
        console.log(`Updated product ${payload.product_id} with Discord thread ID: ${newThreadId}`);
      }
    }

    console.log(`Product Discord notification sent successfully to ${payload.category_name} forum`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Product notification sent to ${payload.category_name} Discord forum`,
        discord_thread_id: newThreadId,
        discord_message_id: newMessageId,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("send-product-discord-webhook error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
