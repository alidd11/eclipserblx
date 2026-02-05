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

// Send DM to user via Discord API
async function sendDMToUser(discordUserId: string, content?: string, embeds?: any[], components?: any[]) {
  const botToken = Deno.env.get("DISCORD_CUSTOMER_BOT_TOKEN");
  if (!botToken) {
    console.error("[discord-customer-bot] No bot token for DM");
    return false;
  }

  try {
    // Create DM channel
    const dmChannelResponse = await fetch("https://discord.com/api/v10/users/@me/channels", {
      method: "POST",
      headers: {
        Authorization: `Bot ${botToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ recipient_id: discordUserId }),
    });

    if (!dmChannelResponse.ok) {
      console.error("[discord-customer-bot] Failed to create DM channel:", await dmChannelResponse.text());
      return false;
    }

    const dmChannel = await dmChannelResponse.json();

    // Send message to DM channel
    const messagePayload: any = {};
    if (content) messagePayload.content = content;
    if (embeds) messagePayload.embeds = embeds;
    if (components) messagePayload.components = components;

    const messageResponse = await fetch(`https://discord.com/api/v10/channels/${dmChannel.id}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bot ${botToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(messagePayload),
    });

    if (!messageResponse.ok) {
      console.error("[discord-customer-bot] Failed to send DM:", await messageResponse.text());
      return false;
    }

    console.log(`[discord-customer-bot] DM sent to ${discordUserId}`);
    return true;
  } catch (error) {
    console.error("[discord-customer-bot] DM error:", error);
    return false;
  }
}

// Public response with DM follow-up
function publicResponseWithDM(
  channelMessage: string,
  discordUserId: string,
  dmContent?: string,
  dmEmbeds?: any[],
  dmComponents?: any[]
) {
  // Fire and forget the DM - don't await to avoid timeout
  sendDMToUser(discordUserId, dmContent, dmEmbeds, dmComponents).catch(console.error);

  return new Response(
    JSON.stringify({
      type: CHANNEL_MESSAGE,
      data: {
        content: channelMessage,
        flags: 0, // Public message
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

// /link command - Check link status (optimized)
async function handleLinkStatusCommand(
  supabase: any,
  discordUserId: string,
  discordUsername: string
) {
  const existingProfile = await getLinkedAccount(supabase, discordUserId);

  if (existingProfile) {
    const embed = {
      color: 0x22c55e,
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
    return publicResponseWithDM(
      `✅ <@${discordUserId}> Your account is already linked! Check your DMs for details.`,
      discordUserId,
      undefined,
      [embed]
    );
  }

  const embed = {
    color: 0x8b5cf6,
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
  return publicResponseWithDM(
    `🔗 <@${discordUserId}> Check your DMs for instructions on how to link your Eclipse account!`,
    discordUserId,
    undefined,
    [embed]
  );
}

// /verify command - Link account with code (optimized)
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
      color: 0xef4444,
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
    return publicResponseWithDM(
      `❌ <@${discordUserId}> Please provide a verification code. Check your DMs for help.`,
      discordUserId,
      undefined,
      [embed]
    );
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
      color: 0xef4444,
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
    return publicResponseWithDM(
      `❌ <@${discordUserId}> That code is invalid or expired. Check your DMs for help.`,
      discordUserId,
      undefined,
      [embed]
    );
  }

  // Update code and profile in parallel
  await Promise.all([
    supabase
      .from("discord_link_codes")
      .update({
        discord_user_id: discordUserId,
        discord_username: discordUsername,
        verified_at: new Date().toISOString(),
      })
      .eq("id", linkCode.id),
    supabase
      .from("profiles")
      .update({
        discord_id: discordUserId,
        discord_username: discordUsername,
      })
      .eq("user_id", linkCode.user_id),
  ]);

  const embed = {
    color: 0x22c55e,
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
  return publicResponseWithDM(
    `🎉 <@${discordUserId}> Your account has been linked successfully! Check your DMs for details.`,
    discordUserId,
    undefined,
    [embed]
  );
}

// /profile command - View account info (optimized with parallel queries)
async function handleProfileCommand(supabase: any, discordUserId: string, discordUsername: string) {
  const profile = await getLinkedAccount(supabase, discordUserId);

  if (!profile) {
    return publicResponseWithDM(
      `❌ <@${discordUserId}> Your account isn't linked yet. Run \`/link\` to get started!`,
      discordUserId,
      "❌ **Account Not Linked**\n\nYour Discord isn't linked to an Eclipse account yet.\nRun `/link` to get started!"
    );
  }

  // Run ALL queries in parallel for speed
  const [subscriptionResult, orderCountResult, spentResult] = await Promise.all([
    supabase
      .from("subscriptions")
      .select("tier, current_period_end, status")
      .eq("user_id", profile.user_id)
      .eq("status", "active")
      .maybeSingle(),
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("user_id", profile.user_id)
      .in("status", ["paid", "completed"]),
    supabase
      .from("orders")
      .select("total")
      .eq("user_id", profile.user_id)
      .in("status", ["paid", "completed"]),
  ]);

  const subscription = subscriptionResult.data;
  const orderCount = orderCountResult.count || 0;
  const totalSpent = spentResult.data?.reduce((sum: number, o: any) => sum + (o.total || 0), 0) || 0;

  const embed = {
    color: 0x8b5cf6,
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
        value: subscription ? `Eclipse+ (Active)` : "Free",
        inline: true,
      },
      {
        name: "🛒 Orders",
        value: `${orderCount} purchases`,
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

  return publicResponseWithDM(
    `👤 <@${discordUserId}> Here's your profile! Check your DMs for full details.`,
    discordUserId,
    undefined,
    [embed]
  );
}

// /purchases command - List purchases (optimized)
async function handlePurchasesCommand(supabase: any, discordUserId: string, discordUsername: string) {
  const profile = await getLinkedAccount(supabase, discordUserId);

  if (!profile) {
    return publicResponseWithDM(
      `❌ <@${discordUserId}> Your account isn't linked yet. Run \`/link\` to get started!`,
      discordUserId,
      "❌ **Account Not Linked**\n\nYour Discord isn't linked to an Eclipse account yet.\nRun `/link` to get started!"
    );
  }

  // Single optimized query with join
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
    return publicResponseWithDM(
      `📦 <@${discordUserId}> You haven't made any purchases yet. Visit https://eclipserblx.com to browse products!`,
      discordUserId,
      "📦 **No Purchases Found**\n\nYou haven't made any purchases yet.\nVisit https://eclipserblx.com to browse products!"
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
    .slice(0, 15);

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
      text: `Showing ${productList.length} of ${orders.reduce((c: number, o: any) => c + o.order_items.length, 0)} items • Use /retrieve to get files`,
    },
    timestamp: new Date().toISOString(),
  };

  return publicResponseWithDM(
    `📦 <@${discordUserId}> Found ${productList.length} purchases! Check your DMs for details.`,
    discordUserId,
    undefined,
    [embed]
  );
}

// /retrieve command - Get download link (optimized with parallel queries)
async function handleRetrieveCommand(
  supabase: any,
  interaction: DiscordInteraction,
  discordUserId: string,
  discordUsername: string
) {
  const profile = await getLinkedAccount(supabase, discordUserId);

  if (!profile) {
    return publicResponseWithDM(
      `❌ <@${discordUserId}> Your account isn't linked yet. Run \`/link\` to get started!`,
      discordUserId,
      "❌ **Account Not Linked**\n\nYour Discord isn't linked to an Eclipse account yet.\nRun `/link` to get started!"
    );
  }

  const options = interaction.data?.options || [];
  const productOption = options.find((o) => o.name === "product");

  // Get user's order IDs first
  const { data: userOrders } = await supabase
    .from("orders")
    .select("id")
    .eq("user_id", profile.user_id)
    .in("status", ["paid", "completed"]);

  const orderIds = userOrders?.map((o: any) => o.id) || [];

  if (orderIds.length === 0) {
    return publicResponseWithDM(
      `📁 <@${discordUserId}> You haven't purchased any downloadable products yet.`,
      discordUserId,
      "📁 **No Downloads Available**\n\nYou haven't purchased any downloadable products yet."
    );
  }

  // Get order items
  const { data: orderItems } = await supabase
    .from("order_items")
    .select("product_id, product_name")
    .in("order_id", orderIds);

  const productIds = [...new Set(orderItems?.map((i: any) => i.product_id) || [])];

  if (productIds.length === 0) {
    return publicResponseWithDM(
      `📁 <@${discordUserId}> You haven't purchased any downloadable products yet.`,
      discordUserId,
      "📁 **No Downloads Available**\n\nYou haven't purchased any downloadable products yet."
    );
  }

  // Get products with download files
  const { data: products } = await supabase
    .from("products")
    .select("id, name, asset_file_url")
    .in("id", productIds)
    .not("asset_file_url", "is", null);

  if (!products || products.length === 0) {
    return publicResponseWithDM(
      `📁 <@${discordUserId}> None of your purchased products have downloadable files.`,
      discordUserId,
      "📁 **No Downloads Available**\n\nNone of your purchased products have downloadable files."
    );
  }

  if (!productOption) {
    // List downloadable products
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
    return publicResponseWithDM(
      `📁 <@${discordUserId}> You have ${products.length} downloadable products. Check your DMs for the list!`,
      discordUserId,
      undefined,
      [embed]
    );
  }

  // Search for product by name
  const searchTerm = productOption.value.toLowerCase().trim();
  console.log(`[discord-customer-bot] Retrieve search: "${searchTerm}"`);

  // Fuzzy match the product name
  const matchedProduct = products?.find((p: any) => 
    p.name.toLowerCase().includes(searchTerm) || 
    searchTerm.includes(p.name.toLowerCase()) ||
    p.name.toLowerCase().split(' ').some((word: string) => searchTerm.includes(word) && word.length > 3)
  );

  if (!matchedProduct) {
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
    return publicResponseWithDM(
      `❌ <@${discordUserId}> Couldn't find that product. Check your DMs for available products.`,
      discordUserId,
      undefined,
      [embed]
    );
  }

  const product = matchedProduct;

  // Generate signed URL and log download in parallel
  const [signedUrlResult] = await Promise.all([
    supabase.storage.from("product-assets").createSignedUrl(product.asset_file_url, 3600),
    supabase.from("download_logs").insert({
      user_id: profile.user_id,
      product_id: product.id,
    }),
    supabase.rpc("increment_download_count", { product_id: product.id }).catch(() => {}),
  ]);

  if (signedUrlResult.error || !signedUrlResult.data?.signedUrl) {
    console.error("[discord-customer-bot] Signed URL error:", signedUrlResult.error);
    return publicResponseWithDM(
      `❌ <@${discordUserId}> Couldn't generate download link. Please try again or use the website.`,
      discordUserId,
      "❌ **Download Failed**\n\nCouldn't generate download link. Please try again or use the website."
    );
  }

  const embed = {
    color: 0x3b82f6,
    title: `📥 ${product.name}`,
    description: "Your download link is ready! Click the button below to download.\n\n⚠️ This link expires in **1 hour**.",
    footer: {
      text: "Eclipse Marketplace • Do not share this link",
    },
    timestamp: new Date().toISOString(),
  };

  const components = [
    {
      type: 1,
      components: [
        {
          type: 2,
          style: 5,
          label: "Download File",
          url: signedUrlResult.data.signedUrl,
          emoji: { name: "📥" },
        },
      ],
    },
  ];

  // Send DM with download link
  sendDMToUser(discordUserId, undefined, [embed], components).catch(console.error);

  // Public acknowledgement
  return new Response(
    JSON.stringify({
      type: CHANNEL_MESSAGE,
      data: {
        content: `📥 <@${discordUserId}> Your download for **${product.name}** is ready! Check your DMs for the link.`,
        flags: 0, // Public message
      },
    }),
    { headers: { "Content-Type": "application/json" } }
  );
}

// /getrole command - Assign Discord roles (already optimized with parallel queries)
async function handleGetRoleCommand(
  supabase: any,
  discordUserId: string,
  discordUsername: string,
  guildId?: string
) {
  const profile = await getLinkedAccount(supabase, discordUserId);

  if (!profile) {
    return publicResponseWithDM(
      `❌ <@${discordUserId}> Your account isn't linked yet. Run \`/link\` to get started!`,
      discordUserId,
      "❌ **Account Not Linked**\n\nYour Discord isn't linked to an Eclipse account yet.\nRun `/link` to get started!"
    );
  }

  const botToken = Deno.env.get("DISCORD_CUSTOMER_BOT_TOKEN");
  const targetGuildId = guildId || Deno.env.get("DISCORD_GUILD_ID");

  if (!botToken || !targetGuildId) {
    console.error("[discord-customer-bot] Missing bot token or guild ID");
    return publicResponseWithDM(
      `❌ <@${discordUserId}> Bot configuration error. Please contact support.`,
      discordUserId,
      "❌ Bot configuration error. Please contact support."
    );
  }

  // Role IDs
  const customerRoleId = Deno.env.get("DISCORD_CUSTOMER_ROLE_ID");
  const loyalCustomerRoleId = Deno.env.get("DISCORD_LOYAL_CUSTOMER_ROLE_ID");
  const storeCreatorRoleId = Deno.env.get("DISCORD_STORE_CREATOR_ROLE_ID");
  const eclipsePlusRoleId = Deno.env.get("DISCORD_ROLE_ID");

  // Run all database queries in parallel
  const [ordersResult, subscriptionResult, storeResult] = await Promise.all([
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("user_id", profile.user_id)
      .in("status", ["paid", "completed"]),
    supabase
      .from("subscriptions")
      .select("id")
      .eq("user_id", profile.user_id)
      .eq("status", "active")
      .maybeSingle(),
    supabase
      .from("stores")
      .select("id")
      .eq("owner_id", profile.user_id)
      .eq("is_active", true)
      .maybeSingle(),
  ]);

  const purchaseCount = ordersResult.count || 0;
  const hasSubscription = !!subscriptionResult.data;
  const hasStore = !!storeResult.data;

  console.log(`[discord-customer-bot] User ${profile.username}: ${purchaseCount} purchases, Eclipse+: ${hasSubscription}, Store: ${hasStore}`);

  // Determine roles
  const rolesToAssign: { id: string; name: string }[] = [];
  const rolesToRemove: { id: string; name: string }[] = [];

  if (purchaseCount >= 5 && loyalCustomerRoleId) {
    rolesToAssign.push({ id: loyalCustomerRoleId, name: "Loyal Customer" });
    if (customerRoleId) rolesToRemove.push({ id: customerRoleId, name: "Customer" });
  } else if (purchaseCount >= 1 && customerRoleId) {
    rolesToAssign.push({ id: customerRoleId, name: "Customer" });
  }

  if (hasSubscription && eclipsePlusRoleId) {
    rolesToAssign.push({ id: eclipsePlusRoleId, name: "Eclipse+" });
  }

  if (hasStore && storeCreatorRoleId) {
    rolesToAssign.push({ id: storeCreatorRoleId, name: "Store Creator" });
  }

  // Execute all role operations in parallel
  const rolesAssigned: string[] = [];
  const rolesFailed: string[] = [];

  await Promise.all([
    ...rolesToAssign.map(async (role) => {
      try {
        const response = await fetch(
          `https://discord.com/api/v10/guilds/${targetGuildId}/members/${discordUserId}/roles/${role.id}`,
          { method: "PUT", headers: { Authorization: `Bot ${botToken}`, "Content-Type": "application/json" } }
        );
        if (response.status === 204 || response.ok) {
          rolesAssigned.push(role.name);
        } else {
          console.error(`[discord-customer-bot] Failed ${role.name}: ${response.status}`);
          rolesFailed.push(role.name);
        }
      } catch (e) {
        console.error(`[discord-customer-bot] Error ${role.name}:`, e);
        rolesFailed.push(role.name);
      }
    }),
    ...rolesToRemove.map(async (role) => {
      try {
        await fetch(
          `https://discord.com/api/v10/guilds/${targetGuildId}/members/${discordUserId}/roles/${role.id}`,
          { method: "DELETE", headers: { Authorization: `Bot ${botToken}` } }
        );
      } catch (e) {
        console.log(`[discord-customer-bot] Could not remove ${role.name}:`, e);
      }
    }),
  ]);

  // Build response
  const fields: any[] = [];

  if (rolesAssigned.length > 0) {
    fields.push({
      name: "✅ Roles Synced",
      value: rolesAssigned.map(r => `• ${r}`).join("\n"),
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

  const eligibility: string[] = [];
  if (purchaseCount === 0) eligibility.push("• Make a purchase → **Customer**");
  if (purchaseCount > 0 && purchaseCount < 5) eligibility.push(`• ${5 - purchaseCount} more purchases → **Loyal Customer**`);
  if (!hasSubscription) eligibility.push("• Subscribe to Eclipse+ → **Eclipse+**");
  if (!hasStore) eligibility.push("• Create a store → **Store Creator**");

  if (eligibility.length > 0 && rolesAssigned.length === 0) {
    fields.push({
      name: "📋 How to Earn Roles",
      value: eligibility.join("\n"),
      inline: false,
    });
  }

  const embed = {
    color: rolesAssigned.length > 0 ? 0x22c55e : 0xf59e0b,
    title: rolesAssigned.length > 0 ? "🎉 Roles Synced!" : "📋 Role Status",
    description: rolesAssigned.length > 0
      ? `Your Discord roles have been updated!`
      : `Here's what you need to earn roles:`,
    fields,
    footer: { text: "Eclipse Marketplace" },
    timestamp: new Date().toISOString(),
  };

  const channelMessage = rolesAssigned.length > 0
    ? `🎉 <@${discordUserId}> Your roles have been synced: ${rolesAssigned.join(", ")}. Check your DMs for details!`
    : `📋 <@${discordUserId}> Check your DMs for information on how to earn roles!`;

  return publicResponseWithDM(
    channelMessage,
    discordUserId,
    undefined,
    [embed]
  );
}
