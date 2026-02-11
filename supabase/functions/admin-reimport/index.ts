import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function scrapeUrl(url: string, apiKey: string) {
  const response = await fetch("https://api.firecrawl.dev/v1/scrape", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ url, formats: ["markdown"], waitFor: 15000, timeout: 30000 }),
  });
  const data = await response.json();
  if (!data.success) return { success: false, error: data.error };
  return { success: true, markdown: data.data?.markdown || data.markdown || "" };
}

function parseClearlyDevProduct(markdown: string, url: string) {
  // Strategy 1: Page title line "Product Name | ClearlyDev Marketplace"
  let name = '';
  const titleLine = markdown.split('\n')[0];
  if (titleLine) {
    const titleMatch = titleLine.match(/^(.+?)\s*[|\\\|]\s*ClearlyDev/i);
    if (titleMatch) {
      name = titleMatch[1].trim();
    }
  }

  // Strategy 2: ## heading that isn't generic
  if (!name) {
    const headingMatch = markdown.match(/^##\s+(.+)/m);
    if (headingMatch) {
      const t = headingMatch[1].trim();
      if (!/clearlydev|store|home|hi,?\s*there|refund|instant|standard/i.test(t) && t.length > 3) {
        name = t;
      }
    }
  }

  // Strategy 3: URL slug
  if (!name) {
    const slugMatch = url.match(/\/product\/([^\/\?#]+)/);
    if (slugMatch) {
      name = slugMatch[1].replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()).trim();
    }
  }

  if (!name) return null;

  // Extract ALL images
  const imageRegex = /!\[([^\]]*)\]\((https?:\/\/[^\)]+)\)/g;
  const images: string[] = [];
  const skipPatterns = /\/(avatar|profile|favicon|logo|icon|clearlydev-logo|clearlydev_logo|brand)\b/i;
  const skipDomains = /\b(rbxcdn\.com|roblox\.com|tr\.rbxcdn\.com|thumbs\.roblox\.com)\b/i;
  let m;
  while ((m = imageRegex.exec(markdown)) !== null) {
    const imgUrl = m[2];
    if (skipPatterns.test(imgUrl)) continue;
    if (skipDomains.test(imgUrl)) continue;
    if (imgUrl.includes('placeholder.png')) continue;
    if (!images.includes(imgUrl)) images.push(imgUrl);
  }

  const priceMatch = markdown.match(/\$(\d+(?:\.\d{2})?)/);
  const price = priceMatch ? parseFloat(priceMatch[1]) : 0;

  return { name, price, images, sourceUrl: url };
}

async function downloadAndUploadImage(imageUrl: string, storeId: string, productSlug: string, index: number, supabaseAdmin: any): Promise<string | null> {
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
    const filePath = `${storeId}/${productSlug}-${index}-${Date.now()}.${ext}`;
    const { error } = await supabaseAdmin.storage.from('product-images').upload(filePath, new Uint8Array(arrayBuffer), { contentType, upsert: true });
    if (error) { console.error('Upload error:', error); return null; }
    const { data: urlData } = supabaseAdmin.storage.from('product-images').getPublicUrl(filePath);
    return urlData?.publicUrl || null;
  } catch (e) { console.error('Image download error:', e); return null; }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { storeId, productUrls, downloadImages } = body;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const firecrawlApiKey = Deno.env.get("FIRECRAWL_API_KEY");
    if (!firecrawlApiKey) return new Response(JSON.stringify({ error: "No API key" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabaseAdmin = createClient(Deno.env.get("SUPABASE_URL") ?? "", serviceRoleKey);
    const results: any[] = [];

    for (const url of productUrls) {
      try {
        console.log(`Scraping: ${url}`);
        const scrapeResult = await scrapeUrl(url, firecrawlApiKey);
        if (!scrapeResult.success) { results.push({ url, success: false, error: scrapeResult.error }); continue; }

        const product = parseClearlyDevProduct(scrapeResult.markdown!, url);
        if (!product) { results.push({ url, success: false, error: "Could not parse" }); continue; }

        console.log(`Found: ${product.name} with ${product.images.length} images`);

        // Download images if requested
        let finalImages = product.images;
        if (downloadImages && product.images.length > 0) {
          const productSlug = product.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 30);
          const uploaded: string[] = [];
          for (let i = 0; i < product.images.length; i++) {
            const u = await downloadAndUploadImage(product.images[i], storeId, productSlug, i, supabaseAdmin);
            if (u) uploaded.push(u);
          }
          if (uploaded.length > 0) finalImages = uploaded;
        }

        // Find existing product by URL slug match
        const urlSlug = url.match(/\/product\/([^\/\?#]+)/)?.[1] || '';
        const productSlug = product.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
        
        // Try multiple ways to find existing product
        const { data: existingBySlug } = await supabaseAdmin
          .from('products')
          .select('id, slug')
          .eq('store_id', storeId)
          .or(`slug.eq.${urlSlug},slug.eq.${productSlug}`)
          .limit(1)
          .maybeSingle();

        if (existingBySlug) {
          await supabaseAdmin.from('products').update({ images: finalImages, is_active: true, deleted_at: null }).eq('id', existingBySlug.id);
          results.push({ url, success: true, name: product.name, imageCount: finalImages.length, action: 'updated', id: existingBySlug.id });
        } else {
          // Check by name
          const { data: existingByName } = await supabaseAdmin
            .from('products')
            .select('id')
            .eq('store_id', storeId)
            .eq('name', product.name)
            .limit(1)
            .maybeSingle();

          if (existingByName) {
            await supabaseAdmin.from('products').update({ images: finalImages, is_active: true, deleted_at: null }).eq('id', existingByName.id);
            results.push({ url, success: true, name: product.name, imageCount: finalImages.length, action: 'updated', id: existingByName.id });
          } else {
            const { data: newP, error: insertErr } = await supabaseAdmin.from('products').insert({
              name: product.name, slug: productSlug, price: product.price || 0,
              images: finalImages, store_id: storeId, is_seller_product: true, is_active: true,
            }).select('id').single();
            if (insertErr) { results.push({ url, success: false, error: insertErr.message }); }
            else { results.push({ url, success: true, name: product.name, imageCount: finalImages.length, action: 'created', id: newP.id }); }
          }
        }

        // Record import
        await supabaseAdmin.from('product_imports').insert({
          store_id: storeId, source_url: url, source_platform: 'clearlydev',
          source_name: product.name, source_price: product.price,
          imported_by: 'admin-reimport', status: 'completed',
          metadata: { image_count: finalImages.length, reimport: true },
        });
      } catch (e) { results.push({ url, success: false, error: String(e) }); }
    }

    return new Response(
      JSON.stringify({ success: true, results, total: results.length, succeeded: results.filter(r => r.success).length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
