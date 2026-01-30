import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// BotGhost Integration API for Eclipse Customer Portal
// This endpoint can be called by BotGhost custom commands via HTTP requests

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
};

interface BotGhostRequest {
  action: "link" | "profile" | "purchases" | "download" | "verify_code";
  discord_id: string;
  discord_username?: string;
  code?: string; // For link verification
  product_name?: string; // For download
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Verify API key (set this in BotGhost's HTTP request headers)
    const apiKey = req.headers.get("x-api-key");
    const expectedKey = Deno.env.get("BOTGHOST_API_KEY");
    
    if (!expectedKey) {
      console.error("[botghost-customer-api] BOTGHOST_API_KEY not configured");
      return jsonResponse({ success: false, error: "API not configured" }, 500);
    }
    
    if (apiKey !== expectedKey) {
      return jsonResponse({ success: false, error: "Invalid API key" }, 401);
    }

    const body: BotGhostRequest = await req.json();
    console.log(`[botghost-customer-api] Action: ${body.action}, Discord ID: ${body.discord_id}`);

    if (!body.discord_id) {
      return jsonResponse({ success: false, error: "Discord ID required" }, 400);
    }

    switch (body.action) {
      case "link":
        return await handleLink(supabase, body);
      case "verify_code":
        return await handleVerifyCode(supabase, body);
      case "profile":
        return await handleProfile(supabase, body);
      case "purchases":
        return await handlePurchases(supabase, body);
      case "download":
        return await handleDownload(supabase, body);
      default:
        return jsonResponse({ success: false, error: "Unknown action" }, 400);
    }
  } catch (error) {
    console.error("[botghost-customer-api] Error:", error);
    return jsonResponse({ success: false, error: "Internal server error" }, 500);
  }
});

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Get linked Eclipse account from Discord ID
async function getLinkedAccount(supabase: any, discordId: string) {
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("user_id, display_name, username, customer_id, avatar_url, discord_id")
    .eq("discord_id", discordId)
    .maybeSingle();

  if (error) {
    console.error("[botghost-customer-api] Profile lookup error:", error);
    return null;
  }
  return profile;
}

// Eclipse branding footer
const ECLIPSE_BRANDING = "\n\n━━━━━━━━━━━━━━━━━━━━━━\n<:eclipse:1234567890> **Eclipse** • Your UK:RP Asset Marketplace\n🌐 [eclipserblx.com](https://eclipserblx.com)";
const ECLIPSE_BANNER = "https://qlnbergwjfrmgkjhrbkj.supabase.co/storage/v1/object/public/product-images/eclipse-discord-banner.png";

// Handle /link - Check if Discord is linked on the website
async function handleLink(supabase: any, body: BotGhostRequest) {
  const profile = await getLinkedAccount(supabase, body.discord_id);

  if (profile) {
    return jsonResponse({
      success: true,
      linked: true,
      embed: {
        title: "🔗 Account Connected",
        description: `Your Discord account has been successfully linked to Eclipse!\n\n` +
          `**Eclipse Account:** @${profile.username}\n` +
          `**Discord:** <@${body.discord_id}>\n\n` +
          `You now have full access to your customer portal commands.\n\u200B`,
        color: 0x5865F2, // Discord Blurple
        fields: [
          {
            name: "📦 Available Commands",
            value: "`/profile` — View your account\n`/purchases` — See order history\n`/download` — Get your files",
            inline: false,
          },
        ],
        footer: {
          text: "Eclipse • Your UK:RP Asset Marketplace",
          icon_url: "https://eclipserblx.com/favicon.ico",
        },
        image: {
          url: ECLIPSE_BANNER,
        },
        timestamp: new Date().toISOString(),
      },
      message: `🔗 **Account Connected**\n\nYour Discord is linked to **@${profile.username}** on Eclipse.\n\nUse \`/profile\`, \`/purchases\`, or \`/download\` to access your account.`,
      username: profile.username,
      customer_id: profile.customer_id,
    });
  }

  return jsonResponse({
    success: false,
    linked: false,
    embed: {
      title: "🔗 Link Your Discord",
      description: "Your Discord isn't linked to an Eclipse account yet.\n\nFollow the steps below to link your account and unlock exclusive features!\n\n\u200B",
      color: 0x5865F2, // Discord Blurple
      fields: [
        {
          name: "📋 How to Link",
          value: "**1.** Visit [eclipserblx.com/account](https://eclipserblx.com/account)\n**2.** Find the **Discord Account** card\n**3.** Click **Link with Discord**\n**4.** Authorize the connection\n**5.** Run `/link` again to confirm!",
          inline: false,
        },
        {
          name: "✨ Benefits",
          value: "• View your profile & purchases\n• Download products directly\n• Access Eclipse+ perks",
          inline: false,
        },
      ],
      footer: {
        text: "Eclipse • Your UK:RP Asset Marketplace",
        icon_url: "https://eclipserblx.com/favicon.ico",
      },
      image: {
        url: ECLIPSE_BANNER,
      },
      timestamp: new Date().toISOString(),
    },
    message: "🔗 **Discord Not Linked** - Visit https://eclipserblx.com/account to link your account!",
  });
}

// Handle code verification (separate action for BotGhost)
async function handleVerifyCode(supabase: any, body: BotGhostRequest) {
  if (!body.code) {
    return jsonResponse({ success: false, error: "Code required" }, 400);
  }

  const code = body.code.toUpperCase().trim();

  // Find valid code
  const { data: linkCode, error: codeError } = await supabase
    .from("discord_link_codes")
    .select("id, user_id, expires_at, verified_at")
    .eq("code", code)
    .gt("expires_at", new Date().toISOString())
    .is("verified_at", null)
    .maybeSingle();

  if (codeError || !linkCode) {
    return jsonResponse({
      success: false,
      error: "Invalid or expired code. Please generate a new one from your Eclipse account.",
    });
  }

  // Mark code as verified and link Discord account
  await supabase
    .from("discord_link_codes")
    .update({
      discord_user_id: body.discord_id,
      discord_username: body.discord_username || "Unknown",
      verified_at: new Date().toISOString(),
    })
    .eq("id", linkCode.id);

  // Update profile with Discord info
  await supabase
    .from("profiles")
    .update({
      discord_id: body.discord_id,
      discord_username: body.discord_username || "Unknown",
    })
    .eq("user_id", linkCode.user_id);

  return jsonResponse({
    success: true,
    message: "✅ **Account Linked Successfully!**\n\nYour Discord account is now linked to Eclipse. You can now use the profile, purchases, and download commands!",
  });
}

// Handle /profile - View account info
async function handleProfile(supabase: any, body: BotGhostRequest) {
  const profile = await getLinkedAccount(supabase, body.discord_id);

  if (!profile) {
    return jsonResponse({
      success: false,
      linked: false,
      error: "Your Discord isn't linked to an Eclipse account yet. Use the link command to get started!",
    });
  }

  // Get membership status (latest record)
  const { data: subscription, error: subscriptionError } = await supabase
    .from("subscriptions")
    .select("tier, billing_period, current_period_end, status, created_at")
    .eq("user_id", profile.user_id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (subscriptionError) {
    console.error("[botghost-customer-api] Subscription lookup error:", subscriptionError);
  }

  // Get order stats
  const { count: orderCount } = await supabase
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("user_id", profile.user_id)
    .in("status", ["paid", "completed"]);

  // Get total spent
  const { data: spentData } = await supabase
    .from("orders")
    .select("total")
    .eq("user_id", profile.user_id)
    .in("status", ["paid", "completed"]);

  // NOTE: order totals are stored in GBP (not pennies)
  const totalSpent = spentData?.reduce((sum: number, o: any) => sum + Number(o.total ?? 0), 0) || 0;
  const totalSpentFormatted = new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(totalSpent);

  const formatTier = (tier: unknown) => {
    const raw = String(tier ?? "").trim();
    if (!raw) return "Eclipse+";
    const label = raw.replace(/_/g, " ");
    return label.charAt(0).toUpperCase() + label.slice(1);
  };

  const membershipDisplay = subscription
    ? `⭐ ${formatTier(subscription.tier)}${subscription.status && subscription.status !== "active" ? ` (${subscription.status})` : ""}`
    : "Free";

  return jsonResponse({
    success: true,
    embed: {
      title: `👤 ${profile.display_name || profile.username}`,
      description: `**@${profile.username}**\n\u200B`,
      color: 0x5865F2,
      fields: [
        {
          name: "📦 Purchases",
          value: `${orderCount || 0} orders`,
          inline: true,
        },
        {
          name: "💰 Total Spent",
          value: totalSpentFormatted,
          inline: true,
        },
        {
          name: "🎖️ Membership",
          value: membershipDisplay,
          inline: true,
        },
      ],
      thumbnail: profile.avatar_url ? { url: profile.avatar_url } : undefined,
      footer: {
        text: "Eclipse • Your UK:RP Asset Marketplace",
        icon_url: "https://eclipserblx.com/favicon.ico",
      },
      image: {
        url: ECLIPSE_BANNER,
      },
      timestamp: new Date().toISOString(),
    },
    message: `👤 **${profile.display_name || profile.username}** (@${profile.username})\n\n📦 **Purchases:** ${orderCount || 0} orders\n💰 **Total Spent:** ${totalSpentFormatted}\n🎖️ **Membership:** ${membershipDisplay}`,
    profile: {
      username: profile.username,
      display_name: profile.display_name,
      avatar_url: profile.avatar_url,
      membership: subscription ? `${subscription.plan_name} (Active)` : "Free",
      order_count: orderCount || 0,
      total_spent_formatted: totalSpentFormatted,
    },
  });
}

// Handle /purchases - List purchases
async function handlePurchases(supabase: any, body: BotGhostRequest) {
  const profile = await getLinkedAccount(supabase, body.discord_id);

  if (!profile) {
    return jsonResponse({
      success: false,
      linked: false,
      error: "Your Discord isn't linked to an Eclipse account yet. Use the link command to get started!",
    });
  }

  // Get recent orders with items
  const { data: orders, error } = await supabase
    .from("orders")
    .select(`
      id,
      created_at,
      status,
      total,
      order_items (
        id,
        product_id,
        product_name,
        price
      )
    `)
    .eq("user_id", profile.user_id)
    .in("status", ["paid", "completed"])
    .order("created_at", { ascending: false })
    .limit(10);

  if (error || !orders || orders.length === 0) {
    return jsonResponse({
      success: true,
      purchases: [],
      message: "You haven't made any purchases yet. Visit https://eclipserblx.com to browse products!",
    });
  }

  const products = orders.flatMap((order: any) =>
    order.order_items.map((item: any) => ({
      name: item.product_name,
      product_id: item.product_id,
      date: new Date(order.created_at).toLocaleDateString("en-GB"),
      price_pence: item.price,
      price_formatted: `£${(item.price / 100).toFixed(2)}`,
    }))
  ).slice(0, 15);

  return jsonResponse({
    success: true,
    purchases: products,
    total_items: orders.reduce((c: number, o: any) => c + o.order_items.length, 0),
  });
}

// Handle /download - Get download link
async function handleDownload(supabase: any, body: BotGhostRequest) {
  const profile = await getLinkedAccount(supabase, body.discord_id);

  if (!profile) {
    return jsonResponse({
      success: false,
      linked: false,
      error: "Your Discord isn't linked to an Eclipse account yet. Use the link command to get started!",
    });
  }

  // Get user's purchased products
  const { data: orderItems } = await supabase
    .from("order_items")
    .select(`
      product_id,
      product_name,
      orders!inner (
        user_id,
        status
      )
    `)
    .eq("orders.user_id", profile.user_id)
    .in("orders.status", ["paid", "completed"]);

  const purchasedProductIds = [...new Set(orderItems?.map((i: any) => i.product_id) || [])];

  if (purchasedProductIds.length === 0) {
    return jsonResponse({
      success: true,
      products: [],
      message: "You haven't purchased any downloadable products yet.",
    });
  }

  // If no product specified, list available products
  if (!body.product_name) {
    const { data: products } = await supabase
      .from("products")
      .select("id, name, asset_file_url")
      .in("id", purchasedProductIds)
      .not("asset_file_url", "is", null);

    if (!products || products.length === 0) {
      return jsonResponse({
        success: true,
        products: [],
        message: "None of your purchased products have downloadable files.",
      });
    }

    return jsonResponse({
      success: true,
      products: products.map((p: any) => ({ id: p.id, name: p.name })),
      message: "Use the download command with a product name to get a download link.",
    });
  }

  // Search for product by name
  const searchTerm = body.product_name.toLowerCase();

  const { data: products } = await supabase
    .from("products")
    .select("id, name, asset_file_url")
    .in("id", purchasedProductIds)
    .not("asset_file_url", "is", null)
    .ilike("name", `%${searchTerm}%`)
    .limit(1);

  if (!products || products.length === 0) {
    return jsonResponse({
      success: false,
      error: `Couldn't find a downloadable product matching "${body.product_name}". Use the download command without a product name to see your available products.`,
    });
  }

  const product = products[0];

  // Generate signed URL (valid for 1 hour)
  const { data: signedUrlData, error: signedUrlError } = await supabase.storage
    .from("product-assets")
    .createSignedUrl(product.asset_file_url, 3600);

  if (signedUrlError || !signedUrlData?.signedUrl) {
    console.error("[botghost-customer-api] Signed URL error:", signedUrlError);
    return jsonResponse({
      success: false,
      error: "Couldn't generate download link. Please try again or use the website.",
    });
  }

  // Log the download
  await supabase.from("download_logs").insert({
    user_id: profile.user_id,
    product_id: product.id,
  });

  // Update download count
  await supabase.rpc("increment_download_count", { product_id: product.id }).catch(() => {});

  return jsonResponse({
    success: true,
    product_name: product.name,
    download_url: signedUrlData.signedUrl,
    expires_in: "1 hour",
    message: `📥 **${product.name}**\n\nYour download link is ready! ⚠️ This link expires in 1 hour.\n\n🔗 Do not share this link.`,
  });
}
