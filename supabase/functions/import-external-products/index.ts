import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ExternalProduct {
  name: string;
  description: string;
  price: number;
  images: string[];
  sourceUrl: string;
  platform: string;
  sellerName?: string;
  suggestedCategoryId?: string;
  alreadyImported?: boolean;
}

interface ScrapeResult {
  success: boolean;
  products: ExternalProduct[];
  sellerName?: string;
  sellerDiscord?: string;
  error?: string;
}

// Category keyword mapping for auto-matching
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'discord-bots': ['bot', 'discord bot', 'moderation', 'music bot', 'utility bot'],
  'scripts': ['script', 'lua', 'roblox script', 'executor', 'admin script'],
  'plugins': ['plugin', 'spigot', 'bukkit', 'paper', 'minecraft plugin'],
  'game-assets': ['asset', 'model', '3d', 'texture', 'ui kit', 'game asset'],
  'websites': ['website', 'web', 'landing page', 'dashboard', 'portfolio'],
  'graphics': ['logo', 'banner', 'thumbnail', 'graphic', 'design'],
};

function suggestCategory(name: string, description: string): string | undefined {
  const text = `${name} ${description}`.toLowerCase();
  
  for (const [slug, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some(kw => text.includes(kw))) {
      return slug;
    }
  }
  return undefined;
}

// Parse ClearlyDev store page
function parseClearlyDevStore(markdown: string, storeUrl: string, links?: string[]): ExternalProduct[] {
  const products: ExternalProduct[] = [];
  const seenUrls = new Set<string>();
  
  // Method 1: Parse markdown for product links
  const productLinkRegex = /\[([^\]]+)\]\((https:\/\/clearlydev\.com\/product\/[^\)]+)\)/g;
  
  let match;
  while ((match = productLinkRegex.exec(markdown)) !== null) {
    const name = match[1].trim();
    const url = match[2];
    
    if (seenUrls.has(url) || name.length < 3 || name.includes('Back')) continue;
    seenUrls.add(url);
    
    const categorySlug = suggestCategory(name, '');
    
    products.push({
      name,
      description: '',
      price: 0,
      images: [],
      sourceUrl: url,
      platform: 'clearlydev',
      suggestedCategoryId: categorySlug,
    });
  }
  
  // Method 2: If no products found from markdown, use links array from Firecrawl
  if (products.length === 0 && links && links.length > 0) {
    console.log(`No products from markdown, checking ${links.length} raw links...`);
    
    for (const link of links) {
      if (!link.includes('clearlydev.com/product/')) continue;
      if (seenUrls.has(link)) continue;
      seenUrls.add(link);
      
      // Extract product name from URL slug
      const slugMatch = link.match(/\/product\/([^\/\?#]+)/);
      const slug = slugMatch ? slugMatch[1] : '';
      const name = slug
        .replace(/-/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase())
        .trim();
      
      if (!name || name.length < 3) continue;
      
      const categorySlug = suggestCategory(name, '');
      
      products.push({
        name,
        description: '',
        price: 0,
        images: [],
        sourceUrl: link.split('?')[0], // Remove query params
        platform: 'clearlydev',
        suggestedCategoryId: categorySlug,
      });
    }
    
    console.log(`Found ${products.length} products from links array`);
  }
  
  return products;
}

// Parse ClearlyDev product page for full details
function parseClearlyDevProduct(markdown: string, url: string): ExternalProduct | null {
  const titleMatch = markdown.match(/^# (.+?)(?:\s*\\|\s*$)/m) || markdown.match(/^## (.+?)(?:\s*\\|\s*$)/m);
  const name = titleMatch ? titleMatch[1].trim() : '';
  
  if (!name) return null;
  
  const imageRegex = /!\[([^\]]*)\]\((https:\/\/files[^\)]+)\)/g;
  const images: string[] = [];
  let imgMatch;
  while ((imgMatch = imageRegex.exec(markdown)) !== null) {
    const imgUrl = imgMatch[2];
    const cleanUrl = imgUrl.includes('plain/') ? imgUrl.split('plain/')[1] : imgUrl;
    if (!images.includes(cleanUrl) && images.length < 4) {
      images.push(cleanUrl);
    }
  }
  
  const priceMatch = markdown.match(/\$(\d+(?:\.\d{2})?)/);
  const price = priceMatch ? parseFloat(priceMatch[1]) : 0;
  
  const descStart = markdown.indexOf('Description');
  const descEnd = markdown.indexOf('## ') > descStart ? markdown.indexOf('## ', descStart + 10) : markdown.length;
  let description = '';
  if (descStart > -1) {
    description = markdown.substring(descStart + 11, descEnd)
      .replace(/!\[.*?\]\([^\)]+\)/g, '')
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
      .slice(0, 2000);
  }
  
  const categorySlug = suggestCategory(name, description);
  
  return {
    name,
    description,
    price,
    images,
    sourceUrl: url,
    platform: 'clearlydev',
    suggestedCategoryId: categorySlug,
  };
}

// Parse BuiltByBit store/member page
function parseBuiltByBitStore(markdown: string, storeUrl: string): ExternalProduct[] {
  const products: ExternalProduct[] = [];
  
  const productLinkRegex = /\[([^\]]+)\]\((https:\/\/builtbybit\.com\/resources\/[^\)]+)\)/g;
  
  let match;
  const seenUrls = new Set<string>();
  
  while ((match = productLinkRegex.exec(markdown)) !== null) {
    const name = match[1].trim();
    const url = match[2];
    
    if (seenUrls.has(url) || name.length < 3 || url.includes('/creators')) continue;
    if (url.match(/\/resources\/[^\/]+\/$/)) continue;
    seenUrls.add(url);
    
    const categorySlug = suggestCategory(name, '');
    
    products.push({
      name,
      description: '',
      price: 0,
      images: [],
      sourceUrl: url,
      platform: 'builtbybit',
      suggestedCategoryId: categorySlug,
    });
  }
  
  return products;
}

// Scrape a single URL using Firecrawl
async function scrapeUrl(url: string, apiKey: string): Promise<{ success: boolean; markdown?: string; links?: string[]; error?: string }> {
  console.log(`Scraping: ${url}`);
  
  const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url,
      formats: ['markdown', 'links'],
      onlyMainContent: false,
      waitFor: 15000,
    }),
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    console.error('Firecrawl error:', data);
    return { success: false, error: data.error || `Failed with status ${response.status}` };
  }
  
  const markdown = data.data?.markdown || data.markdown || '';
  const links = data.data?.links || data.links || [];
  
  console.log(`Scraped ${markdown.length} chars markdown, ${links.length} links`);
  
  return { success: true, markdown, links };
}

// Download image and upload to Supabase storage
async function downloadAndUploadImage(
  imageUrl: string, 
  storeId: string, 
  productSlug: string,
  imageIndex: number,
  supabaseAdmin: ReturnType<typeof createClient>
): Promise<string | null> {
  try {
    console.log(`Downloading image: ${imageUrl}`);
    
    const response = await fetch(imageUrl);
    if (!response.ok) {
      console.error(`Failed to download image: ${response.status}`);
      return null;
    }
    
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const extension = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';
    const blob = await response.blob();
    const arrayBuffer = await blob.arrayBuffer();
    
    const filePath = `${storeId}/${productSlug}-import-${imageIndex}.${extension}`;
    
    const { data, error } = await supabaseAdmin.storage
      .from('product-images')
      .upload(filePath, new Uint8Array(arrayBuffer), {
        contentType,
        upsert: true,
      });
    
    if (error) {
      console.error('Storage upload error:', error);
      return null;
    }
    
    const { data: urlData } = supabaseAdmin.storage
      .from('product-images')
      .getPublicUrl(filePath);
    
    return urlData.publicUrl;
  } catch (err) {
    console.error('Image download error:', err);
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: "Not authenticated" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid authentication" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { action, storeUrl, productUrl, productUrls, platform, downloadImages } = await req.json();

    const firecrawlApiKey = Deno.env.get("FIRECRAWL_API_KEY");
    if (!firecrawlApiKey) {
      console.error("FIRECRAWL_API_KEY not configured");
      return new Response(
        JSON.stringify({ success: false, error: "Import service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('discord_username, discord_id')
      .eq('user_id', user.id)
      .single();

    if (!profile?.discord_username && !profile?.discord_id) {
      return new Response(
        JSON.stringify({ success: false, error: "You must link your Discord account first" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: store } = await supabaseAdmin
      .from('stores')
      .select('id, name, slug')
      .eq('owner_id', user.id)
      .eq('status', 'approved')
      .single();

    if (!store) {
      return new Response(
        JSON.stringify({ success: false, error: "You must have an approved store to import products" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch categories for auto-matching
    const { data: categories } = await supabaseAdmin
      .from('categories')
      .select('id, slug, name');
    
    const categoryMap = new Map(categories?.map(c => [c.slug, c.id]) || []);

    // Action: List products from external store
    if (action === 'list') {
      if (!storeUrl) {
        return new Response(
          JSON.stringify({ success: false, error: "Store URL is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      let detectedPlatform = platform;
      if (!detectedPlatform) {
        if (storeUrl.includes('clearlydev.com')) detectedPlatform = 'clearlydev';
        else if (storeUrl.includes('builtbybit.com')) detectedPlatform = 'builtbybit';
        else {
          return new Response(
            JSON.stringify({ success: false, error: "Unsupported platform. Use ClearlyDev or BuiltByBit URLs." }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      console.log(`Listing products from ${detectedPlatform}: ${storeUrl}`);

      const scrapeResult = await scrapeUrl(storeUrl, firecrawlApiKey);
      if (!scrapeResult.success) {
        return new Response(
          JSON.stringify({ success: false, error: scrapeResult.error || "Failed to scrape store" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      let products: ExternalProduct[] = [];
      if (detectedPlatform === 'clearlydev') {
        products = parseClearlyDevStore(scrapeResult.markdown!, storeUrl, scrapeResult.links);
      } else if (detectedPlatform === 'builtbybit') {
        products = parseBuiltByBitStore(scrapeResult.markdown!, storeUrl);
      }

      // Check for already imported products
      const { data: existingImports } = await supabaseAdmin
        .from('product_imports')
        .select('source_url')
        .eq('store_id', store.id)
        .eq('status', 'completed');
      
      const importedUrls = new Set(existingImports?.map(i => i.source_url) || []);
      
      products = products.map(p => ({
        ...p,
        alreadyImported: importedUrls.has(p.sourceUrl),
        suggestedCategoryId: p.suggestedCategoryId ? categoryMap.get(p.suggestedCategoryId) : undefined,
      }));

      console.log(`Found ${products.length} products`);

      return new Response(
        JSON.stringify({ 
          success: true, 
          products,
          platform: detectedPlatform,
          rawMarkdown: scrapeResult.markdown?.slice(0, 500),
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Action: Fetch full product details
    if (action === 'details') {
      if (!productUrl) {
        return new Response(
          JSON.stringify({ success: false, error: "Product URL is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      let detectedPlatform = platform;
      if (!detectedPlatform) {
        if (productUrl.includes('clearlydev.com')) detectedPlatform = 'clearlydev';
        else if (productUrl.includes('builtbybit.com')) detectedPlatform = 'builtbybit';
      }

      console.log(`Fetching product details from ${detectedPlatform}: ${productUrl}`);

      const scrapeResult = await scrapeUrl(productUrl, firecrawlApiKey);
      if (!scrapeResult.success) {
        return new Response(
          JSON.stringify({ success: false, error: scrapeResult.error || "Failed to scrape product" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      let product: ExternalProduct | null = null;
      if (detectedPlatform === 'clearlydev') {
        product = parseClearlyDevProduct(scrapeResult.markdown!, productUrl);
      }

      if (!product) {
        return new Response(
          JSON.stringify({ success: false, error: "Could not parse product details" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Download and re-upload images if requested
      if (downloadImages && product.images.length > 0) {
        console.log(`Downloading ${product.images.length} images...`);
        const productSlug = product.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 30);
        const uploadedImages: string[] = [];
        
        for (let i = 0; i < product.images.length; i++) {
          const uploadedUrl = await downloadAndUploadImage(
            product.images[i],
            store.id,
            productSlug,
            i,
            supabaseAdmin
          );
          if (uploadedUrl) {
            uploadedImages.push(uploadedUrl);
          }
        }
        
        product.images = uploadedImages.length > 0 ? uploadedImages : product.images;
      }

      // Add suggested category ID
      product.suggestedCategoryId = product.suggestedCategoryId 
        ? categoryMap.get(product.suggestedCategoryId) 
        : undefined;

      // Record the import
      await supabaseAdmin
        .from('product_imports')
        .insert({
          store_id: store.id,
          source_url: productUrl,
          source_platform: detectedPlatform || 'unknown',
          source_name: product.name,
          source_price: product.price,
          imported_by: user.id,
          status: 'completed',
          metadata: { images_downloaded: downloadImages, image_count: product.images.length },
        });

      return new Response(
        JSON.stringify({ success: true, product }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Action: Bulk import multiple products
    if (action === 'bulk-details') {
      if (!productUrls || !Array.isArray(productUrls) || productUrls.length === 0) {
        return new Response(
          JSON.stringify({ success: false, error: "Product URLs array is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`Bulk importing ${productUrls.length} products...`);
      
      const results: { url: string; success: boolean; product?: ExternalProduct; error?: string }[] = [];
      
      for (const url of productUrls.slice(0, 50)) { // Limit to 50 at a time
        let detectedPlatform = platform;
        if (!detectedPlatform) {
          if (url.includes('clearlydev.com')) detectedPlatform = 'clearlydev';
          else if (url.includes('builtbybit.com')) detectedPlatform = 'builtbybit';
        }

        const scrapeResult = await scrapeUrl(url, firecrawlApiKey);
        if (!scrapeResult.success) {
          results.push({ url, success: false, error: scrapeResult.error });
          await supabaseAdmin.from('product_imports').insert({
            store_id: store.id,
            source_url: url,
            source_platform: detectedPlatform || 'unknown',
            source_name: 'Unknown',
            imported_by: user.id,
            status: 'failed',
            error_message: scrapeResult.error,
          });
          continue;
        }

        let product: ExternalProduct | null = null;
        if (detectedPlatform === 'clearlydev') {
          product = parseClearlyDevProduct(scrapeResult.markdown!, url);
        }

        if (!product) {
          results.push({ url, success: false, error: "Could not parse product" });
          await supabaseAdmin.from('product_imports').insert({
            store_id: store.id,
            source_url: url,
            source_platform: detectedPlatform || 'unknown',
            source_name: 'Unknown',
            imported_by: user.id,
            status: 'failed',
            error_message: 'Could not parse product details',
          });
          continue;
        }

        // Download images if requested
        if (downloadImages && product.images.length > 0) {
          const productSlug = product.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 30);
          const uploadedImages: string[] = [];
          
          for (let i = 0; i < Math.min(product.images.length, 4); i++) {
            const uploadedUrl = await downloadAndUploadImage(
              product.images[i],
              store.id,
              productSlug,
              i,
              supabaseAdmin
            );
            if (uploadedUrl) {
              uploadedImages.push(uploadedUrl);
            }
          }
          
          if (uploadedImages.length > 0) {
            product.images = uploadedImages;
          }
        }

        product.suggestedCategoryId = product.suggestedCategoryId 
          ? categoryMap.get(product.suggestedCategoryId) 
          : undefined;

        await supabaseAdmin.from('product_imports').insert({
          store_id: store.id,
          source_url: url,
          source_platform: detectedPlatform || 'unknown',
          source_name: product.name,
          source_price: product.price,
          imported_by: user.id,
          status: 'completed',
          metadata: { images_downloaded: downloadImages, image_count: product.images.length },
        });

        results.push({ url, success: true, product });
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          results,
          imported: results.filter(r => r.success).length,
          failed: results.filter(r => !r.success).length,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Action: Get import history
    if (action === 'history') {
      const { data: imports, error: historyError } = await supabaseAdmin
        .from('product_imports')
        .select('*')
        .eq('store_id', store.id)
        .order('imported_at', { ascending: false })
        .limit(50);

      if (historyError) {
        return new Response(
          JSON.stringify({ success: false, error: historyError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, imports }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Import error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
