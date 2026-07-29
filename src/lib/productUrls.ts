export const ECLIPSE_SITE_ORIGIN = 'https://eclipserblx.com';

function encodeProductIdentifier(identifier: string | number): string {
  const value = String(identifier).trim();
  if (!value) throw new Error('A product identifier is required');
  return encodeURIComponent(value);
}

export function buildProductPath(identifier: string | number): string {
  return `/products/${encodeProductIdentifier(identifier)}`;
}

/** Canonical URL used for navigation, indexing, and product metadata. */
export function buildProductUrl(identifier: string | number): string {
  return `${ECLIPSE_SITE_ORIGIN}${buildProductPath(identifier)}`;
}

/**
 * URL for explicit copy/share actions. Uses the canonical product URL: it serves
 * the product-specific Open Graph preview directly to social crawlers via the
 * Cloudflare Worker (HTTP 200), with no redirect hop. The `share.eclipserblx.com`
 * subdomain only 302-redirects to this same page, so the canonical is the reliable
 * one for rich previews.
 */
export function buildProductShareUrl(identifier: string | number): string {
  return buildProductUrl(identifier);
}
