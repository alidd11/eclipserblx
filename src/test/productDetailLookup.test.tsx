import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Track how the query chain is built so we can assert numeric vs slug lookup.
const eqCalls: Array<[string, unknown]> = [];

vi.mock('@/integrations/supabase/client', () => {
  const chain: any = {
    select: vi.fn(() => chain),
    eq: vi.fn((col: string, val: unknown) => {
      eqCalls.push([col, val]);
      return chain;
    }),
    or: vi.fn(() => chain),
    maybeSingle: vi.fn(async () => ({ data: null, error: null })),
  };
  return {
    supabase: {
      from: vi.fn(() => chain),
    },
  };
});

// Avoid pulling the real storeColumns module network path (harmless import).
import { usePublicProduct } from '@/hooks/usePublicProduct';
import { usePrefetchProduct } from '@/hooks/usePrefetchProduct';

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return React.createElement(QueryClientProvider, { client }, children);
}

beforeEach(() => {
  eqCalls.length = 0;
});

describe('product detail lookup routing', () => {
  it('uses numeric product_number for numeric identifiers', async () => {
    renderHook(() => usePublicProduct('1234'), { wrapper });
    await waitFor(() => {
      expect(eqCalls.some(([c, v]) => c === 'product_number' && v === 1234)).toBe(true);
    });
    expect(eqCalls.some(([c, v]) => c === 'product_number' && Number.isNaN(v as number))).toBe(false);
  });

  it('uses slug lookup for non-numeric identifiers (never NaN)', async () => {
    renderHook(() => usePublicProduct('my-cool-asset'), { wrapper });
    await waitFor(() => {
      expect(eqCalls.some(([c, v]) => c === 'slug' && v === 'my-cool-asset')).toBe(true);
    });
    expect(eqCalls.some(([c]) => c === 'product_number')).toBe(false);
  });

  it('uses UUID id lookup for UUID identifiers', async () => {
    const uuid = '550e8400-e29b-41d4-a716-446655440000';
    renderHook(() => usePublicProduct(uuid), { wrapper });
    await waitFor(() => {
      expect(eqCalls.some(([c, v]) => c === 'id' && v === uuid)).toBe(true);
    });
    expect(eqCalls.some(([c]) => c === 'product_number')).toBe(false);
  });
});

describe('usePrefetchProduct', () => {
  it('never issues product_number=NaN for slug identifiers', async () => {
    const { result } = renderHook(() => usePrefetchProduct(), { wrapper });
    result.current('some-slug-value');
    await waitFor(() => {
      expect(eqCalls.some(([c, v]) => c === 'slug' && v === 'some-slug-value')).toBe(true);
    });
    expect(eqCalls.some(([c, v]) => c === 'product_number' && Number.isNaN(v as number))).toBe(false);
  });

  it('uses product_number for numeric identifiers', async () => {
    const { result } = renderHook(() => usePrefetchProduct(), { wrapper });
    result.current(42);
    await waitFor(() => {
      expect(eqCalls.some(([c, v]) => c === 'product_number' && v === 42)).toBe(true);
    });
  });

  it('is a no-op for empty/undefined identifiers', () => {
    const { result } = renderHook(() => usePrefetchProduct(), { wrapper });
    result.current('');
    result.current(undefined);
    result.current(null);
    expect(eqCalls.length).toBe(0);
  });
});
