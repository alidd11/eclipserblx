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

    if (!productId) {
      return new Response(
        JSON.stringify({ error: "Product ID is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user can download (48 hour limit)
    const { data: canDownload, error: canDownloadError } = await supabaseClient
      .rpc('can_user_download', { _user_id: user.id });

    if (canDownloadError) {
      console.error("Error checking download eligibility:", canDownloadError);
      return new Response(
        JSON.stringify({ error: "Failed to check download eligibility" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!canDownload) {
      // Get next available download time
      const { data: nextTime } = await supabaseClient
        .rpc('get_next_download_time', { _user_id: user.id });

      return new Response(
        JSON.stringify({ 
          error: "Download limit reached", 
          nextDownloadAt: nextTime,
          message: "You can download 1 product every 48 hours"
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify user has purchased this product
    const { data: orderItem, error: orderError } = await supabaseClient
      .from('order_items')
      .select(`
        id,
        order_id,
        product_id,
        orders!inner (
          id,
          user_id,
          status
        )
      `)
      .eq('product_id', productId)
      .eq('orders.user_id', user.id)
      .in('orders.status', ['paid', 'completed'])
      .limit(1)
      .maybeSingle();

    if (orderError || !orderItem) {
      console.error("Order verification failed:", orderError);
      return new Response(
        JSON.stringify({ error: "You have not purchased this product" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get product asset URL
    const { data: product, error: productError } = await supabaseClient
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
    const { error: logError } = await supabaseClient
      .from('download_logs')
      .insert({
        user_id: user.id,
        product_id: productId,
        order_item_id: orderItemId || orderItem.id,
      });

    if (logError) {
      console.error("Error logging download:", logError);
      // Don't fail the download, just log the error
    }

    // Use service role to access storage and increment count
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

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

    console.log(`Download logged: user=${user.id}, product=${productId}`);

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
