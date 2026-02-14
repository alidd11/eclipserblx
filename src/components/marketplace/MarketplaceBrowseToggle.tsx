import { Store, Package } from 'lucide-react';
import { cn } from '@/lib/utils';

type BrowseMode = 'stores' | 'products';

interface MarketplaceBrowseToggleProps {
  mode: BrowseMode;
  onChange: (mode: BrowseMode) => void;
}

export function MarketplaceBrowseToggle({ mode, onChange }: MarketplaceBrowseToggleProps) {
  return (
    <div className="flex items-center gap-2 max-w-xs mx-auto">
      <button
        onClick={() => onChange('stores')}
        className={cn(
          'flex items-center gap-2 px-4 py-2 rounded-md border text-sm font-medium transition-all duration-200 flex-1 justify-center',
          mode === 'stores'
            ? 'border-primary bg-primary/10 text-primary'
            : 'border-border bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground'
        )}
      >
        <Store className="h-4 w-4" />
        Stores
      </button>
      <button
        onClick={() => onChange('products')}
        className={cn(
          'flex items-center gap-2 px-4 py-2 rounded-md border text-sm font-medium transition-all duration-200 flex-1 justify-center',
          mode === 'products'
            ? 'border-primary bg-primary/10 text-primary'
            : 'border-border bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground'
        )}
      >
        <Package className="h-4 w-4" />
        Products
      </button>
    </div>
  );
}
