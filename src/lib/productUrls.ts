export const ECLIPSE_SITE_ORIGIN = 'https://eclipserblx.com';
export const ECLIPSE_SHARE_ORIGIN = 'https://share.eclipserblx.com';

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
 * Reliable rich-preview URL for explicit copy/share actions. Humans are
 * redirected to the canonical page; social crawlers receive product metadata.
 */
export function buildProductShareUrl(identifier: string | number): string {
  return `${ECLIPSE_SHARE_ORIGIN}${buildProductPath(identifier)}`;
}
