import { useState, useEffect, useCallback } from 'react';
import { safeStorage } from '@/lib/safeStorage';

interface RecentStore {
  slug: string;
  name: string;
  logoUrl?: string | null;
  accentColor?: string;
  visitedAt: number;
}

const STORAGE_KEY = 'recent-stores';
const MAX_STORES = 5;
const EXPIRY_DAYS = 7;

export function useRecentStores() {
  const [recentStores, setRecentStores] = useState<RecentStore[]>([]);

  // Load from localStorage on mount
  useEffect(() => {
    const stored = safeStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as RecentStore[];
        const now = Date.now();
        const expiryMs = EXPIRY_DAYS * 24 * 60 * 60 * 1000;
        
        // Filter out expired stores
        const valid = parsed.filter(store => now - store.visitedAt < expiryMs);
        setRecentStores(valid);
        
        // Update storage if we removed any expired stores
        if (valid.length !== parsed.length) {
          safeStorage.setItem(STORAGE_KEY, JSON.stringify(valid));
        }
      } catch {
        setRecentStores([]);
      }
    }
  }, []);

  // Record a store visit
  const recordVisit = useCallback((store: {
    slug: string;
    name: string;
    logoUrl?: string | null;
    accentColor?: string;
  }) => {
    setRecentStores(prev => {
      // Remove existing entry for this store
      const filtered = prev.filter(s => s.slug !== store.slug);
      
      // Add new entry at the beginning
      const updated: RecentStore[] = [
        {
          slug: store.slug,
          name: store.name,
          logoUrl: store.logoUrl,
          accentColor: store.accentColor,
          visitedAt: Date.now(),
        },
        ...filtered,
      ].slice(0, MAX_STORES);
      
      // Persist to localStorage
      safeStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      
      return updated;
    });
  }, []);

  // Clear all recent stores
  const clearRecentStores = useCallback(() => {
    setRecentStores([]);
    safeStorage.removeItem(STORAGE_KEY);
  }, []);

  return {
    recentStores,
    recordVisit,
    clearRecentStores,
  };
}
