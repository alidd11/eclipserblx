import { useState, useCallback } from 'react';

const STORAGE_KEY = 'eclipse_recent_searches';
const MAX_RECENT = 6;

export function useRecentSearches() {
  const [searches, setSearches] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const addSearch = useCallback((query: string) => {
    const trimmed = query.trim();
    if (!trimmed || trimmed.length < 2) return;

    setSearches(prev => {
      const filtered = prev.filter(s => s.toLowerCase() !== trimmed.toLowerCase());
      const updated = [trimmed, ...filtered].slice(0, MAX_RECENT);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)); } catch {}
      return updated;
    });
  }, []);

  const removeSearch = useCallback((query: string) => {
    setSearches(prev => {
      const updated = prev.filter(s => s !== query);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)); } catch {}
      return updated;
    });
  }, []);

  const clearAll = useCallback(() => {
    setSearches([]);
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  }, []);

  return { searches, addSearch, removeSearch, clearAll };
}
