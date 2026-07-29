# SEO discovery deployment

This change keeps the existing Lovable custom domain and Cloudflare social-preview
host intact. It does not attach a Worker route to `eclipserblx.com`.

## Canonical URL decision

The sitemap lists `https://eclipserblx.com/products/{product_number}` and
`https://eclipserblx.com/store/{slug}` as the canonical URLs.

`share.eclipserblx.com` is intentionally not listed. It is a crawler-friendly
sharing transport which points back to the root product URL; listing both would
send conflicting canonical signals and waste crawl budget.

## Deployment and submission order

1. Deploy `og-proxy` and verify:
   - a live approved product returns `200`, unique title/description,
     `Product` and `BreadcrumbList` JSON-LD, and a root-domain canonical;
   - an inactive, deleted, rejected, or unknown product returns `404` plus
     `X-Robots-Tag: noindex, nofollow`;
   - an inactive, suspended, rejected, or unknown store returns the same
     crawler-safe `404`.
2. Deploy `dynamic-sitemap` with JWT verification disabled. It uses only the
   hosted publishable key (or legacy anon key) and public RLS policies; it does
   not need or read the service-role key.
3. Request the Edge Function directly and verify a `200` XML response containing
   only approved active stores and approved active non-deleted products. Check
   that product `lastmod` values match their real update dates.
4. Publish the application build so `public/_redirects` serves the function at
   `/sitemap.xml`. Do not replace the existing `robots.txt` sitemap location.
5. Verify the public endpoint with `GET` and `HEAD`, validate the XML, and confirm
   an intentionally unsupported method returns `405`.
6. In Google Search Console, remove the stale sitemap submission if it points to
   a different URL, then submit `https://eclipserblx.com/sitemap.xml`.
7. Use URL Inspection on the home page, product catalogue, two representative
   product URLs, and one approved store URL. Request indexing only after the live
   test shows the intended canonical and rendered content.

## Platform limitation

Lovable serves the root site as a client-rendered application through
Cloudflare for SaaS. The initial HTML for a root product URL is therefore still
the generic application shell. Google can render JavaScript, but indexing may be
slower and less reliable than server-rendered or pre-rendered product HTML.

The branded share Worker solves social unfurling and the `og-proxy` function
provides correct metadata and structured data, but neither can make the root
Lovable response server-rendered. A permanent solution requires Lovable to add
per-route server rendering/prerendering, or moving the public catalogue/product
routes to a host that supports it. Client-side meta tag updates alone do not
remove this limitation.

## Growth threshold

A single sitemap is valid up to 50,000 URLs. The generator rejects output above
that limit instead of publishing invalid XML. Before the catalogue approaches
that size, split products, stores, categories, and static routes into separate
sitemaps and expose a sitemap index at the existing root URL.
