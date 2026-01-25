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

// Helper to convert category name to slug format
function categoryNameToSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "_")
    .replace(/-+/g, "_")
    .replace(/^_+|_+$/g, "");
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

    // Fetch the webhook URL for this category from settings
    const { data: settingsData, error: settingsError } = await supabase
      .from("settings")
      .select("value")
      .eq("key", settingsKey)
      .maybeSingle();

    if (settingsError) {
      console.error("Failed to fetch webhook URL:", settingsError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch settings", details: settingsError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!settingsData?.value) {
      console.log(`No webhook configured for category: ${categorySlug} (key: ${settingsKey})`);
      return new Response(
        JSON.stringify({ skipped: true, message: `No webhook URL configured for category: ${payload.category_name || categorySlug}` }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Clean webhook URL (remove JSON quotes if present)
    const webhookUrl = String(settingsData.value).replace(/^"|"$/g, "").trim();
    
    if (!webhookUrl || !webhookUrl.startsWith("https://discord.com/api/webhooks/")) {
      console.log("Invalid webhook URL:", webhookUrl);
      return new Response(
        JSON.stringify({ skipped: true, message: "Invalid webhook URL" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Using webhook for category "${payload.category_name}": ${settingsKey}`);

    // Build the description
    const description = payload.product_description 
      ? payload.product_description.replace(/<[^>]*>/g, "").substring(0, 300) + (payload.product_description.length > 300 ? "..." : "")
      : "A new product is now available on Eclipse!";

    // Format prices
    const gbpPrice = `£${payload.product_price.toFixed(2)}`;
    const eclipsePlusPrice = `£${(payload.product_price * 0.7).toFixed(2)}`; // 30% off
    const robuxPrice = payload.robux_enabled && payload.robux_price ? `R$${payload.robux_price.toLocaleString()}` : null;

    // Generate category disclaimer
    let categoryDisclaimer = "";
    if (payload.category_name) {
      const cat = payload.category_name.toLowerCase();
      if (cat.includes("saver") || cat.includes("budget")) {
        categoryDisclaimer = "This product is part of our Savers range - great value for money!";
      } else if (cat.includes("premium") || cat.includes("exclusive")) {
        categoryDisclaimer = "This is a Premium product with exclusive features and priority support.";
      } else if (cat.includes("bundle") || cat.includes("pack")) {
        categoryDisclaimer = "This bundle includes multiple items at a discounted price.";
      } else {
        categoryDisclaimer = `This product is from our ${payload.category_name} collection.`;
      }
    }

    // Build purchase locations field
    let purchaseLocations = "";
    if (robuxPrice) {
      purchaseLocations += `🔵 **${robuxPrice}** - Eclipse Roblox Hub\n`;
    }
    purchaseLocations += `💷 **${gbpPrice}** - Our Store\n`;
    purchaseLocations += `🌙 **${eclipsePlusPrice}** - Eclipse+ Members (30% off)`;

    // Build embed
    const embed: Record<string, unknown> = {
      title: `🏠 Eclipse - ${payload.product_name}`,
      url: `https://roleplay-hub-shop.lovable.app/product/${payload.product_slug}`,
      color: 0x9b59b6, // Purple theme
      fields: [
        {
          name: "📦 Product Information",
          value: `The following product is made for Roblox.\n\n${description}`,
          inline: false,
        },
        {
          name: "🛒 Purchase Locations",
          value: purchaseLocations,
          inline: false,
        },
      ],
      timestamp: new Date().toISOString(),
    };

    // Add category disclaimer if available
    if (categoryDisclaimer && payload.category_name) {
      embed.fields = [
        ...(embed.fields as Array<Record<string, unknown>>).slice(0, 1),
        {
          name: `📋 ${payload.category_name} Info`,
          value: categoryDisclaimer,
          inline: false,
        },
        ...(embed.fields as Array<Record<string, unknown>>).slice(1),
      ];
    }

    // Add support field
    (embed.fields as Array<Record<string, unknown>>).push({
      name: "💬 Need Help?",
      value: "For assistance, contact our support team.",
      inline: false,
    });

    // Add first image as thumbnail if available
    if (payload.product_images && payload.product_images.length > 0) {
      embed.thumbnail = { url: payload.product_images[0] };
      
      // Add as main image too if only one
      if (payload.product_images.length === 1) {
        embed.image = { url: payload.product_images[0] };
      }
    }

    // Build the embeds array - Discord supports up to 4 images in one message using multiple embeds
    const embeds = [embed];

    // Add additional images as separate embeds (up to 3 more for a total of 4)
    if (payload.product_images && payload.product_images.length > 1) {
      const additionalImages = payload.product_images.slice(1, 4);
      for (const imageUrl of additionalImages) {
        embeds.push({
          url: `https://roleplay-hub-shop.lovable.app/product/${payload.product_slug}`,
          image: { url: imageUrl },
          color: 0x9b59b6,
        });
      }
    }

    console.log(`Sending webhook to Discord forum channel for category: ${payload.category_name}`);

    // For forum channels, we need to create a new thread using thread_name
    // This creates a new post in the forum channel
    const forumPayload: Record<string, unknown> = {
      embeds,
      thread_name: `Eclipse - ${payload.product_name}`, // This creates a new forum post
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
          details: errorText 
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
