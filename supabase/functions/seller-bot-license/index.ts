import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Seller Bot License Validation API
// This endpoint allows sellers' Discord bots to validate installation codes

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-seller-id",
};

interface LicenseRequest {
  action: "validate" | "check" | "deactivate";
  installation_code: string;
  guild_id?: string;
  guild_name?: string;
  guild_icon?: string;
  member_count?: number;
}

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Get seller ID from header
    const sellerId = req.headers.get("x-seller-id");
    
    if (!sellerId) {
      console.warn("[seller-bot-license] Missing x-seller-id header");
      return jsonResponse({
        success: false,
        error: "Missing x-seller-id header. Include your store ID in the request.",
        code: "MISSING_SELLER_ID"
      }, 401);
    }

    // Validate the seller exists
    const { data: store, error: storeError } = await supabase
      .from("stores")
      .select("id, name, store_id, status")
      .eq("store_id", sellerId)
      .maybeSingle();

    if (storeError || !store) {
      console.warn("[seller-bot-license] Invalid seller ID:", sellerId);
      return jsonResponse({
        success: false,
        error: "Invalid seller ID",
        code: "INVALID_SELLER"
      }, 401);
    }

    if (store.status !== "approved") {
      return jsonResponse({
        success: false,
        error: "Store not approved",
        code: "STORE_NOT_APPROVED"
      }, 403);
    }

    const body: LicenseRequest = await req.json();
    console.log(`[seller-bot-license] Action: ${body.action}, Store: ${store.name}, Code: ${body.installation_code?.substring(0, 8)}...`);

    if (!body.installation_code) {
      return jsonResponse({
        success: false,
        error: "Installation code required",
        code: "MISSING_CODE"
      }, 400);
    }

    const code = body.installation_code.toUpperCase().trim();

    switch (body.action) {
      case "validate":
        return await handleValidate(supabase, store, code, body);
      case "check":
        return await handleCheck(supabase, store, code);
      case "deactivate":
        return await handleDeactivate(supabase, store, code);
      default:
        return jsonResponse({
          success: false,
          error: "Unknown action. Use: validate, check, or deactivate",
          code: "UNKNOWN_ACTION"
        }, 400);
    }
  } catch (error) {
    console.error("[seller-bot-license] Error:", error);
    return jsonResponse({
      success: false,
      error: "Internal server error",
      code: "INTERNAL_ERROR"
    }, 500);
  }
});

// Validate and activate a license code
async function handleValidate(
  supabase: any,
  store: { id: string; name: string; store_id: string },
  code: string,
  body: LicenseRequest
) {
  // Find the installation code
  const { data: license, error: licenseError } = await supabase
    .from("bot_installation_codes")
    .select(`
      id,
      installation_code,
      is_used,
      used_at,
      guild_id,
      expires_at,
      license_status,
      license_expires_at,
      product_name,
      user_id,
      bot_product_id,
      bot_products!bot_installation_codes_bot_product_id_fkey (
        id,
        discord_application_id,
        is_active,
        product:products (
          id,
          name,
          store_id
        )
      )
    `)
    .eq("installation_code", code)
    .maybeSingle();

  if (licenseError) {
    console.error("[seller-bot-license] License lookup error:", licenseError);
    return jsonResponse({
      success: false,
      error: "Failed to lookup license",
      code: "LOOKUP_ERROR"
    }, 500);
  }

  if (!license) {
    return jsonResponse({
      success: false,
      error: "Invalid installation code",
      code: "INVALID_CODE"
    }, 404);
  }

  // Verify the license belongs to a product from this seller's store
  const botProduct = license.bot_products;
  if (!botProduct?.product || botProduct.product.store_id !== store.id) {
    console.warn("[seller-bot-license] Code not from seller's store");
    return jsonResponse({
      success: false,
      error: "This code is not valid for your store",
      code: "WRONG_STORE"
    }, 403);
  }

  if (!botProduct.is_active) {
    return jsonResponse({
      success: false,
      error: "This bot product is currently disabled",
      code: "BOT_DISABLED"
    }, 403);
  }

  // Check if already used on a different guild
  if (license.is_used && license.guild_id && license.guild_id !== body.guild_id) {
    return jsonResponse({
      success: false,
      error: "This license is already activated on another server",
      code: "ALREADY_USED",
      activated_guild: license.guild_id
    }, 409);
  }

  // Check expiration
  if (license.expires_at && new Date(license.expires_at) < new Date()) {
    return jsonResponse({
      success: false,
      error: "This installation code has expired",
      code: "EXPIRED"
    }, 410);
  }

  // Check license status
  if (license.license_status === "revoked") {
    return jsonResponse({
      success: false,
      error: "This license has been revoked",
      code: "REVOKED"
    }, 403);
  }

  // Activate the license if not already
  if (!license.is_used && body.guild_id) {
    const { error: updateError } = await supabase
      .from("bot_installation_codes")
      .update({
        is_used: true,
        used_at: new Date().toISOString(),
        activated_at: new Date().toISOString(),
        guild_id: body.guild_id,
        discord_guild_name: body.guild_name || null,
        discord_guild_icon: body.guild_icon || null,
        discord_member_count: body.member_count || null,
        license_status: "active",
      })
      .eq("id", license.id);

    if (updateError) {
      console.error("[seller-bot-license] Failed to activate:", updateError);
      return jsonResponse({
        success: false,
        error: "Failed to activate license",
        code: "ACTIVATION_ERROR"
      }, 500);
    }

    console.log(`[seller-bot-license] Activated code ${code} for guild ${body.guild_id}`);
  }

  return jsonResponse({
    success: true,
    message: "License validated successfully",
    license: {
      product_name: license.product_name,
      guild_id: body.guild_id || license.guild_id,
      activated: true,
      expires_at: license.license_expires_at || null,
    },
    bot: {
      application_id: botProduct.discord_application_id,
    }
  });
}

// Check license status without modifying
async function handleCheck(
  supabase: any,
  store: { id: string; name: string; store_id: string },
  code: string
) {
  const { data: license, error } = await supabase
    .from("bot_installation_codes")
    .select(`
      id,
      is_used,
      used_at,
      guild_id,
      discord_guild_name,
      expires_at,
      license_status,
      license_expires_at,
      product_name,
      bot_products!bot_installation_codes_bot_product_id_fkey (
        is_active,
        product:products (
          store_id
        )
      )
    `)
    .eq("installation_code", code)
    .maybeSingle();

  if (error || !license) {
    return jsonResponse({
      success: false,
      error: "Invalid installation code",
      code: "INVALID_CODE"
    }, 404);
  }

  const botProduct = license.bot_products;
  if (!botProduct?.product || botProduct.product.store_id !== store.id) {
    return jsonResponse({
      success: false,
      error: "This code is not valid for your store",
      code: "WRONG_STORE"
    }, 403);
  }

  const isExpired = license.license_expires_at && new Date(license.license_expires_at) < new Date();

  return jsonResponse({
    success: true,
    license: {
      product_name: license.product_name,
      is_activated: license.is_used,
      guild_id: license.guild_id,
      guild_name: license.discord_guild_name,
      status: isExpired ? "expired" : license.license_status,
      activated_at: license.used_at,
      expires_at: license.license_expires_at,
    }
  });
}

// Deactivate a license (for transfers or server removal)
async function handleDeactivate(
  supabase: any,
  store: { id: string; name: string; store_id: string },
  code: string
) {
  const { data: license, error } = await supabase
    .from("bot_installation_codes")
    .select(`
      id,
      is_used,
      guild_id,
      bot_products!bot_installation_codes_bot_product_id_fkey (
        product:products (
          store_id
        )
      )
    `)
    .eq("installation_code", code)
    .maybeSingle();

  if (error || !license) {
    return jsonResponse({
      success: false,
      error: "Invalid installation code",
      code: "INVALID_CODE"
    }, 404);
  }

  const botProduct = license.bot_products;
  if (!botProduct?.product || botProduct.product.store_id !== store.id) {
    return jsonResponse({
      success: false,
      error: "This code is not valid for your store",
      code: "WRONG_STORE"
    }, 403);
  }

  if (!license.is_used) {
    return jsonResponse({
      success: false,
      error: "This license is not currently activated",
      code: "NOT_ACTIVATED"
    }, 400);
  }

  // Deactivate the license
  const { error: updateError } = await supabase
    .from("bot_installation_codes")
    .update({
      is_used: false,
      guild_id: null,
      discord_guild_name: null,
      discord_guild_icon: null,
      discord_member_count: null,
      license_status: "inactive",
    })
    .eq("id", license.id);

  if (updateError) {
    console.error("[seller-bot-license] Failed to deactivate:", updateError);
    return jsonResponse({
      success: false,
      error: "Failed to deactivate license",
      code: "DEACTIVATION_ERROR"
    }, 500);
  }

  console.log(`[seller-bot-license] Deactivated code ${code}`);

  return jsonResponse({
    success: true,
    message: "License deactivated successfully. It can now be used on another server.",
  });
}
