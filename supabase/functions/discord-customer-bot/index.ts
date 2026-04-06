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
    custom_id?: string;
    options?: Array<{
      name: string;
      value: string;
      type: number;
    }>;
    components?: Array<{
      type: number;
      components: Array<{
        type: number;
        custom_id: string;
        value: string;
      }>;
    }>;
  };
  member?: {
    user: {
      id: string;
      username: string;
      global_name?: string;
      avatar?: string;
    };
    permissions?: string;
    roles?: string[];
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
const MESSAGE_COMPONENT = 3;
const MODAL_SUBMIT = 5;

// Response types
const PONG = 1;
const CHANNEL_MESSAGE = 4;
const UPDATE_MESSAGE = 7;
const MODAL = 9;

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

        case "unlink":
          return await handleUnlinkCommand(supabase, discordUserId, discordUsername, serverContext, discordAvatarUrl);



        case "showcase": {
          // Verify seller before showing modal so non-sellers get an immediate error
          const { data: showcaseProfile } = await supabase
            .from("profiles")
            .select("user_id")
            .eq("discord_id", discordUserId)
            .maybeSingle();

          if (!showcaseProfile?.user_id) {
            return interactionResponse("Link your Discord account first with `/link` to showcase your store or products.", true);
          }

          const { data: showcaseStore } = await supabase
            .from("stores")
            .select("id")
            .eq("owner_id", showcaseProfile.user_id)
            .eq("is_active", true)
            .is("deleted_at", null)
            .maybeSingle();

          if (!showcaseStore) {
            return interactionResponse("You don't have an active store on Eclipse. Create one at https://eclipserblx.com/seller", true);
          }

          // Return a Modal form
          return new Response(JSON.stringify({
            type: MODAL,
            data: {
              custom_id: "showcase_modal",
              title: "Showcase Your Store or Product",
              components: [
                {
                  type: 1, // Action Row
                  components: [{
                    type: 4, // Text Input
                    custom_id: "showcase_url",
                    label: "Eclipse URL",
                    style: 1, // Short
                    required: true,
                    max_length: 200,
                    placeholder: "eclipserblx.com/products/123 or eclipserblx.com/store/my-store",
                  }],
                },
                {
                  type: 1, // Action Row
                  components: [{
                    type: 4, // Text Input
                    custom_id: "showcase_message",
                    label: "Message (optional)",
                    style: 2, // Paragraph
                    required: false,
                    max_length: 500,
                    placeholder: "Tell people about your product or store...",
                  }],
                },
              ],
            },
          }), { headers: { "Content-Type": "application/json" } });
        }

        case "help":
          return handleHelpCommand(serverContext);

        case "walletbalance":
          return await handleWalletBalanceCommand(supabase, discordUserId, discordUsername, discordAvatarUrl);

        case "update":
          return await handleUpdateRoleCommand(supabase, interaction, discordUserId, discordUsername, serverContext, discordAvatarUrl);

        // Global Guard commands
        case "globalban":
          return await handleGlobalBanCommand(supabase, interaction, discordUserId, discordUsername, discordAvatarUrl);

        case "globalunban":
          return await handleGlobalUnbanCommand(supabase, interaction, discordUserId, discordUsername, discordAvatarUrl);

        case "globalbans":
          return await handleGlobalBansListCommand(supabase, discordUserId, discordUsername, discordAvatarUrl);

        default:
          return interactionResponse(`Unknown command: ${commandName}`, true);
      }
    }

    // Handle button/component interactions
    if (interaction.type === MESSAGE_COMPONENT && interaction.data?.custom_id) {
      const customId = interaction.data.custom_id;
      const parts = customId.split("_");
      const componentType = parts[0];
      const action = parts[1];
      const pageNum = parseInt(parts[2]) || 0;

      if (componentType === "portalhelp") {
        return handlePortalHelpPagination(serverContext, action, pageNum);
      }
      
      return interactionResponse("Unknown component interaction.", true);
    }

    // Handle modal submissions
    if (interaction.type === MODAL_SUBMIT && interaction.data?.custom_id) {
      const customId = interaction.data.custom_id;
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
        const defaultIndex = (BigInt(discordUserId) >> BigInt(22)) % BigInt(6);
        discordAvatarUrl = `https://cdn.discordapp.com/embed/avatars/${defaultIndex}.png`;
      }

      // Handle showcase modal submission
      if (customId === "showcase_modal") {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        const guildId = interaction.guild_id;
        const serverContext = await getServerContext(supabase, guildId);

        // Extract values from modal components
        const urlValue = interaction.data.components
          ?.find((row: any) => row.components?.[0]?.custom_id === "showcase_url")
          ?.components?.[0]?.value as string | undefined;
        const messageValue = interaction.data.components
          ?.find((row: any) => row.components?.[0]?.custom_id === "showcase_message")
          ?.components?.[0]?.value as string | undefined;

        // Build options array to pass to existing handler
        const showcaseOptions: Array<{ name: string; value: string; type: number }> = [];
        if (urlValue) showcaseOptions.push({ name: "url", value: urlValue, type: 3 });
        if (messageValue) showcaseOptions.push({ name: "message", value: messageValue, type: 3 });

        return await handleShowcaseCommand(supabase, serverContext, discordUserId, showcaseOptions);
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

function interactionResponse(
  content: string,
  ephemeral = false,
  embeds?: any[],
  components?: any[]
) {
  return new Response(
    JSON.stringify({
      type: CHANNEL_MESSAGE,
      data: {
        content: embeds ? undefined : content,
        embeds,
        components,
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

// Get linked Eclipse account from Discord ID (includes email for order matching)
async function getLinkedAccount(supabase: any, discordUserId: string) {
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("user_id, display_name, username, customer_id, avatar_url, discord_id, email")
    .eq("discord_id", discordUserId)
    .maybeSingle();

  if (error) {
    console.error("[discord-customer-bot] Profile lookup error:", error);
    return null;
  }

  // If profile found but no email in profiles table, try to get from auth.users
  if (profile && !profile.email) {
    const { data: authUser } = await supabase.auth.admin.getUserById(profile.user_id);
    if (authUser?.user?.email) {
      profile.email = authUser.user.email;
    }
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

  // Provide a simple one-click link to the account page where they can OAuth
  const embed = {
    color: branding.color,
    title: "🔗 Link Your Eclipse Account",
    description: "Connect your Discord to access your purchases and downloads.\n\nClick the button below to link your account instantly!",
    thumbnail: discordAvatarUrl ? { url: discordAvatarUrl } : undefined,
    fields: [
      {
        name: "💡 How it works",
        value: "1. Click **Link Account** below\n2. Log in to Eclipse (if needed)\n3. Authorize Discord - that's it!",
        inline: false,
      },
    ],
    footer: {
      text: branding.footer,
    },
    timestamp: new Date().toISOString(),
  };

  // Send DM with button
  const dmComponents = [
    {
      type: 1, // Action Row
      components: [
        {
          type: 2, // Button
          style: 5, // Link style
          label: "🔗 Link Account",
          url: "https://eclipserblx.com/account?action=link-discord",
        },
      ],
    },
  ];

  // Fire and forget the DM with button
  sendDMToUser(discordUserId, undefined, [embed], dmComponents).catch(console.error);

  const channelEmbed = {
    color: branding.color,
    description: `<@${discordUserId}>\n🔗 Check your DMs for a quick link to connect your Eclipse account!`,
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

// /unlink command - Disconnect Discord from Eclipse account
async function handleUnlinkCommand(
  supabase: any,
  discordUserId: string,
  discordUsername: string,
  serverContext: ServerContext,
  discordAvatarUrl?: string
) {
  const branding = getBranding(serverContext);
  const existingProfile = await getLinkedAccount(supabase, discordUserId);

  if (!existingProfile) {
    const embed = {
      color: 0xef4444,
      title: "❌ No Linked Account",
      description: "Your Discord isn't linked to any Eclipse account.",
      thumbnail: discordAvatarUrl ? { url: discordAvatarUrl } : undefined,
      fields: [
        {
          name: "Want to link?",
          value: "Use `/link` to connect your Discord to your Eclipse account.",
          inline: false,
        },
      ],
      footer: {
        text: branding.footer,
      },
      timestamp: new Date().toISOString(),
    };
    const channelEmbed = {
      color: 0xef4444,
      description: `<@${discordUserId}>\n❌ Your Discord isn't linked to any account.`,
      thumbnail: discordAvatarUrl ? { url: discordAvatarUrl } : undefined,
      footer: { text: branding.footer },
    };
    return publicResponseWithDM(channelEmbed, discordUserId, [embed]);
  }

  // Check if account is locked (seller accounts or store creator role)
  const [storeResult, roleResult] = await Promise.all([
    supabase
      .from("stores")
      .select("id, name")
      .eq("owner_id", existingProfile.user_id)
      .eq("is_active", true)
      .maybeSingle(),
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", existingProfile.user_id)
  ]);

  const store = storeResult.data;
  const userRoles = roleResult.data || [];
  const hasStoreCreatorRole = userRoles.some((r: any) => 
    r.role?.toLowerCase().includes('store') || r.role?.toLowerCase().includes('seller')
  );

  if (store || hasStoreCreatorRole) {
    const reasons: string[] = [];
    if (store) {
      reasons.push(`• You own an active store (**${store.name || 'Unknown'}**)`);
    }
    if (hasStoreCreatorRole) {
      reasons.push(`• You have the **Store Creator** role`);
    }

    const embed = {
      color: 0xef4444,
      title: "🔒 Account Locked",
      description: "Your Discord account cannot be unlinked for the following reasons:",
      thumbnail: discordAvatarUrl ? { url: discordAvatarUrl } : undefined,
      fields: [
        {
          name: "Reasons",
          value: reasons.join("\n"),
          inline: false,
        },
        {
          name: "Need Help?",
          value: "Contact support if you need to make changes to your linked accounts.",
          inline: false,
        },
      ],
      footer: {
        text: branding.footer,
      },
      timestamp: new Date().toISOString(),
    };
    const channelEmbed = {
      color: 0xef4444,
      description: `<@${discordUserId}>\n🔒 Your account is locked. Check your DMs for details.`,
      thumbnail: discordAvatarUrl ? { url: discordAvatarUrl } : undefined,
      footer: { text: branding.footer },
    };
    return publicResponseWithDM(channelEmbed, discordUserId, [embed]);
  }

  // Unlink the Discord account
  const { error: updateError } = await supabase
    .from("profiles")
    .update({ discord_id: null, discord_username: null })
    .eq("user_id", existingProfile.user_id);

  if (updateError) {
    console.error("[discord-customer-bot] Unlink error:", updateError);
    const embed = {
      color: 0xef4444,
      title: "❌ Error",
      description: "Failed to unlink your account. Please try again later.",
      thumbnail: discordAvatarUrl ? { url: discordAvatarUrl } : undefined,
      footer: {
        text: branding.footer,
      },
      timestamp: new Date().toISOString(),
    };
    const channelEmbed = {
      color: 0xef4444,
      description: `<@${discordUserId}>\n❌ Something went wrong. Please try again.`,
      thumbnail: discordAvatarUrl ? { url: discordAvatarUrl } : undefined,
      footer: { text: branding.footer },
    };
    return publicResponseWithDM(channelEmbed, discordUserId, [embed]);
  }

  // Success
  const embed = {
    color: 0x22c55e,
    title: "✅ Account Unlinked",
    description: `Your Discord has been disconnected from **@${existingProfile.username}**.`,
    thumbnail: discordAvatarUrl ? { url: discordAvatarUrl } : undefined,
    fields: [
      {
        name: "Want to re-link?",
        value: "Use `/link` anytime to reconnect your Discord.",
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
    description: `<@${discordUserId}>\n✅ Your Discord has been unlinked from your Eclipse account.`,
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
      value: subscription ? `Pro (Active)` : "Free",
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
    return interactionResponse("", true, [notLinkedEmbed]);
  }

  const options = interaction.data?.options || [];
  const productOption = options.find((o) => o.name === "product");
  
  console.log(`[discord-customer-bot] Retrieve command options:`, JSON.stringify(options));
  console.log(`[discord-customer-bot] Product option:`, productOption ? JSON.stringify(productOption) : "none");

  // Get user's order IDs - check BOTH user_id AND customer_email (for guest purchases)
  const userEmail = profile.email;
  let allOrderIds: string[] = [];

  // Query by user_id
  const { data: userIdOrders } = await supabase
    .from("orders")
    .select("id")
    .eq("user_id", profile.user_id)
    .in("status", ["paid", "completed"]);

  if (userIdOrders) {
    allOrderIds = userIdOrders.map((o: any) => o.id);
  }

  // Also query by email for orders without user_id (guest purchases later linked)
  if (userEmail) {
    const { data: emailOrders } = await supabase
      .from("orders")
      .select("id")
      .eq("customer_email", userEmail)
      .is("user_id", null)
      .in("status", ["paid", "completed"]);

    if (emailOrders) {
      // Merge and deduplicate
      const emailOrderIds = emailOrders.map((o: any) => o.id);
      allOrderIds = [...new Set([...allOrderIds, ...emailOrderIds])];
    }
  }

  console.log(`[discord-customer-bot] Found ${allOrderIds.length} orders for user ${profile.user_id} (email: ${userEmail || 'none'})`);

  if (allOrderIds.length === 0) {
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
    return interactionResponse("", true, [noOrdersEmbed]);
  }

  const orderIds = allOrderIds;

  // Get order items for these orders
  const { data: orderItems, error: orderItemsError } = await supabase
    .from("order_items")
    .select("product_id")
    .in("order_id", orderIds)
    // Some historical rows can have product_id = null; exclude them so downstream UUID filters don't break
    .not("product_id", "is", null);

  if (orderItemsError) {
    console.error("[discord-customer-bot] order_items lookup error:", orderItemsError);
  }

  const isUuid = (v: unknown): v is string =>
    typeof v === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

  const productIds = [
    ...new Set(
      (orderItems?.map((i: any) => i.product_id) || []).filter((id: unknown) => isUuid(id))
    ),
  ];

  if (productIds.length === 0) {
    const msg = "We found your orders, but they don't include valid product IDs for downloads.";
    console.error("[discord-customer-bot] retrieve: no valid productIds", {
      discordUserId,
      userId: profile.user_id,
      orderCount: orderIds.length,
      rawCount: orderItems?.length ?? 0,
    });

    const embed = {
      color: 0xef4444,
      title: "❌ Downloads Unavailable",
      description: msg,
      footer: { text: branding.footer },
      timestamp: new Date().toISOString(),
    };

    const channelEmbed = {
      color: 0xef4444,
      description: `<@${discordUserId}>\n❌ ${msg}`,
      thumbnail: discordAvatarUrl ? { url: discordAvatarUrl } : undefined,
      footer: { text: branding.footer },
    };

    return interactionResponse("", true, [embed]);
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

  const { data: products, error: productsError } = await productsQuery;

  console.log(`[discord-customer-bot] Retrieve: productIds=${JSON.stringify(productIds)}`);
  console.log(`[discord-customer-bot] Retrieve: products=${products?.length ?? 'null'}, error=${productsError ? productsError.message : 'none'}`);

  if (productsError) {
    console.error("[discord-customer-bot] products lookup error:", {
      message: productsError.message,
      details: (productsError as any).details,
      hint: (productsError as any).hint,
      code: (productsError as any).code,
      productIdsCount: productIds.length,
    });
  }

  if (!products || products.length === 0) {
    console.log(`[discord-customer-bot] Retrieve: No downloadable products found for user`);
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
    return interactionResponse("", true, [noFilesEmbed]);
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
    return interactionResponse("", true, [embed]);
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
    return interactionResponse("", true, [embed]);
  }

  const product = matchedProduct;

  // Generate signed URL and log download in parallel
  // NOTE: Postgrest builders are thenables (await-able) but are not real Promises, so avoid `.catch()`.
  const [signedUrlResult] = await Promise.all([
    supabase.storage.from("product-assets").createSignedUrl(product.asset_file_url, 3600),
    supabase.from("download_logs").insert({
      user_id: profile.user_id,
      product_id: product.id,
    }),
    (async () => {
      const { error } = await supabase.rpc("increment_download_count", { product_id: product.id });
      if (error) {
        console.log("[discord-customer-bot] increment_download_count error (non-fatal):", {
          message: error.message,
          code: (error as any).code,
          details: (error as any).details,
          hint: (error as any).hint,
        });
      }
    })(),
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
    return interactionResponse("", true, [downloadFailedEmbed]);
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

  // Send DM with download link (best-effort)
  sendDMToUser(discordUserId, undefined, [embed], components).catch(console.error);

  // Also return the download button ephemerally so it works even if DMs are blocked
  return interactionResponse("", true, [embed], components);
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

    console.log(`[discord-customer-bot] Main server - User ${profile.username}: ${purchaseCount} purchases, Subscription: ${hasSubscription}, Store: ${hasStore}`);

    if (purchaseCount >= 5 && loyalCustomerRoleId) {
      rolesToAssign.push({ id: loyalCustomerRoleId, name: "Loyal Customer" });
      if (customerRoleId) rolesToRemove.push({ id: customerRoleId, name: "Customer" });
    } else if (purchaseCount >= 1 && customerRoleId) {
      rolesToAssign.push({ id: customerRoleId, name: "Customer" });
    }

    if (hasSubscription && eclipsePlusRoleId) {
      rolesToAssign.push({ id: eclipsePlusRoleId, name: "Pro" });
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
    if (!subRes.data) eligibility.push("• Subscribe to Pro → **Pro**");
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
      footer: { text: "Eclipse Marketplace" },
      timestamp: new Date().toISOString(),
    };

    return new Response(
      JSON.stringify({
        type: CHANNEL_MESSAGE,
        data: {
          embeds: [publicEmbed],
          components: [
            {
              type: 1, // Action Row
              components: [
                {
                  type: 2, // Button
                  style: 5, // Link style
                  label: "Website",
                  url: "https://eclipserblx.com",
                },
                {
                  type: 2, // Button
                  style: 5, // Link style
                  label: "Browse Marketplace",
                  url: "https://eclipserblx.com/marketplace",
                },
              ],
            },
          ],
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

  // Fetch store details and product count in parallel
  const [storeResult, productResult] = await Promise.all([
    supabase
      .from("stores")
      .select("id, name, slug, description, logo_url, banner_url, follower_count, is_verified")
      .eq("id", serverContext.store.id)
      .single(),
    supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("store_id", serverContext.store.id)
      .eq("is_active", true),
  ]);

  const { data: store, error } = storeResult;
  const { count: productCount } = productResult;

  if (error || !store) {
    console.error("[discord-customer-bot] Store fetch error:", error);
    return interactionResponse("Failed to fetch store information.", true);
  }

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

  const publicEmbed = {
    color: 0x8b5cf6,
    title: `🏪 ${store.name}`,
    thumbnail: store.logo_url ? { url: store.logo_url } : undefined,
    image: store.banner_url ? { url: store.banner_url } : undefined,
    fields,
    footer: { text: `${store.name} • Powered by Eclipse` },
    timestamp: new Date().toISOString(),
  };

  // Build button components
  const buttons: any[] = [
    {
      type: 2, // Button
      style: 5, // Link style
      label: "Browse Store",
      url: storeUrl,
    },
  ];

  // Add website button if store has one
  if (serverContext.store.website_url) {
    buttons.push({
      type: 2, // Button
      style: 5, // Link style
      label: "Website",
      url: serverContext.store.website_url,
    });
  }

  return new Response(
    JSON.stringify({
      type: CHANNEL_MESSAGE,
      data: {
        embeds: [publicEmbed],
        components: [
          {
            type: 1, // Action Row
            components: buttons,
          },
        ],
        flags: 0,
      },
    }),
    { headers: { "Content-Type": "application/json" } }
  );
}


// /showcase command - Creator-driven showcase for sellers, or random featured product for non-sellers
async function handleShowcaseCommand(
  supabase: any,
  serverContext: ServerContext,
  discordUserId: string,
  options?: Array<{ name: string; value: string; type: number }>
) {
  const branding = getBranding(serverContext);
  const showcaseType = options?.find(o => o.name === "type")?.value;
  const urlInput = options?.find(o => o.name === "url")?.value as string | undefined;

  // Allowed base domains
  const ALLOWED_HOSTS = ["eclipserblx.com", "www.eclipserblx.com", "roleplay-hub-shop.lovable.app"];

  // Parse URL to extract product number or store slug
  let parsedProductNumber: string | null = null;
  let parsedStoreSlug: string | null = null;
  if (urlInput) {
    // Normalise: prepend https:// if no protocol so URL constructor works
    let normalised = urlInput.trim();
    if (!/^https?:\/\//i.test(normalised)) normalised = "https://" + normalised;

    let hostname: string;
    let pathname: string;
    try {
      const parsed = new URL(normalised);
      hostname = parsed.hostname.toLowerCase();
      pathname = parsed.pathname;
    } catch (_e) {
      return interactionResponse("That doesn't look like a valid URL. Example: `eclipserblx.com/products/123`", true);
    }

    // Check if hostname is an allowed Eclipse domain or a verified custom store domain
    let isAllowed = ALLOWED_HOSTS.includes(hostname);
    if (!isAllowed) {
      const { data: customDomain } = await supabase
        .from("store_domains")
        .select("id")
        .eq("domain", hostname)
        .eq("status", "active")
        .maybeSingle();
      isAllowed = !!customDomain;
    }

    if (!isAllowed) {
      return interactionResponse("Only Eclipse URLs or verified custom store domains are accepted. Example: `eclipserblx.com/products/123`", true);
    }

    const productMatch = pathname.match(/\/products\/(\d+)/);
    const storeMatch = pathname.match(/\/store\/([^\/\?\#]+)/);
    if (productMatch) {
      parsedProductNumber = productMatch[1];
    } else if (storeMatch) {
      parsedStoreSlug = decodeURIComponent(storeMatch[1]);
    } else {
      return interactionResponse("Please provide a valid Eclipse product or store URL (e.g. `eclipserblx.com/products/123` or `eclipserblx.com/store/my-store`)", true);
    }
  }

  // Auto-detect showcase type from URL
  const effectiveType = parsedProductNumber ? "product" : parsedStoreSlug ? "store" : showcaseType;
  const customMessage = options?.find(o => o.name === "message")?.value
    ?.replace(/<[^>]*>/g, '')
    ?.replace(/@(everyone|here)/gi, '@\u200B$1')
    ?.substring(0, 500)
    ?.trim() || null;

  try {
    // Check if user has a linked Eclipse account
    const { data: profile } = await supabase
      .from("profiles")
      .select("user_id, display_name")
      .eq("discord_id", discordUserId)
      .maybeSingle();

    // If user specified a type or URL, they want to showcase their own stuff
    if ((effectiveType || urlInput) && profile?.user_id) {
      // Check if user owns a store
      const { data: store } = await supabase
        .from("stores")
        .select("id, name, slug, description, logo_url, banner_url, average_rating, total_sales, product_count, follower_count, discord_url, website_url, twitter_url, youtube_url, tiktok_url, roblox_url, is_verified")
        .eq("owner_id", profile.user_id)
        .eq("is_active", true)
        .is("deleted_at", null)
        .maybeSingle();

      if (!store) {
        return interactionResponse("You don't have an active store on Eclipse. Create one at https://eclipserblx.com/seller", true);
      }

      // Cooldown check — 1 showcase per 24 hours per store
      const { data: recentShowcase } = await supabase
        .from("audit_logs")
        .select("id")
        .eq("action", "discord_showcase")
        .eq("resource", store.id)
        .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .limit(1);

      if (recentShowcase && recentShowcase.length > 0) {
        return interactionResponse("You can only showcase once every 24 hours. Try again later!", true);
      }

      // Log the showcase for cooldown tracking
      await supabase.from("audit_logs").insert({
        action: "discord_showcase",
        resource: store.id,
        user_id: profile.user_id,
        details: { type: effectiveType || "store", discord_id: discordUserId, url: urlInput || null },
      });

      if (effectiveType === "product") {
        return await handleProductShowcase(supabase, store, parsedProductNumber, branding, customMessage);
      } else {
        return await handleStoreShowcase(supabase, store, branding, customMessage);
      }
    } else if ((effectiveType || urlInput) && !profile?.user_id) {
      return interactionResponse("Link your Discord account first with `/link` to showcase your store or products.", true);
    }

    // Default: show a random featured product (original behavior)
    return await handleRandomShowcase(supabase, branding);
  } catch (err) {
    console.error("[discord-customer-bot] Showcase error:", err);
    return interactionResponse("Failed to fetch showcase. Try again later.", true);
  }
}

// Showcase a seller's store profile
async function handleStoreShowcase(supabase: any, store: any, branding: any, customMessage?: string | null) {
  const storeUrl = `https://eclipserblx.com/store/${encodeURIComponent(store.slug)}`;

  // Store description is always used for the embed description
  let desc = store.description
    ? store.description.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim()
    : "Check out this store on Eclipse!";
  if (desc.length > 300) desc = desc.substring(0, 297) + "...";

  // Build badges
  const badges: string[] = [];
  if (store.is_verified) badges.push("✅ Verified Seller");

  // Build links
  const links: string[] = [`🌐 [Visit Store](${storeUrl})`];
  if (store.discord_url) links.push(`💬 [Discord](${store.discord_url})`);
  if (store.website_url) links.push(`🔗 [Website](${store.website_url})`);
  if (store.roblox_url) links.push(`🎮 [Roblox](${store.roblox_url})`);
  if (store.twitter_url) links.push(`🐦 [Twitter](${store.twitter_url})`);

  // Fetch top products
  const { data: products } = await supabase
    .from("products")
    .select("name, slug, product_number, price")
    .eq("store_id", store.id)
    .eq("is_active", true)
    .eq("moderation_status", "approved")
    .order("created_at", { ascending: false })
    .limit(5);

  const productList = products?.length
    ? products.map((p: any) => {
        const url = `https://eclipserblx.com/products/${p.product_number || encodeURIComponent(p.slug)}`;
        return `• [${p.name}](${url}) — ${p.price === 0 ? "FREE" : `£${Number(p.price).toFixed(2)}`}`;
      }).join("\n")
    : null;

  // Rating
  const rating = store.average_rating
    ? `${"⭐".repeat(Math.round(store.average_rating))} ${Number(store.average_rating).toFixed(1)}/5`
    : "No ratings yet";

  const fields: any[] = [];
  if (customMessage) {
    fields.push({ name: "\uD83D\uDCAC From the Seller", value: customMessage, inline: false });
  }
  fields.push({ name: "\u2B50 Rating", value: rating, inline: true });
  fields.push({ name: "\uD83D\uDCE6 Products", value: "" + (store.product_count || 0), inline: true });
  fields.push({ name: "\uD83D\uDC65 Followers", value: "" + (store.follower_count || 0), inline: true });
  fields.push({ name: "\uD83D\uDD17 Links", value: links.join(" \u2022 "), inline: false });

  if (productList) {
    fields.push({ name: "🛍️ Featured Products", value: productList, inline: false });
  }

  if (badges.length > 0) {
    fields.push({ name: "🏆 Badges", value: badges.join(" • "), inline: false });
  }

  const embeds: any[] = [{
    color: branding.color,
    title: `🏪 ${store.name}`,
    url: storeUrl,
    description: desc,
    thumbnail: store.logo_url ? { url: store.logo_url } : undefined,
    fields,
    footer: { text: `${branding.footer} • Creator Showcase`, icon_url: branding.icon },
    timestamp: new Date().toISOString(),
  }];

  // Add banner as image embed
  if (store.banner_url) {
    embeds.push({ color: branding.color, image: { url: store.banner_url } });
  }

  return new Response(
    JSON.stringify({ type: CHANNEL_MESSAGE, data: { embeds, flags: 0 } }),
    { headers: { "Content-Type": "application/json" } }
  );
}

// Showcase a specific product from the seller's store
async function handleProductShowcase(supabase: any, store: any, productNumber: string | null, branding: any, customMessage?: string | null) {
  if (productNumber) {
    // Look up by exact product number from URL
    const { data: product } = await supabase
      .from("products")
      .select("id, name, slug, product_number, price, images, description, download_count")
      .eq("store_id", store.id)
      .eq("is_active", true)
      .eq("moderation_status", "approved")
      .eq("product_number", productNumber)
      .maybeSingle();

    if (product) {
      return buildProductEmbed(product, store, branding, customMessage);
    }

    return interactionResponse(`No product found with number #${productNumber} in your store. Make sure the URL points to one of your products.`, true);
  }

  // No URL provided — pick latest product
  const { data: latest } = await supabase
    .from("products")
    .select("id, name, slug, product_number, price, images, description, download_count")
    .eq("store_id", store.id)
    .eq("is_active", true)
    .eq("moderation_status", "approved")
    .order("created_at", { ascending: false })
    .limit(1);
  if (!latest || latest.length === 0) {
    return interactionResponse("You don't have any approved products to showcase.", true);
  }

  return buildProductEmbed(latest[0], store, branding, customMessage);
}

// Build a rich product embed
function buildProductEmbed(product: any, store: any, branding: any, customMessage?: string | null) {
  const productUrl = `https://eclipserblx.com/products/${product.product_number || encodeURIComponent(product.slug)}`;
  const storeUrl = `https://eclipserblx.com/store/${encodeURIComponent(store.slug)}`;

  let productDesc = product.description || "A premium product from Eclipse.";
  productDesc = productDesc.replace(/<[^>]*>/g, "").trim();
  if (productDesc.length > 250) productDesc = productDesc.substring(0, 247) + "...";
  const desc = `${productDesc}\n\n**[View Product](${productUrl})**`;

  const embed: any = {
    color: branding.color,
    title: `🌟 ${product.name}`,
    url: productUrl,
    description: desc,
    thumbnail: store.logo_url ? { url: store.logo_url } : undefined,
    image: product.images?.[0] ? { url: product.images[0] } : undefined,
    fields: (() => {
      const f: any[] = [];
      if (customMessage) f.push({ name: "💬 From the Seller", value: customMessage, inline: false });
      f.push({
        name: "💰 Price",
        value: product.price === 0 ? "**FREE**" : `**£${Number(product.price).toFixed(2)}**`,
        inline: true,
      });
      f.push({
        name: "🏪 Store",
        value: `[${store.name}](${storeUrl})`,
        inline: true,
      });
      return f;
    })(),
    footer: { text: `${branding.footer} • Creator Showcase`, icon_url: branding.icon },
    timestamp: new Date().toISOString(),
  };

  if (product.download_count > 0) {
    embed.fields.push({ name: "📥 Downloads", value: `${product.download_count}`, inline: true });
  }

  // Add additional product images
  const embeds: any[] = [embed];
  if (product.images?.length > 1) {
    for (let i = 1; i < Math.min(product.images.length, 4); i++) {
      embeds.push({ color: branding.color, image: { url: product.images[i] } });
    }
  }

  return new Response(
    JSON.stringify({ type: CHANNEL_MESSAGE, data: { embeds, flags: 0 } }),
    { headers: { "Content-Type": "application/json" } }
  );
}

// Original behavior: random featured product
async function handleRandomShowcase(supabase: any, branding: any) {
  const { data: products, error } = await supabase
    .from("products")
    .select(`
      id, name, slug, product_number, price, images, description,
      stores!inner (name, slug, logo_url, is_verified)
    `)
    .eq("is_active", true)
    .eq("is_featured", true)
    .eq("moderation_status", "approved")
    .eq("stores.is_active", true)
    .limit(10);

  if (error || !products || products.length === 0) {
    return interactionResponse("No featured products available at the moment. Sellers can use `/showcase type:My Store` or `/showcase type:A Product` to promote their store!", true);
  }

  const product = products[Math.floor(Math.random() * products.length)];
  const store = product.stores;
  const productUrl = `https://eclipserblx.com/products/${(product as any).product_number || product.slug}`;
  const storeUrl = `https://eclipserblx.com/stores/${store.slug}`;

  const badges: string[] = [];
  if (store.is_verified) badges.push("✅ Verified Seller");
  const badgeText = badges.length > 0 ? badges.join(" • ") : "";

  let description = product.description || "A premium product from the Eclipse marketplace.";
  description = description.replace(/<[^>]*>/g, '').trim();
  if (description.length > 200) description = description.substring(0, 200).trim() + "...";

  const embed = {
    color: branding.color,
    title: `🌟 ${product.name}`,
    url: productUrl,
    description: `${description}\n\n**[View Product](${productUrl})**`,
    thumbnail: store.logo_url ? { url: store.logo_url } : undefined,
    image: product.images?.[0] ? { url: product.images[0] } : undefined,
    fields: [
      { name: "💰 Price", value: product.price === 0 ? "**FREE**" : `**£${product.price.toFixed(2)}**`, inline: true },
      { name: "🏪 Store", value: `[${store.name}](${storeUrl})${badgeText ? `\n${badgeText}` : ""}`, inline: true },
    ],
    footer: { text: `${branding.footer} • Featured Product`, icon_url: branding.icon },
    timestamp: new Date().toISOString(),
  };

  return new Response(
    JSON.stringify({ type: CHANNEL_MESSAGE, data: { embeds: [embed], flags: 0 } }),
    { headers: { "Content-Type": "application/json" } }
  );
}

// /walletbalance command - DM user their credit balance
async function handleWalletBalanceCommand(
  supabase: any,
  discordUserId: string,
  discordUsername: string,
  discordAvatarUrl?: string,
) {
  // Look up linked account
  const { data: profile } = await supabase
    .from("profiles")
    .select("user_id, display_name, username, customer_id")
    .eq("discord_id", discordUserId)
    .maybeSingle();

  if (!profile) {
    return interactionResponse(
      "❌ Your Discord isn't linked to an Eclipse account. Use `/link` first.",
      true
    );
  }

  // Fetch credit balance
  const { data: balance } = await supabase
    .from("credit_balances")
    .select("balance, total_purchased, total_gifted, total_spent")
    .eq("user_id", profile.user_id)
    .maybeSingle();

  const bal = balance || { balance: 0, total_purchased: 0, total_gifted: 0, total_spent: 0 };

  const embed = {
    title: "💰 Your Eclipse Wallet",
    color: 0x7c3aed,
    fields: [
      { name: "Current Balance", value: `£${Number(bal.balance).toFixed(2)}`, inline: true },
      { name: "Total Purchased", value: `£${Number(bal.total_purchased).toFixed(2)}`, inline: true },
      { name: "Total Gifted", value: `£${Number(bal.total_gifted).toFixed(2)}`, inline: true },
      { name: "Total Spent", value: `£${Number(bal.total_spent).toFixed(2)}`, inline: true },
    ],
    thumbnail: discordAvatarUrl ? { url: discordAvatarUrl } : undefined,
  };

  // Send balance via DM, respond ephemerally in channel
  const dmSent = await sendDMToUser(discordUserId, undefined, [embed]);

  if (dmSent) {
    return interactionResponse("💰 Your wallet balance has been sent to your DMs!", true);
  } else {
    return interactionResponse(
      "❌ I couldn't send you a DM. Please make sure your DMs are open and try again.",
      true
    );
  }
}

// /help command - Paginated help with buttons
function handleHelpCommand(serverContext: ServerContext, page = 0) {
  const branding = getBranding(serverContext);

  const pages = [
    // Page 0: Account & Profile
    {
      title: "📖 Eclipse Portal Bot - Account",
      commands: [
        { name: "/link", desc: "Check if your Discord is linked to Eclipse" },
        { name: "/verify", desc: "Link your Discord using a code from Eclipse" },
        { name: "/profile", desc: "View your Eclipse profile and stats" },
        { name: "/unlink", desc: "Disconnect your Discord from Eclipse" },
      ],
      tip: "💡 Use `/verify` with your code from the Eclipse website to link your account!",
    },
    // Page 1: Shopping & Downloads
    {
      title: "📖 Eclipse Portal Bot - Shopping",
      commands: [
        { name: "/purchases", desc: "View your recent purchases" },
        { name: "/retrieve", desc: "Get a download link for a purchased product" },
        { name: "/store", desc: "View this server's store information" },
        { name: "/showcase", desc: "View a featured product from the marketplace" },
      ],
      tip: "🛒 Browse products and retrieve your purchases anytime!",
    },
    // Page 2: Roles & Support
    {
      title: "📖 Eclipse Portal Bot - Roles & Support",
      commands: [
        { name: "/getrole", desc: "Sync your Discord roles based on your account" },
        { name: "/support", desc: "Contact Eclipse support - opens a ticket" },
        { name: "/reply", desc: "Reply to your active support ticket (DM only)" },
        { name: "/help", desc: "View this help message" },
      ],
      tip: "🎫 Use `/getrole` after purchases to sync your roles!",
    },
    // Page 3: Global Guard
    {
      title: "🛡️ Eclipse Portal Bot - Global Guard",
      commands: [
        { name: "/globalban", desc: "Ban a user across all your servers" },
        { name: "/globalunban", desc: "Remove a global ban from a user" },
        { name: "/globalbans", desc: "View your active global bans" },
      ],
      tip: "🛡️ Requires an active bot license. Visit guard.eclipserblx.com for full management!",
    },
  ];

  const currentPage = pages[page] || pages[0];
  const totalPages = pages.length;

  const commandList = currentPage.commands
    .map((cmd) => `**${cmd.name}** — ${cmd.desc}`)
    .join("\n");

  const embed = {
    color: branding.color,
    title: currentPage.title,
    description: `Page ${page + 1} of ${totalPages}\n\n${commandList}`,
    fields: [
      {
        name: currentPage.tip.split(" ")[0],
        value: currentPage.tip.substring(currentPage.tip.indexOf(" ") + 1),
        inline: false,
      },
    ],
    footer: {
      text: branding.footer,
      icon_url: branding.icon,
    },
    timestamp: new Date().toISOString(),
  };

  const components = [
    {
      type: 1, // Action Row
      components: [
        {
          type: 2, // Button
          style: 2, // Secondary (gray)
          label: "◀ Previous",
          custom_id: `portalhelp_prev_${page}`,
          disabled: page === 0,
        },
        {
          type: 2,
          style: 1, // Primary (blue)
          label: `${page + 1}/${totalPages}`,
          custom_id: `portalhelp_page_${page}`,
          disabled: true,
        },
        {
          type: 2,
          style: 2,
          label: "Next ▶",
          custom_id: `portalhelp_next_${page}`,
          disabled: page >= totalPages - 1,
        },
      ],
    },
  ];

  return new Response(
    JSON.stringify({
      type: CHANNEL_MESSAGE,
      data: {
        embeds: [embed],
        components,
        flags: 64, // Ephemeral
      },
    }),
    { headers: { "Content-Type": "application/json" } }
  );
}

// Handle help pagination for portal bot
function handlePortalHelpPagination(serverContext: ServerContext, action: string, currentPage: number) {
  const branding = getBranding(serverContext);
  
  let newPage = currentPage;
  if (action === "prev") {
    newPage = Math.max(0, currentPage - 1);
  } else if (action === "next") {
    newPage = Math.min(3, currentPage + 1); // 4 pages total (0-3)
  }

  const pages = [
    {
      title: "📖 Eclipse Portal Bot - Account",
      commands: [
        { name: "/link", desc: "Check if your Discord is linked to Eclipse" },
        { name: "/verify", desc: "Link your Discord using a code from Eclipse" },
        { name: "/profile", desc: "View your Eclipse profile and stats" },
        { name: "/unlink", desc: "Disconnect your Discord from Eclipse" },
      ],
      tip: "💡 Use `/verify` with your code from the Eclipse website to link your account!",
    },
    {
      title: "📖 Eclipse Portal Bot - Shopping",
      commands: [
        { name: "/purchases", desc: "View your recent purchases" },
        { name: "/retrieve", desc: "Get a download link for a purchased product" },
        { name: "/store", desc: "View this server's store information" },
        { name: "/showcase", desc: "View a featured product from the marketplace" },
      ],
      tip: "🛒 Browse products and retrieve your purchases anytime!",
    },
    {
      title: "📖 Eclipse Portal Bot - Roles & Support",
      commands: [
        { name: "/getrole", desc: "Sync your Discord roles based on your account" },
        { name: "/support", desc: "Contact Eclipse support - opens a ticket" },
        { name: "/reply", desc: "Reply to your active support ticket (DM only)" },
        { name: "/help", desc: "View this help message" },
      ],
      tip: "🎫 Use `/getrole` after purchases to sync your roles!",
    },
    {
      title: "🛡️ Eclipse Portal Bot - Global Guard",
      commands: [
        { name: "/globalban", desc: "Ban a user across all your servers" },
        { name: "/globalunban", desc: "Remove a global ban from a user" },
        { name: "/globalbans", desc: "View your active global bans" },
      ],
      tip: "🛡️ Requires an active bot license. Visit guard.eclipserblx.com for full management!",
    },
  ];

  const currentPageData = pages[newPage];
  const totalPages = pages.length;

  const commandList = currentPageData.commands
    .map((cmd) => `**${cmd.name}** — ${cmd.desc}`)
    .join("\n");

  const embed = {
    color: branding.color,
    title: currentPageData.title,
    description: `Page ${newPage + 1} of ${totalPages}\n\n${commandList}`,
    fields: [
      {
        name: currentPageData.tip.split(" ")[0],
        value: currentPageData.tip.substring(currentPageData.tip.indexOf(" ") + 1),
        inline: false,
      },
    ],
    footer: {
      text: branding.footer,
      icon_url: branding.icon,
    },
    timestamp: new Date().toISOString(),
  };

  const components = [
    {
      type: 1,
      components: [
        {
          type: 2,
          style: 2,
          label: "◀ Previous",
          custom_id: `portalhelp_prev_${newPage}`,
          disabled: newPage === 0,
        },
        {
          type: 2,
          style: 1,
          label: `${newPage + 1}/${totalPages}`,
          custom_id: `portalhelp_page_${newPage}`,
          disabled: true,
        },
        {
          type: 2,
          style: 2,
          label: "Next ▶",
          custom_id: `portalhelp_next_${newPage}`,
          disabled: newPage >= totalPages - 1,
        },
      ],
    },
  ];
  
  return new Response(
    JSON.stringify({
      type: 7, // UPDATE_MESSAGE
      data: { 
        embeds: [embed], 
        components,
        flags: 64,
      },
    }),
    { headers: { "Content-Type": "application/json" } }
  );
}

// ==================== GLOBAL GUARD COMMANDS ====================

// /globalban command - Ban a user across all servers
async function handleGlobalBanCommand(
  supabase: any,
  interaction: DiscordInteraction,
  discordUserId: string,
  discordUsername: string,
  discordAvatarUrl?: string
) {
  const options = interaction.data?.options || [];
  const userOption = options.find((o) => o.name === "user")?.value || "";
  const reason = options.find((o) => o.name === "reason")?.value || null;
  const duration = options.find((o) => o.name === "duration")?.value || null;

  // Extract Discord ID from mention or use directly
  const targetDiscordId = userOption.replace(/<@!?(\d+)>/, "$1").trim();

  if (!targetDiscordId || !/^\d{17,20}$/.test(targetDiscordId)) {
    return interactionResponse("❌ Please provide a valid Discord user ID or @mention.", true);
  }

  // Get the Eclipse user from Discord ID
  const profile = await getLinkedAccount(supabase, discordUserId);
  if (!profile) {
    return interactionResponse(
      "❌ You must link your Discord account to Eclipse to use Global Guard.\nUse `/link` to get started.",
      true
    );
  }

  // Check if user has any active bot licenses (required for Global Guard)
  const { data: licenses, error: licenseError } = await supabase
    .from("bot_installation_codes")
    .select("id")
    .eq("user_id", profile.user_id)
    .eq("license_status", "active")
    .not("guild_id", "is", null)
    .limit(1);

  if (licenseError || !licenses || licenses.length === 0) {
    return interactionResponse(
      "❌ Global Guard requires an active bot license.\nPurchase a bot from the Eclipse marketplace to use this feature.",
      true
    );
  }

  // Calculate expiry for temporary bans
  let expiresAt: string | null = null;
  let banType: "permanent" | "temporary" = "permanent";
  
  if (duration) {
    banType = "temporary";
    const now = new Date();
    const durationMap: Record<string, number> = {
      "1h": 60 * 60 * 1000,
      "12h": 12 * 60 * 60 * 1000,
      "1d": 24 * 60 * 60 * 1000,
      "7d": 7 * 24 * 60 * 60 * 1000,
      "30d": 30 * 24 * 60 * 60 * 1000,
      "90d": 90 * 24 * 60 * 60 * 1000,
    };
    expiresAt = new Date(now.getTime() + (durationMap[duration] || 0)).toISOString();
  }

  // Check if user is already banned
  const { data: existingBan } = await supabase
    .from("global_bans")
    .select("id")
    .eq("owner_user_id", profile.user_id)
    .eq("banned_discord_id", targetDiscordId)
    .eq("is_active", true)
    .maybeSingle();

  if (existingBan) {
    return interactionResponse(
      "⚠️ This user is already globally banned. Use `/globalunban` first to update the ban.",
      true
    );
  }

  // Try to get target user info from Discord
  let targetUsername = "Unknown User";
  let targetAvatarUrl: string | null = null;
  
  try {
    const botToken = Deno.env.get("DISCORD_CUSTOMER_BOT_TOKEN");
    if (botToken) {
      const userResponse = await fetch(`https://discord.com/api/v10/users/${targetDiscordId}`, {
        headers: { Authorization: `Bot ${botToken}` },
      });
      if (userResponse.ok) {
        const userData = await userResponse.json();
        targetUsername = userData.global_name || userData.username || "Unknown User";
        if (userData.avatar) {
          const ext = userData.avatar.startsWith("a_") ? "gif" : "png";
          targetAvatarUrl = `https://cdn.discordapp.com/avatars/${targetDiscordId}/${userData.avatar}.${ext}`;
        }
      }
    }
  } catch (e) {
    console.log("[discord-customer-bot] Failed to fetch target user info:", e);
  }

  // Create the global ban
  const { data: ban, error: banError } = await supabase
    .from("global_bans")
    .insert({
      owner_user_id: profile.user_id,
      banned_discord_id: targetDiscordId,
      banned_username: targetUsername,
      banned_avatar_url: targetAvatarUrl,
      reason: reason,
      ban_type: banType,
      expires_at: expiresAt,
      created_via: "discord_command",
      is_active: true,
    })
    .select()
    .single();

  if (banError) {
    console.error("[discord-customer-bot] Failed to create global ban:", banError);
    return interactionResponse("❌ Failed to create global ban. Please try again.", true);
  }

  // Create log entry
  await supabase.from("global_ban_logs").insert({
    ban_id: ban.id,
    action: "created",
    performed_by: profile.user_id,
    details: { via: "discord_command", ban_type: banType },
  });

  // Trigger sync to all servers (fire and forget)
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  
  fetch(`${supabaseUrl}/functions/v1/sync-global-bans`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${supabaseServiceKey}`,
    },
    body: JSON.stringify({ banId: ban.id, action: "ban" }),
  }).catch(console.error);

  const durationText = duration 
    ? `for **${duration.replace("h", " hour").replace("d", " day").replace(/(\d+)/, "$1")}**`
    : "**permanently**";

  const embed = {
    color: 0xef4444, // Red
    title: "🛡️ Global Ban Created",
    description: `**${targetUsername}** has been banned ${durationText} across all your servers.`,
    thumbnail: targetAvatarUrl ? { url: targetAvatarUrl } : undefined,
    fields: [
      {
        name: "🆔 Discord ID",
        value: targetDiscordId,
        inline: true,
      },
      {
        name: "📝 Reason",
        value: reason || "No reason provided",
        inline: true,
      },
      {
        name: "⏱️ Status",
        value: "Syncing to servers...",
        inline: false,
      },
    ],
    footer: {
      text: "Global Guard • Eclipse Marketplace",
      icon_url: discordAvatarUrl,
    },
    timestamp: new Date().toISOString(),
  };

  return interactionResponse("", false, [embed]);
}

// /globalunban command - Remove a global ban
async function handleGlobalUnbanCommand(
  supabase: any,
  interaction: DiscordInteraction,
  discordUserId: string,
  discordUsername: string,
  discordAvatarUrl?: string
) {
  const options = interaction.data?.options || [];
  const userOption = options.find((o) => o.name === "user")?.value || "";

  // Extract Discord ID from mention or use directly
  const targetDiscordId = userOption.replace(/<@!?(\d+)>/, "$1").trim();

  if (!targetDiscordId || !/^\d{17,20}$/.test(targetDiscordId)) {
    return interactionResponse("❌ Please provide a valid Discord user ID or @mention.", true);
  }

  // Get the Eclipse user from Discord ID
  const profile = await getLinkedAccount(supabase, discordUserId);
  if (!profile) {
    return interactionResponse(
      "❌ You must link your Discord account to Eclipse to use Global Guard.\nUse `/link` to get started.",
      true
    );
  }

  // Find the active ban
  const { data: ban, error: banError } = await supabase
    .from("global_bans")
    .select("*")
    .eq("owner_user_id", profile.user_id)
    .eq("banned_discord_id", targetDiscordId)
    .eq("is_active", true)
    .maybeSingle();

  if (banError || !ban) {
    return interactionResponse("❌ No active global ban found for this user.", true);
  }

  // Revoke the ban
  const { error: updateError } = await supabase
    .from("global_bans")
    .update({ is_active: false })
    .eq("id", ban.id);

  if (updateError) {
    console.error("[discord-customer-bot] Failed to revoke global ban:", updateError);
    return interactionResponse("❌ Failed to revoke ban. Please try again.", true);
  }

  // Create log entry
  await supabase.from("global_ban_logs").insert({
    ban_id: ban.id,
    action: "revoked",
    performed_by: profile.user_id,
    details: { via: "discord_command" },
  });

  // Trigger unban sync to all servers (fire and forget)
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  
  fetch(`${supabaseUrl}/functions/v1/sync-global-bans`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${supabaseServiceKey}`,
    },
    body: JSON.stringify({ banId: ban.id, action: "unban" }),
  }).catch(console.error);

  const embed = {
    color: 0x22c55e, // Green
    title: "🛡️ Global Ban Removed",
    description: `**${ban.banned_username || targetDiscordId}** has been unbanned from all your servers.`,
    thumbnail: ban.banned_avatar_url ? { url: ban.banned_avatar_url } : undefined,
    fields: [
      {
        name: "🆔 Discord ID",
        value: targetDiscordId,
        inline: true,
      },
      {
        name: "⏱️ Status",
        value: "Syncing to servers...",
        inline: true,
      },
    ],
    footer: {
      text: "Global Guard • Eclipse Marketplace",
      icon_url: discordAvatarUrl,
    },
    timestamp: new Date().toISOString(),
  };

  return interactionResponse("", false, [embed]);
}

// /globalbans command - View active global bans
async function handleGlobalBansListCommand(
  supabase: any,
  discordUserId: string,
  discordUsername: string,
  discordAvatarUrl?: string
) {
  // Get the Eclipse user from Discord ID
  const profile = await getLinkedAccount(supabase, discordUserId);
  if (!profile) {
    return interactionResponse(
      "❌ You must link your Discord account to Eclipse to use Global Guard.\nUse `/link` to get started.",
      true
    );
  }

  // Get active bans
  const { data: bans, error: bansError } = await supabase
    .from("global_bans")
    .select("*")
    .eq("owner_user_id", profile.user_id)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(10);

  if (bansError) {
    console.error("[discord-customer-bot] Failed to fetch global bans:", bansError);
    return interactionResponse("❌ Failed to fetch your bans. Please try again.", true);
  }

  if (!bans || bans.length === 0) {
    const embed = {
      color: 0x3b82f6, // Blue
      title: "🛡️ Global Guard - Active Bans",
      description: "You have no active global bans.\n\nUse `/globalban` to ban a user across all your servers.",
      footer: {
        text: "Global Guard • Eclipse Marketplace",
        icon_url: discordAvatarUrl,
      },
      timestamp: new Date().toISOString(),
    };
    return interactionResponse("", true, [embed]);
  }

  // Build ban list
  const banList = bans.map((ban: any, index: number) => {
    const typeEmoji = ban.ban_type === "permanent" ? "🔴" : "🟡";
    const expiryText = ban.expires_at 
      ? `Expires: <t:${Math.floor(new Date(ban.expires_at).getTime() / 1000)}:R>`
      : "Permanent";
    return `${typeEmoji} **${ban.banned_username || ban.banned_discord_id}**\n└ ID: \`${ban.banned_discord_id}\` • ${expiryText}`;
  }).join("\n\n");

  const embed = {
    color: 0x3b82f6, // Blue
    title: "🛡️ Global Guard - Active Bans",
    description: `You have **${bans.length}** active global ban${bans.length === 1 ? "" : "s"}:\n\n${banList}`,
    fields: [
      {
        name: "📊 Manage Bans",
        value: "Visit [guard.eclipserblx.com](https://guard.eclipserblx.com) for full management.",
        inline: false,
      },
    ],
    footer: {
      text: "Global Guard • Eclipse Marketplace",
      icon_url: discordAvatarUrl,
    },
    timestamp: new Date().toISOString(),
  };

  return interactionResponse("", true, [embed]);
}

// /update command - Admin-only: sync Eclipse platform roles for a target user
async function handleUpdateRoleCommand(
  supabase: any,
  interaction: DiscordInteraction,
  discordUserId: string,
  discordUsername: string,
  serverContext: ServerContext,
  discordAvatarUrl?: string
) {
  const branding = getBranding(serverContext);
  const options = interaction.data?.options || [];
  const memberPermissions = interaction.member?.permissions;

  // Check MANAGE_ROLES permission
  const MANAGE_ROLES = BigInt(0x10000000);
  const hasPermission = memberPermissions
    ? (BigInt(memberPermissions) & MANAGE_ROLES) === MANAGE_ROLES
    : false;

  if (!hasPermission) {
    return interactionResponse("", true, [{
      color: 0xef4444,
      title: "❌ Permission Denied",
      description: "You need the **Manage Roles** permission to use this command.",
      footer: { text: branding.footer },
    }]);
  }

  const targetUserId = options.find((o) => o.name === "user")?.value;

  if (!targetUserId) {
    return interactionResponse("", true, [{
      color: 0xef4444,
      title: "❌ Missing User",
      description: "Please provide a **user** to sync roles for.",
      footer: { text: branding.footer },
    }]);
  }

  const botToken = Deno.env.get("DISCORD_CUSTOMER_BOT_TOKEN");
  const guildId = serverContext.guildId;

  if (!botToken || !guildId) {
    return interactionResponse("", true, [{
      color: 0xef4444,
      title: "❌ Configuration Error",
      description: "Bot configuration error. Please contact support.",
      footer: { text: branding.footer },
    }]);
  }

  // Look up the target user's linked Eclipse account by their Discord ID
  const { data: profile } = await supabase
    .from("profiles")
    .select("user_id, username, discord_id")
    .eq("discord_id", targetUserId)
    .maybeSingle();

  if (!profile) {
    return interactionResponse("", true, [{
      color: 0xef4444,
      title: "❌ Account Not Linked",
      description: `<@${targetUserId}> doesn't have a linked Eclipse account.`,
      footer: { text: branding.footer },
    }]);
  }

  try {
    const rolesToAssign: { id: string; name: string }[] = [];
    const rolesToRemove: { id: string; name: string }[] = [];

    if (serverContext.isMainServer) {
      const customerRoleId = Deno.env.get("DISCORD_CUSTOMER_ROLE_ID");
      const loyalCustomerRoleId = Deno.env.get("DISCORD_LOYAL_CUSTOMER_ROLE_ID");
      const storeCreatorRoleId = Deno.env.get("DISCORD_STORE_CREATOR_ROLE_ID");
      const eclipsePlusRoleId = Deno.env.get("DISCORD_ROLE_ID");
      const verifiedSellerRoleId = Deno.env.get("DISCORD_VERIFIED_SELLER_ROLE_ID");

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
          .select("id, is_verified")
          .eq("owner_id", profile.user_id)
          .eq("is_active", true)
          .maybeSingle(),
      ]);

      const purchaseCount = ordersResult.count || 0;
      const hasSubscription = !!subscriptionResult.data;
      const hasStore = !!storeResult.data;
      const isVerified = storeResult.data?.is_verified === true;

      // Customer / Loyal Customer
      if (purchaseCount >= 5 && loyalCustomerRoleId) {
        rolesToAssign.push({ id: loyalCustomerRoleId, name: "Loyal Customer" });
        if (customerRoleId) rolesToRemove.push({ id: customerRoleId, name: "Customer" });
      } else if (purchaseCount >= 1 && customerRoleId) {
        rolesToAssign.push({ id: customerRoleId, name: "Customer" });
        if (loyalCustomerRoleId) rolesToRemove.push({ id: loyalCustomerRoleId, name: "Loyal Customer" });
      } else {
        if (customerRoleId) rolesToRemove.push({ id: customerRoleId, name: "Customer" });
        if (loyalCustomerRoleId) rolesToRemove.push({ id: loyalCustomerRoleId, name: "Loyal Customer" });
      }

      // Eclipse+
      if (hasSubscription && eclipsePlusRoleId) {
        rolesToAssign.push({ id: eclipsePlusRoleId, name: "Pro" });
      } else if (eclipsePlusRoleId) {
        rolesToRemove.push({ id: eclipsePlusRoleId, name: "Pro" });
      }

      // Store Creator
      if (hasStore && storeCreatorRoleId) {
        rolesToAssign.push({ id: storeCreatorRoleId, name: "Store Creator" });
      } else if (storeCreatorRoleId) {
        rolesToRemove.push({ id: storeCreatorRoleId, name: "Store Creator" });
      }

      // Verified Seller
      if (isVerified && verifiedSellerRoleId) {
        rolesToAssign.push({ id: verifiedSellerRoleId, name: "Verified Seller" });
      } else if (verifiedSellerRoleId) {
        rolesToRemove.push({ id: verifiedSellerRoleId, name: "Verified Seller" });
      }
    } else if (serverContext.store) {
      // Store server: use store-specific role configs
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

      if (orderIds.length > 0 && roleConfigs.length > 0) {
        const { data: orderItems } = await supabase
          .from("order_items")
          .select("store_id")
          .in("order_id", orderIds)
          .eq("store_id", serverContext.store.id);

        const storeOrderCount = orderItems?.length || 0;

        for (const cfg of roleConfigs) {
          const eligible =
            (!cfg.min_order_count || storeOrderCount >= cfg.min_order_count);
          if (eligible) {
            rolesToAssign.push({ id: cfg.role_id, name: cfg.role_name });
          }
        }
      }
    }

    // Execute role changes
    const assigned: string[] = [];
    const removed: string[] = [];
    const errors: string[] = [];

    const assignPromises = rolesToAssign.map(async (role) => {
      const res = await fetch(
        `https://discord.com/api/v10/guilds/${guildId}/members/${targetUserId}/roles/${role.id}`,
        { method: "PUT", headers: { Authorization: `Bot ${botToken}`, "Content-Type": "application/json" } }
      );
      if (res.status === 204 || res.ok) {
        assigned.push(role.name);
      } else {
        errors.push(`Failed to assign ${role.name}`);
      }
    });

    const removePromises = rolesToRemove.map(async (role) => {
      const res = await fetch(
        `https://discord.com/api/v10/guilds/${guildId}/members/${targetUserId}/roles/${role.id}`,
        { method: "DELETE", headers: { Authorization: `Bot ${botToken}`, "Content-Type": "application/json" } }
      );
      if (res.status === 204 || res.status === 404 || res.ok) {
        removed.push(role.name);
      }
    });

    await Promise.all([...assignPromises, ...removePromises]);

    // Audit log
    await supabase.from("audit_logs").insert({
      action: "discord_role_sync_manual",
      resource: "discord_roles",
      user_id: null,
      details: {
        admin_discord_id: discordUserId,
        admin_discord_username: discordUsername,
        target_discord_id: targetUserId,
        target_eclipse_user: profile.username,
        assigned,
        removed,
        errors,
        guild_id: guildId,
      },
    });

    const fields = [];
    if (assigned.length > 0) {
      fields.push({ name: "✅ Assigned", value: assigned.map(r => `\`${r}\``).join(", "), inline: true });
    }
    if (removed.length > 0) {
      fields.push({ name: "🔄 Removed", value: removed.map(r => `\`${r}\``).join(", "), inline: true });
    }
    if (errors.length > 0) {
      fields.push({ name: "⚠️ Errors", value: errors.join("\n"), inline: false });
    }
    if (assigned.length === 0 && removed.length === 0 && errors.length === 0) {
      fields.push({ name: "ℹ️ No Changes", value: "No roles needed updating for this user.", inline: false });
    }

    return interactionResponse("", true, [{
      color: errors.length > 0 ? 0xf59e0b : 0x22c55e,
      title: `🔄 Role Sync — ${profile.username}`,
      description: `Synced Eclipse roles for <@${targetUserId}>.`,
      fields,
      footer: { text: branding.footer },
    }]);
  } catch (error) {
    console.error(`[discord-customer-bot] /update error:`, error);
    return interactionResponse("", true, [{
      color: 0xef4444,
      title: "❌ Error",
      description: "An unexpected error occurred. Please try again.",
      footer: { text: branding.footer },
    }]);
  }
}
