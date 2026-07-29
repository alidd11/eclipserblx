/**
 * Pure, side-effect-free helpers for the /retrieve download flow.
 *
 * These are deliberately kept in their own module (no discord.js / supabase / config
 * imports) so they can be unit-tested without booting the bot — importing the command
 * module would run config.js env validation and exit the process.
 */

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Split an array into fixed-size batches (for chunked `.in(...)` queries). */
export function chunk(arr, size = 50) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
  return chunks;
}

/**
 * Build a clean, human-friendly download filename from the product name + the
 * original file's extension (e.g. "Police Cruiser" + ".rbxm" → "police cruiser.rbxm").
 */
export function assetFilename(product) {
  const base = (product?.asset_file_url || '').split('/').pop() || '';
  const dot = base.lastIndexOf('.');
  const ext = dot > -1 ? base.slice(dot) : '';
  const safe = (product?.name || 'download').replace(/[^\w.\- ]+/g, '').trim().slice(0, 80) || 'download';
  return safe.toLowerCase().endsWith(ext.toLowerCase()) && ext ? safe : `${safe}${ext}`;
}

/**
 * From a set of order_items rows, return the unique, valid product UUIDs. Guards
 * against nulls, non-strings, and non-UUID junk before they reach an `.in(...)` query.
 */
export function extractProductIds(orderItems) {
  return [...new Set(
    (orderItems || [])
      .map(i => i && i.product_id)
      .filter(v => typeof v === 'string' && UUID_RE.test(v)),
  )];
}

/**
 * Fuzzy-match a purchased product against a customer's free-text search term.
 * Matches on substring (either direction) or a shared significant word (>3 chars).
 * Returns the matched product or null.
 */
export function matchProduct(products, searchTerm) {
  const term = (searchTerm || '').toLowerCase().trim();
  if (!term || !Array.isArray(products)) return null;
  return products.find(p => {
    const name = (p?.name || '').toLowerCase();
    if (!name) return false;
    return (
      name.includes(term) ||
      term.includes(name) ||
      name.split(' ').some(w => w.length > 3 && term.includes(w))
    );
  }) || null;
}
