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
  // BotGhost setups sometimes pass command arguments under different names.
  // We keep these optional so the function is resilient without requiring BotGhost reconfiguration.
  product?: string;
  productName?: string;
  args?: string;
  arguments?: string;
  query?: string;
  text?: string;
  content?: string;
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

  // Get full profile with Roblox info
  const { data: fullProfile } = await supabase
    .from("profiles")
    .select("roblox_user_id, roblox_username, discord_username")
    .eq("user_id", profile.user_id)
    .maybeSingle();

  // Get purchased products (recent 5)
  const { data: orderItems } = await supabase
    .from("order_items")
    .select(`
      product_name,
      orders!inner (
        user_id,
        status
      )
    `)
    .eq("orders.user_id", profile.user_id)
    .in("orders.status", ["paid", "completed"])
    .limit(5);

  const purchasedProducts = orderItems?.map((item: any) => item.product_name) || [];
  const purchasedDisplay = purchasedProducts.length > 0 
    ? purchasedProducts.join("\n") 
    : "none";

  // Build Roblox section
  const robloxUsername = fullProfile?.roblox_username || "Not linked";
  const robloxId = fullProfile?.roblox_user_id || null;
  const robloxSection = robloxId 
    ? `${robloxUsername}\n\`${robloxId}\`` 
    : "Not linked";

  // Build Discord section
  const discordUsername = fullProfile?.discord_username || body.discord_username || "Unknown";
  const discordSection = `${discordUsername}\n\`${body.discord_id}\``;

  // Roblox avatar thumbnail (if linked) - fetch from Roblox API for direct CDN URL
  let robloxThumbnail: string | null = null;
  if (robloxId) {
    try {
      const thumbnailResponse = await fetch(
        `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${robloxId}&size=150x150&format=Png&isCircular=false`
      );
      if (thumbnailResponse.ok) {
        const thumbnailData = await thumbnailResponse.json();
        if (thumbnailData.data?.[0]?.imageUrl) {
          robloxThumbnail = thumbnailData.data[0].imageUrl;
        }
      }
    } catch (e) {
      console.error("[botghost-customer-api] Failed to fetch Roblox thumbnail:", e);
    }
  }

  // Log what we're returning for debugging
  console.log("[botghost-customer-api] Roblox thumbnail URL:", robloxThumbnail);

  // Expose a simple string field for BotGhost's Embed Thumbnail URL input
  // (BotGhost commonly builds embeds from response.message rather than passing through response.embed)
  const robloxThumbnailUrl = robloxThumbnail;

  return jsonResponse({
    success: true,
    roblox_thumbnail_url: robloxThumbnailUrl,
    button_url: "https://eclipserblx.com/account",
    button_label: "Manage my Account",
    embed: {
      title: `Profile of ${profile.username}`,
      color: 0xF5A623, // Orange/amber accent like in the reference
      description: `**Roblox**\n${robloxSection}\n\n**Discord**\n${discordSection}\n\n**Purchased Products**\n${purchasedDisplay}`,
      thumbnail: robloxThumbnailUrl ? { url: robloxThumbnailUrl } : null,
      footer: {
        text: "Eclipse • Your UK:RP Asset Marketplace",
        icon_url: "https://eclipserblx.com/favicon.ico",
      },
      timestamp: new Date().toISOString(),
    },
    components: [
      {
        type: 1, // Action Row
        components: [
          {
            type: 2, // Button
            style: 5, // Link button
            label: "Manage my Account",
            url: "https://eclipserblx.com/account",
            emoji: { name: "🔗" },
          },
        ],
      },
    ],
    message: `**Profile of ${profile.username}**\n\n**Roblox:** ${robloxUsername}${robloxId ? ` (${robloxId})` : ""}\n**Discord:** ${discordUsername} (${body.discord_id})\n**Purchased Products:** ${purchasedDisplay}\n\n🔗 Manage: https://eclipserblx.com/account`,
    profile: {
      username: profile.username,
      roblox_username: robloxUsername,
      roblox_id: robloxId,
      roblox_thumbnail_url: robloxThumbnailUrl,
      discord_username: discordUsername,
      discord_id: body.discord_id,
      purchased_products: purchasedProducts,
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

  // Get user's last 10 purchased products with downloadable files
  // Use left join (products instead of products!inner) to avoid failing on deleted products
  const { data: recentPurchases, error: purchaseError } = await supabase
    .from("order_items")
    .select(`
      product_id,
      product_name,
      created_at,
      products (
        id,
        name,
        asset_file_url
      ),
      orders!inner (
        user_id,
        status,
        created_at
      )
    `)
    .eq("orders.user_id", profile.user_id)
    .in("orders.status", ["paid", "completed"])
    .not("product_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(20);

  console.log("[botghost-customer-api] Recent purchases found:", recentPurchases?.length || 0, purchaseError ? `Error: ${purchaseError.message}` : "");

  // Filter to only products that exist AND have an asset file, then deduplicate
  const seenIds = new Set<string>();
  const uniquePurchases = (recentPurchases || [])
    .filter((p: any) => p.products && p.products.asset_file_url)
    .filter((p: any) => {
      if (seenIds.has(p.product_id)) return false;
      seenIds.add(p.product_id);
      return true;
    })
    .slice(0, 10);

  console.log("[botghost-customer-api] Unique downloadable products:", uniquePurchases.length);

  if (uniquePurchases.length === 0) {
    return jsonResponse({
      success: true,
      products: [],
      message: "You haven't purchased any downloadable products yet.",
    });
  }

  // BotGhost command arguments are sometimes passed under different JSON keys.
  // Try to derive the intended product name from common fields.
  const rawProductName =
    body.product_name ??
    body.product ??
    body.productName ??
    body.args ??
    body.arguments ??
    body.query ??
    body.text ??
    body.content ??
    null;

  const derivedProductName =
    typeof rawProductName === "string" ? rawProductName : undefined;

  // If no product specified:
  // - If there's only 1 downloadable product, just deliver it (no selection step)
  // - Otherwise show a short selection list (last 10 unique purchases)
  if (!derivedProductName || !derivedProductName.trim()) {
    if (uniquePurchases.length === 1) {
      const only = uniquePurchases[0];
      const onlyProduct = {
        id: only.product_id ?? only.products?.id,
        name: only.products?.name ?? only.product_name,
        asset_file_url: only.products?.asset_file_url,
      };

      if (!onlyProduct.id || !onlyProduct.asset_file_url) {
        console.error("[botghost-customer-api] Single purchase missing product data", {
          hasId: !!onlyProduct.id,
          hasAsset: !!onlyProduct.asset_file_url,
        });

        return jsonResponse({
          success: false,
          error: "Couldn't prepare your download. Please try again via the website.",
        });
      }

      // Generate signed URL (valid for 1 hour)
      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from("product-assets")
        .createSignedUrl(onlyProduct.asset_file_url, 3600);

      if (signedUrlError || !signedUrlData?.signedUrl) {
        console.error("[botghost-customer-api] Signed URL error (single product):", signedUrlError);
        return jsonResponse({
          success: false,
          error: "Couldn't generate download link. Please try again or use the website.",
        });
      }

      // Log the download
      await supabase.from("download_logs").insert({
        user_id: profile.user_id,
        product_id: onlyProduct.id,
      });

      // Update download count
      try {
        await supabase.rpc("increment_download_count", { product_id: onlyProduct.id });
      } catch (_e) {
        // Ignore if RPC doesn't exist or fails
      }

      // Fetch Roblox thumbnail for embed
      let robloxThumbnail: string | null = null;
      const { data: userProfile } = await supabase
        .from("profiles")
        .select("roblox_user_id")
        .eq("user_id", profile.user_id)
        .maybeSingle();
      
      if (userProfile?.roblox_user_id) {
        try {
          const thumbnailResponse = await fetch(
            `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userProfile.roblox_user_id}&size=150x150&format=Png&isCircular=false`
          );
          if (thumbnailResponse.ok) {
            const thumbnailData = await thumbnailResponse.json();
            if (thumbnailData.data?.[0]?.imageUrl) {
              robloxThumbnail = thumbnailData.data[0].imageUrl;
            }
          }
        } catch (_e) {
          // Ignore thumbnail fetch errors
        }
      }

      return jsonResponse({
        success: true,
        product_name: onlyProduct.name,
        download_url: signedUrlData.signedUrl,
        expires_in: "1 hour",
        button_url: signedUrlData.signedUrl,
        button_label: "Download",
        embed: {
          title: `${onlyProduct.name}`,
          color: 0x5865F2,
          thumbnail: robloxThumbnail ? { url: robloxThumbnail } : null,
          fields: [
            {
              name: "Requested by",
              value: `<@${body.discord_id}>`,
              inline: true,
            },
            {
              name: "Expires",
              value: "1 hour",
              inline: true,
            },
            {
              name: "Download",
              value: `[Click here](${signedUrlData.signedUrl})`,
              inline: false,
            },
          ],
          footer: {
            text: "Eclipse • Your UK:RP Asset Marketplace",
            icon_url: "https://eclipserblx.com/favicon.ico",
          },
          timestamp: new Date().toISOString(),
        },
        components: [
          {
            type: 1,
            components: [
              {
                type: 2,
                style: 5,
                label: "Download",
                url: signedUrlData.signedUrl,
                emoji: { name: "📥" },
              },
            ],
          },
        ],
        message: `Your download for **${onlyProduct.name}** is ready.`,
      });
    }

    // Build numbered list for easy selection
    const productList = uniquePurchases
      .map((p: any, i: number) => `**${i + 1}.** ${p.products.name}`)
      .join("\n");

    return jsonResponse({
      success: true,
      products: uniquePurchases.map((p: any) => ({ 
        id: p.product_id, 
        name: p.products.name 
      })),
      message: `📦 **Select a product to download:**\n\n${productList}\n\n*Use* \`/retrieve [product name]\` *to get your download link.*`,
    });
  }

  // Get all purchasedProductIds for the search
  const purchasedProductIds = uniquePurchases.map((p: any) => p.product_id);

  // Search for product by name
  const rawSearch = derivedProductName ?? "";
  const searchTerm = rawSearch.replace(/\s+/g, " ").trim();

  console.log(
    "[botghost-customer-api] Product search input:",
    JSON.stringify(rawSearch),
    "normalized:",
    JSON.stringify(searchTerm)
  );

  if (!searchTerm) {
    return jsonResponse(
      {
        success: false,
        error:
          "Product name required. Run /retrieve without a product name to see your downloadable products.",
      },
      400
    );
  }

  // 1) Try a direct PostgREST match first (case-insensitive)
  const { data: matchedByQuery, error: matchError } = await supabase
    .from("products")
    .select("id, name, asset_file_url")
    .in("id", purchasedProductIds)
    .not("asset_file_url", "is", null)
    .ilike("name", `%${searchTerm}%`)
    .limit(1);

  if (matchError) {
    console.error("[botghost-customer-api] Product match query error:", matchError);
  }

  let product = matchedByQuery?.[0] ?? null;

  // 2) Fallback: use the uniquePurchases we already have and do a normalized match in JS.
  // This handles weird spacing, punctuation, or BotGhost variable formatting.
  if (!product) {
    const availableProducts = uniquePurchases.map((p: any) => ({
      id: p.product_id,
      name: p.products.name,
      asset_file_url: p.products.asset_file_url,
    }));

    const normalize = (s: string) =>
      s
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    const nSearch = normalize(searchTerm);

    // Prefer exact-ish matches; then substring matches.
    product =
      availableProducts.find((p: any) => normalize(p.name) === nSearch) ||
      availableProducts.find((p: any) => normalize(p.name).includes(nSearch)) ||
      availableProducts.find((p: any) => nSearch.includes(normalize(p.name))) ||
      null;

    console.log(
      "[botghost-customer-api] Fallback product match:",
      product ? product.name : null
    );

    if (!product) {
      const availableList = availableProducts
        .map((p: any, i: number) => `**${i + 1}.** ${p.name}`)
        .join("\n");

      return jsonResponse({
        success: false,
        error:
          `Couldn't find "${rawSearch}".\n\n` +
          `**Your products:**\n${availableList}\n\n` +
          `*Copy the exact name and try again.*`,
      });
    }
  }

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
  try {
    await supabase.rpc("increment_download_count", { product_id: product.id });
  } catch (_e) {
    // Ignore if RPC doesn't exist or fails
  }

  // Fetch Roblox thumbnail for embed
  let robloxThumbnail: string | null = null;
  const { data: userProfile } = await supabase
    .from("profiles")
    .select("roblox_user_id")
    .eq("user_id", profile.user_id)
    .maybeSingle();
  
  if (userProfile?.roblox_user_id) {
    try {
      const thumbnailResponse = await fetch(
        `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userProfile.roblox_user_id}&size=150x150&format=Png&isCircular=false`
      );
      if (thumbnailResponse.ok) {
        const thumbnailData = await thumbnailResponse.json();
        if (thumbnailData.data?.[0]?.imageUrl) {
          robloxThumbnail = thumbnailData.data[0].imageUrl;
        }
      }
    } catch (_e) {
      // Ignore thumbnail fetch errors
    }
  }

  return jsonResponse({
    success: true,
    product_name: product.name,
    download_url: signedUrlData.signedUrl,
    expires_in: "1 hour",
    button_url: signedUrlData.signedUrl,
    button_label: "Download",
    embed: {
      title: `${product.name}`,
      color: 0x5865F2,
      thumbnail: robloxThumbnail ? { url: robloxThumbnail } : null,
      fields: [
        {
          name: "Requested by",
          value: `<@${body.discord_id}>`,
          inline: true,
        },
        {
          name: "Expires",
          value: "1 hour",
          inline: true,
        },
        {
          name: "Download",
          value: `[Click here](${signedUrlData.signedUrl})`,
          inline: false,
        },
      ],
      footer: {
        text: "Eclipse • Your UK:RP Asset Marketplace",
        icon_url: "https://eclipserblx.com/favicon.ico",
      },
      timestamp: new Date().toISOString(),
    },
    components: [
      {
        type: 1,
        components: [
          {
            type: 2,
            style: 5,
            label: "Download",
            url: signedUrlData.signedUrl,
            emoji: { name: "📥" },
          },
        ],
      },
    ],
    message: `Your download for **${product.name}** is ready.`,
  });
}
