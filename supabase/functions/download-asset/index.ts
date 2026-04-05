import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { checkRateLimit, getClientIp as sharedGetClientIp, rateLimitResponse, RATE_LIMITS } from '../_shared/rateLimit.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Input validation
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TOKEN_REGEX = /^[0-9a-f]{64}$/i;

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

// Generate a unique watermark identifier from user/order data
function generateWatermarkHash(userId: string, orderId: string, productId: string): string {
  // Create a deterministic but opaque hash from user + order + product
  const raw = `${userId}:${orderId}:${productId}`;
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    const char = raw.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  // Convert to alphanumeric string
  const hex = Math.abs(hash).toString(36).toUpperCase();
  return `ECL-${hex.padStart(8, '0').slice(0, 8)}`;
}

// Encode watermark ID into a Lua-safe obfuscated variable
function generateLuaWatermark(watermarkId: string): string {
  // Encode the watermark as a series of string.char calls to make it less obvious
  const chars = watermarkId.split('').map(c => c.charCodeAt(0));
  const charStr = chars.join(',');
  
  const lines = [
    `-- Eclipse Marketplace | Licensed Copy`,
    `-- Unauthorized redistribution is prohibited`,
    `-- https://eclipserblx.com/terms`,
    `local _=string.char(${charStr}) --[[ license ]]`,
  ];
  return lines.join('\n');
}

// Inject watermark into Lua file content
function watermarkLuaFile(content: string, userId: string, orderId: string, productId: string): string {
  const watermarkId = generateWatermarkHash(userId, orderId, productId);
  const watermark = generateLuaWatermark(watermarkId);
  
  // Insert watermark after any existing header comments/shebangs, or at the very top
  const lines = content.split('\n');
  let insertIndex = 0;
  
  // Skip past any initial comment block
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (trimmed.startsWith('--') || trimmed === '' || trimmed.startsWith('#!')) {
      insertIndex = i + 1;
    } else {
      break;
    }
  }
  
  lines.splice(insertIndex, 0, watermark, '');
  return lines.join('\n');
}

// Binary fingerprinting: embed buyer hash into non-Lua files
function fingerprintBinaryFile(data: Uint8Array, watermarkId: string, extension: string): Uint8Array {
  const ext = extension.toLowerCase();
  const marker = new TextEncoder().encode(`\x00ECL_FP:${watermarkId}\x00`);

  if (ext === '.rbxm' || ext === '.rbxl') {
    // Roblox binary files: append trailing metadata (Studio ignores it)
    const result = new Uint8Array(data.length + marker.length);
    result.set(data);
    result.set(marker, data.length);
    return result;
  }

  if (ext === '.png' || ext === '.jpg' || ext === '.jpeg' || ext === '.webp') {
    // Images: prepend a comment-safe fingerprint block after header
    // For PNG: append to IEND, for JPEG: append before EOF
    const result = new Uint8Array(data.length + marker.length);
    result.set(data);
    result.set(marker, data.length);
    return result;
  }

  if (ext === '.zip' || ext === '.rar' || ext === '.7z') {
    // Archives: append fingerprint after archive end (most tools ignore trailing data)
    const result = new Uint8Array(data.length + marker.length);
    result.set(data);
    result.set(marker, data.length);
    return result;
  }

  // Default: append fingerprint for any other binary
  const result = new Uint8Array(data.length + marker.length);
  result.set(data);
  result.set(marker, data.length);
  return result;
}

// Extract fingerprint from a fingerprinted file
function extractFingerprint(data: Uint8Array): string | null {
  const text = new TextDecoder('utf-8', { fatal: false }).decode(data);
  const match = text.match(/\x00ECL_FP:(ECL-[A-Z0-9]{8})\x00/);
  if (match) return match[1];
  
  // Also check Lua watermark format
  const luaMatch = text.match(/local _=string\.char\(([0-9,]+)\)/);
  if (luaMatch) {
    try {
      const chars = luaMatch[1].split(',').map(Number);
      return String.fromCharCode(...chars);
    } catch { /* ignore */ }
  }
  
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const tokenParam = url.searchParams.get("token");

    // If token is provided, this is a download redemption request (GET)
    if (tokenParam && req.method === "GET") {
      if (!TOKEN_REGEX.test(tokenParam)) {
        return new Response(JSON.stringify({ error: "Invalid token format" }), 
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      // Rate limit token redemptions to prevent brute-force
      const redeemIp = sharedGetClientIp(req);
      const redeemRl = checkRateLimit({ ...RATE_LIMITS.API, identifier: redeemIp, action: 'download-redeem' });
      if (!redeemRl.allowed) return rateLimitResponse(redeemRl, corsHeaders);
      
      return await handleTokenRedemption(tokenParam, req);
    }

    // Otherwise, this is a token generation request (POST with auth)
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
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

    const { productId, orderItemId, fileIndex } = await req.json();
    const requestedFileIndex = typeof fileIndex === 'number' ? fileIndex : 0;
    const clientIp = getClientIp(req);
    const userAgent = req.headers.get("user-agent") || "unknown";

    console.log("Download request:", { productId, orderItemId, userId: user.id, ip: clientIp });

    if (!productId || !UUID_REGEX.test(productId)) {
      return new Response(
        JSON.stringify({ error: "Valid Product ID is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (orderItemId && !UUID_REGEX.test(orderItemId)) {
      return new Response(
        JSON.stringify({ error: "Invalid order item ID format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use service role for all admin operations
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // === RATE LIMITING ===
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
      .select('id, name, asset_file_url, additional_asset_files, download_count')
      .eq('id', productId)
      .single();

    if (productError || !product) {
      return new Response(
        JSON.stringify({ error: "Product not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Determine which file to serve based on fileIndex
    const additionalFiles: string[] = (product as any).additional_asset_files || [];
    let assetUrl: string | null = null;

    if (requestedFileIndex === 0) {
      assetUrl = product.asset_file_url;
    } else if (requestedFileIndex > 0 && requestedFileIndex <= additionalFiles.length) {
      assetUrl = additionalFiles[requestedFileIndex - 1];
    }

    if (!assetUrl) {
      return new Response(
        JSON.stringify({ error: "Download not available for this file" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const fileExtension = assetUrl.includes('.') ? assetUrl.substring(assetUrl.lastIndexOf('.')) : '';
    const isLuaFile = fileExtension.toLowerCase() === '.lua';

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

    // Atomically increment download count
    const incResult = await supabaseAdmin.rpc('increment_download_count', { p_product_id: productId });
    if (incResult.error) console.error("Error incrementing download count:", incResult.error);

    // === WATERMARKING for .lua files ===
    if (isLuaFile) {
      console.log(`Watermarking Lua file for user=${user.id}, product=${productId}`);
      
      // Download the original file
      const { data: fileData, error: downloadError } = await supabaseAdmin.storage
        .from('product-assets')
        .download(assetUrl);
      
      if (downloadError || !fileData) {
        console.error("Failed to download file for watermarking:", downloadError);
        // Fall through to normal signed URL flow
      } else {
        try {
          const originalContent = await fileData.text();
          const watermarkedContent = watermarkLuaFile(
            originalContent, 
            user.id, 
            ((userOrder as Record<string, unknown>).order_id as string) || userOrder.id, 
            productId
          );
          
          const watermarkId = generateWatermarkHash(
            user.id, 
            ((userOrder as Record<string, unknown>).order_id as string) || userOrder.id, 
            productId
          );
          
          console.log(`Watermark applied: ${watermarkId} for user=${user.id}`);
          
          // Create filename
          const sanitizedName = product.name.replace(/[^a-zA-Z0-9-_ ]/g, '').trim();
          const fileName = `${sanitizedName}.lua`;
          
          // Return watermarked file directly as a download
          const downloadToken = generateToken();
          const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
          
          // Store the watermarked content as a signed blob URL
          // Upload to a temp path in product-assets
          const tempPath = `_watermarked/${user.id}/${downloadToken}.lua`;
          const watermarkedBlob = new Blob([watermarkedContent], { type: 'text/plain' });
          
          const { error: uploadError } = await supabaseAdmin.storage
            .from('product-assets')
            .upload(tempPath, watermarkedBlob, { 
              contentType: 'application/octet-stream',
              upsert: true 
            });
          
          if (uploadError) {
            console.error("Failed to upload watermarked file:", uploadError);
            // Fall through to normal flow
          } else {
            // Create signed URL for the watermarked file
            const { data: signedUrlData, error: signedUrlError } = await supabaseAdmin.storage
              .from('product-assets')
              .createSignedUrl(tempPath, 300);
            
            if (!signedUrlError && signedUrlData?.signedUrl) {
              // Create one-time download token
              const { error: tokenError } = await supabaseAdmin
                .from('download_tokens')
                .insert({
                  token: downloadToken,
                  user_id: user.id,
                  product_id: productId,
                  order_item_id: orderItemId || userOrder.id,
                  signed_url: signedUrlData.signedUrl,
                  expires_at: expiresAt.toISOString(),
                  temp_file_path: tempPath,
                  creator_ip: clientIp,
                });
                
                if (!tokenError) {
                  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
                  const downloadUrl = `${supabaseUrl}/functions/v1/download-asset?token=${downloadToken}`;
                  
                  return new Response(
                    JSON.stringify({
                      downloadUrl,
                      productName: product.name,
                      fileName,
                      fileSize: watermarkedContent.length,
                      expiresAt: expiresAt.toISOString(),
                      oneTimeUse: true,
                    }),
                    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                  );
                }
              }
            }
          } catch (e) {
          console.error("Watermarking failed, falling back to normal download:", e);
        }
      }
    }

    // === STANDARD (non-Lua) DOWNLOAD FLOW with binary fingerprinting ===
    const watermarkId = generateWatermarkHash(
      user.id,
      ((userOrder as Record<string, unknown>).order_id as string) || userOrder.id,
      productId
    );

    // Try binary fingerprinting for supported file types
    let finalSignedUrl: string | null = null;
    let tempFilePath: string | null = null;

    const fingerprintableExts = ['.rbxm', '.rbxl', '.png', '.jpg', '.jpeg', '.webp', '.zip', '.rar', '.7z'];
    const shouldFingerprint = fingerprintableExts.some(ext => fileExtension.toLowerCase() === ext);

    if (shouldFingerprint) {
      try {
        console.log(`Fingerprinting ${fileExtension} file for user=${user.id}, watermark=${watermarkId}`);
        const { data: fileData, error: dlErr } = await supabaseAdmin.storage
          .from('product-assets')
          .download(assetUrl);

        if (!dlErr && fileData) {
          const originalBytes = new Uint8Array(await fileData.arrayBuffer());
          const fingerprinted = fingerprintBinaryFile(originalBytes, watermarkId, fileExtension);

          const fpToken = generateToken();
          const fpPath = `_watermarked/${user.id}/${fpToken}${fileExtension}`;

          const { error: upErr } = await supabaseAdmin.storage
            .from('product-assets')
            .upload(fpPath, fingerprinted, { contentType: 'application/octet-stream', upsert: true });

          if (!upErr) {
            const { data: fpSigned, error: fpSignErr } = await supabaseAdmin.storage
              .from('product-assets')
              .createSignedUrl(fpPath, 300);

            if (!fpSignErr && fpSigned?.signedUrl) {
              finalSignedUrl = fpSigned.signedUrl;
              tempFilePath = fpPath;
            }
          }
        }
      } catch (e) {
        console.error("Binary fingerprinting failed, falling back:", e);
      }
    }

    // Fallback: use original signed URL if fingerprinting was skipped or failed
    if (!finalSignedUrl) {
      const { data: signedUrlData, error: signedUrlError } = await supabaseAdmin.storage
        .from('product-assets')
        .createSignedUrl(assetUrl, 300);

      if (signedUrlError || !signedUrlData?.signedUrl) {
        console.error("Error creating signed URL:", signedUrlError);
        return new Response(
          JSON.stringify({ error: "Failed to generate download link" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      finalSignedUrl = signedUrlData.signedUrl;
    }

    const downloadToken = generateToken();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    const { error: tokenError } = await supabaseAdmin
      .from('download_tokens')
      .insert({
        token: downloadToken,
        user_id: user.id,
        product_id: productId,
        order_item_id: orderItemId || userOrder.id,
        signed_url: finalSignedUrl,
        expires_at: expiresAt.toISOString(),
        creator_ip: clientIp,
        ...(tempFilePath ? { temp_file_path: tempFilePath } : {}),
      });

    if (tokenError) {
      console.error("Error creating download token:", tokenError);
      return new Response(
        JSON.stringify({ error: "Failed to generate download token" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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

    const sanitizedName = product.name.replace(/[^a-zA-Z0-9-_ ]/g, '').trim();
    const fileSuffix = requestedFileIndex > 0 ? `-file${requestedFileIndex + 1}` : '';
    const fileName = fileExtension ? `${sanitizedName}${fileSuffix}${fileExtension}` : `${sanitizedName}${fileSuffix}`;

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const downloadUrl = `${supabaseUrl}/functions/v1/download-asset?token=${downloadToken}`;

    const totalFiles = (product.asset_file_url ? 1 : 0) + additionalFiles.length;

    return new Response(
      JSON.stringify({ 
        downloadUrl,
        productName: product.name,
        fileName,
        fileSize,
        expiresAt: expiresAt.toISOString(),
        oneTimeUse: true,
        fileIndex: requestedFileIndex,
        totalFiles,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
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

  // Atomically claim the token — use .select() to check if any row was actually updated
  const { data: updatedRows, error: updateError } = await supabaseAdmin
    .from('download_tokens')
    .update({ used_at: new Date().toISOString() })
    .eq('id', tokenData.id)
    .is('used_at', null)
    .select('id');

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

  // If no rows were updated, another request already claimed this token
  if (!updatedRows || updatedRows.length === 0) {
    console.log("Token race condition — already claimed:", token.slice(0, 8));
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

  const clientIp = getClientIp(req);
  console.log(`Token redeemed: ${token.slice(0, 8)}... for product ${tokenData.product_id}, ip=${clientIp}`);

  // Clean up watermarked temp file if one exists
  if (tokenData.temp_file_path) {
    try {
      await supabaseAdmin.storage
        .from('product-assets')
        .remove([tokenData.temp_file_path]);
      console.log(`Cleaned up temp watermark file: ${tokenData.temp_file_path}`);
    } catch (e) {
      console.log("Temp watermark file cleanup failed (non-critical):", e);
    }
  }

  return new Response(null, {
    status: 302,
    headers: {
      ...corsHeaders,
      "Location": tokenData.signed_url,
    },
  });
}
