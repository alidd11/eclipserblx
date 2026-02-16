import { Store, Package, LayoutGrid } from 'lucide-react';
import { cn } from '@/lib/utils';

export type BrowseMode = 'stores' | 'products' | 'categories';

interface MarketplaceBrowseToggleProps {
  mode: BrowseMode;
  onChange: (mode: BrowseMode) => void;
}

const tabs: { mode: BrowseMode; label: string; icon: typeof Store }[] = [
  { mode: 'stores', label: 'Stores', icon: Store },
  { mode: 'categories', label: 'Categories', icon: LayoutGrid },
  { mode: 'products', label: 'Products', icon: Package },
];

export function MarketplaceBrowseToggle({ mode, onChange }: MarketplaceBrowseToggleProps) {
  return (
    <div className="flex items-center gap-2 max-w-md mx-auto">
      {tabs.map(({ mode: m, label, icon: Icon }) => (
        <button
          key={m}
          onClick={() => onChange(m)}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-md border text-sm font-medium transition-all duration-200 flex-1 justify-center',
            mode === m
              ? 'border-primary bg-primary/10 text-primary'
              : 'border-border bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground'
          )}
        >
          <Icon className="h-4 w-4" />
          {label}
        </button>
      ))}
    </div>
  );
}
