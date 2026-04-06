import { Search, X, ChevronUp, ChevronDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import type { ChatMessage } from './chatHelpers';

interface MessageSearchBarProps {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  searchResults: ChatMessage[];
  onClose: () => void;
  onNavigateToMessage: (messageId: string) => void;
}

export function MessageSearchBar({
  searchQuery,
  setSearchQuery,
  searchResults,
  onClose,
  onNavigateToMessage,
}: MessageSearchBarProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleNav = (dir: 'up' | 'down') => {
    if (searchResults.length === 0) return;
    const next = dir === 'down'
      ? (currentIndex + 1) % searchResults.length
      : (currentIndex - 1 + searchResults.length) % searchResults.length;
    setCurrentIndex(next);
    onNavigateToMessage(searchResults[next].id);
  };

  return (
    <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-muted/30">
      <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      <Input
        value={searchQuery}
        onChange={(e) => { setSearchQuery(e.target.value); setCurrentIndex(0); }}
        placeholder="Search messages…"
        className="flex-1 h-8 text-sm border-0 bg-transparent focus-visible:ring-0 px-0"
        autoFocus
      />
      {searchQuery && (
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {searchResults.length > 0 ? `${currentIndex + 1}/${searchResults.length}` : 'No results'}
        </span>
      )}
      <div className="flex items-center gap-0.5">
        <Button variant="ghost" size="icon" aria-label="Navigate up" className="h-7 w-7" onClick={() => handleNav('up')} disabled={searchResults.length === 0}>
          <ChevronUp className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="icon" aria-label="Navigate down" className="h-7 w-7" onClick={() => handleNav('down')} disabled={searchResults.length === 0}>
          <ChevronDown className="h-3.5 w-3.5" />
        </Button>
      </div>
      <Button variant="ghost" size="icon" aria-label="Close" className="h-7 w-7" onClick={onClose}>
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
