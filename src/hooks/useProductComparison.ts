import { useState, useCallback } from 'react';
import { safeStorage } from '@/lib/safeStorage';

const STORAGE_KEY = 'eclipse_comparison';
const MAX_COMPARE = 3;

export interface CompareProduct {
  id: string;
  name: string;
  slug: string;
  price: number;
  image?: string;
  category?: string;
}

export function useProductComparison() {
  const [products, setProducts] = useState<CompareProduct[]>(() => {
    try {
      const saved = safeStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const persist = useCallback((items: CompareProduct[]) => {
    safeStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, []);

  const addToCompare = useCallback((product: CompareProduct) => {
    setProducts(prev => {
      if (prev.length >= MAX_COMPARE) return prev;
      if (prev.some(p => p.id === product.id)) return prev;
      const next = [...prev, product];
      persist(next);
      return next;
    });
  }, [persist]);

  const removeFromCompare = useCallback((id: string) => {
    setProducts(prev => {
      const next = prev.filter(p => p.id !== id);
      persist(next);
      return next;
    });
  }, [persist]);

  const clearComparison = useCallback(() => {
    setProducts([]);
    persist([]);
  }, [persist]);

  const isInComparison = useCallback((id: string) => {
    return products.some(p => p.id === id);
  }, [products]);

  return {
    compareProducts: products,
    addToCompare,
    removeFromCompare,
    clearComparison,
    isInComparison,
    canAddMore: products.length < MAX_COMPARE,
    compareCount: products.length,
  };
}
