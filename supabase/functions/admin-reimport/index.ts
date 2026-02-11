import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ExternalProduct {
  name: string;
  description: string;
  price: number;
  images: string[];
  sourceUrl: string;
}

async function scrapeUrl(url: string, apiKey: string) {
  const response = await fetch("https://api.firecrawl.dev/v1/scrape", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      url,
      formats: ["markdown"],
      waitFor: 15000,
      timeout: 30000,
    }),
  });
  const data = await response.json();
  if (!data.success) return { success: false, error: data.error };
  return { success: true, markdown: data.data?.markdown || "" };
}

function parseClearlyDevProduct(markdown: string, url: string): ExternalProduct | null {
  const lines = markdown.split('\n');

  // Extract name from page title or headings
  let name = '';
  const titleMatch = markdown.match(/^#\s+(.+)/m);
  if (titleMatch) {
    name = titleMatch[1].replace(/\s*[-|].*$/, '').trim();
  }
  if (!name) {
    for (const line of lines) {
      const h = line.match(/^#{1,3}\s+(.+)/);
      if (h) {
        const t = h[1].trim();
        if (!/clearlydev|store|home|product/i.test(t) && t.length > 3) {
          name = t;
          break;
        }
      }
    }
  }
  if (!name) {
    const slugMatch = url.match(/\/product\/([^\/\?#]+)/);
    if (slugMatch) {
      name = slugMatch[1].replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()).trim();
    }
  }
  if (!name) return null;

  // Extract ALL images (no cap)
  const imageRegex = /!\[([^\]]*)\]\((https?:\/\/[^\)]+)\)/g;
  const images: string[] = [];
  const skipImagePatterns = /\/(avatar|profile|favicon|logo|icon|clearlydev-logo|clearlydev_logo|brand)\b/i;
  const skipImageDomains = /\b(rbxcdn\.com|roblox\.com|tr\.rbxcdn\.com|thumbs\.roblox\.com)\b/i;
  let imgMatch;
  while ((imgMatch = imageRegex.exec(markdown)) !== null) {
    const imgUrl = imgMatch[2];
    if (skipImagePatterns.test(imgUrl)) continue;
    if (skipImageDomains.test(imgUrl)) continue;
    if (!images.includes(imgUrl)) {
      images.push(imgUrl);
    }
  }

  const priceMatch = markdown.match(/\$(\d+(?:\.\d{2})?)/);
  const price = priceMatch ? parseFloat(priceMatch[1]) : 0;

  return { name, description: '', price, images, sourceUrl: url };
}

async function downloadAndUploadImage(
  imageUrl: string,
  storeId: string,
  productSlug: string,
  index: number,
  supabaseAdmin: any
): Promise<string | null> {
  try {
    const response = await fetch(imageUrl, { redirect: 'follow' });
    if (!response.ok) return null;

    const finalUrl = response.url || imageUrl;
    if (/\b(rbxcdn\.com|roblox\.com)\b/i.test(finalUrl)) return null;

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    if (!contentType.startsWith('image/') && !contentType.startsWith('video/')) return null;

    const arrayBuffer = await response.arrayBuffer();
    if (arrayBuffer.byteLength < 1000) return null;

    const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : contentType.includes('gif') ? 'gif' : contentType.includes('video') ? 'mp4' : 'jpg';
    const timestamp = Date.now();
    const filePath = `${storeId}/${productSlug}-${index}-${timestamp}.${ext}`;

    const { data, error } = await supabaseAdmin.storage
      .from('product-images')
      .upload(filePath, new Uint8Array(arrayBuffer), { contentType, upsert: true });

    if (error) { console.error('Upload error:', error); return null; }

    const { data: urlData } = supabaseAdmin.storage
      .from('product-images')
      .getPublicUrl(filePath);

    return urlData?.publicUrl || null;
  } catch (e) {
    console.error('Image download error:', e);
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { storeId, productUrls, downloadImages } = body;

    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const firecrawlApiKey = Deno.env.get("FIRECRAWL_API_KEY");
    if (!firecrawlApiKey) {
      return new Response(JSON.stringify({ error: "FIRECRAWL_API_KEY not set" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      serviceRoleKey
    );

    const results: any[] = [];

    for (const url of productUrls) {
      try {
        console.log(`Scraping: ${url}`);
        const scrapeResult = await scrapeUrl(url, firecrawlApiKey);
        if (!scrapeResult.success) {
          results.push({ url, success: false, error: scrapeResult.error });
          continue;
        }

        const product = parseClearlyDevProduct(scrapeResult.markdown!, url);
        if (!product) {
          results.push({ url, success: false, error: "Could not parse product" });
          continue;
        }

        console.log(`Found: ${product.name} with ${product.images.length} images`);

        // Download images
        if (downloadImages && product.images.length > 0) {
          const productSlug = product.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 30);
          const uploadedImages: string[] = [];
          for (let i = 0; i < product.images.length; i++) {
            const uploaded = await downloadAndUploadImage(product.images[i], storeId, productSlug, i, supabaseAdmin);
            if (uploaded) uploadedImages.push(uploaded);
          }
          if (uploadedImages.length > 0) product.images = uploadedImages;
        }

        // Check if product already exists (by source URL in slug or name)
        const slug = product.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
        
        // Try to find existing product to update
        const { data: existing } = await supabaseAdmin
          .from('products')
          .select('id')
          .eq('store_id', storeId)
          .eq('slug', slug)
          .maybeSingle();

        if (existing) {
          // Update images on existing product
          await supabaseAdmin
            .from('products')
            .update({ images: product.images, is_active: true, deleted_at: null })
            .eq('id', existing.id);
          results.push({ url, success: true, name: product.name, imageCount: product.images.length, action: 'updated' });
        } else {
          // Insert new product
          const { data: newProduct, error: insertError } = await supabaseAdmin
            .from('products')
            .insert({
              name: product.name,
              slug,
              description: product.description || null,
              price: product.price || 0,
              images: product.images,
              store_id: storeId,
              is_seller_product: true,
              is_active: true,
            })
            .select('id')
            .single();

          if (insertError) {
            results.push({ url, success: false, error: insertError.message });
          } else {
            results.push({ url, success: true, name: product.name, imageCount: product.images.length, action: 'created', id: newProduct.id });
          }
        }

        // Record import
        await supabaseAdmin.from('product_imports').insert({
          store_id: storeId,
          source_url: url,
          source_platform: 'clearlydev',
          source_name: product.name,
          source_price: product.price,
          imported_by: 'admin-reimport',
          status: 'completed',
          metadata: { image_count: product.images.length, reimport: true },
        });

      } catch (e) {
        results.push({ url, success: false, error: String(e) });
      }
    }

    return new Response(
      JSON.stringify({ success: true, results, total: results.length, succeeded: results.filter(r => r.success).length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: corsHeaders });
  }
});
