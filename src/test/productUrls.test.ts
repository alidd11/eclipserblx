import { describe, expect, it } from 'vitest';
import {
  buildProductPath,
  buildProductShareUrl,
  buildProductUrl,
} from '@/lib/productUrls';

describe('product URL helpers', () => {
  it('keeps canonical product navigation on the main domain', () => {
    expect(buildProductUrl(57)).toBe('https://eclipserblx.com/products/57');
  });

  it('builds explicit share URLs on the branded preview domain', () => {
    expect(buildProductShareUrl(57)).toBe('https://share.eclipserblx.com/products/57');
  });

  it('safely encodes slug identifiers', () => {
    expect(buildProductPath('vehicle pack')).toBe('/products/vehicle%20pack');
  });

  it('rejects empty identifiers', () => {
    expect(() => buildProductShareUrl('  ')).toThrow('A product identifier is required');
  });
});
