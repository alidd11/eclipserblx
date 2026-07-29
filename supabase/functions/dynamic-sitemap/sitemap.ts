export const SITE_URL = "https://eclipserblx.com";
export const MAX_URLS = 50_000;

export const STATIC_ROUTES = [
  { path: "/", changefreq: "daily", priority: "1.0" },
  { path: "/products", changefreq: "daily", priority: "0.9" },
  { path: "/featured", changefreq: "daily", priority: "0.8" },
  { path: "/categories", changefreq: "weekly", priority: "0.8" },
  { path: "/free", changefreq: "weekly", priority: "0.7" },
  { path: "/stores", changefreq: "daily", priority: "0.8" },
  { path: "/sell", changefreq: "monthly", priority: "0.7" },
  { path: "/affiliate", changefreq: "monthly", priority: "0.6" },
  { path: "/faq", changefreq: "monthly", priority: "0.6" },
  { path: "/help-center", changefreq: "weekly", priority: "0.7" },
  { path: "/help-center/buyers", changefreq: "weekly", priority: "0.6" },
  { path: "/help-center/sellers", changefreq: "weekly", priority: "0.6" },
  { path: "/support", changefreq: "monthly", priority: "0.5" },
  { path: "/contact", changefreq: "monthly", priority: "0.5" },
  { path: "/jobs", changefreq: "weekly", priority: "0.6" },
  { path: "/advertise", changefreq: "monthly", priority: "0.6" },
  { path: "/status", changefreq: "daily", priority: "0.4" },
  { path: "/security", changefreq: "monthly", priority: "0.4" },
  { path: "/brand", changefreq: "monthly", priority: "0.4" },
  { path: "/changelog", changefreq: "weekly", priority: "0.4" },
  { path: "/terms", changefreq: "yearly", priority: "0.3" },
  { path: "/privacy", changefreq: "yearly", priority: "0.3" },
  { path: "/refunds", changefreq: "yearly", priority: "0.3" },
  { path: "/dmca", changefreq: "yearly", priority: "0.3" },
] as const;

export interface SitemapProduct {
  product_number: number | string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface SitemapStore {
  slug: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface SitemapCategory {
  slug: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

interface SitemapInput {
  generatedAt: Date;
  products: SitemapProduct[];
  stores: SitemapStore[];
  categories: SitemapCategory[];
}

export function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function toDateOnly(value: string | null | undefined, fallback: string): string {
  if (!value) return fallback;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed.toISOString().slice(0, 10);
}

function urlEntry(
  url: string,
  lastmod: string | null,
  changefreq: string,
  priority: string,
): string {
  return [
    "  <url>",
    `    <loc>${escapeXml(url)}</loc>`,
    ...(lastmod ? [`    <lastmod>${lastmod}</lastmod>`] : []),
    `    <changefreq>${changefreq}</changefreq>`,
    `    <priority>${priority}</priority>`,
    "  </url>",
  ].join("\n");
}

export function buildSitemap({
  generatedAt,
  products,
  stores,
  categories,
}: SitemapInput): string {
  const today = generatedAt.toISOString().slice(0, 10);
  const entries: string[] = STATIC_ROUTES.map(({ path, changefreq, priority }) =>
    // Without a source-of-truth content timestamp, omitting lastmod is more
    // accurate than marking every static page as changed on every invocation.
    urlEntry(`${SITE_URL}${path}`, null, changefreq, priority)
  );

  // Category filters are canonical application routes. Encode dynamic slugs and
  // XML-escape the query separator so the document remains standards-compliant.
  for (const category of categories) {
    if (!category.slug) continue;
    entries.push(
      urlEntry(
        `${SITE_URL}/products?category=${encodeURIComponent(category.slug)}`,
        toDateOnly(category.updated_at || category.created_at, today),
        "daily",
        "0.7",
      ),
    );
  }

  for (const product of products) {
    const number = String(product.product_number ?? "");
    if (!/^\d+$/.test(number)) continue;
    entries.push(
      urlEntry(
        `${SITE_URL}/products/${number}`,
        toDateOnly(product.updated_at || product.created_at, today),
        "weekly",
        "0.8",
      ),
    );
  }

  for (const store of stores) {
    if (!store.slug) continue;
    entries.push(
      urlEntry(
        `${SITE_URL}/store/${encodeURIComponent(store.slug)}`,
        toDateOnly(store.updated_at || store.created_at, today),
        "weekly",
        "0.6",
      ),
    );
  }

  if (entries.length > MAX_URLS) {
    throw new Error(`Sitemap URL count ${entries.length} exceeds the ${MAX_URLS} URL limit`);
  }

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...entries,
    "</urlset>",
  ].join("\n");
}
