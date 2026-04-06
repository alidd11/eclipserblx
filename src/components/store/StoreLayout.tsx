import { ReactNode, useEffect } from 'react';
import { LayoutShell } from '@/components/layout/LayoutShell';
import { StoreSidebar } from './StoreSidebar';

import { useRecentStores } from '@/hooks/useRecentStores';

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
    banner_url?: string | null;
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

export function StoreLayout({
  children,
  store,
  tabs = [],
  activeTab = null,
  onTabChange,
  productCount = 0,
  averageRating,
}: StoreLayoutProps) {
  const { recordVisit } = useRecentStores();

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

  const handleTabChange = (tabSlug: string | null) => {
    onTabChange?.(tabSlug);
  };

  const sidebarProps = {
    storeSlug: store.slug || store.id,
    storeName: store.name,
    logoUrl: store.logo_url,
    bannerUrl: store.banner_url,
    tabs,
    activeTab,
    onTabChange: handleTabChange,
    productCount,
    averageRating,
    collapsed: false,
    onToggle: () => {},
  };

  return (
    <LayoutShell
      desktopSidebar={null}
      mobileSidebar={(onClose) => (
        <StoreSidebar {...sidebarProps} onNavigate={onClose} isMobileDrawer />
      )}
      headerProps={{ hideBrandName: true }}
    >
      {children}
    </LayoutShell>
  );
}
