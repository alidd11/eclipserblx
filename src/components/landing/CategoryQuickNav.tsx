import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Package, Map, FileCode, Car, Plane, Building2, Shirt, 
  Layout, Bot, Globe
} from 'lucide-react';
import { cn } from '@/lib/utils';

const CATEGORIES = [
  { label: 'Scripts', slug: 'scripts-systems', icon: FileCode },
  { label: 'Maps', slug: 'maps', icon: Map },
  { label: 'Vehicles', slug: 'civilian-vehicles', icon: Car },
  { label: 'Buildings', slug: 'buildings', icon: Building2 },
  { label: 'UI Kits', slug: 'roblox-ui', icon: Layout },
  { label: 'Bots', slug: 'bots', icon: Bot },
  { label: 'Uniforms', slug: 'uniforms', icon: Shirt },
  { label: 'Aircraft', slug: 'aircraft', icon: Plane },
  { label: 'Bundles', slug: 'bundle-deals', icon: Package },
  
];

export function CategoryQuickNav() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const activeCategory = searchParams.get('category') || '';

  return (
    <nav aria-label="Browse categories" className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-2">
      <div className="relative">
        <div className="overflow-x-auto scrollbar-hide -mx-4 px-4">
          <div className="flex items-center gap-1.5 min-w-max">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isActive = activeCategory === cat.slug;
              return (
                <button
                  key={cat.slug}
                  onClick={() => navigate(cat.slug ? `/products?category=${cat.slug}` : '/products')}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap border",
                    isActive
                      ? "bg-primary/15 text-primary border-primary/30"
                      : "text-foreground/70 hover:text-foreground hover:bg-muted/60 border-transparent hover:border-border/50"
                  )}
                >
                  <div className={cn(
                    "p-1 rounded-md",
                    isActive ? "bg-primary/20" : "bg-muted/50"
                  )}>
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>
        {/* Right fade hint for scrollability */}
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-background to-transparent pointer-events-none" />
      </div>
    </nav>
  );
}
