import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-ROBUX-AD-PENDING] ${step}${detailsStr}`);
};

// Sanitize text input
const sanitizeText = (text: string): string => {
  return text
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .replace(/@(everyone|here)/gi, '@\u200B$1')
    .trim();
};

// Validate URL format
const isValidUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { title, description, imageUrl, linkUrl, discordUsername } = await req.json();

    // Validate inputs
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      throw new Error("Title is required");
    }
    if (title.length > 100) {
      throw new Error("Title must be 100 characters or less");
    }
    if (!description || typeof description !== 'string' || description.trim().length === 0) {
      throw new Error("Description is required");
    }
    if (description.length > 500) {
      throw new Error("Description must be 500 characters or less");
    }
    
    if (imageUrl) {
      if (typeof imageUrl !== 'string' || imageUrl.length > 500) {
        throw new Error("Image URL is too long");
      }
      if (!isValidUrl(imageUrl)) {
        throw new Error("Invalid image URL format");
      }
    }
    if (linkUrl) {
      if (typeof linkUrl !== 'string' || linkUrl.length > 500) {
        throw new Error("Link URL is too long");
      }
      if (!isValidUrl(linkUrl)) {
        throw new Error("Invalid link URL format");
      }
    }
    if (discordUsername && (typeof discordUsername !== 'string' || discordUsername.length > 50)) {
      throw new Error("Discord username is too long");
    }

    const sanitizedTitle = sanitizeText(title);
    const sanitizedDescription = sanitizeText(description);
    const sanitizedDiscordUsername = discordUsername ? sanitizeText(discordUsername) : null;

    logStep("Request received", { title: sanitizedTitle });

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Authorization required");
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !userData.user) {
      throw new Error("User not authenticated");
    }

    const user = userData.user;
    logStep("User authenticated", { userId: user.id });

    // Check user has linked Roblox account
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('roblox_id, roblox_username')
      .eq('user_id', user.id)
      .single();

    if (!profile?.roblox_id) {
      throw new Error("Please link your Roblox account first to pay with Robux");
    }

    logStep("Roblox account linked", { roblox_id: profile.roblox_id });

    // Get Robux price setting
    const { data: priceSetting } = await supabaseClient
      .from("settings")
      .select("value")
      .eq("key", "robux_ad_gamepass_robux_price")
      .maybeSingle();

    let robuxPrice = 100; // Default
    if (priceSetting?.value) {
      const parsed = parseInt(String(priceSetting.value).replace(/"/g, ''), 10);
      if (!isNaN(parsed) && parsed > 0) {
        robuxPrice = parsed;
      }
    }

    // Get game URL for redirect
    const { data: gameUrlSetting } = await supabaseClient
      .from("settings")
      .select("value")
      .eq("key", "roblox_game_url")
      .maybeSingle();

    const gameUrl = gameUrlSetting?.value?.toString().replace(/"/g, '') || 'https://www.roblox.com';

    // Create pending advertisement
    const { data: advertisement, error: adError } = await supabaseAdmin
      .from("discord_advertisements")
      .insert({
        user_id: user.id,
        title: sanitizedTitle,
        description: sanitizedDescription,
        image_url: imageUrl?.trim() || null,
        link_url: linkUrl?.trim() || null,
        discord_username: sanitizedDiscordUsername,
        status: "pending_robux",
        payment_method: "robux",
        price_paid: robuxPrice,
      })
      .select()
      .single();

    if (adError) {
      logStep("Failed to create advertisement", adError);
      throw new Error("Failed to create advertisement");
    }

    logStep("Pending ad created", { id: advertisement.id, robuxPrice });

    return new Response(JSON.stringify({ 
      success: true,
      advertisement_id: advertisement.id,
      robux_price: robuxPrice,
      roblox_game_url: gameUrl,
      roblox_user_id: profile.roblox_id,
      message: "Please purchase the gamepass in Roblox to complete your advertisement",
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
