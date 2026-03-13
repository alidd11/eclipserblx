import { Store, ChevronDown, Check, ArrowLeftRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { useStoreAccess, type AccessibleStore } from '@/hooks/useStoreAccess';
import { useActiveStore } from '@/contexts/ActiveStoreContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { hapticTap } from '@/lib/haptics';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const roleLabels: Record<string, string> = {
  owner: 'Owner',
  manager: 'Manager',
  editor: 'Editor',
  viewer: 'Viewer',
};

const roleBadgeVariants: Record<string, string> = {
  owner: 'bg-primary/10 text-primary border-primary/20',
  manager: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  editor: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  viewer: 'bg-muted text-muted-foreground border-border',
};

export function StoreSwitcher() {
  const { data: stores = [] } = useStoreAccess();
  const { activeStoreId, setActiveStoreId } = useActiveStore();
  const queryClient = useQueryClient();

  // Don't render if user only has access to one store
  if (stores.length <= 1) return null;

  const currentStore = stores.find(s => s.id === activeStoreId) || stores[0];
  const isActive = (store: AccessibleStore) =>
    store.id === activeStoreId || (!activeStoreId && store === stores[0]);

  const handleSelect = (store: AccessibleStore) => {
    if (isActive(store)) return; // Already selected
    hapticTap();
    setActiveStoreId(store.id);

    // Invalidate all seller-related queries to refetch with new store
    queryClient.invalidateQueries({ queryKey: ['seller-store'] });
    queryClient.invalidateQueries({ queryKey: ['seller-balance'] });
    queryClient.invalidateQueries({ queryKey: ['seller-products'] });
    queryClient.invalidateQueries({ queryKey: ['seller-orders'] });
    queryClient.invalidateQueries({ queryKey: ['seller-analytics'] });
    queryClient.invalidateQueries({ queryKey: ['seller-refunds'] });
    queryClient.invalidateQueries({ queryKey: ['seller-announcements'] });
    queryClient.invalidateQueries({ queryKey: ['seller-goals'] });
    queryClient.invalidateQueries({ queryKey: ['seller-campaigns'] });
    queryClient.invalidateQueries({ queryKey: ['store-tabs'] });
    queryClient.invalidateQueries({ queryKey: ['store-pages'] });
    queryClient.invalidateQueries({ queryKey: ['store-team'] });
    queryClient.invalidateQueries({ queryKey: ['store-notifications'] });

    toast.success(`Switched to ${store.name}`, {
      description: `You're now managing as ${roleLabels[store.role] || store.role}`,
      duration: 2000,
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium text-foreground hover:bg-muted/60 transition-all focus:outline-none group">
          <Avatar className="h-6 w-6 shrink-0 rounded-md">
            <AvatarImage src={currentStore?.logo_url || undefined} alt="" />
            <AvatarFallback className="rounded-md bg-primary/10 text-primary text-[10px] font-bold">
              {currentStore?.name?.charAt(0)?.toUpperCase() || 'S'}
            </AvatarFallback>
          </Avatar>
          <span className="truncate flex-1 text-left">{currentStore?.name || 'Select Store'}</span>
          <ArrowLeftRight className="h-3 w-3 shrink-0 text-muted-foreground group-hover:text-foreground transition-colors" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64" sideOffset={4}>
        <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
          Switch store ({stores.length})
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {stores.map(store => {
          const active = isActive(store);
          return (
            <DropdownMenuItem
              key={store.id}
              onClick={() => handleSelect(store)}
              className={cn(
                'flex items-center gap-2.5 py-2 cursor-pointer',
                active && 'bg-primary/5'
              )}
            >
              <Avatar className="h-7 w-7 shrink-0 rounded-md">
                <AvatarImage src={store.logo_url || undefined} alt="" />
                <AvatarFallback className="rounded-md bg-muted text-muted-foreground text-[10px] font-bold">
                  {store.name?.charAt(0)?.toUpperCase() || 'S'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <span className={cn('block truncate text-sm', active && 'font-semibold')}>
                  {store.name}
                </span>
                <span className={cn(
                  'inline-block text-[10px] px-1.5 py-0 rounded-full border mt-0.5',
                  roleBadgeVariants[store.role] || 'bg-muted text-muted-foreground border-border'
                )}>
                  {roleLabels[store.role] || store.role}
                </span>
              </div>
              {active && (
                <Check className="h-4 w-4 text-primary shrink-0" />
              )}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
