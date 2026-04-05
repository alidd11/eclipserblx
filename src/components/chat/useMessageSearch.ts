import { useState, useMemo } from 'react';
import type { ChatMessage } from './chatHelpers';

export function useMessageSearch(messages: ChatMessage[]) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return messages.filter(m =>
      m.message?.toLowerCase().includes(q)
    );
  }, [messages, searchQuery]);

  const toggleSearch = () => {
    setIsSearchOpen(prev => !prev);
    if (isSearchOpen) setSearchQuery('');
  };

  return {
    searchQuery,
    setSearchQuery,
    isSearchOpen,
    toggleSearch,
    searchResults,
  };
}
