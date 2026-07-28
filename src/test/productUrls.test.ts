import { describe, expect, it } from 'vitest';
import {
  buildProductPath,
  buildProductUrl,
} from '@/lib/productUrls';

describe('product URL helpers', () => {
  it('keeps canonical product navigation on the main domain', () => {
    expect(buildProductUrl(57)).toBe('https://eclipserblx.com/products/57');
  });

  it('shares the canonical product URL (no separate share domain)', () => {
    // Copy/paste of this URL is what produces the rich OG preview via the
    // Cloudflare Worker; there is no share.eclipserblx.com URL.
    expect(buildProductUrl(57)).toBe('https://eclipserblx.com/products/57');
  });

  it('safely encodes slug identifiers', () => {
    expect(buildProductPath('vehicle pack')).toBe('/products/vehicle%20pack');
  });

  it('rejects empty identifiers', () => {
    expect(() => buildProductUrl('  ')).toThrow('A product identifier is required');
  });
});
