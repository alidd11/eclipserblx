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
  is_resellable?: boolean;
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
      value: "{robux_line}💷 **{gbp_price}** — [Our Store]({product_url}){eclipse_plus_line}",
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
    robuxPrice: string;
    robuxLine: string;
    eclipsePlusLine: string;
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
    .replace(/{robux_price}/g, extras.robuxPrice)
    .replace(/{robux_line}/g, extras.robuxLine)
    .replace(/{eclipse_plus_line}/g, extras.eclipsePlusLine);
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
    // Convert paragraph/line break tags to newlines, then strip remaining HTML
    const rawDescription = payload.product_description
      ? payload.product_description
          // First, handle list structures properly
          .replace(/<ul[^>]*>/gi, "")  // Remove opening ul tags
          .replace(/<\/ul>/gi, "\n")  // Closing ul = newline
          .replace(/<ol[^>]*>/gi, "")  // Remove opening ol tags
          .replace(/<\/ol>/gi, "\n")  // Closing ol = newline
          .replace(/<li[^>]*>/gi, "• ")  // Add bullet for list items
          .replace(/<\/li>/gi, "\n")  // List item end = newline
          // Handle paragraphs
          .replace(/<p>\s*<\/p>/gi, "\n")  // Empty paragraphs = single newline
          .replace(/<\/p>/gi, "\n")  // Regular paragraphs = single newline
          .replace(/<p[^>]*>/gi, "")  // Remove opening p tags
          // Handle other elements
          .replace(/<br\s*\/?>/gi, "\n")  // Line breaks = single newline
          .replace(/<strong[^>]*>/gi, "**")  // Bold start
          .replace(/<\/strong>/gi, "**")  // Bold end
          .replace(/<em[^>]*>/gi, "*")  // Italic start
          .replace(/<\/em>/gi, "*")  // Italic end
          .replace(/<[^>]*>/g, "")  // Strip remaining HTML tags
          .replace(/&nbsp;/g, " ")  // Replace HTML spaces
          .replace(/&amp;/g, "&")  // Replace HTML ampersands
          .replace(/&lt;/g, "<")  // Replace HTML less than
          .replace(/&gt;/g, ">")  // Replace HTML greater than
          .replace(/\n{3,}/g, "\n\n")  // Collapse 3+ newlines to double
          .replace(/• \n/g, "• ")  // Fix bullet followed by immediate newline
          .replace(/:\s*\n•/g, ":\n•")  // Fix colon spacing before bullets
          .trim()
      : "A new product is now available on Eclipse!";
    const description = rawDescription.length > 900 
      ? rawDescription.substring(0, 897) + "..." 
      : rawDescription;

    const gbpPrice = `£${payload.product_price.toFixed(2)}`;
    const eclipsePlusPrice = `£${(payload.product_price * 0.7).toFixed(2)}`;
    
    // Only provide robux values if robux is enabled AND has a price
    const hasRobux = payload.robux_enabled && payload.robux_price;
    const robuxPrice = hasRobux ? `R$${payload.robux_price!.toLocaleString()}` : "";
    const robuxLine = hasRobux 
      ? `<:Robux:1145238657427578911>  **R$${payload.robux_price!.toLocaleString()}** - [Roblox Hub](https://www.roblox.com/games/14585849356/KILLr-Projects-Hub)\n` 
      : "";
    const productUrl = `https://eclipserblx.com/products/${payload.product_slug}`;

    // Check if product is eligible for Eclipse+ discount (not resellable, not Eclipse Savers category)
    const isEclipseSavers = payload.category_slug === "eclipse_savers" || 
                            payload.category_name?.toLowerCase() === "eclipse savers";
    const isEligibleForEclipsePlus = !payload.is_resellable && !isEclipseSavers;
    
    // Only show Eclipse+ line if product is eligible for the discount
    const eclipsePlusLine = isEligibleForEclipsePlus 
      ? `\n🌙 **${eclipsePlusPrice}** — Eclipse+ (30% off)`
      : "";

    const placeholderExtras = {
      gbpPrice,
      eclipsePlusPrice,
      robuxPrice,
      robuxLine,
      eclipsePlusLine,
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

      let fieldName = applyPlaceholders(field.name, payload, placeholderExtras);
      let fieldValue = applyPlaceholders(field.value, payload, placeholderExtras);

      // For purchase_locations, filter out Robux line if not enabled
      if (field.id === "purchase_locations" && !hasRobux) {
        fieldValue = fieldValue
          .split('\n')
          .filter(line => {
            // Remove Robux lines if robux is not enabled
            const isRobuxLine = line.includes(':Robux:') || line.includes('Roblox Hub') || line.includes('R$');
            return !isRobuxLine;
          })
          .join('\n');
      }

      // Skip fields with empty values
      if (!fieldValue || fieldValue.trim() === '') continue;

      // Skip fields with empty names (Discord requires field names)
      if (!fieldName || fieldName.trim() === '') {
        console.log(`Skipping field with empty name: ${field.id}`);
        continue;
      }

      // Validate Discord field limits
      if (fieldName.length > 256) {
        console.log(`Field name too long (${fieldName.length} chars), truncating: ${field.id}`);
        fieldName = fieldName.substring(0, 253) + '...';
      }
      
      if (fieldValue.length > 1024) {
        console.log(`Field value too long (${fieldValue.length} chars), truncating: ${field.id}`);
        fieldValue = fieldValue.substring(0, 1021) + '...';
      }

      embedFields.push({
        name: fieldName,
        value: fieldValue,
        inline: field.inline,
      });
    }

    // Validate we have at least one field
    if (embedFields.length === 0) {
      console.error('No valid embed fields generated, cannot send webhook');
      return new Response(
        JSON.stringify({ error: "No valid embed fields generated" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate total fields count
    if (embedFields.length > 25) {
      console.log(`Too many fields (${embedFields.length}), limiting to 25`);
      embedFields.splice(25);
    }

    // Parse color (hex to int)
    const colorInt = parseInt(template.color.replace("#", ""), 16) || 0x9b59b6;

    // Validate embed title
    let embedTitleFinal = embedTitle;
    if (!embedTitleFinal || embedTitleFinal.trim() === '') {
      console.log('Empty embed title, using fallback');
      embedTitleFinal = `Eclipse - ${payload.product_name}`;
    }
    if (embedTitleFinal.length > 256) {
      console.log(`Embed title too long (${embedTitleFinal.length} chars), truncating`);
      embedTitleFinal = embedTitleFinal.substring(0, 253) + '...';
    }

    // Build embed
    const embed: Record<string, unknown> = {
      title: embedTitleFinal,
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

    // Log payload for debugging (limit to first embed only to avoid huge logs)
    console.log('Sending webhook with payload:', JSON.stringify({
      thread_name: threadName,
      embed_title: embed.title,
      embed_field_count: embedFields.length,
      embed_count: embeds.length,
      has_thumbnail: !!embed.thumbnail,
      has_image: !!embed.image,
      has_timestamp: !!embed.timestamp
    }));

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
