import { useNavigate } from 'react-router-dom';
import { 
  Package, Map, FileCode, Car, Plane, Building2, Shirt, 
  Layout, Bot, Globe, Gift
} from 'lucide-react';

const CATEGORIES = [
  { label: 'All', slug: '', icon: Gift },
  { label: 'Scripts', slug: 'scripts-systems', icon: FileCode },
  { label: 'Maps', slug: 'maps', icon: Map },
  { label: 'Vehicles', slug: 'civilian-vehicles', icon: Car },
  { label: 'Buildings', slug: 'buildings', icon: Building2 },
  { label: 'UI Kits', slug: 'roblox-ui', icon: Layout },
  { label: 'Bots', slug: 'bots', icon: Bot },
  { label: 'Uniforms', slug: 'uniforms', icon: Shirt },
  { label: 'Aircraft', slug: 'aircraft', icon: Plane },
  { label: 'Bundles', slug: 'bundle-deals', icon: Package },
  { label: 'Templates', slug: 'website-templates', icon: Globe },
];

export function CategoryQuickNav() {
  const navigate = useNavigate();

  return (
    <nav aria-label="Browse categories" className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-2">
      <div className="overflow-x-auto scrollbar-hide -mx-4 px-4">
        <div className="flex items-center gap-1.5 min-w-max">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            return (
              <button
                key={cat.slug}
                onClick={() => navigate(cat.slug ? `/products?category=${cat.slug}` : '/products')}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-foreground/70 hover:text-foreground hover:bg-muted/60 active:scale-[0.97] transition-all whitespace-nowrap border border-transparent hover:border-border/50"
              >
                <div className="p-1 rounded-md bg-muted/50">
                  <Icon className="h-3.5 w-3.5" />
                </div>
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
