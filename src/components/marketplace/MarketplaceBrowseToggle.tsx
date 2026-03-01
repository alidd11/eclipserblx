import { forwardRef } from 'react';
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

export const MarketplaceBrowseToggle = forwardRef<HTMLDivElement, MarketplaceBrowseToggleProps>(function MarketplaceBrowseToggle({ mode, onChange }, ref) {
  return (
    <div ref={ref} className="flex items-center justify-center border-b border-border">
      {tabs.map(({ mode: m, label, icon: Icon }) => (
        <button
          key={m}
          onClick={() => onChange(m)}
          className={cn(
            'flex items-center gap-2 px-4 py-3 text-xs font-bold uppercase tracking-wider transition-all duration-150 border-b-2 -mb-px relative',
            mode === m
              ? 'border-primary text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
          )}
        >
          <Icon className="h-3.5 w-3.5" />
          {label}
        </button>
      ))}
    </div>
  );
});
