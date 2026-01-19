import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

interface SearchCommandContextType {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
}

const SearchCommandContext = createContext<SearchCommandContextType | undefined>(undefined);

export function SearchCommandProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  const toggle = useCallback(() => {
    setOpen((prev) => !prev);
  }, []);

  // Keyboard shortcut: Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        toggle();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [toggle]);

  return (
    <SearchCommandContext.Provider value={{ open, setOpen, toggle }}>
      {children}
    </SearchCommandContext.Provider>
  );
}

export function useSearchCommand() {
  const context = useContext(SearchCommandContext);
  if (!context) {
    throw new Error('useSearchCommand must be used within SearchCommandProvider');
  }
  return context;
}
