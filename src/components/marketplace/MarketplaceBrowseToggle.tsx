import { Store, Package } from 'lucide-react';
import { cn } from '@/lib/utils';

type BrowseMode = 'stores' | 'products';

interface MarketplaceBrowseToggleProps {
  mode: BrowseMode;
  onChange: (mode: BrowseMode) => void;
}

export function MarketplaceBrowseToggle({ mode, onChange }: MarketplaceBrowseToggleProps) {
  return (
    <div className="grid grid-cols-2 gap-3 max-w-md mx-auto">
      <button
        onClick={() => onChange('stores')}
        className={cn(
          'flex flex-col items-center gap-2 p-4 rounded-lg border transition-all duration-200',
          mode === 'stores'
            ? 'border-primary bg-primary/10 text-primary'
            : 'border-border bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground'
        )}
      >
        <Store className="h-6 w-6" />
        <span className="text-sm font-semibold">Browse Stores</span>
      </button>
      <button
        onClick={() => onChange('products')}
        className={cn(
          'flex flex-col items-center gap-2 p-4 rounded-lg border transition-all duration-200',
          mode === 'products'
            ? 'border-primary bg-primary/10 text-primary'
            : 'border-border bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground'
        )}
      >
        <Package className="h-6 w-6" />
        <span className="text-sm font-semibold">Browse Products</span>
      </button>
    </div>
  );
}
