import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Not authenticated" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid authentication" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { productId, orderItemId } = await req.json();

    console.log("Download request:", { productId, orderItemId, userId: user.id, email: user.email });

    if (!productId) {
      return new Response(
        JSON.stringify({ error: "Product ID is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use service role for all admin operations
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Verify user has purchased this product
    const { data: orderItems, error: orderError } = await supabaseAdmin
      .from('order_items')
      .select(`
        id,
        order_id,
        product_id,
        orders!inner (
          id,
          user_id,
          customer_email,
          status
        )
      `)
      .eq('product_id', productId)
      .in('orders.status', ['paid', 'completed']);

    console.log("Order items found:", orderItems?.length, "Error:", orderError);

    // Find an order that belongs to this user (by user_id or email)
    const userOrder = orderItems?.find((item: any) => 
      item.orders?.user_id === user.id || 
      item.orders?.customer_email === user.email
    );

    if (orderError || !userOrder) {
      console.error("Order verification failed:", { orderError, userId: user.id, email: user.email, foundItems: orderItems?.length });
      return new Response(
        JSON.stringify({ error: "You have not purchased this product" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Found matching order:", userOrder.id);

    // Get product asset URL
    const { data: product, error: productError } = await supabaseAdmin
      .from('products')
      .select('id, name, asset_file_url, download_count')
      .eq('id', productId)
      .single();

    if (productError || !product) {
      return new Response(
        JSON.stringify({ error: "Product not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!product.asset_file_url) {
      return new Response(
        JSON.stringify({ error: "Download not available for this product" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log the download
    const { error: logError } = await supabaseAdmin
      .from('download_logs')
      .insert({
        user_id: user.id,
        product_id: productId,
        order_item_id: orderItemId || userOrder.id,
      });

    if (logError) {
      console.error("Error logging download:", logError);
      // Don't fail the download, just log the error
    }

    // Increment download count
    await supabaseAdmin
      .from('products')
      .update({ download_count: (product.download_count || 0) + 1 })
      .eq('id', productId);

    // Generate signed URL for the file (valid for 1 hour)
    const { data: signedUrlData, error: signedUrlError } = await supabaseAdmin.storage
      .from('product-assets')
      .createSignedUrl(product.asset_file_url, 3600); // 1 hour expiry

    if (signedUrlError || !signedUrlData?.signedUrl) {
      console.error("Error creating signed URL:", signedUrlError);
      return new Response(
        JSON.stringify({ error: "Failed to generate download link" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Download successful: user=${user.id}, product=${productId}`);

    return new Response(
      JSON.stringify({ 
        downloadUrl: signedUrlData.signedUrl,
        productName: product.name
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Download error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});