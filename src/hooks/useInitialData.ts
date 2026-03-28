import { useRef } from 'react';

interface InitialData {
  products?: any[];
  categories?: any[];
  route: string;
  ts: number;
}

declare global {
  interface Window {
    __INITIAL_DATA__?: InitialData;
  }
}

const MAX_AGE_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Returns pre-fetched data injected by Cloudflare Worker, if available and fresh.
 * Consumes the data on first read so it's only used once.
 */
export function useInitialData<T extends keyof Omit<InitialData, 'route' | 'ts'>>(
  key: T,
  expectedRoute: string
): InitialData[T] | undefined {
  const consumed = useRef(false);

  if (consumed.current) return undefined;

  const data = window.__INITIAL_DATA__;
  if (!data) return undefined;
  if (data.route !== expectedRoute) return undefined;
  if (Date.now() - data.ts > MAX_AGE_MS) {
    delete window.__INITIAL_DATA__;
    return undefined;
  }

  consumed.current = true;
  const value = data[key];
  // Clean up after consumption
  delete window.__INITIAL_DATA__;
  return value;
}
