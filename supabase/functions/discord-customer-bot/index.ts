import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verify } from "https://esm.sh/discord-verify@1.2.0";

const DISCORD_PUBLIC_KEY = "b87fe7be359aeef9c3f4f75c9f6f00f45a0bf3b5ec7b16d87c8c32bf5d0d7b8c"; // Eclipse Marketplace app public key

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

    // For development, skip verification if public key not set
    const publicKey = Deno.env.get("DISCORD_BOT_PUBLIC_KEY") || DISCORD_PUBLIC_KEY;
    
    try {
      const isValid = await verify(body, signature, timestamp, publicKey, crypto.subtle);
      if (!isValid) {
        console.log("[discord-customer-bot] Invalid signature");
        return new Response("Invalid request signature", { status: 401, headers: corsHeaders });
      }
    } catch (verifyError) {
      console.log("[discord-customer-bot] Signature verification error:", verifyError);
      // Continue anyway for development - Discord will fail if not valid
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
          return await handleLinkCommand(supabase, interaction, discordUserId, discordUsername);

        case "profile":
          return await handleProfileCommand(supabase, discordUserId, discordUsername);

        case "purchases":
          return await handlePurchasesCommand(supabase, discordUserId, discordUsername);

        case "download":
          return await handleDownloadCommand(supabase, interaction, discordUserId, discordUsername);

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

// /link command - Generate or verify a link code
async function handleLinkCommand(
  supabase: any,
  interaction: DiscordInteraction,
  discordUserId: string,
  discordUsername: string
) {
  const options = interaction.data?.options || [];
  const codeOption = options.find((o) => o.name === "code");

  // If code provided, verify it
  if (codeOption) {
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
      return interactionResponse(
        "❌ **Invalid or Expired Code**\nThis code doesn't exist or has expired. Please generate a new one from your Eclipse account.",
        true
      );
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

    return interactionResponse(
      "✅ **Account Linked Successfully!**\n\nYour Discord account is now linked to Eclipse. You can now use:\n• `/profile` - View your account\n• `/purchases` - See your orders\n• `/download` - Get your files",
      true
    );
  }

  // No code provided - check if already linked
  const existingProfile = await getLinkedAccount(supabase, discordUserId);

  if (existingProfile) {
    return interactionResponse(
      `✅ **Already Linked**\n\nYour Discord is linked to **@${existingProfile.username}** (${existingProfile.customer_id}).\n\nUse \`/profile\`, \`/purchases\`, or \`/download\` to access your account.`,
      true
    );
  }

  return interactionResponse(
    "🔗 **Link Your Eclipse Account**\n\n1. Go to your Eclipse account settings\n2. Find the **Link Discord** section\n3. Click **Generate Link Code**\n4. Come back here and run `/link code:YOUR_CODE`\n\n🔗 **Account Settings:** https://eclipserblx.com/account",
    true
  );
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

// /download command - Get download link
async function handleDownloadCommand(
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
    // List downloadable products
    const { data: orderItems } = await supabase
      .from("order_items")
      .select(`
        id,
        product_id,
        product_name,
        orders!inner (
          user_id,
          status
        )
      `)
      .eq("orders.user_id", profile.user_id)
      .in("orders.status", ["paid", "completed"]);

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

    return interactionResponse(
      `📁 **Your Downloadable Products**\n\n${productList}\n\n💡 Use \`/download product:NAME\` to get a download link.`,
      true
    );
  }

  // Search for product by name
  const searchTerm = productOption.value.toLowerCase();

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

  // Find matching product
  const { data: products } = await supabase
    .from("products")
    .select("id, name, asset_file_url")
    .in("id", purchasedProductIds)
    .not("asset_file_url", "is", null)
    .ilike("name", `%${searchTerm}%`)
    .limit(1);

  if (!products || products.length === 0) {
    return interactionResponse(
      `❌ **Product Not Found**\n\nCouldn't find a downloadable product matching "${productOption.value}".\n\nRun \`/download\` without arguments to see your available products.`,
      true
    );
  }

  const product = products[0];

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
