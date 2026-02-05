import { createClient } from "npm:@supabase/supabase-js@2";
import { verify } from "npm:discord-verify@1.2.0";

// Customer Bot - separate from Eclipse Marketplace app
// Secrets needed: DISCORD_CUSTOMER_BOT_PUBLIC_KEY, DISCORD_CUSTOMER_BOT_TOKEN

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-signature-ed25519, x-signature-timestamp",
};

interface DiscordInteraction {
  type: number;
  id: string;
  token: string;
  data?: {
    name: string;
    options?: Array<{
      name: string;
      value: string;
      type: number;
    }>;
  };
  member?: {
    user: {
      id: string;
      username: string;
      global_name?: string;
      avatar?: string;
    };
  };
  user?: {
    id: string;
    username: string;
    global_name?: string;
    avatar?: string;
  };
  guild_id?: string;
}

// Interaction types
const PING = 1;
const APPLICATION_COMMAND = 2;

// Response types
const PONG = 1;
const CHANNEL_MESSAGE = 4;
const DEFERRED_CHANNEL_MESSAGE = 5;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Verify Discord signature
    const signature = req.headers.get("x-signature-ed25519");
    const timestamp = req.headers.get("x-signature-timestamp");
    const body = await req.text();

    if (!signature || !timestamp) {
      return new Response("Invalid request signature", { status: 401, headers: corsHeaders });
    }

    const publicKey = Deno.env.get("DISCORD_CUSTOMER_BOT_PUBLIC_KEY");
    
    if (!publicKey) {
      console.error("[discord-customer-bot] DISCORD_CUSTOMER_BOT_PUBLIC_KEY not configured");
      return new Response("Bot not configured", { status: 500, headers: corsHeaders });
    }
    
    try {
      const isValid = await verify(body, signature, timestamp, publicKey, crypto.subtle);
      if (!isValid) {
        console.log("[discord-customer-bot] Invalid signature");
        return new Response("Invalid request signature", { status: 401, headers: corsHeaders });
      }
    } catch (verifyError) {
      console.error("[discord-customer-bot] Signature verification error:", verifyError);
      return new Response("Signature verification failed", { status: 401, headers: corsHeaders });
    }

    const interaction: DiscordInteraction = JSON.parse(body);
    console.log(`[discord-customer-bot] Received interaction type ${interaction.type}:`, interaction.data?.name);

    // Handle Discord's verification ping
    if (interaction.type === PING) {
      return new Response(JSON.stringify({ type: PONG }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Handle slash commands
    if (interaction.type === APPLICATION_COMMAND && interaction.data) {
      const commandName = interaction.data.name;
      const discordUser = interaction.member?.user || interaction.user;

      if (!discordUser) {
        return interactionResponse("Unable to identify Discord user.", true);
      }

      const discordUserId = discordUser.id;
      const discordUsername = discordUser.global_name || discordUser.username;

      switch (commandName) {
        case "link":
          return await handleLinkStatusCommand(supabase, discordUserId, discordUsername);

        case "verify":
          return await handleVerifyCommand(supabase, interaction, discordUserId, discordUsername);

        case "profile":
          return await handleProfileCommand(supabase, discordUserId, discordUsername);

        case "purchases":
          return await handlePurchasesCommand(supabase, discordUserId, discordUsername);

        case "retrieve":
          return await handleRetrieveCommand(supabase, interaction, discordUserId, discordUsername);

        case "getrole":
        case "roles":
          return await handleGetRoleCommand(supabase, discordUserId, discordUsername, interaction.guild_id);

        default:
          return interactionResponse(`Unknown command: ${commandName}`, true);
      }
    }

    return new Response(JSON.stringify({ type: PONG }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[discord-customer-bot] Error:", error);
    return interactionResponse("An error occurred. Please try again later.", true);
  }
});

function interactionResponse(content: string, ephemeral = false, embeds?: any[]) {
  return new Response(
    JSON.stringify({
      type: CHANNEL_MESSAGE,
      data: {
        content: embeds ? undefined : content,
        embeds,
        flags: ephemeral ? 64 : 0, // 64 = ephemeral
      },
    }),
    { headers: { "Content-Type": "application/json" } }
  );
}

// Get linked Eclipse account from Discord ID
async function getLinkedAccount(supabase: any, discordUserId: string) {
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("user_id, display_name, username, customer_id, avatar_url, discord_id")
    .eq("discord_id", discordUserId)
    .maybeSingle();

  if (error) {
    console.error("[discord-customer-bot] Profile lookup error:", error);
    return null;
  }

  return profile;
}

// /link command - Check link status
async function handleLinkStatusCommand(
  supabase: any,
  discordUserId: string,
  discordUsername: string
) {
  const existingProfile = await getLinkedAccount(supabase, discordUserId);

  if (existingProfile) {
    const embed = {
      color: 0x22c55e, // Green
      title: "✅ Account Linked",
      description: `Your Discord is connected to **@${existingProfile.username}**`,
      fields: [
        {
          name: "🆔 Customer ID",
          value: existingProfile.customer_id || "N/A",
          inline: true,
        },
      ],
      footer: {
        text: "Eclipse Marketplace • Use /profile, /purchases, or /retrieve",
      },
      timestamp: new Date().toISOString(),
    };
    return interactionResponse("", true, [embed]);
  }

  const embed = {
    color: 0x8b5cf6, // Eclipse purple
    title: "🔗 Link Your Eclipse Account",
    description: "Connect your Discord to access your purchases and downloads.",
    fields: [
      {
        name: "Step 1",
        value: "Go to your [Eclipse account settings](https://eclipserblx.com/account)",
        inline: false,
      },
      {
        name: "Step 2",
        value: "Find the **Link Discord** section and click **Generate Link Code**",
        inline: false,
      },
      {
        name: "Step 3",
        value: "Come back here and run `/verify code:YOUR_CODE`",
        inline: false,
      },
    ],
    footer: {
      text: "Eclipse Marketplace",
    },
    timestamp: new Date().toISOString(),
  };
  return interactionResponse("", true, [embed]);
}

// /verify command - Link account with code
async function handleVerifyCommand(
  supabase: any,
  interaction: DiscordInteraction,
  discordUserId: string,
  discordUsername: string
) {
  const options = interaction.data?.options || [];
  const codeOption = options.find((o) => o.name === "code");

  if (!codeOption) {
    const embed = {
      color: 0xef4444, // Red
      title: "❌ Code Required",
      description: "Please provide your link code.",
      fields: [
        {
          name: "Usage",
          value: "`/verify code:YOUR_CODE`",
          inline: false,
        },
        {
          name: "Get a Code",
          value: "Generate one from your [Eclipse account settings](https://eclipserblx.com/account)",
          inline: false,
        },
      ],
      footer: {
        text: "Eclipse Marketplace",
      },
    };
    return interactionResponse("", true, [embed]);
  }

  const code = codeOption.value.toUpperCase().trim();

  // Find valid code
  const { data: linkCode, error: codeError } = await supabase
    .from("discord_link_codes")
    .select("id, user_id, expires_at, verified_at")
    .eq("code", code)
    .gt("expires_at", new Date().toISOString())
    .is("verified_at", null)
    .maybeSingle();

  if (codeError || !linkCode) {
    const embed = {
      color: 0xef4444, // Red
      title: "❌ Invalid or Expired Code",
      description: "This code doesn't exist or has expired.",
      fields: [
        {
          name: "What to do",
          value: "Generate a new code from your [Eclipse account settings](https://eclipserblx.com/account)",
          inline: false,
        },
      ],
      footer: {
        text: "Eclipse Marketplace",
      },
    };
    return interactionResponse("", true, [embed]);
  }

  // Mark code as verified and link Discord account
  await supabase
    .from("discord_link_codes")
    .update({
      discord_user_id: discordUserId,
      discord_username: discordUsername,
      verified_at: new Date().toISOString(),
    })
    .eq("id", linkCode.id);

  // Update profile with Discord info
  await supabase
    .from("profiles")
    .update({
      discord_id: discordUserId,
      discord_username: discordUsername,
    })
    .eq("user_id", linkCode.user_id);

  const embed = {
    color: 0x22c55e, // Green
    title: "✅ Account Linked Successfully!",
    description: "Your Discord account is now connected to Eclipse.",
    fields: [
      {
        name: "Available Commands",
        value: "• `/profile` - View your account\n• `/purchases` - See your orders\n• `/retrieve` - Get your files",
        inline: false,
      },
    ],
    footer: {
      text: "Eclipse Marketplace",
    },
    timestamp: new Date().toISOString(),
  };
  return interactionResponse("", true, [embed]);
}

// /profile command - View account info
async function handleProfileCommand(supabase: any, discordUserId: string, discordUsername: string) {
  const profile = await getLinkedAccount(supabase, discordUserId);

  if (!profile) {
    return interactionResponse(
      "❌ **Account Not Linked**\n\nYour Discord isn't linked to an Eclipse account yet.\nRun `/link` to get started!",
      true
    );
  }

  // Get membership status
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("plan_name, current_period_end, status")
    .eq("user_id", profile.user_id)
    .eq("status", "active")
    .maybeSingle();

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

  const totalSpent = spentData?.reduce((sum: number, o: any) => sum + (o.total || 0), 0) || 0;

  const embed = {
    color: 0x8b5cf6, // Eclipse purple
    author: {
      name: profile.display_name || profile.username,
      icon_url: profile.avatar_url || undefined,
    },
    title: "Eclipse Profile",
    fields: [
      {
        name: "👤 Username",
        value: `@${profile.username}`,
        inline: true,
      },
      {
        name: "🆔 Customer ID",
        value: profile.customer_id || "N/A",
        inline: true,
      },
      {
        name: "⭐ Membership",
        value: subscription ? `${subscription.plan_name} (Active)` : "Free",
        inline: true,
      },
      {
        name: "🛒 Orders",
        value: `${orderCount || 0} purchases`,
        inline: true,
      },
      {
        name: "💷 Total Spent",
        value: `£${(totalSpent / 100).toFixed(2)}`,
        inline: true,
      },
    ],
    footer: {
      text: "Eclipse Marketplace",
    },
    timestamp: new Date().toISOString(),
  };

  return interactionResponse("", true, [embed]);
}

// /purchases command - List purchases
async function handlePurchasesCommand(supabase: any, discordUserId: string, discordUsername: string) {
  const profile = await getLinkedAccount(supabase, discordUserId);

  if (!profile) {
    return interactionResponse(
      "❌ **Account Not Linked**\n\nYour Discord isn't linked to an Eclipse account yet.\nRun `/link` to get started!",
      true
    );
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
    return interactionResponse(
      "📦 **No Purchases Found**\n\nYou haven't made any purchases yet.\nVisit https://eclipserblx.com to browse products!",
      true
    );
  }

  const productList = orders
    .flatMap((order: any) =>
      order.order_items.map((item: any) => ({
        name: item.product_name,
        productId: item.product_id,
        date: new Date(order.created_at).toLocaleDateString("en-GB"),
        price: item.price,
      }))
    )
    .slice(0, 15); // Limit to 15 items

  const embed = {
    color: 0x22c55e,
    title: "📦 Your Purchases",
    description: productList
      .map(
        (p: any, i: number) =>
          `**${i + 1}.** ${p.name}\n   └ £${(p.price / 100).toFixed(2)} • ${p.date}`
      )
      .join("\n\n"),
    footer: {
      text: `Showing ${productList.length} of ${orders.reduce((c: number, o: any) => c + o.order_items.length, 0)} items • Use /download to get files`,
    },
    timestamp: new Date().toISOString(),
  };

  return interactionResponse("", true, [embed]);
}

// /retrieve command - Get download link
async function handleRetrieveCommand(
  supabase: any,
  interaction: DiscordInteraction,
  discordUserId: string,
  discordUsername: string
) {
  const profile = await getLinkedAccount(supabase, discordUserId);

  if (!profile) {
    return interactionResponse(
      "❌ **Account Not Linked**\n\nYour Discord isn't linked to an Eclipse account yet.\nRun `/link` to get started!",
      true
    );
  }

  const options = interaction.data?.options || [];
  const productOption = options.find((o) => o.name === "product");

  if (!productOption) {
    // List downloadable products - use separate queries to avoid nested join issues
    const { data: userOrders } = await supabase
      .from("orders")
      .select("id")
      .eq("user_id", profile.user_id)
      .in("status", ["paid", "completed"]);

    const orderIds = userOrders?.map((o: any) => o.id) || [];

    if (orderIds.length === 0) {
      return interactionResponse(
        "📁 **No Downloads Available**\n\nYou haven't purchased any downloadable products yet.",
        true
      );
    }

    const { data: orderItems } = await supabase
      .from("order_items")
      .select("product_id, product_name")
      .in("order_id", orderIds);

    // Get products with download files
    const productIds = [...new Set(orderItems?.map((i: any) => i.product_id) || [])];

    if (productIds.length === 0) {
      return interactionResponse(
        "📁 **No Downloads Available**\n\nYou haven't purchased any downloadable products yet.",
        true
      );
    }

    const { data: products } = await supabase
      .from("products")
      .select("id, name, asset_file_url")
      .in("id", productIds)
      .not("asset_file_url", "is", null);

    if (!products || products.length === 0) {
      return interactionResponse(
        "📁 **No Downloads Available**\n\nNone of your purchased products have downloadable files.",
        true
      );
    }

    const productList = products.map((p: any, i: number) => `**${i + 1}.** ${p.name}`).join("\n");

    const embed = {
      color: 0x3b82f6,
      title: "📁 Your Downloadable Products",
      description: productList,
      footer: {
        text: "Eclipse Marketplace • Use /retrieve product:NAME to download",
      },
      timestamp: new Date().toISOString(),
    };
    return interactionResponse("", true, [embed]);
  }

  // Search for product by name
  const searchTerm = productOption.value.toLowerCase().trim();
  console.log(`[discord-customer-bot] Retrieve search: "${searchTerm}" for user ${profile.user_id}`);

  // Get user's purchased products - use separate query for orders first
  const { data: userOrders, error: ordersError } = await supabase
    .from("orders")
    .select("id")
    .eq("user_id", profile.user_id)
    .in("status", ["paid", "completed"]);

  if (ordersError) {
    console.error("[discord-customer-bot] Orders query error:", ordersError);
  }

  const orderIds = userOrders?.map((o: any) => o.id) || [];
  console.log(`[discord-customer-bot] Found ${orderIds.length} orders for user`);

  if (orderIds.length === 0) {
    return interactionResponse(
      "📁 **No Purchases Found**\n\nYou don't have any completed orders yet.",
      true
    );
  }

  // Get order items for those orders
  const { data: orderItems, error: itemsError } = await supabase
    .from("order_items")
    .select("product_id, product_name")
    .in("order_id", orderIds);

  if (itemsError) {
    console.error("[discord-customer-bot] Order items query error:", itemsError);
  }

  const purchasedProductIds = [...new Set(orderItems?.map((i: any) => i.product_id) || [])];
  console.log(`[discord-customer-bot] Purchased product IDs: ${purchasedProductIds.length}`);

  if (purchasedProductIds.length === 0) {
    return interactionResponse(
      "📁 **No Downloads Available**\n\nNo purchased products found.",
      true
    );
  }

  // Find matching product with flexible search
  const { data: products, error: productsError } = await supabase
    .from("products")
    .select("id, name, asset_file_url")
    .in("id", purchasedProductIds)
    .not("asset_file_url", "is", null);

  if (productsError) {
    console.error("[discord-customer-bot] Products query error:", productsError);
  }

  console.log(`[discord-customer-bot] Products with files: ${products?.length || 0}`);

  // Fuzzy match the product name
  const matchedProduct = products?.find((p: any) => 
    p.name.toLowerCase().includes(searchTerm) || 
    searchTerm.includes(p.name.toLowerCase()) ||
    p.name.toLowerCase().split(' ').some((word: string) => searchTerm.includes(word) && word.length > 3)
  );

  if (!matchedProduct) {
    const availableProducts = products?.map((p: any) => p.name).join(", ") || "None";
    console.log(`[discord-customer-bot] No match found. Available: ${availableProducts}`);
    
    const embed = {
      color: 0xef4444,
      title: "❌ Product Not Found",
      description: `Couldn't find a downloadable product matching "${productOption.value}".`,
      fields: [
        {
          name: "Available Products",
          value: products?.length ? products.map((p: any) => `• ${p.name}`).join("\n").slice(0, 1000) : "No downloadable products found",
          inline: false,
        },
      ],
      footer: {
        text: "Eclipse Marketplace • Try typing the exact product name",
      },
    };
    return interactionResponse("", true, [embed]);
  }

  const product = matchedProduct;

  // Generate signed URL (valid for 1 hour)
  const { data: signedUrlData, error: signedUrlError } = await supabase.storage
    .from("product-assets")
    .createSignedUrl(product.asset_file_url, 3600);

  if (signedUrlError || !signedUrlData?.signedUrl) {
    console.error("[discord-customer-bot] Signed URL error:", signedUrlError);
    return interactionResponse(
      "❌ **Download Failed**\n\nCouldn't generate download link. Please try again or use the website.",
      true
    );
  }

  // Log the download
  await supabase.from("download_logs").insert({
    user_id: profile.user_id,
    product_id: product.id,
  });

  // Update download count
  await supabase.rpc("increment_download_count", { product_id: product.id }).catch(() => {});

  const embed = {
    color: 0x3b82f6,
    title: `📥 ${product.name}`,
    description: "Your download link is ready! Click the button below to download.\n\n⚠️ This link expires in **1 hour**.",
    footer: {
      text: "Eclipse Marketplace • Do not share this link",
    },
    timestamp: new Date().toISOString(),
  };

  return new Response(
    JSON.stringify({
      type: CHANNEL_MESSAGE,
      data: {
        embeds: [embed],
        components: [
          {
            type: 1, // Action row
            components: [
              {
                type: 2, // Button
                style: 5, // Link button
                label: "Download File",
                url: signedUrlData.signedUrl,
                emoji: { name: "📥" },
              },
            ],
          },
        ],
        flags: 64, // Ephemeral
      },
    }),
    { headers: { "Content-Type": "application/json" } }
  );
}

// /getrole command - Assign Discord roles based on Eclipse account
async function handleGetRoleCommand(
  supabase: any,
  discordUserId: string,
  discordUsername: string,
  guildId?: string
) {
  const profile = await getLinkedAccount(supabase, discordUserId);

  if (!profile) {
    return interactionResponse(
      "❌ **Account Not Linked**\n\nYour Discord isn't linked to an Eclipse account yet.\nRun `/link` to get started!",
      true
    );
  }

  const botToken = Deno.env.get("DISCORD_CUSTOMER_BOT_TOKEN");
  const targetGuildId = guildId || Deno.env.get("DISCORD_GUILD_ID");

  if (!botToken || !targetGuildId) {
    console.error("[discord-customer-bot] Missing bot token or guild ID for role assignment");
    return interactionResponse("❌ Bot configuration error. Please contact support.", true);
  }

  // Role IDs from secrets
  const customerRoleId = Deno.env.get("DISCORD_CUSTOMER_ROLE_ID");
  const loyalCustomerRoleId = Deno.env.get("DISCORD_LOYAL_CUSTOMER_ROLE_ID");
  const storeCreatorRoleId = Deno.env.get("DISCORD_STORE_CREATOR_ROLE_ID");
  const eclipsePlusRoleId = Deno.env.get("DISCORD_ROLE_ID"); // Eclipse+ role

  const rolesAssigned: string[] = [];
  const rolesFailed: string[] = [];
  const rolesAlreadyHad: string[] = [];

  // Helper to assign a role
  async function assignRole(roleId: string, roleName: string) {
    if (!roleId) {
      console.log(`[discord-customer-bot] ${roleName} role ID not configured`);
      return;
    }

    try {
      const response = await fetch(
        `https://discord.com/api/v10/guilds/${targetGuildId}/members/${discordUserId}/roles/${roleId}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bot ${botToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.status === 204) {
        rolesAssigned.push(roleName);
      } else if (response.status === 304) {
        rolesAlreadyHad.push(roleName);
      } else {
        const errorText = await response.text();
        console.error(`[discord-customer-bot] Failed to assign ${roleName}:`, response.status, errorText);
        rolesFailed.push(roleName);
      }
    } catch (error) {
      console.error(`[discord-customer-bot] Error assigning ${roleName}:`, error);
      rolesFailed.push(roleName);
    }
  }

  // Check purchase count for Customer/Loyal Customer roles
  const { count: orderCount } = await supabase
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("user_id", profile.user_id)
    .in("status", ["paid", "completed"]);

  const purchaseCount = orderCount || 0;
  console.log(`[discord-customer-bot] User ${profile.username} has ${purchaseCount} purchases`);

  if (purchaseCount >= 5 && loyalCustomerRoleId) {
    // Loyal Customer (5+ purchases) - also remove regular Customer role
    await assignRole(loyalCustomerRoleId, "Loyal Customer");
    
    // Remove Customer role if they have Loyal Customer
    if (customerRoleId) {
      try {
        await fetch(
          `https://discord.com/api/v10/guilds/${targetGuildId}/members/${discordUserId}/roles/${customerRoleId}`,
          {
            method: "DELETE",
            headers: {
              Authorization: `Bot ${botToken}`,
            },
          }
        );
      } catch (e) {
        console.log("[discord-customer-bot] Could not remove Customer role:", e);
      }
    }
  } else if (purchaseCount >= 1 && customerRoleId) {
    // Customer (1-4 purchases)
    await assignRole(customerRoleId, "Customer");
  }

  // Check for Eclipse+ subscription
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("id, status")
    .eq("user_id", profile.user_id)
    .eq("status", "active")
    .maybeSingle();

  if (subscription && eclipsePlusRoleId) {
    await assignRole(eclipsePlusRoleId, "Eclipse+");
  }

  // Check for Store Creator
  const { data: store } = await supabase
    .from("stores")
    .select("id")
    .eq("owner_id", profile.user_id)
    .eq("is_active", true)
    .maybeSingle();

  if (store && storeCreatorRoleId) {
    await assignRole(storeCreatorRoleId, "Store Creator");
  }

  // Build response
  const fields: any[] = [];

  if (rolesAssigned.length > 0) {
    fields.push({
      name: "✅ Roles Assigned",
      value: rolesAssigned.map(r => `• ${r}`).join("\n"),
      inline: true,
    });
  }

  if (rolesAlreadyHad.length > 0) {
    fields.push({
      name: "ℹ️ Already Had",
      value: rolesAlreadyHad.map(r => `• ${r}`).join("\n"),
      inline: true,
    });
  }

  if (rolesFailed.length > 0) {
    fields.push({
      name: "❌ Failed",
      value: rolesFailed.map(r => `• ${r}`).join("\n"),
      inline: true,
    });
  }

  // Summary of eligibility
  const eligibility: string[] = [];
  if (purchaseCount === 0) eligibility.push("• Make a purchase to earn **Customer** role");
  if (purchaseCount > 0 && purchaseCount < 5) eligibility.push(`• ${5 - purchaseCount} more purchases for **Loyal Customer**`);
  if (!subscription) eligibility.push("• Subscribe to **Eclipse+** for the member role");
  if (!store) eligibility.push("• Create a store for **Store Creator** role");

  if (eligibility.length > 0 && rolesAssigned.length === 0 && rolesAlreadyHad.length === 0) {
    fields.push({
      name: "📋 How to Earn Roles",
      value: eligibility.join("\n"),
      inline: false,
    });
  }

  const embed = {
    color: rolesAssigned.length > 0 ? 0x22c55e : (rolesAlreadyHad.length > 0 ? 0x3b82f6 : 0xf59e0b),
    title: rolesAssigned.length > 0 ? "🎉 Roles Synced!" : "📋 Role Status",
    description: rolesAssigned.length > 0
      ? `Your Discord roles have been updated based on your Eclipse account.`
      : rolesAlreadyHad.length > 0
        ? `You already have all the roles you're eligible for!`
        : `Based on your Eclipse account, here's what you need to earn roles:`,
    fields,
    footer: {
      text: "Eclipse Marketplace • Roles sync automatically on login",
    },
    timestamp: new Date().toISOString(),
  };

  return interactionResponse("", true, [embed]);
}
