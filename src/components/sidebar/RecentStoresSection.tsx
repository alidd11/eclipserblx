import { Link } from 'react-router-dom';
import { Store, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { hapticTap } from '@/lib/haptics';

interface RecentStore {
  slug: string;
  name: string;
  logoUrl?: string | null;
  accentColor?: string;
  visitedAt: number;
}

interface RecentStoresSectionProps {
  stores: RecentStore[];
  collapsed: boolean;
  onNavigate?: () => void;
}

export function RecentStoresSection({ stores, collapsed, onNavigate }: RecentStoresSectionProps) {
  if (stores.length === 0) return null;

  const handleClick = () => {
    hapticTap();
    onNavigate?.();
  };

  if (collapsed) {
    return (
      <div className="mb-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              className={cn(
                "w-full flex items-center justify-center py-2.5 rounded-lg select-none",
                "transition-all duration-100 active:scale-[0.97] active:opacity-90",
                "focus:outline-none focus-visible:outline-none",
                "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <Clock className="h-4 w-4 stroke-[1.5]" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" className="p-0">
            <div className="py-2">
              <div className="px-3 pb-1 text-xs font-semibold text-muted-foreground">
                Recent Stores
              </div>
              {stores.map((store) => (
                <Link
                  key={store.slug}
                  to={`/store/${store.slug}`}
                  onClick={handleClick}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm transition-colors hover:bg-muted"
                >
                  {store.logoUrl ? (
                    <img 
                      src={store.logoUrl} 
                      alt="" 
                      className="h-4 w-4 rounded-full object-cover"
                    />
                  ) : (
                    <Store 
                      className="h-4 w-4" 
                      style={{ color: store.accentColor || 'currentColor' }} 
                    />
                  )}
                  <span className="truncate">{store.name}</span>
                </Link>
              ))}
            </div>
          </TooltipContent>
        </Tooltip>
      </div>
    );
  }

  return (
    <div className="mb-1">
      <div className="flex items-center gap-3 px-3 py-2">
        <Clock className="h-4 w-4 text-muted-foreground stroke-[1.5]" />
        <span className="flex-1 text-left truncate text-xs uppercase tracking-wider text-muted-foreground">
          Recent Stores
        </span>
      </div>
      <div className="space-y-0.5">
        {stores.map((store) => (
          <Link
            key={store.slug}
            to={`/store/${store.slug}`}
            onClick={handleClick}
            className={cn(
              "rounded-lg text-sm font-medium select-none",
              "transition-all duration-100 active:scale-[0.97] active:opacity-90",
              "flex flex-row flex-nowrap items-center gap-3 px-3 py-2 ml-4",
              "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            {store.logoUrl ? (
              <img 
                src={store.logoUrl} 
                alt="" 
                className="h-4 w-4 sm:h-[1.125rem] sm:w-[1.125rem] rounded-full object-cover shrink-0"
              />
            ) : (
              <Store 
                className="h-4 w-4 sm:h-[1.125rem] sm:w-[1.125rem] shrink-0" 
                style={{ color: store.accentColor || 'currentColor' }} 
              />
            )}
            <span className="truncate leading-none">{store.name}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
