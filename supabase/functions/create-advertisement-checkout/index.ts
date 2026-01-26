import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-ADVERTISEMENT-CHECKOUT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { title, description, imageUrl, linkUrl, discordUsername } = await req.json();

    // Validate inputs
    if (!title || title.trim().length === 0) {
      throw new Error("Title is required");
    }
    if (title.length > 100) {
      throw new Error("Title must be 100 characters or less");
    }
    if (!description || description.trim().length === 0) {
      throw new Error("Description is required");
    }
    if (description.length > 500) {
      throw new Error("Description must be 500 characters or less");
    }
    if (imageUrl && imageUrl.length > 500) {
      throw new Error("Image URL is too long");
    }
    if (linkUrl && linkUrl.length > 500) {
      throw new Error("Link URL is too long");
    }

    logStep("Request received", { title, descriptionLength: description.length });

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
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Get advertisement price from settings
    const { data: priceSetting } = await supabaseClient
      .from("settings")
      .select("value")
      .eq("key", "advertisement_price")
      .maybeSingle();

    let advertisementPrice = 5.00; // Default £5
    if (priceSetting?.value) {
      const parsed = typeof priceSetting.value === 'string' 
        ? parseFloat(priceSetting.value.replace(/"/g, ''))
        : parseFloat(String(priceSetting.value));
      if (!isNaN(parsed) && parsed > 0) {
        advertisementPrice = parsed;
      }
    }

    logStep("Price determined", { price: advertisementPrice });

    // Check if advertisements are enabled
    const { data: enabledSetting } = await supabaseClient
      .from("settings")
      .select("value")
      .eq("key", "advertisements_enabled")
      .maybeSingle();

    const isEnabled = enabledSetting?.value === true || 
                     enabledSetting?.value === 'true' || 
                     enabledSetting?.value === '"true"' ||
                     !enabledSetting; // Default to enabled if no setting exists

    if (!isEnabled) {
      throw new Error("Advertisements are currently disabled");
    }

    // Create pending advertisement record using service role
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: advertisement, error: adError } = await supabaseAdmin
      .from("discord_advertisements")
      .insert({
        user_id: user.id,
        title: title.trim(),
        description: description.trim(),
        image_url: imageUrl?.trim() || null,
        link_url: linkUrl?.trim() || null,
        discord_username: discordUsername?.trim() || null,
        status: "pending",
        price_paid: advertisementPrice,
      })
      .select()
      .single();

    if (adError) {
      logStep("Failed to create advertisement record", adError);
      throw new Error("Failed to create advertisement");
    }

    logStep("Advertisement record created", { id: advertisement.id });

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    // Check for existing Stripe customer
    const customers = await stripe.customers.list({ email: user.email!, limit: 1 });
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email!,
      line_items: [
        {
          price_data: {
            currency: "gbp",
            product_data: {
              name: "Discord Advertisement",
              description: `Your ad: "${title.slice(0, 50)}${title.length > 50 ? '...' : ''}"`,
            },
            unit_amount: Math.round(advertisementPrice * 100),
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${req.headers.get("origin")}/advertise?success=true&ad_id=${advertisement.id}`,
      cancel_url: `${req.headers.get("origin")}/advertise?cancelled=true`,
      metadata: {
        advertisement_id: advertisement.id,
        type: "discord_advertisement",
        user_id: user.id,
      },
    });

    // Update advertisement with session ID
    await supabaseAdmin
      .from("discord_advertisements")
      .update({ payment_id: session.id })
      .eq("id", advertisement.id);

    logStep("Checkout session created", { sessionId: session.id });

    return new Response(JSON.stringify({ url: session.url }), {
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
