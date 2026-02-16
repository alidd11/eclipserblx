import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { sendBotMessage, sendDirectMessage } from "../_shared/discord-bot.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BOOST_LOG_CHANNEL_ID = "1461353041310781531";
const BOOST_COLOR = 0xFF73FA;   // Pink/Magenta
const UNBOOST_COLOR = 0x808080; // Grey

function generateBoostCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = 'BOOST-';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { discord_id, discord_username, discord_avatar_url, action } = await req.json();

    if (!discord_id || !discord_username || !action) {
      return new Response(
        JSON.stringify({ error: "discord_id, discord_username, and action are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const avatarUrl = discord_avatar_url ||
      `https://cdn.discordapp.com/embed/avatars/${parseInt(discord_id) % 5}.png`;

    const isBoosted = action === "boosted";
    const color = isBoosted ? BOOST_COLOR : UNBOOST_COLOR;
    const description = isBoosted
      ? `🚀 Thank you for boosting the server! 🎉`
      : `No longer boosting the server.`;

    // Send the boost log embed as normal
    const result = await sendBotMessage(BOOST_LOG_CHANNEL_ID, {
      content: `<@${discord_id}>`,
      allowed_mentions: { users: [discord_id] },
      embeds: [
        {
          author: {
            name: discord_username,
            icon_url: avatarUrl,
          },
          description,
          color,
          thumbnail: { url: avatarUrl },
        },
      ],
    });

    if (!result.success) {
      throw new Error(result.error || "Failed to send boost log");
    }

    // If boosted, generate discount code and DM the user
    let discountCode: string | null = null;
    if (isBoosted) {
      try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // Look up the user's profile by discord_id
        const { data: profile } = await supabase
          .from("profiles")
          .select("user_id")
          .eq("discord_id", discord_id)
          .single();

        if (profile?.user_id) {
          // Generate unique code
          let code = generateBoostCode();
          let attempts = 0;
          while (attempts < 5) {
            const { data: existing } = await supabase
              .from("discount_codes")
              .select("id")
              .eq("code", code)
              .single();
            if (!existing) break;
            code = generateBoostCode();
            attempts++;
          }

          // Set expiry to 30 days
          const expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + 30);

          // Insert discount code
          const { error: insertError } = await supabase
            .from("discount_codes")
            .insert({
              code,
              discount_type: "percentage",
              discount_value: 50,
              max_uses: 1,
              current_uses: 0,
              is_active: true,
              expires_at: expiresAt.toISOString(),
              restricted_to_user_id: profile.user_id,
            });

          if (!insertError) {
            discountCode = code;
            console.log("[BOOST-LOG] Discount code created:", code, "for user:", profile.user_id);

            // Send DM to the booster
            const expiryDateStr = expiresAt.toLocaleDateString("en-GB", {
              day: "numeric",
              month: "long",
              year: "numeric",
            });

            const dmResult = await sendDirectMessage(discord_id, {
              embeds: [
                {
                  author: {
                    name: "Eclipse Portal",
                    icon_url: avatarUrl,
                  },
                  title: "🚀 Thank You for Boosting!",
                  description: "Here's your exclusive **50% discount code** as a thank you for boosting the server!",
                  color: BOOST_COLOR,
                  fields: [
                    {
                      name: "💎 Your Code",
                      value: `\`\`\`${code}\`\`\``,
                      inline: false,
                    },
                    {
                      name: "📅 Expires",
                      value: expiryDateStr,
                      inline: true,
                    },
                    {
                      name: "🔒 Usage",
                      value: "Single use · Only for you",
                      inline: true,
                    },
                  ],
                  footer: {
                    text: "This code is exclusive to your account and cannot be shared.",
                  },
                },
              ],
            });

            if (!dmResult.success) {
              console.log("[BOOST-LOG] Could not DM user (DMs may be disabled):", dmResult.error);
            }
          } else {
            console.error("[BOOST-LOG] Failed to insert discount code:", insertError);
          }
        } else {
          console.log("[BOOST-LOG] No linked platform account for discord_id:", discord_id);
        }
      } catch (discountError) {
        console.error("[BOOST-LOG] Discount generation error (non-fatal):", discountError);
      }
    }

    return new Response(
      JSON.stringify({ success: true, messageId: result.messageId, discountCode }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[BOOST-LOG] Error:", msg);
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
