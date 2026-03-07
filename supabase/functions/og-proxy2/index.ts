import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SITE_URL = 'https://eclipserblx.com';
const DEFAULT_OG_IMAGE = 'https://storage.googleapis.com/gpt-engineer-file-uploads/6XoLGVy9Aseup6dIxodIWS9uGsS2/social-images/social-1770521924890-IMG_4300.png';
const SITE_NAME = 'Eclipse';

interface PageMeta {
  title: string;
  description: string;
  image: string;
  url: string;
}

async function getProductMeta(slug: string, supabase: ReturnType<typeof createClient>): Promise<PageMeta | null> {
  const { data } = await supabase
    .from('products')
    .select('name, description, images, price, slug, stores(name, slug)')
    .eq('slug', slug)
    .eq('is_active', true)
    .single();

  if (!data) return null;

  const storeName = (data.stores as any)?.name;
  const rawDesc = data.description
    ? data.description.replace(/<[^>]*>/g, '').slice(0, 155)
    : `Buy ${data.name} on Eclipse marketplace`;
  const desc = storeName ? `By ${storeName} — ${rawDesc}` : rawDesc;
  const priceTag = data.price != null ? ` · £${Number(data.price).toFixed(2)}` : '';

  return {
    title: `${data.name}${priceTag} | ${SITE_NAME}`,
    description: desc,
    image: data.images?.[0] || DEFAULT_OG_IMAGE,
    url: `${SITE_URL}/products/${data.slug}`,
  };
}

async function getStoreMeta(slug: string, supabase: ReturnType<typeof createClient>): Promise<PageMeta | null> {
  const { data } = await supabase
    .from('stores')
    .select('name, description, logo_url, slug')
    .eq('slug', slug)
    .eq('is_active', true)
    .single();

  if (!data) return null;

  return {
    title: `${data.name} | ${SITE_NAME}`,
    description: data.description?.slice(0, 155) || `${data.name} on Eclipse marketplace`,
    image: data.logo_url || DEFAULT_OG_IMAGE,
    url: `${SITE_URL}/store/${data.slug}`,
  };
}

function buildHtml(meta: PageMeta): string {
  const escape = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${escape(meta.title)}</title>
  <meta name="description" content="${escape(meta.description)}">
  <meta property="og:type" content="website">
  <meta property="og:title" content="${escape(meta.title)}">
  <meta property="og:description" content="${escape(meta.description)}">
  <meta property="og:image" content="${escape(meta.image)}">
  <meta property="og:url" content="${escape(meta.url)}">
  <meta property="og:site_name" content="${SITE_NAME}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escape(meta.title)}">
  <meta name="twitter:description" content="${escape(meta.description)}">
  <meta name="twitter:image" content="${escape(meta.image)}">
  <meta name="twitter:site" content="@EclipseRblx">
  <link rel="canonical" href="${escape(meta.url)}">
  <meta http-equiv="refresh" content="0;url=${escape(meta.url)}">
</head>
<body><p>Redirecting to <a href="${escape(meta.url)}">${escape(meta.title)}</a>...</p></body>
</html>`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const path = url.searchParams.get('path') || '/';

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let meta: PageMeta | null = null;

    // Match /products/:slug
    const productMatch = path.match(/^\/products\/([^/?]+)$/);
    if (productMatch) {
      meta = await getProductMeta(productMatch[1], supabase);
    }

    // Match /store/:slug
    const storeMatch = path.match(/^\/store\/([^/?]+)$/);
    if (storeMatch) {
      meta = await getStoreMeta(storeMatch[1], supabase);
    }

    // Fallback — covers static pages and unknown paths
    if (!meta) {
      const staticMeta: Record<string, Partial<PageMeta>> = {
        '/': { title: 'Eclipse — Roblox Asset Marketplace', description: 'Premium UK Roleplay Assets marketplace for Roblox. Lower fees, instant delivery.' },
        '/products': { title: 'Browse Products | Eclipse', description: 'Browse premium Roblox scripts, vehicles, maps and game assets on Eclipse marketplace.' },
        '/stores': { title: 'All Stores | Eclipse', description: 'Discover trusted stores selling Roblox assets on Eclipse.' },
        '/categories': { title: 'Categories | Eclipse', description: 'Browse Roblox assets by category — vehicles, scripts, maps, bots and more.' },
        '/featured': { title: 'Featured Products | Eclipse', description: 'Hand-picked premium Roblox assets on Eclipse marketplace.' },
        '/eclipse-plus': { title: 'Eclipse+ Membership | Eclipse', description: 'Get exclusive discounts, free claims, and premium perks with Eclipse+ membership.' },
        '/faq': { title: 'FAQ | Eclipse', description: 'Frequently asked questions about buying, selling, and using Eclipse marketplace.' },
        '/help-center': { title: 'Help Center | Eclipse', description: 'Get help with purchases, downloads, payments, refunds, and account security.' },
        '/sell': { title: 'Start Selling | Eclipse', description: 'Open your store on Eclipse marketplace. Lower fees, instant payouts, growing community.' },
        '/contact': { title: 'Contact Us | Eclipse', description: 'Get in touch with the Eclipse team for support, partnerships, or feedback.' },
        '/affiliate': { title: 'Affiliate Programme | Eclipse', description: 'Earn commission by referring new users to Eclipse marketplace.' },
        '/advertise': { title: 'Advertise | Eclipse', description: 'Promote your Roblox products to thousands of active buyers on Eclipse.' },
        '/jobs': { title: 'Careers | Eclipse', description: 'Join the Eclipse team. View open positions and apply today.' },
      };

      const staticPage = staticMeta[path];
      meta = {
        title: staticPage?.title || `Eclipse — Roblox Asset Marketplace`,
        description: staticPage?.description || 'Premium Roblox asset marketplace with lower fees and instant delivery.',
        image: DEFAULT_OG_IMAGE,
        url: `${SITE_URL}${path}`,
      };
    }

    return new Response(buildHtml(meta), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (err) {
    console.error('OG proxy error:', err);
    return new Response('Error', { status: 500, headers: corsHeaders });
  }
});
