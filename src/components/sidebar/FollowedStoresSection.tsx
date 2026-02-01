import { Link } from 'react-router-dom';
import { Store, Heart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { hapticTap } from '@/lib/haptics';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface FollowedStore {
  id: string;
  slug: string;
  name: string;
  logo_url?: string | null;
  accent_color?: string | null;
}

interface FollowedStoresSectionProps {
  userId: string;
  collapsed: boolean;
  onNavigate?: () => void;
}

export function FollowedStoresSection({ userId, collapsed, onNavigate }: FollowedStoresSectionProps) {
  const { data: followedStores = [] } = useQuery({
    queryKey: ['followed-stores-sidebar', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('store_follows')
        .select(`
          store_id,
          stores:store_id (
            id,
            slug,
            name,
            logo_url,
            accent_color
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      
      return (data || [])
        .map(f => f.stores as unknown as FollowedStore)
        .filter(Boolean);
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  if (followedStores.length === 0) return null;

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
              <Heart className="h-4 w-4 stroke-[1.5]" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" className="p-0">
            <div className="py-2">
              <div className="px-3 pb-1 text-xs font-semibold text-muted-foreground">
                Following
              </div>
              {followedStores.map((store) => (
                <Link
                  key={store.id}
                  to={`/store/${store.slug}`}
                  onClick={handleClick}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm transition-colors hover:bg-muted"
                >
                  {store.logo_url ? (
                    <img 
                      src={store.logo_url} 
                      alt="" 
                      className="h-4 w-4 rounded-full object-cover"
                    />
                  ) : (
                    <Store 
                      className="h-4 w-4" 
                      style={{ color: store.accent_color || 'currentColor' }} 
                    />
                  )}
                  <span className="truncate">{store.name}</span>
                </Link>
              ))}
              <Link
                to="/wishlist?tab=stores"
                onClick={handleClick}
                className="flex items-center gap-2 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                View all →
              </Link>
            </div>
          </TooltipContent>
        </Tooltip>
      </div>
    );
  }

  return (
    <div className="mb-1">
      <div className="flex items-center gap-3 px-3 py-2">
        <Heart className="h-4 w-4 text-muted-foreground stroke-[1.5]" />
        <span className="flex-1 text-left truncate text-xs uppercase tracking-wider text-muted-foreground">
          Following
        </span>
      </div>
      <div className="space-y-0.5">
        {followedStores.map((store) => (
          <Link
            key={store.id}
            to={`/store/${store.slug}`}
            onClick={handleClick}
            className={cn(
              "rounded-lg text-sm font-medium select-none",
              "transition-all duration-100 active:scale-[0.97] active:opacity-90",
              "flex flex-row flex-nowrap items-center gap-3 px-3 py-2 ml-4",
              "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            {store.logo_url ? (
              <img 
                src={store.logo_url} 
                alt="" 
                className="h-4 w-4 sm:h-[1.125rem] sm:w-[1.125rem] rounded-full object-cover shrink-0"
              />
            ) : (
              <Store 
                className="h-4 w-4 sm:h-[1.125rem] sm:w-[1.125rem] shrink-0" 
                style={{ color: store.accent_color || 'currentColor' }} 
              />
            )}
            <span className="truncate leading-none">{store.name}</span>
          </Link>
        ))}
        <Link
          to="/wishlist?tab=stores"
          onClick={handleClick}
          className={cn(
            "rounded-lg text-xs select-none",
            "transition-all duration-100",
            "flex flex-row flex-nowrap items-center gap-3 px-3 py-1.5 ml-4",
            "text-muted-foreground hover:text-foreground"
          )}
        >
          View all followed stores →
        </Link>
      </div>
    </div>
  );
}
