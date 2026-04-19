/**
 * Platform readiness facts — fetched once per session from
 * `verify-platform-readiness` edge function and cached in module scope.
 *
 * Lets the roadmap probe runner verify "is STRIPE_SECRET_KEY actually set?"
 * without ever exposing the value to the client.
 */
import { supabase } from '@/integrations/supabase/client';

export type ReadinessFacts = Record<string, boolean | string>;

let cache: ReadinessFacts | null = null;
let inflight: Promise<ReadinessFacts | null> | null = null;

const FUNCTION_NAME = 'verify-platform-readiness';

export function invalidateReadinessFacts(): void {
  cache = null;
  inflight = null;
}

export async function fetchReadinessFacts(): Promise<ReadinessFacts | null> {
  if (cache) return cache;
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const { data, error } = await supabase.functions.invoke(FUNCTION_NAME, { body: {} });
      if (error || !data) return null;
      cache = data as ReadinessFacts;
      return cache;
    } catch {
      return null;
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

export function getReadinessFact(name: string): boolean | undefined {
  const v = cache?.[name];
  return typeof v === 'boolean' ? v : undefined;
}

export function readinessFactsReady(): boolean {
  return cache !== null;
}
