import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { checkRateLimit, getClientIp, rateLimitResponse, RATE_LIMITS } from '../_shared/rateLimit.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CartItem {
  id: string;
  name: string;
  price: number;
  category_slug?: string;
  category_id?: string;
}

interface PurchaseRequest {
  items: CartItem[];
}

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[PURCHASE-WITH-CREDITS] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Rate limit check
    const clientIp = getClientIp(req);
    const rateLimitResult = checkRateLimit({
      ...RATE_LIMITS.WRITE,
      identifier: clientIp,
      action: 'purchase-with-credits',
    });

    if (!rateLimitResult.allowed) {
      logStep("Rate limit exceeded", { ip: clientIp });
      return rateLimitResponse(rateLimitResult, corsHeaders);
    }

    logStep("Function started");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Authentication required");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error("Invalid authentication");
    }

    const userId = user.id;
    const userEmail = user.email || "";
    logStep("User authenticated", { userId });

    const { items }: PurchaseRequest = await req.json();
    
    if (!items || items.length === 0) {
      throw new Error("No items provided");
    }

    // Fetch actual product data from database (server-side price validation)
    const productIds = items.map(item => item.id);
    const { data: products, error: productsError } = await supabaseClient
      .from('products')
      .select(`
        id, name, price, category_id, is_seller_product, store_id,
        stores(owner_id, commission_rate, name)
      `)
      .in('id', productIds);

    if (productsError) {
      logStep("Error fetching products", productsError);
      throw new Error("Failed to verify product prices");
    }

    const productMap = new Map(products?.map(p => [p.id, p]) || []);

    // Validate all products exist and calculate total
    let totalPrice = 0;
    const validatedItems: Array<{
      id: string;
      name: string;
      price: number;
      is_seller_product: boolean;
      store_id?: string;
      seller_id?: string;
      commission_rate?: number;
      store_name?: string;
    }> = [];

    for (const item of items) {
      const product = productMap.get(item.id);
      if (!product) {
        throw new Error(`Product not found: ${item.id}`);
      }

      const storesData = product.stores as unknown as { 
        owner_id: string; 
        commission_rate?: number; 
        name?: string; 
      }[] | null;

      validatedItems.push({
        id: product.id,
        name: product.name,
        price: product.price,
        is_seller_product: product.is_seller_product || false,
        store_id: product.store_id,
        seller_id: storesData?.[0]?.owner_id,
        commission_rate: storesData?.[0]?.commission_rate ?? 15,
        store_name: storesData?.[0]?.name,
      });

      totalPrice += product.price;
    }

    logStep("Validated items", { totalPrice, itemCount: validatedItems.length });

    // Check user's credit balance
    const { data: creditBalance } = await supabaseClient
      .from('credit_balances')
      .select('balance')
      .eq('user_id', userId)
      .single();

    const currentBalance = creditBalance?.balance || 0;
    
    if (currentBalance < totalPrice) {
      throw new Error(`Insufficient credit balance. Required: £${totalPrice.toFixed(2)}, Available: £${currentBalance.toFixed(2)}`);
    }

    logStep("Credit balance verified", { currentBalance, required: totalPrice });

    // Create order
    const { data: order, error: orderError } = await supabaseClient
      .from("orders")
      .insert({
        customer_email: userEmail,
        user_id: userId,
        subtotal: totalPrice,
        total: totalPrice,
        status: "paid",
        payment_method: "credits",
        payment_id: `credits_${Date.now()}_${userId.slice(0, 8)}`,
      })
      .select()
      .single();

    if (orderError) {
      logStep("Order creation error", orderError);
      throw orderError;
    }

    logStep("Order created", { orderId: order.id });

    // Create order items
    const orderItems = validatedItems.map(item => ({
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

    // Process seller earnings for seller products
    // Since credits have no Stripe fee, sellers get their full (100% - commission%) of sale price
    for (const item of validatedItems) {
      if (item.is_seller_product && item.store_id && item.seller_id) {
        const grossAmount = item.price;
        const commissionRate = item.commission_rate || 15;
        // No Stripe fees for credit purchases - seller gets more!
        const sellerEarnings = grossAmount * (1 - commissionRate / 100);
        const platformFee = grossAmount - sellerEarnings;

        logStep("Processing seller earnings (credit purchase)", {
          productId: item.id,
          sellerId: item.seller_id,
          grossAmount,
          commissionRate,
          sellerEarnings,
          platformFee,
        });

        // Find the matching order_item_id for this product
        const matchingOrderItem = insertedItems?.find(oi => oi.product_id === item.id);

        // Create seller transaction record
        const { error: txError } = await supabaseClient
          .from("seller_transactions")
          .insert({
            seller_id: item.seller_id,
            store_id: item.store_id,
            order_id: order.id,
            order_item_id: matchingOrderItem?.id || null,
            gross_amount: grossAmount,
            stripe_fee: 0, // No Stripe fee for credit purchases
            net_before_commission: grossAmount, // Full amount since no Stripe fee
            platform_fee: platformFee,
            net_amount: sellerEarnings,
            amount: sellerEarnings,
            type: "sale",
            status: "completed",
            description: "Credit purchase - no payment processing fees",
          });

        if (txError) {
          logStep("Seller transaction error (non-fatal)", { message: txError.message, details: txError.details, code: txError.code });
        } else {
          // Update seller balance
          const { data: currentSellerBalance } = await supabaseClient
            .from("seller_balances")
            .select("available_balance, total_earned")
            .eq("user_id", item.seller_id)
            .single();

          if (currentSellerBalance) {
            await supabaseClient
              .from("seller_balances")
              .update({
                available_balance: (currentSellerBalance.available_balance || 0) + sellerEarnings,
                total_earned: (currentSellerBalance.total_earned || 0) + sellerEarnings,
              })
              .eq("user_id", item.seller_id);
          } else {
            await supabaseClient
              .from("seller_balances")
              .insert({
                user_id: item.seller_id,
                store_id: item.store_id,
                available_balance: sellerEarnings,
                total_earned: sellerEarnings,
              });
          }
          
          logStep("Seller balance updated", { sellerId: item.seller_id, amount: sellerEarnings });

          // Send email + in-app sale notification to seller
          try {
            const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
            await fetch(`${supabaseUrl}/functions/v1/notify-seller-sale`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
              },
              body: JSON.stringify({
                type: 'sale',
                store_id: item.store_id,
                order_id: order.id,
                product_name: item.name,
                amount: sellerEarnings,
              }),
            });
            logStep("Seller sale notification triggered", { sellerId: item.seller_id, product: item.name });
          } catch (notifyError) {
            logStep("Seller sale notification error (non-fatal)", String(notifyError));
          }

          // Send Discord notification to seller
          const { data: credentials } = await supabaseClient
            .from("store_credentials")
            .select("discord_webhook_url")
            .eq("store_id", item.store_id)
            .single();

          if (credentials?.discord_webhook_url) {
            try {
              const webhookPayload = {
                embeds: [{
                  title: "🎉 New Sale (Credit Purchase)!",
                  description: `Someone just purchased **${item.name}** using store credits!`,
                  color: 0x22c55e,
                  fields: [
                    { name: "Product", value: item.name, inline: true },
                    { name: "Sale Price", value: `£${grossAmount.toFixed(2)}`, inline: true },
                    { name: "Your Earnings", value: `£${sellerEarnings.toFixed(2)}`, inline: true },
                    { name: "Payment Method", value: "Store Credits", inline: true },
                  ],
                  footer: { text: `${item.store_name || 'Your Store'} • Eclipse Store` },
                  timestamp: new Date().toISOString(),
                }],
              };

              await fetch(credentials.discord_webhook_url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(webhookPayload),
              });
              logStep("Seller Discord notification sent", { sellerId: item.seller_id });
            } catch (webhookError) {
              logStep("Seller Discord webhook error (non-fatal)", webhookError);
            }
          }
        }
      }
    }

    // Deduct credits from user's balance
    const { data: spendResult, error: spendError } = await supabaseClient
      .rpc('spend_credits', {
        p_user_id: userId,
        p_amount: totalPrice,
        p_description: `Purchase: ${validatedItems.map(i => i.name).join(', ')}`,
        p_order_id: order.id,
      });

    if (spendError) {
      logStep("Credit spend error", spendError);
      // Rollback: Delete order and order items
      await supabaseClient.from("order_items").delete().eq("order_id", order.id);
      await supabaseClient.from("orders").delete().eq("id", order.id);
      throw new Error("Failed to deduct credits");
    }

    if (!spendResult) {
      // Rollback: Delete order and order items
      await supabaseClient.from("order_items").delete().eq("order_id", order.id);
      await supabaseClient.from("orders").delete().eq("id", order.id);
      throw new Error("Insufficient credit balance");
    }

    logStep("Credits deducted", { amount: totalPrice, orderId: order.id });

    // Clear user's cart
    await supabaseClient
      .from("cart_items")
      .delete()
      .eq("user_id", userId);

    logStep("Cart cleared");

    // Create notification for user
    await supabaseClient.from("notifications").insert({
      user_id: userId,
      type: "order_confirmation",
      title: "Order Confirmed!",
      message: `Your credit purchase of £${totalPrice.toFixed(2)} has been completed.`,
      data: { order_id: order.id },
    });

    return new Response(
      JSON.stringify({
        success: true,
        orderId: order.id,
        totalSpent: totalPrice,
        message: "Purchase completed successfully with credits",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
