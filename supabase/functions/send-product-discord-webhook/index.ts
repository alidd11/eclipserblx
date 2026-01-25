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

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("send-product-discord-webhook: Starting...");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const payload: ProductPayload = await req.json();
    console.log("Received payload:", JSON.stringify(payload));

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

    // Prepare placeholder values
    const description = payload.product_description
      ? payload.product_description.replace(/<[^>]*>/g, "").substring(0, 300) + 
        (payload.product_description.length > 300 ? "..." : "")
      : "A new product is now available on Eclipse!";

    const gbpPrice = `£${payload.product_price.toFixed(2)}`;
    const eclipsePlusPrice = `£${(payload.product_price * 0.7).toFixed(2)}`;
    const robuxPrice = payload.robux_enabled && payload.robux_price 
      ? `R$${payload.robux_price.toLocaleString()}` 
      : null;
    const robuxLine = robuxPrice 
      ? `🔵 **${robuxPrice}** - Eclipse Roblox Hub\n` 
      : "";
    const productUrl = `https://roleplay-hub-shop.lovable.app/product/${payload.product_slug}`;

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

    // Add additional images as separate embeds if enabled (up to 3 more for a total of 4)
    if (template.showAdditionalImages && payload.product_images && payload.product_images.length > 1) {
      const additionalImages = payload.product_images.slice(1, 4);
      for (const imageUrl of additionalImages) {
        embeds.push({
          url: productUrl,
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

    // Send to Discord forum channel
    const response = await fetch(webhookUrl, {
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

    console.log(`Product Discord notification sent successfully to ${payload.category_name} forum`);

    return new Response(
      JSON.stringify({ success: true, message: `Product notification sent to ${payload.category_name} Discord forum` }),
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
