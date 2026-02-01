import { Link } from 'react-router-dom';
import { 
  LayoutGrid, 
  Star, 
  Info, 
  Package,
  Sparkles,
  FileText,
  Shield,
  RefreshCw,
  Home,
  User,
  ChevronLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { EclipseLogo } from '@/components/ui/EclipseLogo';
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
    <div className="h-full flex flex-col bg-sidebar pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      {/* Header - synchronized with main sidebar (neutral branding) */}
      <div className="h-14 sm:h-16 flex items-center px-4 border-b border-sidebar-border shrink-0">
        <Link 
          to="/" 
          onClick={onNavigate}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          <EclipseLogo size="sm" />
        </Link>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-1">
          {/* Quick Access */}
          <div className="mb-2 space-y-0.5">
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 h-9 px-3 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg"
              asChild
            >
              <Link to="/marketplace" onClick={onNavigate}>
                <ChevronLeft className="h-4 w-4 sm:h-[1.125rem] sm:w-[1.125rem]" />
                <span>Back to Marketplace</span>
              </Link>
            </Button>

            <Button
              variant="ghost"
              className="w-full justify-start gap-3 h-9 px-3 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg"
              asChild
            >
              <Link to={`/store/${storeSlug}`} onClick={onNavigate}>
                <Home className="h-4 w-4 sm:h-[1.125rem] sm:w-[1.125rem]" style={{ color: accentColor }} />
                <span>Store Home</span>
              </Link>
            </Button>

            <Button
              variant="ghost"
              className="w-full justify-start gap-3 h-9 px-3 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg"
              asChild
            >
              <Link to={`/store/${storeSlug}/about`} onClick={onNavigate}>
                <Info className="h-4 w-4 sm:h-[1.125rem] sm:w-[1.125rem]" style={{ color: accentColor }} />
                <span>About</span>
              </Link>
            </Button>

            <Button
              variant="ghost"
              className="w-full justify-start gap-3 h-9 px-3 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg"
              asChild
            >
              <Link to="/account" onClick={onNavigate}>
                <User className="h-4 w-4 sm:h-[1.125rem] sm:w-[1.125rem]" style={{ color: accentColor }} />
                <span>My Account</span>
              </Link>
            </Button>

            <Button
              variant="ghost"
              className="w-full justify-start gap-3 h-9 px-3 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg"
              onClick={() => scrollToSection('store-recommendations')}
            >
              <Sparkles className="h-4 w-4 sm:h-[1.125rem] sm:w-[1.125rem]" style={{ color: accentColor }} />
              <span>Recommended</span>
            </Button>

            {averageRating && (
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 h-9 px-3 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg"
                onClick={() => scrollToSection('store-reviews')}
              >
                <Star className="h-4 w-4 sm:h-[1.125rem] sm:w-[1.125rem] text-yellow-500" />
                <span className="flex-1 text-left">Reviews</span>
                <span className="text-xs text-muted-foreground/50">
                  {averageRating.toFixed(1)}
                </span>
              </Button>
            )}
          </div>

          {/* Categories */}
          <Separator className="my-3" />
          <div>
            <p className="text-xs font-medium text-muted-foreground/50 uppercase tracking-wider px-3 mb-2">
              Categories
            </p>
            
            <Button
              variant={!activeTab ? 'secondary' : 'ghost'}
              className={cn(
                "w-full justify-start gap-3 h-9 px-3 text-sm font-medium rounded-lg",
                !activeTab 
                  ? "bg-primary text-primary-foreground" 
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
              onClick={() => handleTabClick(null)}
            >
              <LayoutGrid className="h-4 w-4 sm:h-[1.125rem] sm:w-[1.125rem]" />
              <span className="flex-1 text-left">All Products</span>
              <span className="text-xs opacity-70">
                {productCount}
              </span>
            </Button>

            {tabs.map((tab) => (
              <Button
                key={tab.id}
                variant={activeTab === tab.slug ? 'secondary' : 'ghost'}
                className={cn(
                  "w-full justify-start gap-3 h-9 px-3 text-sm font-medium rounded-lg",
                  activeTab === tab.slug 
                    ? "bg-primary text-primary-foreground" 
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
                onClick={() => handleTabClick(tab.slug)}
              >
                <Package className="h-4 w-4 sm:h-[1.125rem] sm:w-[1.125rem]" />
                <span className="truncate flex-1 text-left">{tab.name}</span>
              </Button>
            ))}
          </div>

          {/* Legal Section */}
          <Separator className="my-3" />
          <div>
            <p className="text-xs font-medium text-muted-foreground/50 uppercase tracking-wider px-3 mb-2">
              Legal
            </p>
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 h-9 px-3 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg"
              asChild
            >
              <Link to="/terms" onClick={onNavigate}>
                <FileText className="h-4 w-4 sm:h-[1.125rem] sm:w-[1.125rem]" style={{ color: accentColor }} />
                <span>Terms of Service</span>
              </Link>
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 h-9 px-3 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg"
              asChild
            >
              <Link to="/privacy" onClick={onNavigate}>
                <Shield className="h-4 w-4 sm:h-[1.125rem] sm:w-[1.125rem]" style={{ color: accentColor }} />
                <span>Privacy Policy</span>
              </Link>
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 h-9 px-3 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg"
              asChild
            >
              <Link to="/refund" onClick={onNavigate}>
                <RefreshCw className="h-4 w-4 sm:h-[1.125rem] sm:w-[1.125rem]" style={{ color: accentColor }} />
                <span>Refund Policy</span>
              </Link>
            </Button>
          </div>
        </div>
      </ScrollArea>

      {/* Footer with Eclipse Branding */}
      <div className="p-3 border-t border-sidebar-border shrink-0">
        <Link
          to="/"
          className="flex items-center justify-center gap-2 py-2 text-muted-foreground hover:text-foreground transition-colors"
          onClick={onNavigate}
        >
          <EclipseLogo size="xs" />
          <span className="text-xs">Powered by Eclipse</span>
        </Link>
      </div>
    </div>
  );
}
