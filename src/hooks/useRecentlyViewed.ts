import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'eclipse_recently_viewed';
const MAX_ITEMS = 12;

interface RecentProduct {
  id: string;
  slug: string;
  name: string;
  image?: string;
  price: number;
  viewedAt: number;
}

export function useRecentlyViewed() {
  const [items, setItems] = useState<RecentProduct[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {
      // Ignore corrupt data
    }
  }, []);

  const addProduct = useCallback((product: Omit<RecentProduct, 'viewedAt'>) => {
    setItems(prev => {
      const filtered = prev.filter(p => p.id !== product.id);
      const updated = [{ ...product, viewedAt: Date.now() }, ...filtered].slice(0, MAX_ITEMS);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // Storage full
      }
      return updated;
    });
  }, []);

  const getRecent = useCallback((excludeId?: string, limit = 6) => {
    return items.filter(p => p.id !== excludeId).slice(0, limit);
  }, [items]);

  return { recentlyViewed: items, addProduct, getRecent };
}
