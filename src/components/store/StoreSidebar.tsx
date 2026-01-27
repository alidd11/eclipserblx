import { Link } from 'react-router-dom';
import { 
  LayoutGrid, 
  Star, 
  Info, 
  Package,
  Sparkles,
  ChevronRight,
  FileText,
  Shield,
  RefreshCw,
  Home,
  User
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface StoreTab {
  id: string;
  name: string;
  slug: string;
  icon?: string | null;
}

interface StoreSidebarProps {
  storeSlug: string;
  storeName: string;
  accentColor: string;
  tabs?: StoreTab[];
  activeTab: string | null;
  onTabChange: (tabSlug: string | null) => void;
  onNavigate?: () => void;
  productCount?: number;
  totalSales?: number;
  averageRating?: number | null;
  bio?: string | null;
}

export function StoreSidebar({
  storeSlug,
  storeName,
  accentColor,
  tabs = [],
  activeTab,
  onTabChange,
  onNavigate,
  productCount = 0,
  totalSales = 0,
  averageRating,
  bio,
}: StoreSidebarProps) {
  const handleTabClick = (tabSlug: string | null) => {
    onTabChange(tabSlug);
    onNavigate?.();
  };

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    onNavigate?.();
  };

  return (
    <div className="h-full flex flex-col bg-sidebar pt-[env(safe-area-inset-top)]">
      {/* Header */}
      <div className="p-4 border-b border-sidebar-border">
        <h2 
          className="font-display font-bold text-lg truncate"
          style={{ color: accentColor }}
        >
          {storeName}
        </h2>
        <p className="text-xs text-sidebar-foreground/60 mt-0.5">Store Navigation</p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-1">
          {/* Navigation */}
          <div className="mb-2">
            <Button
              variant="ghost"
              className="w-full justify-start gap-2 h-9 text-sidebar-foreground hover:bg-sidebar-accent"
              asChild
            >
              <Link to={`/store/${storeSlug}`} onClick={onNavigate}>
                <Home className="h-4 w-4" style={{ color: accentColor }} />
                <span>Home</span>
              </Link>
            </Button>

            <Button
              variant="ghost"
              className="w-full justify-start gap-2 h-9 text-sidebar-foreground hover:bg-sidebar-accent"
              asChild
            >
              <Link to={`/store/${storeSlug}/about`} onClick={onNavigate}>
                <Info className="h-4 w-4" style={{ color: accentColor }} />
                <span>About</span>
              </Link>
            </Button>

            <Button
              variant="ghost"
              className="w-full justify-start gap-2 h-9 text-sidebar-foreground hover:bg-sidebar-accent"
              asChild
            >
              <Link to="/account" onClick={onNavigate}>
                <User className="h-4 w-4" style={{ color: accentColor }} />
                <span>My Account</span>
              </Link>
            </Button>

            <Button
              variant="ghost"
              className="w-full justify-start gap-2 h-9 text-sidebar-foreground hover:bg-sidebar-accent"
              onClick={() => scrollToSection('store-recommendations')}
            >
              <Sparkles className="h-4 w-4" style={{ color: accentColor }} />
              <span>Recommended</span>
            </Button>

            {averageRating && (
              <Button
                variant="ghost"
                className="w-full justify-start gap-2 h-9 text-sidebar-foreground hover:bg-sidebar-accent"
                onClick={() => scrollToSection('store-reviews')}
              >
                <Star className="h-4 w-4 text-yellow-500" />
                <span>Reviews</span>
                <span className="ml-auto text-xs text-sidebar-foreground/50">
                  {averageRating.toFixed(1)}
                </span>
              </Button>
            )}
          </div>

          {/* Categories */}
          <Separator className="my-3" />
          <div>
            <p className="text-xs font-medium text-sidebar-foreground/50 uppercase tracking-wider px-2 mb-2">
              Categories
            </p>
            
            <Button
              variant={!activeTab ? 'secondary' : 'ghost'}
              className={cn(
                "w-full justify-start gap-2 h-9",
                !activeTab 
                  ? "text-sidebar-foreground" 
                  : "text-sidebar-foreground hover:bg-sidebar-accent"
              )}
              style={!activeTab ? { backgroundColor: `${accentColor}20`, color: accentColor } : undefined}
              onClick={() => handleTabClick(null)}
            >
              <LayoutGrid className="h-4 w-4" />
              <span>All Products</span>
              <span className="ml-auto text-xs text-sidebar-foreground/50">
                {productCount}
              </span>
            </Button>

            {tabs.map((tab) => (
              <Button
                key={tab.id}
                variant={activeTab === tab.slug ? 'secondary' : 'ghost'}
                className={cn(
                  "w-full justify-start gap-2 h-9",
                  activeTab === tab.slug 
                    ? "text-sidebar-foreground" 
                    : "text-sidebar-foreground hover:bg-sidebar-accent"
                )}
                style={activeTab === tab.slug ? { backgroundColor: `${accentColor}20`, color: accentColor } : undefined}
                onClick={() => handleTabClick(tab.slug)}
              >
                <Package className="h-4 w-4" />
                <span className="truncate">{tab.name}</span>
                <ChevronRight className={cn(
                  "h-4 w-4 ml-auto transition-transform flex-shrink-0",
                  activeTab === tab.slug && "rotate-90"
                )} />
              </Button>
            ))}
          </div>

          {/* Legal Section */}
          <Separator className="my-3" />
          <div>
            <p className="text-xs font-medium text-sidebar-foreground/50 uppercase tracking-wider px-2 mb-2">
              Legal
            </p>
            <Button
              variant="ghost"
              className="w-full justify-start gap-2 h-9 text-sidebar-foreground hover:bg-sidebar-accent"
              asChild
            >
              <Link to="/terms" onClick={onNavigate}>
                <FileText className="h-4 w-4" style={{ color: accentColor }} />
                <span>Terms of Service</span>
              </Link>
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start gap-2 h-9 text-sidebar-foreground hover:bg-sidebar-accent"
              asChild
            >
              <Link to="/privacy" onClick={onNavigate}>
                <Shield className="h-4 w-4" style={{ color: accentColor }} />
                <span>Privacy Policy</span>
              </Link>
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start gap-2 h-9 text-sidebar-foreground hover:bg-sidebar-accent"
              asChild
            >
              <Link to="/refund" onClick={onNavigate}>
                <RefreshCw className="h-4 w-4" style={{ color: accentColor }} />
                <span>Refund Policy</span>
              </Link>
            </Button>
          </div>
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="p-3 border-t border-sidebar-border">
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          asChild
        >
          <Link to="/products">
            <LayoutGrid className="h-4 w-4 mr-2" />
            Browse All Stores
          </Link>
        </Button>
      </div>
    </div>
  );
}
