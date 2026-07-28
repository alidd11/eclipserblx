export const ECLIPSE_SITE_ORIGIN = 'https://eclipserblx.com';

function encodeProductIdentifier(identifier: string | number): string {
  const value = String(identifier).trim();
  if (!value) throw new Error('A product identifier is required');
  return encodeURIComponent(value);
}

export function buildProductPath(identifier: string | number): string {
  return `/products/${encodeProductIdentifier(identifier)}`;
}

/**
 * Canonical URL used for navigation, indexing, product metadata, AND sharing.
 * Copy/paste of this URL produces the rich Open Graph preview directly: the
 * Cloudflare Worker (docs/cloudflare-worker-og.js) detects social crawlers on
 * `/products/{id}` and serves product-specific OG tags from the og-proxy edge
 * function, while real browsers get the normal SPA. No separate share URL or
 * `share.` subdomain is needed.
 */
export function buildProductUrl(identifier: string | number): string {
  return `${ECLIPSE_SITE_ORIGIN}${buildProductPath(identifier)}`;
}
