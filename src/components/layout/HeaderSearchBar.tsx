import { Search } from 'lucide-react';
import { useSearchCommand } from '@/hooks/useSearchCommand';
import { hapticTap } from '@/lib/haptics';
import { cn } from '@/lib/utils';

interface HeaderSearchBarProps {
  className?: string;
}

export function HeaderSearchBar({ className }: HeaderSearchBarProps) {
  const searchCommand = useSearchCommand();

  return (
    <button
      onClick={() => {
        hapticTap();
        searchCommand?.toggle();
      }}
      className={cn(
        "flex items-center gap-3 w-full max-w-md h-10 px-4 rounded-xl",
        "bg-muted/50 border border-border hover:border-primary/50",
        "text-muted-foreground hover:text-foreground",
        "transition-all duration-200 cursor-text",
        "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background",
        className
      )}
    >
      <Search className="h-4 w-4 shrink-0" />
      <span className="text-sm flex-1 text-left">Search products, categories...</span>
      <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border border-border bg-background px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
        <span className="text-xs">⌘</span>K
      </kbd>
    </button>
  );
}
