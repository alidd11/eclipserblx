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
}

interface ScrapeResult {
  success: boolean;
  products: ExternalProduct[];
  sellerName?: string;
  sellerDiscord?: string;
  error?: string;
}

// Parse ClearlyDev store page
function parseClearlyDevStore(markdown: string, storeUrl: string): ExternalProduct[] {
  const products: ExternalProduct[] = [];
  
  // ClearlyDev product links follow pattern: /product/slug
  const productLinkRegex = /\[([^\]]+)\]\((https:\/\/clearlydev\.com\/product\/[^\)]+)\)/g;
  const priceRegex = /\$(\d+(?:\.\d{2})?)/g;
  
  let match;
  const seenUrls = new Set<string>();
  
  while ((match = productLinkRegex.exec(markdown)) !== null) {
    const name = match[1].trim();
    const url = match[2];
    
    // Skip duplicates and navigation links
    if (seenUrls.has(url) || name.length < 3 || name.includes('Back')) continue;
    seenUrls.add(url);
    
    products.push({
      name,
      description: '',
      price: 0,
      images: [],
      sourceUrl: url,
      platform: 'clearlydev',
    });
  }
  
  return products;
}

// Parse ClearlyDev product page for full details
function parseClearlyDevProduct(markdown: string, url: string): ExternalProduct | null {
  // Extract title from first heading
  const titleMatch = markdown.match(/^# (.+?)(?:\s*\\|\s*$)/m) || markdown.match(/^## (.+?)(?:\s*\\|\s*$)/m);
  const name = titleMatch ? titleMatch[1].trim() : '';
  
  if (!name) return null;
  
  // Extract images
  const imageRegex = /!\[([^\]]*)\]\((https:\/\/files[^\)]+)\)/g;
  const images: string[] = [];
  let imgMatch;
  while ((imgMatch = imageRegex.exec(markdown)) !== null) {
    const imgUrl = imgMatch[2];
    // Get clean image URL (remove proxy wrapper if present)
    const cleanUrl = imgUrl.includes('plain/') ? imgUrl.split('plain/')[1] : imgUrl;
    if (!images.includes(cleanUrl) && images.length < 4) {
      images.push(cleanUrl);
    }
  }
  
  // Extract price
  const priceMatch = markdown.match(/\$(\d+(?:\.\d{2})?)/);
  const price = priceMatch ? parseFloat(priceMatch[1]) : 0;
  
  // Extract description (content between first image and store info)
  const descStart = markdown.indexOf('Description');
  const descEnd = markdown.indexOf('## ') > descStart ? markdown.indexOf('## ', descStart + 10) : markdown.length;
  let description = '';
  if (descStart > -1) {
    description = markdown.substring(descStart + 11, descEnd)
      .replace(/!\[.*?\]\([^\)]+\)/g, '') // Remove images
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1') // Convert links to text
      .replace(/\n{3,}/g, '\n\n') // Normalize newlines
      .trim()
      .slice(0, 2000); // Limit description length
  }
  
  return {
    name,
    description,
    price,
    images,
    sourceUrl: url,
    platform: 'clearlydev',
  };
}

// Parse BuiltByBit store/member page
function parseBuiltByBitStore(markdown: string, storeUrl: string): ExternalProduct[] {
  const products: ExternalProduct[] = [];
  
  // BuiltByBit product links follow pattern: /resources/slug.id/
  const productLinkRegex = /\[([^\]]+)\]\((https:\/\/builtbybit\.com\/resources\/[^\)]+)\)/g;
  
  let match;
  const seenUrls = new Set<string>();
  
  while ((match = productLinkRegex.exec(markdown)) !== null) {
    const name = match[1].trim();
    const url = match[2];
    
    // Skip duplicates, navigation links, and category links
    if (seenUrls.has(url) || name.length < 3 || url.includes('/creators')) continue;
    if (url.match(/\/resources\/[^\/]+\/$/)) continue; // Skip category pages
    seenUrls.add(url);
    
    products.push({
      name,
      description: '',
      price: 0,
      images: [],
      sourceUrl: url,
      platform: 'builtbybit',
    });
  }
  
  return products;
}

// Scrape a single URL using Firecrawl
async function scrapeUrl(url: string, apiKey: string): Promise<{ success: boolean; markdown?: string; error?: string }> {
  console.log(`Scraping: ${url}`);
  
  const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url,
      formats: ['markdown'],
      onlyMainContent: false,
      waitFor: 2000,
    }),
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    console.error('Firecrawl error:', data);
    return { success: false, error: data.error || `Failed with status ${response.status}` };
  }
  
  return { 
    success: true, 
    markdown: data.data?.markdown || data.markdown || '' 
  };
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

    // Verify authentication
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

    const { action, storeUrl, productUrl, platform } = await req.json();

    const firecrawlApiKey = Deno.env.get("FIRECRAWL_API_KEY");
    if (!firecrawlApiKey) {
      console.error("FIRECRAWL_API_KEY not configured");
      return new Response(
        JSON.stringify({ success: false, error: "Import service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Admin client for database operations
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get user's profile to check Discord username
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

    // Get user's store
    const { data: store } = await supabaseAdmin
      .from('stores')
      .select('id, name')
      .eq('owner_id', user.id)
      .eq('status', 'approved')
      .single();

    if (!store) {
      return new Response(
        JSON.stringify({ success: false, error: "You must have an approved store to import products" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Action: List products from external store
    if (action === 'list') {
      if (!storeUrl) {
        return new Response(
          JSON.stringify({ success: false, error: "Store URL is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Determine platform from URL
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

      // Scrape the store page
      const scrapeResult = await scrapeUrl(storeUrl, firecrawlApiKey);
      if (!scrapeResult.success) {
        return new Response(
          JSON.stringify({ success: false, error: scrapeResult.error || "Failed to scrape store" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Parse products based on platform
      let products: ExternalProduct[] = [];
      if (detectedPlatform === 'clearlydev') {
        products = parseClearlyDevStore(scrapeResult.markdown!, storeUrl);
      } else if (detectedPlatform === 'builtbybit') {
        products = parseBuiltByBitStore(scrapeResult.markdown!, storeUrl);
      }

      console.log(`Found ${products.length} products`);

      return new Response(
        JSON.stringify({ 
          success: true, 
          products,
          platform: detectedPlatform,
          rawMarkdown: scrapeResult.markdown?.slice(0, 500), // Debug preview
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

      // Determine platform
      let detectedPlatform = platform;
      if (!detectedPlatform) {
        if (productUrl.includes('clearlydev.com')) detectedPlatform = 'clearlydev';
        else if (productUrl.includes('builtbybit.com')) detectedPlatform = 'builtbybit';
      }

      console.log(`Fetching product details from ${detectedPlatform}: ${productUrl}`);

      // Scrape the product page
      const scrapeResult = await scrapeUrl(productUrl, firecrawlApiKey);
      if (!scrapeResult.success) {
        return new Response(
          JSON.stringify({ success: false, error: scrapeResult.error || "Failed to scrape product" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Parse product details
      let product: ExternalProduct | null = null;
      if (detectedPlatform === 'clearlydev') {
        product = parseClearlyDevProduct(scrapeResult.markdown!, productUrl);
      }
      // Add BuiltByBit parser when needed

      if (!product) {
        return new Response(
          JSON.stringify({ success: false, error: "Could not parse product details" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, product }),
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
