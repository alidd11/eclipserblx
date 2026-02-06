import { createClient } from "npm:@supabase/supabase-js@2";
import { verify } from "npm:discord-verify@1.2.0";

// Customer Bot - works in main Eclipse server AND creator store servers
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

interface ServerContext {
  guildId: string;
  isMainServer: boolean;
  store?: {
    id: string;
    name: string;
    slug: string;
    logo_url?: string;
  };
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
    console.log(`[discord-customer-bot] Received interaction type ${interaction.type}:`, interaction.data?.name, `guild: ${interaction.guild_id}`);

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
      
      // Build Discord avatar URL
      let discordAvatarUrl: string | undefined;
      if (discordUser.avatar) {
        const ext = discordUser.avatar.startsWith('a_') ? 'gif' : 'png';
        discordAvatarUrl = `https://cdn.discordapp.com/avatars/${discordUserId}/${discordUser.avatar}.${ext}?size=128`;
      } else {
        // Default avatar
        const defaultIndex = (BigInt(discordUserId) >> BigInt(22)) % BigInt(6);
        discordAvatarUrl = `https://cdn.discordapp.com/embed/avatars/${defaultIndex}.png`;
      }
      const guildId = interaction.guild_id;

      // Determine server context (main Eclipse server or store server)
      const serverContext = await getServerContext(supabase, guildId);
      console.log(`[discord-customer-bot] Server context:`, serverContext);

      switch (commandName) {
        case "link":
          return await handleLinkStatusCommand(supabase, discordUserId, discordUsername, serverContext, discordAvatarUrl);

        case "verify":
          return await handleVerifyCommand(supabase, interaction, discordUserId, discordUsername, serverContext, discordAvatarUrl);

        case "profile":
          return await handleProfileCommand(supabase, discordUserId, discordUsername, serverContext, discordAvatarUrl);

        case "purchases":
          return await handlePurchasesCommand(supabase, discordUserId, discordUsername, serverContext, discordAvatarUrl);

        case "retrieve":
          return await handleRetrieveCommand(supabase, interaction, discordUserId, discordUsername, serverContext, discordAvatarUrl);

        case "getrole":
        case "roles":
          return await handleGetRoleCommand(supabase, discordUserId, discordUsername, serverContext, discordAvatarUrl);

        case "store":
          return await handleStoreCommand(supabase, discordUserId, serverContext, discordAvatarUrl);

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

// Get server context - determine if main server or store server
async function getServerContext(supabase: any, guildId?: string): Promise<ServerContext> {
  const mainGuildId = Deno.env.get("DISCORD_GUILD_ID");
  
  if (!guildId) {
    return { guildId: mainGuildId || "", isMainServer: true };
  }

  // Check if this is the main Eclipse server
  if (guildId === mainGuildId) {
    return { guildId, isMainServer: true };
  }

  // Check if this guild is associated with a store
  const { data: store, error } = await supabase
    .from("stores")
    .select("id, name, slug, logo_url")
    .eq("discord_guild_id", guildId)
    .eq("is_active", true)
    .maybeSingle();

  if (store && !error) {
    return { guildId, isMainServer: false, store };
  }

  // Not a recognized server, but allow basic commands
  return { guildId, isMainServer: false };
}

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

// Public response with DM follow-up - now supports channel embeds
function publicResponseWithDM(
  channelEmbed: any,
  discordUserId: string,
  dmEmbeds?: any[],
  dmComponents?: any[]
) {
  // Fire and forget the DM - don't await to avoid timeout
  sendDMToUser(discordUserId, undefined, dmEmbeds, dmComponents).catch(console.error);

  return new Response(
    JSON.stringify({
      type: CHANNEL_MESSAGE,
      data: {
        embeds: [channelEmbed],
        flags: 0, // Public message
      },
    }),
    { headers: { "Content-Type": "application/json" } }
  );
}

// Get branding based on context
function getBranding(serverContext: ServerContext) {
  if (serverContext.store) {
    return {
      name: serverContext.store.name,
      footer: `${serverContext.store.name} • Powered by Eclipse`,
      color: 0x8b5cf6,
      icon: serverContext.store.logo_url,
    };
  }
  return {
    name: "Eclipse Marketplace",
    footer: "Eclipse Marketplace",
    color: 0x8b5cf6,
    icon: undefined,
  };
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
  discordUsername: string,
  serverContext: ServerContext,
  discordAvatarUrl?: string
) {
  const branding = getBranding(serverContext);
  const existingProfile = await getLinkedAccount(supabase, discordUserId);

  if (existingProfile) {
    const embed = {
      color: 0x22c55e,
      title: "✅ Account Linked",
      description: `Your Discord is connected to **@${existingProfile.username}**`,
      thumbnail: discordAvatarUrl ? { url: discordAvatarUrl } : undefined,
      fields: [
        {
          name: "🆔 Customer ID",
          value: existingProfile.customer_id || "N/A",
          inline: true,
        },
      ],
      footer: {
        text: `${branding.footer} • Use /profile, /purchases, or /retrieve`,
      },
      timestamp: new Date().toISOString(),
    };
    const channelEmbed = {
      color: 0x22c55e,
      description: `<@${discordUserId}>\n✅ Your account is already linked! Check your DMs for details.`,
      thumbnail: discordAvatarUrl ? { url: discordAvatarUrl } : undefined,
      footer: { text: branding.footer },
    };
    return publicResponseWithDM(channelEmbed, discordUserId, [embed]);
  }

  const embed = {
    color: branding.color,
    title: "🔗 Link Your Eclipse Account",
    description: "Connect your Discord to access your purchases and downloads.",
    thumbnail: discordAvatarUrl ? { url: discordAvatarUrl } : undefined,
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
      text: branding.footer,
    },
    timestamp: new Date().toISOString(),
  };
  const channelEmbed = {
    color: branding.color,
    description: `<@${discordUserId}>\n🔗 Check your DMs for instructions on how to link your Eclipse account!`,
    thumbnail: discordAvatarUrl ? { url: discordAvatarUrl } : undefined,
    footer: { text: branding.footer },
  };
  return publicResponseWithDM(channelEmbed, discordUserId, [embed]);
}

// /verify command - Link account with code
async function handleVerifyCommand(
  supabase: any,
  interaction: DiscordInteraction,
  discordUserId: string,
  discordUsername: string,
  serverContext: ServerContext,
  discordAvatarUrl?: string
) {
  const branding = getBranding(serverContext);
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
        text: branding.footer,
      },
    };
    const channelEmbed = {
      color: 0xef4444,
      description: `<@${discordUserId}>\n❌ Please provide a verification code. Check your DMs for help.`,
      thumbnail: discordAvatarUrl ? { url: discordAvatarUrl } : undefined,
      footer: { text: branding.footer },
    };
    return publicResponseWithDM(channelEmbed, discordUserId, [embed]);
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
        text: branding.footer,
      },
    };
    const channelEmbed = {
      color: 0xef4444,
      description: `<@${discordUserId}>\n❌ That code is invalid or expired. Check your DMs for help.`,
      thumbnail: discordAvatarUrl ? { url: discordAvatarUrl } : undefined,
      footer: { text: branding.footer },
    };
    return publicResponseWithDM(channelEmbed, discordUserId, [embed]);
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
    thumbnail: discordAvatarUrl ? { url: discordAvatarUrl } : undefined,
    fields: [
      {
        name: "Available Commands",
        value: "• `/profile` - View your account\n• `/purchases` - See your orders\n• `/retrieve` - Get your files\n• `/getrole` - Sync your roles",
        inline: false,
      },
    ],
    footer: {
      text: branding.footer,
    },
    timestamp: new Date().toISOString(),
  };
  const channelEmbed = {
    color: 0x22c55e,
    description: `<@${discordUserId}>\n🎉 Your account has been linked! Check your DMs for details.`,
    thumbnail: discordAvatarUrl ? { url: discordAvatarUrl } : undefined,
    footer: { text: branding.footer },
  };
  return publicResponseWithDM(channelEmbed, discordUserId, [embed]);
}

// /profile command - View account info
async function handleProfileCommand(
  supabase: any,
  discordUserId: string,
  discordUsername: string,
  serverContext: ServerContext,
  discordAvatarUrl?: string
) {
  const branding = getBranding(serverContext);
  const profile = await getLinkedAccount(supabase, discordUserId);

  if (!profile) {
    const notLinkedEmbed = {
      color: 0xef4444,
      title: "❌ Account Not Linked",
      description: `<@${discordUserId}>\nYour Discord isn't linked yet. Run \`/link\` to get started!`,
      thumbnail: discordAvatarUrl ? { url: discordAvatarUrl } : undefined,
      footer: { text: branding.footer },
    };
    const dmEmbed = {
      color: 0xef4444,
      title: "❌ Account Not Linked",
      description: "Your Discord isn't linked to an Eclipse account yet.",
      fields: [{ name: "How to Link", value: "Run `/link` to get started!", inline: false }],
      footer: { text: branding.footer },
      timestamp: new Date().toISOString(),
    };
    return publicResponseWithDM(notLinkedEmbed, discordUserId, [dmEmbed]);
  }

  // Fetch stats based on context (avoid embedded joins; order_items has no store_id)
  let subscription: any = null;
  let orderCount = 0;
  let totalSpent = 0;

  if (serverContext.store) {
    // Store server: only count purchases for this specific store
    const { data: orders, error: ordersError } = await supabase
      .from("orders")
      .select("id")
      .eq("user_id", profile.user_id)
      .in("status", ["paid", "completed"]) 
      .limit(200);

    if (ordersError) {
      console.error("[discord-customer-bot] Store profile orders lookup error:", ordersError);
    }

    const orderIds = (orders || []).map((o: any) => o.id);

    if (orderIds.length > 0) {
      const { data: orderItems, error: orderItemsError } = await supabase
        .from("order_items")
        .select("product_id")
        .in("order_id", orderIds);

      if (orderItemsError) {
        console.error("[discord-customer-bot] Store profile order_items lookup error:", orderItemsError);
      } else {
        const productIds = [...new Set((orderItems || []).map((i: any) => i.product_id).filter(Boolean))];

        if (productIds.length > 0) {
          const { data: products, error: productsError } = await supabase
            .from("products")
            .select("id, store_id")
            .in("id", productIds);

          if (productsError) {
            console.error("[discord-customer-bot] Store profile products lookup error:", productsError);
          } else {
            const storeProductSet = new Set(
              (products || [])
                .filter((p: any) => p.store_id === serverContext.store!.id)
                .map((p: any) => p.id)
            );

            orderCount = (orderItems || []).filter((i: any) => storeProductSet.has(i.product_id)).length;
          }
        }
      }
    }
  } else {
    const [subscriptionResult, orderCountResult, ordersTotalsResult] = await Promise.all([
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

    subscription = subscriptionResult.data;
    orderCount = orderCountResult.count || 0;
    totalSpent =
      ordersTotalsResult.data?.reduce((sum: number, o: any) => sum + Number(o.total || 0), 0) || 0;
  }

  const fields = [
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
  ];

  if (!serverContext.store) {
    fields.push({
      name: "⭐ Membership",
      value: subscription ? `Eclipse+ (Active)` : "Free",
      inline: true,
    });
    fields.push({
      name: "💷 Total Spent",
      value: `£${totalSpent.toFixed(2)}`,
      inline: true,
    });
  }

  fields.push({
    name: serverContext.store ? `🛒 Orders from ${serverContext.store.name}` : "🛒 Total Orders",
    value: `${orderCount} purchases`,
    inline: true,
  });

  const embed = {
    color: branding.color,
    author: {
      name: profile.display_name || profile.username,
      icon_url: profile.avatar_url || undefined,
    },
    title: serverContext.store ? `${serverContext.store.name} Profile` : "Eclipse Profile",
    thumbnail: discordAvatarUrl ? { url: discordAvatarUrl } : undefined,
    fields,
    footer: {
      text: branding.footer,
    },
    timestamp: new Date().toISOString(),
  };

  const channelEmbed = {
    color: branding.color,
    description: `<@${discordUserId}>\n👤 Profile sent! Check your DMs.`,
    thumbnail: discordAvatarUrl ? { url: discordAvatarUrl } : undefined,
    footer: { text: branding.footer },
  };
  return publicResponseWithDM(channelEmbed, discordUserId, [embed]);
}

// /purchases command - List purchases
async function handlePurchasesCommand(
  supabase: any,
  discordUserId: string,
  discordUsername: string,
  serverContext: ServerContext,
  discordAvatarUrl?: string
) {
  const branding = getBranding(serverContext);
  const profile = await getLinkedAccount(supabase, discordUserId);

  if (!profile) {
    const notLinkedEmbed = {
      color: 0xef4444,
      description: `<@${discordUserId}>\n❌ Your Discord isn't linked yet. Run \`/link\` to get started!`,
      thumbnail: discordAvatarUrl ? { url: discordAvatarUrl } : undefined,
      footer: { text: branding.footer },
    };
    const dmEmbed = {
      color: 0xef4444,
      title: "❌ Account Not Linked",
      description: "Your Discord isn't linked to an Eclipse account yet.",
      fields: [{ name: "How to Link", value: "Run `/link` to get started!", inline: false }],
      footer: { text: branding.footer },
      timestamp: new Date().toISOString(),
    };
    return publicResponseWithDM(notLinkedEmbed, discordUserId, [dmEmbed]);
  }

  // Fetch recent orders
  const { data: orders, error: ordersError } = await supabase
    .from("orders")
    .select("id, created_at, status, total")
    .eq("user_id", profile.user_id)
    .in("status", ["paid", "completed"])
    .order("created_at", { ascending: false })
    .limit(20);

  if (ordersError || !orders || orders.length === 0) {
    const msg = serverContext.store
      ? `You haven't purchased anything from ${serverContext.store.name} yet.`
      : "You haven't made any purchases yet.";
    const channelEmbed = {
      color: 0x3b82f6,
      description: `<@${discordUserId}>\n📦 ${msg}`,
      thumbnail: discordAvatarUrl ? { url: discordAvatarUrl } : undefined,
      footer: { text: branding.footer },
    };
    const dmEmbed = {
      color: 0x3b82f6,
      title: "📦 No Purchases Found",
      description: msg,
      footer: { text: branding.footer },
      timestamp: new Date().toISOString(),
    };
    return publicResponseWithDM(channelEmbed, discordUserId, [dmEmbed]);
  }

  const orderIds = orders.map((o: any) => o.id);
  const orderCreatedAt = new Map(orderIds.map((id: string) => [id, orders.find((o: any) => o.id === id)?.created_at]));

  // Pull items separately (avoids embedded relationship issues)
  const { data: orderItems, error: orderItemsError } = await supabase
    .from("order_items")
    .select("order_id, product_id, product_name, price")
    .in("order_id", orderIds);

  if (orderItemsError || !orderItems || orderItems.length === 0) {
    console.error("[discord-customer-bot] Purchases order_items error:", orderItemsError);
    const channelEmbed = {
      color: 0x3b82f6,
      title: "📦 No Purchases Found",
      description: `<@${discordUserId}>\nI couldn't find any purchasable items for your orders.`,
      thumbnail: discordAvatarUrl ? { url: discordAvatarUrl } : undefined,
      footer: { text: branding.footer },
    };
    const dmEmbed = {
      color: 0x3b82f6,
      title: "📦 No Purchases Found",
      description: "I couldn't find any purchasable items for your recent orders.",
      footer: { text: branding.footer },
      timestamp: new Date().toISOString(),
    };
    return publicResponseWithDM(channelEmbed, discordUserId, [dmEmbed]);
  }

  let filteredItems = orderItems;

  // If command is run inside a creator's store server, only show purchases for that store
  if (serverContext.store) {
    const productIds = [...new Set(filteredItems.map((i: any) => i.product_id).filter(Boolean))];
    const { data: products, error: productsError } = await supabase
      .from("products")
      .select("id, store_id")
      .in("id", productIds);

    if (productsError) {
      console.error("[discord-customer-bot] Purchases product store lookup error:", productsError);
    } else {
      const storeProductSet = new Set(
        (products || [])
          .filter((p: any) => p.store_id === serverContext.store!.id)
          .map((p: any) => p.id)
      );
      filteredItems = filteredItems.filter((i: any) => storeProductSet.has(i.product_id));
    }

    if (!filteredItems.length) {
      const channelEmbed = {
        color: 0x3b82f6,
        title: "📦 No Purchases Found",
        description: `<@${discordUserId}>\nYou haven't purchased anything from ${serverContext.store.name} yet.`,
        thumbnail: discordAvatarUrl ? { url: discordAvatarUrl } : undefined,
        footer: { text: branding.footer },
      };
      const dmEmbed = {
        color: 0x3b82f6,
        title: "📦 No Purchases Found",
        description: `You haven't purchased anything from ${serverContext.store.name} yet.`,
        footer: { text: branding.footer },
        timestamp: new Date().toISOString(),
      };
      return publicResponseWithDM(channelEmbed, discordUserId, [dmEmbed]);
    }
  }

  const productList = filteredItems
    .map((item: any) => {
      const createdAt = orderCreatedAt.get(item.order_id);
      return {
        name: item.product_name,
        productId: item.product_id,
        date: createdAt ? new Date(createdAt).toLocaleDateString("en-GB") : "",
        price: Number(item.price || 0),
        orderId: item.order_id,
      };
    })
    .sort((a: any, b: any) => {
      const aTime = orderCreatedAt.get(a.orderId) ? new Date(orderCreatedAt.get(a.orderId)).getTime() : 0;
      const bTime = orderCreatedAt.get(b.orderId) ? new Date(orderCreatedAt.get(b.orderId)).getTime() : 0;
      return bTime - aTime;
    })
    .slice(0, 15);

  const embed = {
    color: 0x22c55e,
    title: serverContext.store ? `📦 Your ${serverContext.store.name} Purchases` : "📦 Your Purchases",
    description: "Here are your most recent purchases:",
    thumbnail: discordAvatarUrl ? { url: discordAvatarUrl } : undefined,
    fields: productList.map((p: any, i: number) => ({
      name: `${i + 1}. ${p.name}`,
      value: `£${p.price.toFixed(2)}${p.date ? ` • ${p.date}` : ""}`,
      inline: false,
    })),
    footer: {
      text: `${branding.footer} • Use /retrieve to get files`,
    },
    timestamp: new Date().toISOString(),
  };

  const channelEmbed = {
    color: 0x22c55e,
    description: `<@${discordUserId}>\n📦 Check your DMs for your purchase list.`,
    thumbnail: discordAvatarUrl ? { url: discordAvatarUrl } : undefined,
    footer: { text: branding.footer },
  };

  return publicResponseWithDM(channelEmbed, discordUserId, [embed]);
}

// /retrieve command - Get download link
async function handleRetrieveCommand(
  supabase: any,
  interaction: DiscordInteraction,
  discordUserId: string,
  discordUsername: string,
  serverContext: ServerContext,
  discordAvatarUrl?: string
) {
  const branding = getBranding(serverContext);
  const profile = await getLinkedAccount(supabase, discordUserId);

  if (!profile) {
    const notLinkedEmbed = {
      color: 0xef4444,
      title: "❌ Account Not Linked",
      description: "Your Discord isn't linked to an Eclipse account yet.",
      fields: [
        {
          name: "How to Link",
          value: "Run `/link` to get started with linking your account!",
          inline: false,
        },
      ],
      footer: { text: branding.footer },
      timestamp: new Date().toISOString(),
    };
    const channelEmbed = {
      color: 0xef4444,
      description: `<@${discordUserId}>\n❌ Your account isn't linked yet. Run \`/link\` to get started!`,
      thumbnail: discordAvatarUrl ? { url: discordAvatarUrl } : undefined,
      footer: { text: branding.footer },
    };
    return publicResponseWithDM(channelEmbed, discordUserId, [notLinkedEmbed]);
  }

  const options = interaction.data?.options || [];
  const productOption = options.find((o) => o.name === "product");

  // Get user's order IDs
  const { data: userOrders } = await supabase
    .from("orders")
    .select("id")
    .eq("user_id", profile.user_id)
    .in("status", ["paid", "completed"]);

  const orderIds = userOrders?.map((o: any) => o.id) || [];

  if (orderIds.length === 0) {
    const noOrdersEmbed = {
      color: 0x3b82f6,
      title: "📁 No Downloads Available",
      description: "You haven't purchased any downloadable products yet.",
      fields: [
        {
          name: "Browse Products",
          value: "Visit [Eclipse Marketplace](https://eclipserblx.com) to find products!",
          inline: false,
        },
      ],
      footer: { text: branding.footer },
      timestamp: new Date().toISOString(),
    };
    const channelEmbed = {
      color: 0x3b82f6,
      description: `<@${discordUserId}>\n📁 You haven't purchased any downloadable products yet.`,
      thumbnail: discordAvatarUrl ? { url: discordAvatarUrl } : undefined,
      footer: { text: branding.footer },
    };
    return publicResponseWithDM(channelEmbed, discordUserId, [noOrdersEmbed]);
  }

  // Get order items for these orders
  const { data: orderItems, error: orderItemsError } = await supabase
    .from("order_items")
    .select("product_id")
    .in("order_id", orderIds);

  if (orderItemsError) {
    console.error("[discord-customer-bot] order_items lookup error:", orderItemsError);
  }

  const productIds = [...new Set(orderItems?.map((i: any) => i.product_id) || [])];

  if (productIds.length === 0) {
    const msg = serverContext.store
      ? `You haven't purchased any products from ${serverContext.store.name} yet.`
      : "You haven't purchased any downloadable products yet.";
    const noProductsEmbed = {
      color: 0x3b82f6,
      title: "📁 No Downloads Available",
      description: msg,
      footer: { text: branding.footer },
      timestamp: new Date().toISOString(),
    };
    const channelEmbed = {
      color: 0x3b82f6,
      description: `<@${discordUserId}>\n📁 ${msg}`,
      thumbnail: discordAvatarUrl ? { url: discordAvatarUrl } : undefined,
      footer: { text: branding.footer },
    };
    return publicResponseWithDM(channelEmbed, discordUserId, [noProductsEmbed]);
  }

  // Get products with download files (store-filtered when applicable)
  let productsQuery = supabase
    .from("products")
    .select("id, name, asset_file_url, store_id")
    .in("id", productIds)
    .not("asset_file_url", "is", null);

  if (serverContext.store) {
    productsQuery = productsQuery.eq("store_id", serverContext.store.id);
  }

  const { data: products } = await productsQuery;


  if (!products || products.length === 0) {
    const noFilesEmbed = {
      color: 0x3b82f6,
      title: "📁 No Downloads Available",
      description: "None of your purchased products have downloadable files.",
      footer: { text: branding.footer },
      timestamp: new Date().toISOString(),
    };
    const channelEmbed = {
      color: 0x3b82f6,
      description: `<@${discordUserId}>\n📁 None of your purchased products have downloadable files.`,
      thumbnail: discordAvatarUrl ? { url: discordAvatarUrl } : undefined,
      footer: { text: branding.footer },
    };
    return publicResponseWithDM(channelEmbed, discordUserId, [noFilesEmbed]);
  }

  if (!productOption) {
    // List downloadable products
    const productList = products.map((p: any, i: number) => `**${i + 1}.** ${p.name}`).join("\n");

    const embed = {
      color: 0x3b82f6,
      title: serverContext.store ? `📁 Your ${serverContext.store.name} Downloads` : "📁 Your Downloadable Products",
      description: productList,
      thumbnail: discordAvatarUrl ? { url: discordAvatarUrl } : undefined,
      footer: {
        text: `${branding.footer} • Use /retrieve product:NAME to download`,
      },
      timestamp: new Date().toISOString(),
    };
    const channelEmbed = {
      color: 0x3b82f6,
      description: `<@${discordUserId}>\n📁 Check your DMs for your download list!`,
      thumbnail: discordAvatarUrl ? { url: discordAvatarUrl } : undefined,
      footer: { text: branding.footer },
    };
    return publicResponseWithDM(channelEmbed, discordUserId, [embed]);
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
        text: `${branding.footer} • Try typing the exact product name`,
      },
    };
    const channelEmbed = {
      color: 0xef4444,
      description: `<@${discordUserId}>\n❌ Couldn't find that product. Check your DMs for available products.`,
      thumbnail: discordAvatarUrl ? { url: discordAvatarUrl } : undefined,
      footer: { text: branding.footer },
    };
    return publicResponseWithDM(channelEmbed, discordUserId, [embed]);
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
    const downloadFailedEmbed = {
      color: 0xef4444,
      title: "❌ Download Failed",
      description: "Couldn't generate download link. Please try again or use the website.",
      fields: [
        {
          name: "Alternative",
          value: "Visit [Eclipse Marketplace](https://eclipserblx.com) to download your products.",
          inline: false,
        },
      ],
      footer: { text: branding.footer },
      timestamp: new Date().toISOString(),
    };
    const channelEmbed = {
      color: 0xef4444,
      description: `<@${discordUserId}>\n❌ Couldn't generate download link. Please try again or use the website.`,
      thumbnail: discordAvatarUrl ? { url: discordAvatarUrl } : undefined,
      footer: { text: branding.footer },
    };
    return publicResponseWithDM(channelEmbed, discordUserId, [downloadFailedEmbed]);
  }

  const embed = {
    color: 0x3b82f6,
    title: `📥 ${product.name}`,
    description: "Your download link is ready! Click the button below to download.\n\n⚠️ This link expires in **1 hour**.",
    thumbnail: discordAvatarUrl ? { url: discordAvatarUrl } : undefined,
    footer: {
      text: `${branding.footer} • Do not share this link`,
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

  // Public acknowledgement as embed
  const channelEmbed = {
    color: 0x22c55e,
    description: `<@${discordUserId}>\n📥 Your download for **${product.name}** is ready! Check your DMs.`,
    thumbnail: discordAvatarUrl ? { url: discordAvatarUrl } : undefined,
    footer: { text: branding.footer },
  };

  return new Response(
    JSON.stringify({
      type: CHANNEL_MESSAGE,
      data: {
        embeds: [channelEmbed],
        flags: 0,
      },
    }),
    { headers: { "Content-Type": "application/json" } }
  );
}

// /getrole command - Assign Discord roles based on context
async function handleGetRoleCommand(
  supabase: any,
  discordUserId: string,
  discordUsername: string,
  serverContext: ServerContext,
  discordAvatarUrl?: string
) {
  const branding = getBranding(serverContext);
  const profile = await getLinkedAccount(supabase, discordUserId);

  if (!profile) {
    const notLinkedEmbed = {
      color: 0xef4444,
      title: "❌ Account Not Linked",
      description: "Your Discord isn't linked to an Eclipse account yet.",
      fields: [
        {
          name: "How to Link",
          value: "Run `/link` to get started with linking your account!",
          inline: false,
        },
      ],
      footer: { text: branding.footer },
      timestamp: new Date().toISOString(),
    };
    const channelEmbed = {
      color: 0xef4444,
      description: `<@${discordUserId}>\n❌ Your account isn't linked yet. Run \`/link\` to get started!`,
      thumbnail: discordAvatarUrl ? { url: discordAvatarUrl } : undefined,
      footer: { text: branding.footer },
    };
    return publicResponseWithDM(channelEmbed, discordUserId, [notLinkedEmbed]);
  }

  const botToken = Deno.env.get("DISCORD_CUSTOMER_BOT_TOKEN");
  
  if (!botToken || !serverContext.guildId) {
    console.error("[discord-customer-bot] Missing bot token or guild ID");
    const configErrorEmbed = {
      color: 0xef4444,
      title: "❌ Configuration Error",
      description: "Bot configuration error. Please contact support.",
      footer: { text: branding.footer },
      timestamp: new Date().toISOString(),
    };
    const channelEmbed = {
      color: 0xef4444,
      description: `<@${discordUserId}>\n❌ Bot configuration error. Please contact support.`,
      thumbnail: discordAvatarUrl ? { url: discordAvatarUrl } : undefined,
      footer: { text: branding.footer },
    };
    return publicResponseWithDM(channelEmbed, discordUserId, [configErrorEmbed]);
  }

  const rolesToAssign: { id: string; name: string }[] = [];
  const rolesToRemove: { id: string; name: string }[] = [];

  if (serverContext.isMainServer) {
    // Main server: Use environment variable role IDs
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

    console.log(`[discord-customer-bot] Main server - User ${profile.username}: ${purchaseCount} purchases, Eclipse+: ${hasSubscription}, Store: ${hasStore}`);

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
  } else if (serverContext.store) {
    // Store server: Use store-specific role configs
    const [roleConfigsResult, ordersResult] = await Promise.all([
      supabase
        .from("discord_role_configs")
        .select("*")
        .eq("store_id", serverContext.store.id)
        .eq("auto_assign_on_purchase", true),
      supabase
        .from("orders")
        .select("id")
        .eq("user_id", profile.user_id)
        .in("status", ["paid", "completed"]) 
        .limit(200),
    ]);

    const roleConfigs = roleConfigsResult.data || [];
    const orderIds = (ordersResult.data || []).map((o: any) => o.id);

    let orderCount = 0;
    let totalSpent = 0;

    if (orderIds.length > 0) {
      const { data: orderItems, error: orderItemsError } = await supabase
        .from("order_items")
        .select("product_id, price, order_id")
        .in("order_id", orderIds);

      if (orderItemsError) {
        console.error("[discord-customer-bot] Store order_items lookup error:", orderItemsError);
      } else if (orderItems?.length) {
        const productIds = [...new Set(orderItems.map((i: any) => i.product_id).filter(Boolean))];

        const { data: products, error: productsError } = await supabase
          .from("products")
          .select("id, store_id")
          .in("id", productIds);

        if (productsError) {
          console.error("[discord-customer-bot] Product store lookup error:", productsError);
        } else {
          const storeProductSet = new Set(
            (products || [])
              .filter((p: any) => p.store_id === serverContext.store!.id)
              .map((p: any) => p.id)
          );

          const storeItems = (orderItems || []).filter((i: any) => storeProductSet.has(i.product_id));
          orderCount = storeItems.length;
          totalSpent = storeItems.reduce((sum: number, item: any) => sum + Number(item.price || 0), 0);
        }
      }
    }

    console.log(
      `[discord-customer-bot] Store server ${serverContext.store.name} - User ${profile.username}: ${orderCount} purchases, £${totalSpent.toFixed(2)} spent`
    );

    // Check each role config
    for (const config of roleConfigs) {
      let eligible = true;

      if (config.min_order_count && orderCount < config.min_order_count) {
        eligible = false;
      }

      if (config.min_order_amount && totalSpent < config.min_order_amount) {
        eligible = false;
      }

      if (config.requires_subscription) {
        const { data: sub } = await supabase
          .from("subscriptions")
          .select("id")
          .eq("user_id", profile.user_id)
          .eq("status", "active")
          .maybeSingle();
        if (!sub) eligible = false;
      }

      if (eligible) {
        rolesToAssign.push({ id: config.role_id, name: config.role_name });
      }
    }
  } else {
    // Unknown server - no roles to assign
    const unknownServerChannelEmbed = {
      color: 0xef4444,
      description: `<@${discordUserId}>\n❌ This server isn't configured for automatic roles.`,
      thumbnail: discordAvatarUrl ? { url: discordAvatarUrl } : undefined,
      footer: { text: branding.footer },
    };
    const unknownServerDmEmbed = {
      color: 0xef4444,
      title: "❌ Server Not Configured",
      description: "This Discord server isn't linked to the main Eclipse server or a creator store.",
      footer: { text: branding.footer },
      timestamp: new Date().toISOString(),
    };
    return publicResponseWithDM(unknownServerChannelEmbed, discordUserId, [unknownServerDmEmbed]);
  }

  // Execute all role operations in parallel
  const rolesAssigned: string[] = [];
  const rolesFailed: string[] = [];

  await Promise.all([
    ...rolesToAssign.map(async (role) => {
      try {
        const response = await fetch(
          `https://discord.com/api/v10/guilds/${serverContext.guildId}/members/${discordUserId}/roles/${role.id}`,
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
          `https://discord.com/api/v10/guilds/${serverContext.guildId}/members/${discordUserId}/roles/${role.id}`,
          { method: "DELETE", headers: { Authorization: `Bot ${botToken}` } }
        );
      } catch (e) {
        console.log(`[discord-customer-bot] Could not remove ${role.name}:`, e);
      }
    }),
  ]);

  // Build response - now fully public with role pings
  const fields: any[] = [];

  // Build role pings for assigned roles
  const rolePings = rolesToAssign.map(r => `<@&${r.id}>`).join(" ");

  if (rolesAssigned.length > 0) {
    fields.push({
      name: "✅ Roles Synced",
      value: rolesToAssign.filter(r => rolesAssigned.includes(r.name)).map(r => `<@&${r.id}>`).join("\n"),
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

  // Build eligibility hints based on context
  const eligibility: string[] = [];
  if (serverContext.isMainServer) {
    // Get current stats for hints
    const [ordersRes, subRes, storeRes] = await Promise.all([
      supabase.from("orders").select("id", { count: "exact", head: true }).eq("user_id", profile.user_id).in("status", ["paid", "completed"]),
      supabase.from("subscriptions").select("id").eq("user_id", profile.user_id).eq("status", "active").maybeSingle(),
      supabase.from("stores").select("id").eq("owner_id", profile.user_id).eq("is_active", true).maybeSingle(),
    ]);
    const count = ordersRes.count || 0;
    if (count === 0) eligibility.push("• Make a purchase → **Customer**");
    if (count > 0 && count < 5) eligibility.push(`• ${5 - count} more purchases → **Loyal Customer**`);
    if (!subRes.data) eligibility.push("• Subscribe to Eclipse+ → **Eclipse+**");
    if (!storeRes.data) eligibility.push("• Create a store → **Store Creator**");
  } else if (serverContext.store && rolesAssigned.length === 0) {
    eligibility.push(`• Make purchases from ${serverContext.store.name} to earn roles!`);
  }

  if (eligibility.length > 0 && rolesAssigned.length === 0) {
    fields.push({
      name: "📋 How to Earn Roles",
      value: eligibility.join("\n"),
      inline: false,
    });
  }

  // Build public embed with role pings
  const publicEmbed = {
    color: rolesAssigned.length > 0 ? 0x22c55e : 0xf59e0b,
    title: rolesAssigned.length > 0 ? "🎉 Roles Synced!" : "📋 Role Status",
    description: rolesAssigned.length > 0
      ? `<@${discordUserId}>\n\nYour roles have been updated!`
      : `<@${discordUserId}>\n\nHere's what you need to earn roles:`,
    thumbnail: discordAvatarUrl ? { url: discordAvatarUrl } : undefined,
    fields,
    footer: { text: branding.footer },
    timestamp: new Date().toISOString(),
  };

  // Return public response (no DM)
  return new Response(
    JSON.stringify({
      type: CHANNEL_MESSAGE,
      data: {
        embeds: [publicEmbed],
        flags: 0, // Public message
      },
    }),
    { headers: { "Content-Type": "application/json" } }
  );
}

// /store command - Display store information publicly
async function handleStoreCommand(
  supabase: any,
  discordUserId: string,
  serverContext: ServerContext,
  discordAvatarUrl?: string
) {
  const branding = getBranding(serverContext);

  // Check if this is the main Eclipse server
  if (serverContext.isMainServer) {
    // For main server, show Eclipse Marketplace info
    const publicEmbed = {
      color: 0x8b5cf6,
      title: "🛒 Eclipse Marketplace",
      description: "The premier Roblox asset marketplace featuring scripts, UI kits, games, and more from verified creators.",
      thumbnail: { url: "https://eclipserblx.com/logo.png" },
      fields: [
        {
          name: "🌐 Website",
          value: "[eclipserblx.com](https://eclipserblx.com)",
          inline: true,
        },
        {
          name: "🏪 Browse Stores",
          value: "[View All Stores](https://eclipserblx.com/stores)",
          inline: true,
        },
      ],
      footer: { text: "Eclipse Marketplace" },
      timestamp: new Date().toISOString(),
    };

    return new Response(
      JSON.stringify({
        type: CHANNEL_MESSAGE,
        data: {
          embeds: [publicEmbed],
          flags: 0,
        },
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  }

  // Check if this server has a linked store
  if (!serverContext.store) {
    const noStoreEmbed = {
      color: 0xef4444,
      description: `<@${discordUserId}>\n\n❌ This server isn't linked to a store.`,
      thumbnail: discordAvatarUrl ? { url: discordAvatarUrl } : undefined,
      footer: { text: branding.footer },
    };

    return new Response(
      JSON.stringify({
        type: CHANNEL_MESSAGE,
        data: {
          embeds: [noStoreEmbed],
          flags: 0,
        },
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  }

  // Fetch full store details
  const { data: store, error } = await supabase
    .from("stores")
    .select("id, name, slug, description, logo_url, banner_url, follower_count, is_verified")
    .eq("id", serverContext.store.id)
    .single();

  if (error || !store) {
    console.error("[discord-customer-bot] Store fetch error:", error);
    return interactionResponse("Failed to fetch store information.", true);
  }

  // Get product count
  const { count: productCount } = await supabase
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("store_id", store.id)
    .eq("is_active", true);

  // Build store URL
  const storeUrl = `https://eclipserblx.com/store/${store.slug}`;

  const fields: any[] = [];

  if (store.description) {
    fields.push({
      name: "📝 About",
      value: store.description.length > 200 ? store.description.substring(0, 200) + "..." : store.description,
      inline: false,
    });
  }

  fields.push(
    {
      name: "📦 Products",
      value: `${productCount || 0}`,
      inline: true,
    },
    {
      name: "👥 Followers",
      value: `${store.follower_count || 0}`,
      inline: true,
    }
  );

  if (store.is_verified) {
    fields.push({
      name: "✅ Status",
      value: "Verified Store",
      inline: true,
    });
  }

  fields.push({
    name: "🔗 Visit Store",
    value: `[${store.name} on Eclipse](${storeUrl})`,
    inline: false,
  });

  const publicEmbed = {
    color: 0x8b5cf6,
    title: `🏪 ${store.name}`,
    thumbnail: store.logo_url ? { url: store.logo_url } : undefined,
    image: store.banner_url ? { url: store.banner_url } : undefined,
    fields,
    footer: { text: `${store.name} • Powered by Eclipse` },
    timestamp: new Date().toISOString(),
  };

  return new Response(
    JSON.stringify({
      type: CHANNEL_MESSAGE,
      data: {
        embeds: [publicEmbed],
        flags: 0,
      },
    }),
    { headers: { "Content-Type": "application/json" } }
  );
}
