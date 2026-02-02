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
  store_id?: string;
  store_name?: string;
  store_logo_url?: string;
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

// Convert HTML description to plain text
function htmlToPlainText(html: string): string {
  return html
    .replace(/<ul[^>]*>/gi, "")
    .replace(/<\/ul>/gi, "\n")
    .replace(/<ol[^>]*>/gi, "")
    .replace(/<\/ol>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<\/li>/gi, "\n")
    .replace(/<p>\s*<\/p>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<p[^>]*>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<strong[^>]*>/gi, "**")
    .replace(/<\/strong>/gi, "**")
    .replace(/<em[^>]*>/gi, "*")
    .replace(/<\/em>/gi, "*")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/• \n/g, "• ")
    .replace(/:\s*\n•/g, ":\n•")
    .trim();
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

    if (response.status === 404) {
      console.log(`Thread ${threadId} not found (already deleted)`);
      return true;
    }

    const errorText = await response.text();
    console.error(`Failed to delete thread ${threadId}: ${response.status} - ${errorText}`);
    return false;
  } catch (error) {
    console.error(`Error deleting thread ${threadId}:`, error);
    return false;
  }
}

// Format price for display
function formatPrice(price: number, currency: string = "GBP"): string {
  if (currency === "GBP") {
    return `£${price.toFixed(2)}`;
  }
  return `$${price.toFixed(2)}`;
}

// Format relative time for Discord timestamp
function getDiscordTimestamp(): string {
  const now = Math.floor(Date.now() / 1000);
  return `<t:${now}:R>`;
}

Deno.serve(async (req) => {
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
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    // Determine the category slug for webhook lookup
    let categorySlug = payload.category_slug;
    if (!categorySlug && payload.category_name) {
      categorySlug = categoryNameToSlug(payload.category_name);
    }

    console.log("Looking up webhook for category slug:", categorySlug);

    const settingsKey = categorySlug ? `product_webhook_${categorySlug}` : null;

    if (!settingsKey) {
      console.log("No category provided, skipping webhook");
      return new Response(
        JSON.stringify({ skipped: true, message: "No category provided" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch the webhook URL from settings
    const { data: settingsData, error: settingsError } = await supabase
      .from("settings")
      .select("key, value")
      .eq("key", settingsKey);

    if (settingsError) {
      console.error("Failed to fetch settings:", settingsError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch settings", details: settingsError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let webhookUrl: string | null = null;
    for (const setting of settingsData || []) {
      if (setting.key === settingsKey && setting.value) {
        webhookUrl = String(setting.value).replace(/^"|"$/g, "").trim();
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

    // Fetch store info if we have a product_id but no store info
    let storeName = payload.store_name || "Eclipse Marketplace";
    let storeLogoUrl = payload.store_logo_url;

    if (payload.product_id && (!payload.store_name || !payload.store_logo_url)) {
      const { data: productData } = await supabase
        .from("products")
        .select(`
          store_id,
          stores(
            id,
            name,
            logo_url
          )
        `)
        .eq("id", payload.product_id)
        .maybeSingle();

      if (productData?.stores) {
        // Handle both single object and array responses
        const storeData = Array.isArray(productData.stores) 
          ? productData.stores[0] 
          : productData.stores;
        if (storeData) {
          storeName = storeData.name || storeName;
          storeLogoUrl = storeData.logo_url || storeLogoUrl;
        }
      }
    }

    // Prepare description - clean HTML and truncate
    const rawDescription = payload.product_description
      ? htmlToPlainText(payload.product_description)
      : "A new product is now available!";

    // Check eligibility for member pricing display
    const categorySlugNormalized = (payload.category_slug || "").toLowerCase();
    const categoryNameNormalized = (payload.category_name || "").toLowerCase();
    const isEclipseSavers =
      categorySlugNormalized === "eclipse_savers" ||
      categorySlugNormalized === "eclipse-savers" ||
      categoryNameNormalized === "eclipse savers";
    const isEligibleForEclipsePlus = !payload.is_resellable && !isEclipseSavers;

    // Strip member pricing references for ineligible products
    let cleanedDescription = rawDescription;
    if (!isEligibleForEclipsePlus) {
      cleanedDescription = rawDescription
        .replace(/eclipse\+/gi, "")
        .replace(/eclipse plus/gi, "")
        .replace(/30%\s*off/gi, "")
        .replace(/member\s*price/gi, "")
        .replace(/member\s*discount/gi, "")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
    }

    // Truncate description to Discord's limits
    const description = cleanedDescription.length > 900
      ? cleanedDescription.substring(0, 897) + "..."
      : cleanedDescription;

    const productUrl = `https://eclipserblx.com/products/${payload.product_slug}`;
    const priceDisplay = formatPrice(payload.product_price);

    // Build ClearlyDev-style embed
    // Author = Store branding
    // Title = Product name (linked)
    // Description = Product description
    // Fields = Category, Price, Published (with emojis)
    // Image = Product image
    // Footer = Site branding

    const embed: Record<string, unknown> = {
      author: {
        name: storeName,
        icon_url: storeLogoUrl || undefined,
      },
      title: payload.product_name,
      url: productUrl,
      description: description,
      color: 0x5865F2, // Discord blurple for consistent marketplace look
      fields: [
        {
          name: "📁 Category",
          value: payload.category_name || "Products",
          inline: false,
        },
        {
          name: "💰 Price",
          value: priceDisplay,
          inline: false,
        },
        {
          name: "📅 Published",
          value: getDiscordTimestamp(),
          inline: false,
        },
      ],
      footer: {
        text: `View on eclipserblx.com`,
      },
      timestamp: new Date().toISOString(),
    };

    // Add product image if available
    if (payload.product_images && payload.product_images.length > 0) {
      embed.image = { url: payload.product_images[0] };
    }

    // Build embeds array - add additional images as separate embeds (up to Discord's 10 limit)
    const embeds = [embed];
    if (payload.product_images && payload.product_images.length > 1) {
      const additionalImages = payload.product_images.slice(1, 10);
      for (const imageUrl of additionalImages) {
        embeds.push({
          image: { url: imageUrl },
          color: 0x5865F2,
        });
      }
    }

    console.log(`Sending ClearlyDev-style webhook for: ${payload.product_name}`);

    // Build thread name for forum channels
    const threadName = `${storeName} - ${payload.product_name}`;

    const forumPayload: Record<string, unknown> = {
      embeds,
      thread_name: threadName.length > 100 ? threadName.substring(0, 97) + "..." : threadName,
    };

    console.log('Sending webhook with payload:', JSON.stringify({
      thread_name: threadName,
      store_name: storeName,
      product_name: payload.product_name,
      embed_count: embeds.length,
    }));

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

    // Parse response for thread/message IDs
    let newThreadId: string | null = null;
    let newMessageId: string | null = null;

    try {
      const responseData = await response.json();
      console.log("Discord webhook response:", JSON.stringify(responseData));
      newMessageId = responseData.id || null;
      newThreadId = responseData.channel_id || null;
      console.log(`New Discord thread ID: ${newThreadId}, message ID: ${newMessageId}`);
    } catch (e) {
      console.log("Could not parse webhook response:", e);
    }

    // Update product with Discord thread/message IDs
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

    console.log(`Product Discord notification sent successfully for ${storeName}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Product notification sent to Discord`,
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
