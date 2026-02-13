import { Search } from 'lucide-react';
import { useSearchCommand } from '@/hooks/useSearchCommand';
import { hapticTap } from '@/lib/haptics';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

interface HeaderSearchBarProps {
  className?: string;
  compact?: boolean;
}

export function HeaderSearchBar({ className, compact = false }: HeaderSearchBarProps) {
  const searchCommand = useSearchCommand();
  const { t } = useTranslation();

  return (
    <button
      onClick={() => {
        hapticTap();
        searchCommand?.toggle();
      }}
      className={cn(
        "flex items-center gap-2 w-full h-10 px-3 rounded-xl",
        "bg-muted/50 border border-border hover:border-primary/50",
        "text-muted-foreground hover:text-foreground",
        "transition-all duration-200 cursor-text",
        "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background",
        compact && [
          "h-8 px-3 rounded-md",
          "bg-muted",
          "border-border hover:border-primary/40",
          "active:scale-[0.98]",
        ],
        className
      )}
    >
      <Search className={cn(
        "shrink-0 transition-colors",
        compact ? "h-3.5 w-3.5 text-muted-foreground/70" : "h-4 w-4"
      )} />
      <span className={cn(
        "flex-1 text-left truncate",
        compact ? "text-xs text-muted-foreground/70" : "text-sm"
      )}>
        {compact ? t('common.search') + "..." : t('search.placeholder')}
      </span>
      {!compact && (
        <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border border-border bg-background px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
          <span className="text-xs">⌘</span>K
        </kbd>
      )}
    </button>
  );
}
