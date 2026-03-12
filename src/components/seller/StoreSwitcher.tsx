import { Store, ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { useStoreAccess, type AccessibleStore } from '@/hooks/useStoreAccess';
import { useActiveStore } from '@/contexts/ActiveStoreContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { hapticTap } from '@/lib/haptics';

const roleLabels: Record<string, string> = {
  owner: 'Owner',
  manager: 'Manager',
  editor: 'Editor',
  viewer: 'Viewer',
};

export function StoreSwitcher() {
  const { data: stores = [] } = useStoreAccess();
  const { activeStoreId, setActiveStoreId } = useActiveStore();

  // Don't render if user only has access to one store
  if (stores.length <= 1) return null;

  const currentStore = stores.find(s => s.id === activeStoreId) || stores[0];

  const handleSelect = (store: AccessibleStore) => {
    hapticTap();
    setActiveStoreId(store.id);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[12px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all focus:outline-none">
          <Store className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate flex-1 text-left">{currentStore?.name || 'Select Store'}</span>
          <ChevronDown className="h-3 w-3 shrink-0" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {stores.map(store => (
          <DropdownMenuItem
            key={store.id}
            onClick={() => handleSelect(store)}
            className="flex items-center gap-2"
          >
            <div className="h-6 w-6 rounded border border-border bg-muted shrink-0 overflow-hidden">
              {store.logo_url ? (
                <img src={store.logo_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full flex items-center justify-center">
                  <Store className="h-3 w-3 text-muted-foreground" />
                </div>
              )}
            </div>
            <span className="truncate flex-1 text-sm">{store.name}</span>
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              {roleLabels[store.role] || store.role}
            </Badge>
            {(store.id === activeStoreId || (!activeStoreId && store === stores[0])) && (
              <Check className="h-3.5 w-3.5 text-primary shrink-0" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
