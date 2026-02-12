import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Rate limits
const MAX_DOWNLOADS_PER_PRODUCT_PER_DAY = 5;
const MAX_DOWNLOADS_PER_HOUR_GLOBAL = 15;

// Generate a secure random token
function generateToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

// Extract client IP from request headers
function getClientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() 
    || req.headers.get("x-real-ip") 
    || req.headers.get("cf-connecting-ip")
    || "unknown";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const tokenParam = url.searchParams.get("token");

    // If token is provided, this is a download redemption request (GET)
    if (tokenParam && req.method === "GET") {
      return await handleTokenRedemption(tokenParam, req);
    }

    // Otherwise, this is a token generation request (POST with auth)
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
    const clientIp = getClientIp(req);
    const userAgent = req.headers.get("user-agent") || "unknown";

    console.log("Download request:", { productId, orderItemId, userId: user.id, ip: clientIp });

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

    // === RATE LIMITING ===
    // Check per-product daily download limit
    const { data: perProductOk } = await supabaseAdmin.rpc('check_download_rate_limit', {
      p_user_id: user.id,
      p_product_id: productId,
      p_max_downloads_per_day: MAX_DOWNLOADS_PER_PRODUCT_PER_DAY,
    });

    if (perProductOk === false) {
      console.warn(`Rate limit hit: user=${user.id} product=${productId} (per-product daily)`);
      return new Response(
        JSON.stringify({ 
          error: "Download limit reached",
          message: `You've reached the maximum of ${MAX_DOWNLOADS_PER_PRODUCT_PER_DAY} downloads per day for this product. Please try again later.`,
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check global hourly download limit
    const { data: globalOk } = await supabaseAdmin.rpc('check_global_download_rate_limit', {
      p_user_id: user.id,
      p_max_downloads_per_hour: MAX_DOWNLOADS_PER_HOUR_GLOBAL,
    });

    if (globalOk === false) {
      console.warn(`Rate limit hit: user=${user.id} (global hourly)`);
      return new Response(
        JSON.stringify({ 
          error: "Download limit reached",
          message: `You've reached the maximum of ${MAX_DOWNLOADS_PER_HOUR_GLOBAL} downloads per hour. Please try again later.`,
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // === PURCHASE VERIFICATION ===
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

    // Extract file extension from asset URL
    const assetUrl = product.asset_file_url;
    const fileExtension = assetUrl.includes('.') ? assetUrl.substring(assetUrl.lastIndexOf('.')) : '';

    // Log the download with IP and user agent
    const { error: logError } = await supabaseAdmin
      .from('download_logs')
      .insert({
        user_id: user.id,
        product_id: productId,
        order_item_id: orderItemId || userOrder.id,
        ip_address: clientIp,
        user_agent: userAgent,
      });

    if (logError) {
      console.error("Error logging download:", logError);
    }

    // Increment download count
    await supabaseAdmin
      .from('products')
      .update({ download_count: (product.download_count || 0) + 1 })
      .eq('id', productId);

    // Generate signed URL for the file (valid for 5 minutes)
    const { data: signedUrlData, error: signedUrlError } = await supabaseAdmin.storage
      .from('product-assets')
      .createSignedUrl(product.asset_file_url, 300); // 5 minutes expiry

    if (signedUrlError || !signedUrlData?.signedUrl) {
      console.error("Error creating signed URL:", signedUrlError);
      return new Response(
        JSON.stringify({ error: "Failed to generate download link" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create one-time download token
    const downloadToken = generateToken();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    const { error: tokenError } = await supabaseAdmin
      .from('download_tokens')
      .insert({
        token: downloadToken,
        user_id: user.id,
        product_id: productId,
        order_item_id: orderItemId || userOrder.id,
        signed_url: signedUrlData.signedUrl,
        expires_at: expiresAt.toISOString(),
      });

    if (tokenError) {
      console.error("Error creating download token:", tokenError);
      return new Response(
        JSON.stringify({ error: "Failed to generate download token" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get file metadata for size
    let fileSize: number | null = null;
    try {
      const headResponse = await fetch(signedUrlData.signedUrl, { method: 'HEAD' });
      const contentLength = headResponse.headers.get('content-length');
      if (contentLength) {
        fileSize = parseInt(contentLength, 10);
      }
    } catch (e) {
      console.log("Could not get file size:", e);
    }

    console.log(`Download token created: user=${user.id}, product=${productId}, ip=${clientIp}, token=${downloadToken.slice(0, 8)}...`);

    // Create filename with proper extension
    const sanitizedName = product.name.replace(/[^a-zA-Z0-9-_ ]/g, '').trim();
    const fileName = fileExtension ? `${sanitizedName}${fileExtension}` : sanitizedName;

    // Return the one-time token URL instead of direct signed URL
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const downloadUrl = `${supabaseUrl}/functions/v1/download-asset?token=${downloadToken}`;

    return new Response(
      JSON.stringify({ 
        downloadUrl: downloadUrl,
        productName: product.name,
        fileName: fileName,
        fileSize: fileSize,
        expiresAt: expiresAt.toISOString(),
        oneTimeUse: true,
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

// Handle one-time token redemption (GET request with token)
async function handleTokenRedemption(token: string, req: Request): Promise<Response> {
  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  // Find the token
  const { data: tokenData, error: tokenError } = await supabaseAdmin
    .from('download_tokens')
    .select('*')
    .eq('token', token)
    .single();

  if (tokenError || !tokenData) {
    console.error("Token not found:", token.slice(0, 8));
    return new Response(
      `<!DOCTYPE html>
      <html>
        <head><title>Download Error</title></head>
        <body style="font-family: system-ui; text-align: center; padding: 50px;">
          <h1>❌ Invalid Download Link</h1>
          <p>This download link is invalid or has already been used.</p>
          <p>Please request a new download link from your account.</p>
        </body>
      </html>`,
      { status: 404, headers: { ...corsHeaders, "Content-Type": "text/html" } }
    );
  }

  // Check if already used
  if (tokenData.used_at) {
    console.log("Token already used:", token.slice(0, 8), "at", tokenData.used_at);
    return new Response(
      `<!DOCTYPE html>
      <html>
        <head><title>Download Error</title></head>
        <body style="font-family: system-ui; text-align: center; padding: 50px;">
          <h1>⚠️ Link Already Used</h1>
          <p>This download link has already been used.</p>
          <p>Download links are one-time use only for security.</p>
          <p>Please request a new download link from your account.</p>
        </body>
      </html>`,
      { status: 410, headers: { ...corsHeaders, "Content-Type": "text/html" } }
    );
  }

  // Check if expired
  const expiresAt = new Date(tokenData.expires_at);
  if (expiresAt < new Date()) {
    console.log("Token expired:", token.slice(0, 8), "expired at", tokenData.expires_at);
    return new Response(
      `<!DOCTYPE html>
      <html>
        <head><title>Download Error</title></head>
        <body style="font-family: system-ui; text-align: center; padding: 50px;">
          <h1>⏰ Link Expired</h1>
          <p>This download link has expired (5 minute limit).</p>
          <p>Please request a new download link from your account.</p>
        </body>
      </html>`,
      { status: 410, headers: { ...corsHeaders, "Content-Type": "text/html" } }
    );
  }

  // Mark token as used BEFORE redirecting (atomic operation)
  const { error: updateError } = await supabaseAdmin
    .from('download_tokens')
    .update({ used_at: new Date().toISOString() })
    .eq('id', tokenData.id)
    .is('used_at', null); // Only update if still unused (prevents race conditions)

  if (updateError) {
    console.error("Failed to mark token as used:", updateError);
    return new Response(
      `<!DOCTYPE html>
      <html>
        <head><title>Download Error</title></head>
        <body style="font-family: system-ui; text-align: center; padding: 50px;">
          <h1>❌ Download Failed</h1>
          <p>An error occurred processing your download.</p>
          <p>Please try again.</p>
        </body>
      </html>`,
      { status: 500, headers: { ...corsHeaders, "Content-Type": "text/html" } }
    );
  }

  const clientIp = getClientIp(req);
  console.log(`Token redeemed: ${token.slice(0, 8)}... for product ${tokenData.product_id}, ip=${clientIp}`);

  // Redirect to the signed URL for actual file download
  return new Response(null, {
    status: 302,
    headers: {
      ...corsHeaders,
      "Location": tokenData.signed_url,
    },
  });
}
