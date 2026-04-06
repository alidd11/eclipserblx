import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SITE_URL = 'https://eclipserblx.com';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch all active, approved products
    const { data: products } = await supabase
      .from('products')
      .select('product_number, created_at, updated_at')
      .eq('is_active', true)
      .eq('moderation_status', 'approved')
      .order('created_at', { ascending: false })
      .limit(1000);

    // Fetch all active stores
    const { data: stores } = await supabase
      .from('stores')
      .select('slug, updated_at')
      .eq('is_active', true)
      .order('updated_at', { ascending: false })
      .limit(500);

    // Fetch categories
    const { data: categories } = await supabase
      .from('categories')
      .select('slug, name')
      .order('display_order');

    const today = new Date().toISOString().split('T')[0];

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <!-- Static pages -->
  <url><loc>${SITE_URL}/</loc><lastmod>${today}</lastmod><changefreq>daily</changefreq><priority>1.0</priority></url>
  <url><loc>${SITE_URL}/products</loc><lastmod>${today}</lastmod><changefreq>daily</changefreq><priority>0.9</priority></url>
  <url><loc>${SITE_URL}/categories</loc><lastmod>${today}</lastmod><changefreq>weekly</changefreq><priority>0.8</priority></url>
  <url><loc>${SITE_URL}/featured</loc><lastmod>${today}</lastmod><changefreq>daily</changefreq><priority>0.8</priority></url>
  <url><loc>${SITE_URL}/stores</loc><lastmod>${today}</lastmod><changefreq>daily</changefreq><priority>0.7</priority></url>
  <url><loc>${SITE_URL}/sell</loc><lastmod>${today}</lastmod><changefreq>monthly</changefreq><priority>0.6</priority></url>
  <url><loc>${SITE_URL}/changelog</loc><lastmod>${today}</lastmod><changefreq>weekly</changefreq><priority>0.6</priority></url>
  <url><loc>${SITE_URL}/help-center</loc><lastmod>${today}</lastmod><changefreq>weekly</changefreq><priority>0.7</priority></url>
  <url><loc>${SITE_URL}/help-center/buyers</loc><lastmod>${today}</lastmod><changefreq>weekly</changefreq><priority>0.7</priority></url>
  <url><loc>${SITE_URL}/help-center/sellers</loc><lastmod>${today}</lastmod><changefreq>weekly</changefreq><priority>0.7</priority></url>
  <url><loc>${SITE_URL}/faq</loc><lastmod>${today}</lastmod><changefreq>monthly</changefreq><priority>0.5</priority></url>
  <url><loc>${SITE_URL}/contact</loc><lastmod>${today}</lastmod><changefreq>monthly</changefreq><priority>0.5</priority></url>
  <url><loc>${SITE_URL}/support</loc><lastmod>${today}</lastmod><changefreq>monthly</changefreq><priority>0.5</priority></url>
  <url><loc>${SITE_URL}/jobs</loc><lastmod>${today}</lastmod><changefreq>weekly</changefreq><priority>0.6</priority></url>
  <url><loc>${SITE_URL}/advertise</loc><lastmod>${today}</lastmod><changefreq>monthly</changefreq><priority>0.6</priority></url>
  <url><loc>${SITE_URL}/affiliate</loc><lastmod>${today}</lastmod><changefreq>monthly</changefreq><priority>0.6</priority></url>
  <url><loc>${SITE_URL}/terms</loc><lastmod>${today}</lastmod><changefreq>yearly</changefreq><priority>0.3</priority></url>
  <url><loc>${SITE_URL}/privacy</loc><lastmod>${today}</lastmod><changefreq>yearly</changefreq><priority>0.3</priority></url>
  <url><loc>${SITE_URL}/refunds</loc><lastmod>${today}</lastmod><changefreq>yearly</changefreq><priority>0.3</priority></url>
  <url><loc>${SITE_URL}/dmca</loc><lastmod>${today}</lastmod><changefreq>yearly</changefreq><priority>0.3</priority></url>`;

    // Category filter pages — high SEO value for long-tail keywords
    if (categories) {
      for (const cat of categories) {
        xml += `\n  <url><loc>${SITE_URL}/products?category=${cat.slug}</loc><lastmod>${today}</lastmod><changefreq>daily</changefreq><priority>0.7</priority></url>`;
      }
    }

    // Individual product pages
    if (products) {
      for (const p of products) {
        const lastmod = (p.updated_at || p.created_at)?.split('T')[0] || today;
        xml += `\n  <url><loc>${SITE_URL}/products/${(p as any).product_number}</loc><lastmod>${lastmod}</lastmod><changefreq>weekly</changefreq><priority>0.8</priority></url>`;
      }
    }

    // Individual store pages
    if (stores) {
      for (const s of stores) {
        const lastmod = s.updated_at?.split('T')[0] || today;
        xml += `\n  <url><loc>${SITE_URL}/store/${s.slug}</loc><lastmod>${lastmod}</lastmod><changefreq>weekly</changefreq><priority>0.6</priority></url>`;
      }
    }

    xml += '\n</urlset>';

    return new Response(xml, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (err) {
    console.error('Sitemap error:', err);
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>`,
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/xml' } }
    );
  }
});
