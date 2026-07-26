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
 * Share URL used only by explicit copy/share actions.
 * Humans are redirected to the canonical product page while social crawlers
 * receive the product-specific Open Graph document.
 */
export function buildProductShareUrl(identifier: string | number): string {
  return `${ECLIPSE_SHARE_ORIGIN}${buildProductPath(identifier)}`;
}
