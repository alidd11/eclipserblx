import { describe, expect, it } from 'vitest';
import { safeInternalPath } from '@/lib/safeNavigation';

describe('safeInternalPath', () => {
  it('keeps normal application paths, queries, and hashes', () => {
    expect(safeInternalPath('/products/57?tab=details#reviews')).toBe('/products/57?tab=details#reviews');
  });

  it.each([
    'https://evil.example/path',
    '//evil.example/path',
    '/\\evil.example/path',
    '/%5cevil.example/path',
    'javascript:alert(1)',
    '/safe\u0000path',
  ])('rejects unsafe navigation value %s', (value) => {
    expect(safeInternalPath(value, '/account')).toBe('/account');
  });
});
