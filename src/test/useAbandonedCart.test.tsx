import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';

// --- Mock supabase client with call tracking -----------------------------
const calls: Array<{ op: string; table?: string; payload?: unknown; filters: Record<string, unknown> }> = [];
let existingActiveRow: { id: string } | null = null;

function makeChain(op: string, table: string, payload?: unknown) {
  const entry = { op, table, payload, filters: {} as Record<string, unknown> };
  calls.push(entry);
  const chain: any = {
    eq: (col: string, val: unknown) => { entry.filters[col] = val; return chain; },
    order: () => chain,
    limit: () => chain,
    select: () => chain,
    single: async () => ({ data: null, error: null }),
    maybeSingle: async () => ({ data: op === 'select' ? existingActiveRow : null, error: null }),
    then: (resolve: (v: any) => void) => resolve({ data: null, error: null }),
  };
  return chain;
}

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (table: string) => ({
      select: () => makeChain('select', table),
      insert: (payload: unknown) => makeChain('insert', table, payload),
      update: (payload: unknown) => makeChain('update', table, payload),
      upsert: (payload: unknown) => makeChain('upsert', table, payload),
      delete: () => makeChain('delete', table),
    }),
  },
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}));

let cartState = { items: [{ id: 'p1' }] as any[], total: 10 };
vi.mock('@/hooks/useCart', () => ({
  useCart: () => cartState,
}));

import { useAbandonedCart } from '@/hooks/useAbandonedCart';

beforeEach(() => {
  calls.length = 0;
  existingActiveRow = null;
  cartState = { items: [{ id: 'p1' }], total: 10 };
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

async function flushSaveTimer() {
  await act(async () => {
    vi.advanceTimersByTime(5001);
    // Let awaited supabase promises resolve.
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe('useAbandonedCart persistence', () => {
  it('never issues an upsert with onConflict on user_id', async () => {
    renderHook(() => useAbandonedCart());
    await flushSaveTimer();
    expect(calls.some((c) => c.op === 'upsert')).toBe(false);
  });

  it('inserts a new active row when no active cart exists for the user', async () => {
    existingActiveRow = null;
    renderHook(() => useAbandonedCart());
    await flushSaveTimer();
    const insert = calls.find((c) => c.op === 'insert' && c.table === 'abandoned_carts');
    expect(insert).toBeDefined();
    expect(insert!.payload).toMatchObject({ user_id: 'user-1', recovered: false, total: 10 });
  });

  it('updates the existing active row instead of inserting a duplicate', async () => {
    existingActiveRow = { id: 'row-abc' };
    renderHook(() => useAbandonedCart());
    await flushSaveTimer();
    expect(calls.some((c) => c.op === 'insert')).toBe(false);
    const update = calls.find((c) => c.op === 'update' && c.table === 'abandoned_carts');
    expect(update).toBeDefined();
    expect(update!.filters).toMatchObject({ id: 'row-abc' });
  });

  it('does not attempt to persist a save when the cart is empty', async () => {
    cartState = { items: [], total: 0 };
    renderHook(() => useAbandonedCart());
    await flushSaveTimer();
    // The recovery-check select may run; ensure no write ops fire.
    expect(calls.some((c) => c.op === 'insert' || c.op === 'update' || c.op === 'upsert')).toBe(false);
  });
});
