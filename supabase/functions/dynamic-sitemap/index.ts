import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import {
  buildSitemap,
  type SitemapCategory,
  type SitemapProduct,
  type SitemapStore,
} from "./sitemap.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PAGE_SIZE = 1000;

function getPublishableKey(): string {
  const publishableKeys = Deno.env.get("SUPABASE_PUBLISHABLE_KEYS");
  if (publishableKeys) {
    try {
      const parsed = JSON.parse(publishableKeys);
      if (typeof parsed?.default === "string" && parsed.default) return parsed.default;
    } catch {
      // Hosted projects that have not migrated to publishable keys still expose
      // the legacy anon key. It remains safe here because RLS is enforced.
    }
  }

  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!anonKey) throw new Error("No Supabase publishable key is configured");
  return anonKey;
}

async function fetchAll<T>(
  createQuery: (from: number, to: number) => PromiseLike<{
    data: T[] | null;
    error: { message: string } | null;
  }>,
): Promise<T[]> {
  const rows: T[] = [];

  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await createQuery(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(error.message);
    const page = data ?? [];
    rows.push(...page);
    if (page.length < PAGE_SIZE) return rows;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "GET" && req.method !== "HEAD") {
    return new Response("Method Not Allowed", {
      status: 405,
      headers: { ...corsHeaders, Allow: "GET, HEAD, OPTIONS" },
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    if (!supabaseUrl) throw new Error("SUPABASE_URL is not configured");

    // A public sitemap should only need public data. Using the publishable/anon
    // key makes RLS part of the contract and avoids bypassing it with a secret.
    const supabase = createClient(supabaseUrl, getPublishableKey(), {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const [products, stores, categories] = await Promise.all([
      fetchAll<SitemapProduct>((from, to) =>
        supabase
          .from("products")
          .select("product_number, created_at, updated_at, stores!inner(status,is_active)")
          .eq("is_active", true)
          .eq("moderation_status", "approved")
          .is("deleted_at", null)
          .eq("stores.status", "approved")
          .eq("stores.is_active", true)
          .not("product_number", "is", null)
          .order("product_number", { ascending: true })
          .range(from, to)
      ),
      fetchAll<SitemapStore>((from, to) =>
        supabase
          .from("stores")
          .select("slug, created_at, updated_at")
          .eq("status", "approved")
          .eq("is_active", true)
          .not("slug", "is", null)
          .order("slug", { ascending: true })
          .range(from, to)
      ),
      fetchAll<SitemapCategory>((from, to) =>
        supabase
          .from("categories")
          .select("slug, created_at, updated_at")
          .not("slug", "is", null)
          .order("display_order", { ascending: true })
          .range(from, to)
      ),
    ]);

    const xml = buildSitemap({
      generatedAt: new Date(),
      products,
      stores,
      categories,
    });

    return new Response(req.method === "HEAD" ? null : xml, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=900, s-maxage=3600, stale-while-revalidate=86400',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (err) {
    console.error('Sitemap error:', err);
    return new Response(
      "Sitemap temporarily unavailable",
      {
        status: 503,
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-store',
          'Retry-After': '300',
        },
      }
    );
  }
});
