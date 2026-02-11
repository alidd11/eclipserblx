import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { checkRateLimit, getClientIp, rateLimitResponse, RATE_LIMITS } from '../_shared/rateLimit.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[VERIFY-PAYMENT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Rate limit check - prevent abuse of payment verification
    const clientIp = getClientIp(req);
    const rateLimitResult = checkRateLimit({
      ...RATE_LIMITS.WRITE,
      identifier: clientIp,
      action: 'verify-payment',
    });

    if (!rateLimitResult.allowed) {
      logStep("Rate limit exceeded", { ip: clientIp });
      return rateLimitResponse(rateLimitResult, corsHeaders);
    }
    const { sessionId, paymentIntentId } = await req.json();

    if (!sessionId && !paymentIntentId) {
      throw new Error("Session ID or Payment Intent ID is required");
    }

    logStep("Starting verification", { sessionId, paymentIntentId });

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    let items: any[] = [];
    let customerEmail = "";
    let userId: string | null = null;
    let paymentId = "";
    let paymentMethod = "stripe"; // Valid values: stripe, paypal, klarna, apple_pay, google_pay
    let amountTotal = 0;
    let discountCodeId: string | null = null;
    let discountAmount = 0;
    let stripeProcessingFee = 0; // Actual Stripe fee from balance transaction

    // Handle Stripe Checkout Session
    if (sessionId) {
      const session = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ["line_items", "payment_intent"],
      });

      logStep("Session retrieved", { id: session.id, status: session.payment_status });

      if (session.payment_status !== "paid") {
        return new Response(JSON.stringify({ 
          success: false, 
          message: "Payment not completed" 
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      items = JSON.parse(session.metadata?.items || "[]");
      customerEmail = session.customer_email || session.metadata?.customer_email || "";
      userId = session.metadata?.user_id || null;
      paymentId = session.id;
      discountCodeId = session.metadata?.discount_code_id || null;
      discountAmount = parseFloat(session.metadata?.discount_amount || "0");
      // Map Stripe payment method types to our valid values
      const pmType = session.payment_method_types?.[0];
      if (pmType === 'paypal') paymentMethod = 'paypal';
      else if (pmType === 'klarna') paymentMethod = 'klarna';
      else paymentMethod = 'stripe'; // Default to stripe for card payments
      amountTotal = session.amount_total ? session.amount_total / 100 : 0;

      // Retrieve Stripe processing fee from payment intent's balance transaction
      const paymentIntent = session.payment_intent as Stripe.PaymentIntent | null;
      if (paymentIntent?.latest_charge) {
        try {
          const charge = await stripe.charges.retrieve(
            typeof paymentIntent.latest_charge === 'string' 
              ? paymentIntent.latest_charge 
              : paymentIntent.latest_charge.id,
            { expand: ['balance_transaction'] }
          );
          const balanceTransaction = charge.balance_transaction as Stripe.BalanceTransaction | null;
          if (balanceTransaction?.fee) {
            stripeProcessingFee = balanceTransaction.fee / 100; // Convert from pence to pounds
            logStep("Stripe fee retrieved from checkout session", { fee: stripeProcessingFee });
          }
        } catch (feeError) {
          logStep("Could not retrieve Stripe fee (non-fatal)", feeError);
        }
      }
    }
    // Handle PaymentIntent (from Apple Pay/Google Pay)
    else if (paymentIntentId) {
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, {
        expand: ['latest_charge.balance_transaction']
      });

      logStep("PaymentIntent retrieved", { id: paymentIntent.id, status: paymentIntent.status });

      if (paymentIntent.status !== "succeeded") {
        return new Response(JSON.stringify({ 
          success: false, 
          message: "Payment not completed" 
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      items = JSON.parse(paymentIntent.metadata?.items || "[]");
      customerEmail = paymentIntent.receipt_email || paymentIntent.metadata?.customer_email || "";
      userId = paymentIntent.metadata?.user_id || null;
      paymentId = paymentIntent.id;
      discountCodeId = paymentIntent.metadata?.discount_code_id || null;
      discountAmount = parseFloat(paymentIntent.metadata?.discount_amount || "0");
      
      // Determine payment method type - must match constraint values
      if (paymentIntent.payment_method) {
        const pm = await stripe.paymentMethods.retrieve(paymentIntent.payment_method as string);
        if (pm.type === 'card' && pm.card?.wallet?.type === 'apple_pay') {
          paymentMethod = 'apple_pay';
        } else if (pm.type === 'card' && pm.card?.wallet?.type === 'google_pay') {
          paymentMethod = 'google_pay';
        } else if (pm.type === 'paypal') {
          paymentMethod = 'paypal';
        } else if (pm.type === 'klarna') {
          paymentMethod = 'klarna';
        } else {
          paymentMethod = 'stripe'; // Default for card and other types
        }
      }
      
      amountTotal = paymentIntent.amount / 100;

      // Retrieve Stripe processing fee from balance transaction
      const charge = paymentIntent.latest_charge as Stripe.Charge | null;
      if (charge?.balance_transaction) {
        const balanceTransaction = charge.balance_transaction as Stripe.BalanceTransaction;
        if (balanceTransaction.fee) {
          stripeProcessingFee = balanceTransaction.fee / 100; // Convert from pence to pounds
          logStep("Stripe fee retrieved from payment intent", { fee: stripeProcessingFee });
        }
      }
    }

    // Check if order already exists
    const { data: existingOrder } = await supabaseClient
      .from("orders")
      .select("id")
      .eq("payment_id", paymentId)
      .single();

    if (existingOrder) {
      logStep("Order already exists", { orderId: existingOrder.id });
      return new Response(JSON.stringify({ 
        success: true, 
        orderId: existingOrder.id,
        alreadyProcessed: true 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Calculate totals
    const subtotal = items.reduce((sum: number, item: any) => sum + item.price, 0);
    const total = amountTotal || (subtotal - discountAmount);

    logStep("Creating order", { customerEmail, userId, subtotal, discountAmount, total, paymentMethod, discountCodeId });

    // Increment discount code usage if applicable
    if (discountCodeId) {
      const { data: discount } = await supabaseClient
        .from('discount_codes')
        .select('current_uses')
        .eq('id', discountCodeId)
        .single();

      if (discount) {
        await supabaseClient
          .from('discount_codes')
          .update({ current_uses: (discount.current_uses || 0) + 1 })
          .eq('id', discountCodeId);
        logStep("Discount code usage incremented", { discountCodeId });
      }
    }

    // Create order
    const { data: order, error: orderError } = await supabaseClient
      .from("orders")
      .insert({
        customer_email: customerEmail,
        user_id: userId || null,
        subtotal: subtotal,
        total: total,
        discount_amount: discountAmount > 0 ? discountAmount : null,
        discount_code_id: discountCodeId || null,
        status: "paid",
        payment_id: paymentId,
        payment_method: paymentMethod,
      })
      .select()
      .single();

    if (orderError) {
      logStep("Order creation error", orderError);
      throw orderError;
    }

    logStep("Order created", { orderId: order.id });

    // Create order items and track bot purchases
    const botInstallationCodes: Array<{ product_name: string; installation_code: string }> = [];
    
    const orderItems = items.map((item: any) => ({
      order_id: order.id,
      product_id: item.id,
      product_name: item.name,
      price: item.price,
    }));

    const { data: insertedItems, error: itemsError } = await supabaseClient
      .from("order_items")
      .insert(orderItems)
      .select();

    if (itemsError) {
      logStep("Order items error", itemsError);
      throw itemsError;
    }

    // Process seller earnings for seller products (net-based after Stripe fees)
    // Calculate seller product count for proportional fee allocation
    const sellerProducts = items.filter((item: any) => item.id);
    const sellerProductCount = sellerProducts.length;
    
    for (const item of items) {
      if (item.id) {
        // Check if this is a seller product and get store commission rate
        const { data: product } = await supabaseClient
          .from("products")
          .select("is_seller_product, store_id, price, stores(owner_id, commission_rate, name)")
          .eq("id", item.id)
          .single();

        if (product?.is_seller_product && product.store_id) {
          const storesArray = product.stores as unknown as { 
            owner_id: string; 
            commission_rate?: number; 
            name?: string; 
          }[] | null;
          const sellerId = storesArray?.[0]?.owner_id;
          const commissionRate = storesArray?.[0]?.commission_rate ?? 15; // Default 15% commission
          const storeName = storesArray?.[0]?.name;

          // Fetch Discord credentials from separate secure table
          const { data: credentials } = await supabaseClient
            .from("store_credentials")
            .select("discord_webhook_url, discord_bot_token, discord_guild_id, discord_role_id")
            .eq("store_id", product.store_id)
            .single();

          const sellerWebhookUrl = credentials?.discord_webhook_url;
          const discordBotToken = credentials?.discord_bot_token;
          const discordGuildId = credentials?.discord_guild_id;
          const discordRoleId = credentials?.discord_role_id;
          
          if (sellerId) {
            // Calculate net-based seller earnings
            // Use full product price so sellers earn the same regardless of Eclipse+ discounts
            // The platform absorbs the Eclipse+ discount
            const grossAmount = product.price;
            // Allocate Stripe fee proportionally across all items
            const proportionalStripeFee = sellerProductCount > 0 
              ? stripeProcessingFee / sellerProductCount 
              : 0;
            const netBeforeCommission = grossAmount - proportionalStripeFee;
            // Seller receives (100% - commission%) of net amount
            const sellerEarnings = Math.max(0, netBeforeCommission * (1 - commissionRate / 100));
            const platformFee = netBeforeCommission - sellerEarnings;
            
            logStep("Processing seller earnings (net-based)", { 
              productId: item.id, 
              sellerId, 
              grossAmount,
              stripeFee: proportionalStripeFee,
              netBeforeCommission,
              commissionRate,
              sellerEarnings,
              platformFee
            });

            // Create transaction record with full fee breakdown
            const { error: txError } = await supabaseClient
              .from("seller_transactions")
              .insert({
                seller_id: sellerId,
                store_id: product.store_id,
                order_id: order.id,
                product_id: item.id,
                gross_amount: grossAmount,
                stripe_fee: proportionalStripeFee,
                net_before_commission: netBeforeCommission,
                platform_fee: platformFee,
                net_amount: sellerEarnings,
                amount: sellerEarnings,
                type: "sale",
                status: "completed",
              });

            if (txError) {
              logStep("Seller transaction error (non-fatal)", txError);
            } else {
              // Update seller balance
              const { data: currentBalance } = await supabaseClient
                .from("seller_balances")
                .select("available_balance, pending_balance, total_earned")
                .eq("user_id", sellerId)
                .single();

              if (currentBalance) {
                await supabaseClient
                  .from("seller_balances")
                  .update({
                    available_balance: (currentBalance.available_balance || 0) + sellerEarnings,
                    total_earned: (currentBalance.total_earned || 0) + sellerEarnings,
                  })
                  .eq("user_id", sellerId);
              } else {
                // Create new balance record
                await supabaseClient
                  .from("seller_balances")
                  .insert({
                    user_id: sellerId,
                    store_id: product.store_id,
                    available_balance: sellerEarnings,
                    total_earned: sellerEarnings,
                  });
              }
              logStep("Seller balance updated", { sellerId, amount: sellerEarnings });

              // Send Discord notification to seller if they have a webhook configured
              if (sellerWebhookUrl) {
                try {
                  const webhookPayload = {
                    embeds: [{
                      title: "🎉 New Sale!",
                      description: `Someone just purchased **${item.name}** from your store!`,
                      color: 0x22c55e, // Green color
                      fields: [
                        { name: "Product", value: item.name, inline: true },
                        { name: "Sale Price", value: `£${grossAmount.toFixed(2)}`, inline: true },
                        { name: "Your Earnings", value: `£${sellerEarnings.toFixed(2)}`, inline: true },
                        { name: "Order ID", value: order.id.slice(0, 8) + "...", inline: true },
                      ],
                      footer: { text: `${storeName || 'Your Store'} • Eclipse Store` },
                      timestamp: new Date().toISOString(),
                    }],
                  };

                  const webhookResponse = await fetch(sellerWebhookUrl, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(webhookPayload),
                  });

                  if (webhookResponse.ok) {
                    logStep("Seller Discord notification sent", { sellerId, product: item.name });
                  } else {
                    logStep("Seller Discord notification failed (non-fatal)", { 
                      status: webhookResponse.status 
                    });
                  }
                } catch (webhookError) {
                  logStep("Seller Discord webhook error (non-fatal)", webhookError);
                }
              }

              // Assign Discord role if seller has role integration configured
              if (discordBotToken && discordGuildId && discordRoleId && userId) {
                try {
                  // Get buyer's Discord ID from their profile
                  const { data: buyerProfile } = await supabaseClient
                    .from("profiles")
                    .select("discord_id")
                    .eq("user_id", userId)
                    .single();

                  if (buyerProfile?.discord_id) {
                    const discordApiUrl = `https://discord.com/api/v10/guilds/${discordGuildId}/members/${buyerProfile.discord_id}/roles/${discordRoleId}`;
                    
                    const roleResponse = await fetch(discordApiUrl, {
                      method: "PUT",
                      headers: {
                        "Authorization": `Bot ${discordBotToken}`,
                        "Content-Type": "application/json",
                      },
                    });

                    if (roleResponse.ok || roleResponse.status === 204) {
                      logStep("Discord role assigned to buyer", { 
                        buyerDiscordId: buyerProfile.discord_id, 
                        roleId: discordRoleId,
                        storeName 
                      });
                    } else {
                      const errorText = await roleResponse.text();
                      logStep("Discord role assignment failed (non-fatal)", { 
                        status: roleResponse.status,
                        error: errorText
                      });
                    }
                  } else {
                    logStep("Buyer has no Discord linked, skipping role assignment");
                  }
                } catch (roleError) {
                  logStep("Discord role assignment error (non-fatal)", roleError);
                }
              }
            }
          }
        }
      }
    }

    // Generate installation codes for bot purchases
    const insertedItemsArray = insertedItems as Array<{ id: string; product_name: string }>;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const isBotPurchase = item.category_slug === 'bots' || (item.name && item.name.toLowerCase().includes('bot'));
      
      if (isBotPurchase && insertedItemsArray[i]) {
        // Determine how many codes to generate (default to 1 for single license)
        const bundleQuantity = item.quantity || 1;
        const bundleId = item.bundle_id || null;
        
        logStep("Generating bot installation codes", { 
          product: item.name, 
          quantity: bundleQuantity,
          bundleId 
        });

        // Look up the bot_product_id for this product
        let botProductId: string | null = null;
        if (item.id) {
          const { data: botProduct } = await supabaseClient
            .from("bot_products")
            .select("id")
            .eq("product_id", item.id)
            .maybeSingle();
          botProductId = botProduct?.id || null;
        }

        // Generate multiple codes based on bundle quantity
        for (let codeIndex = 0; codeIndex < bundleQuantity; codeIndex++) {
          const { data: codeResult } = await supabaseClient.rpc('generate_installation_code');
          const installationCode = codeResult as string;
          
          if (installationCode) {
            const { error: codeError } = await supabaseClient
              .from("bot_installation_codes")
              .insert({
                order_id: order.id,
                order_item_id: insertedItemsArray[i].id,
                user_id: userId,
                installation_code: installationCode,
                product_name: bundleQuantity > 1 
                  ? `${item.name.replace(/\s*\([^)]*\)$/, '')} (License ${codeIndex + 1}/${bundleQuantity})`
                  : item.name,
                bot_product_id: botProductId,
              });
            
            if (codeError) {
              logStep("ERROR creating installation code", { error: codeError.message, codeIndex });
            } else {
              botInstallationCodes.push({
                product_name: item.name,
                installation_code: installationCode,
              });
              logStep("Installation code created", { 
                code: installationCode, 
                product: item.name,
                codeIndex: codeIndex + 1,
                total: bundleQuantity
              });
            }
          }
        }
      }
    }

    // Create review reminders for each item if user is logged in
    if (userId) {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.id) {
          const { error: reminderError } = await supabaseClient
            .from("review_reminders")
            .insert({
              user_id: userId,
              order_id: order.id,
              product_id: item.id,
              product_name: item.name,
            });
          
          if (reminderError) {
            logStep("Review reminder creation error (non-fatal)", { error: reminderError.message });
          } else {
            logStep("Review reminder created", { productName: item.name });
          }
        }
      }
    }

    // Send order confirmation email
    logStep("Sending confirmation email");
    try {
      // Check if any item is a bot (for special installation instructions)
      const hasBotPurchase = items.some((item: any) => 
        item.category_slug === 'bots' || 
        (item.name && item.name.toLowerCase().includes('bot'))
      );

      const emailPayload = {
        orderId: order.id,
        customerEmail: customerEmail,
        items: items.map((item: any) => ({
          product_name: item.name,
          price: item.price,
          category_slug: item.category_slug,
        })),
        subtotal: subtotal,
        total: total,
        paymentMethod: paymentMethod,
        orderDate: order.created_at,
        hasBotPurchase: hasBotPurchase,
        botInstallationCodes: botInstallationCodes.length > 0 ? botInstallationCodes : undefined,
      };

      const emailResponse = await fetch(
        `${Deno.env.get("SUPABASE_URL")}/functions/v1/send-order-confirmation`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify(emailPayload),
        }
      );

      if (!emailResponse.ok) {
        const errorText = await emailResponse.text();
        logStep("Email sending failed", errorText);
      } else {
        logStep("Email sent successfully");
      }
    } catch (emailError) {
      logStep("Email error (non-fatal)", emailError);
    }

    // Process referral if applicable
    if (userId) {
      logStep("Processing referral for user", { userId, orderTotal: order.total });
      try {
        const referralResponse = await fetch(
          `${Deno.env.get("SUPABASE_URL")}/functions/v1/process-referral`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
            },
            body: JSON.stringify({ orderId: order.id, userId, orderTotal: order.total }),
          }
        );

        if (referralResponse.ok) {
          const referralResult = await referralResponse.json();
          logStep("Referral processed", referralResult);
        } else {
          logStep("Referral processing failed (non-fatal)");
        }
      } catch (referralError) {
        logStep("Referral error (non-fatal)", referralError);
      }

      // Create in-app notification for the purchase
      const hasBotPurchase = items.some((item: any) => 
        item.category_slug === 'bots' || 
        (item.name && item.name.toLowerCase().includes('bot'))
      );
      
      const notificationTitle = hasBotPurchase 
        ? '🤖 Bot Purchase Complete!' 
        : '🎉 Order Confirmed!';
      
      const notificationMessage = hasBotPurchase
        ? `Your bot purchase is complete! Your installation code is ready. Visit Downloads to view your code and installation instructions.`
        : `Your order has been confirmed. Visit Downloads to access your purchased products.`;
      
      try {
        await supabaseClient
          .from('notifications')
          .insert({
            user_id: userId,
            title: notificationTitle,
            message: notificationMessage,
            type: hasBotPurchase ? 'bot_purchase' : 'order',
            link: '/downloads',
          });
        logStep("In-app notification created");
      } catch (notifError) {
        logStep("Notification error (non-fatal)", notifError);
      }

      // Send push notification
      try {
        await fetch(
          `${Deno.env.get("SUPABASE_URL")}/functions/v1/send-push-notification`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
            },
            body: JSON.stringify({
              user_ids: [userId],
              payload: {
                title: notificationTitle,
                body: notificationMessage,
                tag: `order-${order.id}`,
                url: '/downloads',
                requireInteraction: true,
              },
            }),
          }
        );
        logStep("Push notification sent");
      } catch (pushError) {
        logStep("Push notification error (non-fatal)", pushError);
      }

      // Send Discord order notification
      try {
        await fetch(
          `${Deno.env.get("SUPABASE_URL")}/functions/v1/send-order-discord-notification`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
            },
            body: JSON.stringify({
              orderId: order.id,
              userId: userId,
              customerEmail: customerEmail,
              productNames: items.map((item: any) => item.name),
              total: total,
            }),
          }
        );
        logStep("Discord order notification sent");
      } catch (discordError) {
        logStep("Discord notification error (non-fatal)", discordError);
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      orderId: order.id 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
