import { ReactNode, useState, useCallback, useRef, useEffect } from 'react';
import { Menu } from 'lucide-react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { ChatWidget } from '@/components/chat/ChatWidget';
import { StoreSidebar } from './StoreSidebar';
import { MarketplaceBreadcrumb } from './MarketplaceBreadcrumb';
import { ScrollProgressIndicator } from '@/components/ui/ScrollProgressIndicator';
import { FloatingActionButtons } from '@/components/ui/FloatingActionButtons';
import { SearchCommandProvider, useSearchCommand } from '@/hooks/useSearchCommand';
import { SearchCommandPalette } from '@/components/search/SearchCommandPalette';
import { useIsMobile } from '@/hooks/use-mobile';
import { useRecentStores } from '@/hooks/useRecentStores';
import { hapticTap } from '@/lib/haptics';
import { safeStorage } from '@/lib/safeStorage';
import { cn } from '@/lib/utils';

const SIDEBAR_STORAGE_KEY = 'store-sidebar-collapsed';

interface StoreTab {
  id: string;
  name: string;
  slug: string;
  icon?: string | null;
  isGlobalCategory?: boolean;
}

interface StoreLayoutProps {
  children: ReactNode;
  store: {
    id: string;
    slug?: string;
    name: string;
    logo_url?: string | null;
    accent_color?: string;
    discord_url?: string | null;
    twitter_url?: string | null;
    youtube_url?: string | null;
    tiktok_url?: string | null;
    website_url?: string | null;
    roblox_url?: string | null;
  };
  tabs?: StoreTab[];
  activeTab?: string | null;
  activeTabName?: string | null;
  onTabChange?: (tabSlug: string | null) => void;
  productCount?: number;
  totalSales?: number;
  averageRating?: number | null;
  bio?: string | null;
}

function StoreLayoutContent({ 
  children, 
  store,
  tabs = [],
  activeTab = null,
  activeTabName = null,
  onTabChange,
  productCount = 0,
  averageRating,
}: StoreLayoutProps) {
  const accentColor = store.accent_color || '#8b5cf6';
  const isMobile = useIsMobile();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { recordVisit } = useRecentStores();
  const { open: searchOpen, setOpen: setSearchOpen } = useSearchCommand();

  // Sidebar collapse state with localStorage persistence
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const stored = safeStorage.getItem(SIDEBAR_STORAGE_KEY);
    return stored === 'true';
  });

  // Persist sidebar collapse state
  useEffect(() => {
    safeStorage.setItem(SIDEBAR_STORAGE_KEY, String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  // Record store visit when component mounts
  useEffect(() => {
    if (store.slug || store.id) {
      recordVisit({
        slug: store.slug || store.id,
        name: store.name,
        logoUrl: store.logo_url,
        accentColor: store.accent_color,
      });
    }
  }, [store.slug, store.id, store.name, store.logo_url, store.accent_color, recordVisit]);

  // Swipe gesture tracking for mobile
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const isEdgeSwipe = useRef(false);

  const EDGE_SWIPE_ZONE_PX = 100;
  const OPEN_SWIPE_MIN_X = 12;
  const HORIZONTAL_LOCK_RATIO = 1.1;

  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      if (mobileOpen) {
        isEdgeSwipe.current = false;
        touchStartX.current = null;
        touchStartY.current = null;
        return;
      }

      const target = e.target as Element | null;
      if (target?.closest?.('[data-gesture-exempt="true"]')) {
        isEdgeSwipe.current = false;
        touchStartX.current = null;
        touchStartY.current = null;
        return;
      }

      const touch = e.touches[0];
      touchStartX.current = touch.clientX;
      touchStartY.current = touch.clientY;
      isEdgeSwipe.current = touch.clientX < EDGE_SWIPE_ZONE_PX;
    },
    [mobileOpen]
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (mobileOpen) return;
      if (!isEdgeSwipe.current || touchStartX.current === null) return;

      const touch = e.touches[0];
      const deltaX = touch.clientX - touchStartX.current;

      if (deltaX > 0) {
        e.preventDefault();
        e.stopPropagation();
      }
    },
    [mobileOpen]
  );

  const handleTouchEnd = useCallback(
    (e: TouchEvent) => {
      if (touchStartX.current === null || touchStartY.current === null) return;

      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - touchStartX.current;
      const deltaY = Math.abs(touch.clientY - touchStartY.current);

      const isMostlyHorizontal = Math.abs(deltaX) > deltaY * HORIZONTAL_LOCK_RATIO;

      if (
        touchStartX.current < EDGE_SWIPE_ZONE_PX &&
        deltaX > OPEN_SWIPE_MIN_X &&
        isMostlyHorizontal &&
        !mobileOpen
      ) {
        hapticTap();
        setMobileOpen(true);
      }

      touchStartX.current = null;
      touchStartY.current = null;
      isEdgeSwipe.current = false;
    },
    [mobileOpen]
  );

  // Add edge swipe listener for mobile
  useEffect(() => {
    if (!isMobile) return;
    
    document.addEventListener('touchstart', handleTouchStart, { passive: true, capture: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: false, capture: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true, capture: true });
    
    return () => {
      document.removeEventListener('touchstart', handleTouchStart, { capture: true });
      document.removeEventListener('touchmove', handleTouchMove, { capture: true });
      document.removeEventListener('touchend', handleTouchEnd, { capture: true });
    };
  }, [isMobile, handleTouchStart, handleTouchMove, handleTouchEnd]);

  // Keyboard shortcut: Ctrl/Cmd + B to toggle sidebar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault();
        hapticTap();
        setSidebarCollapsed(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleTabChange = (tabSlug: string | null) => {
    onTabChange?.(tabSlug);
  };

  const handleSidebarToggle = () => {
    hapticTap();
    setSidebarCollapsed(prev => !prev);
  };

  return (
    <>
      <ScrollProgressIndicator />
      <div className="min-h-[100dvh] flex w-full bg-background overflow-x-hidden relative">
        {/* Desktop Sidebar */}
        {!isMobile && (
          <StoreSidebar
            storeSlug={store.slug || store.id}
            storeName={store.name}
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={handleTabChange}
            productCount={productCount}
            averageRating={averageRating}
            collapsed={sidebarCollapsed}
            onToggle={handleSidebarToggle}
          />
        )}

        {/* Mobile Sidebar (Sheet) */}
        {isMobile && (
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetContent
              side="left"
              className="p-0 w-64 border-r-0 !h-[100dvh] !max-h-[100dvh] bg-card overflow-hidden"
              style={{ height: '100dvh', maxHeight: '100dvh' }}
              data-gesture-exempt="true"
              hideCloseButton
            >
              <StoreSidebar
                storeSlug={store.slug || store.id}
                storeName={store.name}
                tabs={tabs}
                activeTab={activeTab}
                onTabChange={handleTabChange}
                onNavigate={() => setMobileOpen(false)}
                productCount={productCount}
                averageRating={averageRating}
                collapsed={false}
                onToggle={() => {}}
                isMobileDrawer
              />
            </SheetContent>
          </Sheet>
        )}

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0 h-[100dvh]">
          {/* Unified Header */}
          <Header 
            showDesktopNav={false} 
            onMenuClick={() => setMobileOpen(true)}
            onSidebarToggle={handleSidebarToggle}
          />

          {/* Breadcrumb Bar */}
          <div 
            className="border-b px-4 py-2"
            style={{ borderColor: `${accentColor}20` }}
          >
            <MarketplaceBreadcrumb
              storeName={store.name}
              storeSlug={store.slug || store.id}
              categoryName={activeTabName}
              accentColor={accentColor}
              compact
            />
          </div>

          {/* Main Content */}
          <main className="flex-1 overflow-y-auto overflow-x-hidden pb-[env(safe-area-inset-bottom)]">
            {children}
            <Footer />
          </main>
        </div>
      </div>

      {/* Floating Action Buttons */}
      <FloatingActionButtons />

      {/* Search Command Palette */}
      <SearchCommandPalette open={searchOpen} onOpenChange={setSearchOpen} />

      {/* Chat Widget */}
      <ChatWidget />
    </>
  );
}

export function StoreLayout(props: StoreLayoutProps) {
  return (
    <SearchCommandProvider>
      <StoreLayoutContent {...props} />
    </SearchCommandProvider>
  );
}
