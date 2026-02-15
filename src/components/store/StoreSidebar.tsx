import { useState, useEffect } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
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
  ChevronLeft,
  ChevronDown,
  ShoppingCart,
  Heart,
  Download,
  PanelLeftClose,
  PanelLeft,
  LucideIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { EclipseLogo } from '@/components/ui/EclipseLogo';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { safeStorage } from '@/lib/safeStorage';
import { hapticTap } from '@/lib/haptics';

// Unified icon styling constants (synchronized with CustomerSidebar)
const ICON_SIZE = "h-[1.125rem] w-[1.125rem]";
const ICON_SIZE_SMALL = "h-4 w-4";
const ICON_STROKE_ACTIVE = "stroke-[2.25]";
const ICON_STROKE_DEFAULT = "stroke-[1.75]";

const STORAGE_KEY = 'store-sidebar-groups';

interface StoreTab {
  id: string;
  name: string;
  slug: string;
  icon?: string | null;
  isGlobalCategory?: boolean;
}

interface NavItem {
  title: string;
  icon: LucideIcon;
  href?: string;
  onClick?: () => void;
  external?: boolean;
  badge?: string | number;
}

interface NavGroup {
  id: string;
  title: string;
  icon: LucideIcon;
  items: NavItem[];
}

interface StoreSidebarProps {
  storeSlug: string;
  storeName: string;
  tabs?: StoreTab[];
  activeTab: string | null;
  onTabChange: (tabSlug: string | null) => void;
  onNavigate?: () => void;
  productCount?: number;
  averageRating?: number | null;
  collapsed: boolean;
  onToggle: () => void;
  isMobileDrawer?: boolean;
}

export function StoreSidebar({
  storeSlug,
  storeName,
  tabs = [],
  activeTab,
  onTabChange,
  onNavigate,
  productCount = 0,
  averageRating,
  collapsed,
  onToggle,
  isMobileDrawer = false,
}: StoreSidebarProps) {
  const location = useLocation();
  const isCollapsed = isMobileDrawer ? false : collapsed;

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    onNavigate?.();
  };

  const handleTabClick = (tabSlug: string | null) => {
    hapticTap();
    onTabChange(tabSlug);
    onNavigate?.();
  };

  const handleNavClick = () => {
    hapticTap();
    onNavigate?.();
  };

  // Navigation groups matching CustomerSidebar structure
  const navGroups: NavGroup[] = [
    {
      id: 'quick-access',
      title: 'Quick Access',
      icon: Home,
      items: [
        { title: 'Back to Marketplace', icon: ChevronLeft, href: '/' },
        { title: 'Store Home', icon: Home, href: `/store/${storeSlug}` },
        { title: 'About', icon: Info, href: `/store/${storeSlug}/about` },
      ],
    },
    {
      id: 'account',
      title: 'My Account',
      icon: User,
      items: [
        { title: 'Profile', icon: User, href: '/account' },
        { title: 'My Cart', icon: ShoppingCart, href: '/cart' },
        { title: 'Wishlist', icon: Heart, href: '/wishlist' },
        { title: 'My Purchases', icon: Download, href: '/purchases' },
      ],
    },
    {
      id: 'store',
      title: 'Store',
      icon: Sparkles,
      items: [
        { title: 'Recommended', icon: Sparkles, onClick: () => scrollToSection('store-recommendations') },
        ...(averageRating ? [{ 
          title: 'Reviews', 
          icon: Star, 
          onClick: () => scrollToSection('store-reviews'),
          badge: averageRating.toFixed(1)
        }] : []),
      ],
    },
    {
      id: 'legal',
      title: 'Legal',
      icon: FileText,
      items: [
        { title: 'Terms of Service', icon: FileText, href: '/terms' },
        { title: 'Privacy Policy', icon: Shield, href: '/privacy' },
        { title: 'Refund Policy', icon: RefreshCw, href: '/refund' },
      ],
    },
  ];

  // Initialize open groups from localStorage
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const stored = safeStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return {};
      }
    }
    return navGroups.reduce((acc, group) => ({ ...acc, [group.id]: true }), {});
  });

  // Persist open groups
  useEffect(() => {
    safeStorage.setItem(STORAGE_KEY, JSON.stringify(openGroups));
  }, [openGroups]);

  const toggleGroup = (groupId: string) => {
    hapticTap();
    setOpenGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  const renderNavItem = (item: NavItem) => {
    const isActive = item.href && !item.external && location.pathname === item.href;

    const LinkContent = (
      <>
        <item.icon className={cn(
          ICON_SIZE,
          "transition-colors shrink-0",
          isActive ? ICON_STROKE_ACTIVE : ICON_STROKE_DEFAULT
        )} />
        {!isCollapsed && (
          <span className="min-w-0 truncate leading-none flex-1">{item.title}</span>
        )}
        {!isCollapsed && item.badge && (
          <span className="text-xs text-muted-foreground/70">{item.badge}</span>
        )}
      </>
    );

    const linkClassName = cn(
      "group rounded-md text-[13px] font-medium select-none",
      "transition-all duration-150 active:scale-[0.98] active:opacity-90",
      isCollapsed
        ? "flex items-center justify-center p-2.5"
        : "flex items-center gap-2.5 px-2.5 py-[7px]",
      isActive
        ? "bg-primary text-primary-foreground shadow-sm"
        : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
    );

    // Button action (scroll anchors)
    if (item.onClick) {
      if (isCollapsed) {
        return (
          <Tooltip key={item.title}>
            <TooltipTrigger asChild>
              <button onClick={item.onClick} className={linkClassName}>
                {LinkContent}
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">{item.title}</TooltipContent>
          </Tooltip>
        );
      }
      return (
        <button key={item.title} onClick={item.onClick} className={linkClassName}>
          {LinkContent}
        </button>
      );
    }

    // Internal link
    if (!isCollapsed) {
      return (
        <NavLink
          key={item.href}
          to={item.href!}
          end={item.href === `/store/${storeSlug}`}
          onClick={handleNavClick}
          className={linkClassName}
        >
          {LinkContent}
        </NavLink>
      );
    }

    return (
      <Tooltip key={item.href}>
        <TooltipTrigger asChild>
          <Link to={item.href!} onClick={handleNavClick} className={linkClassName}>
            {LinkContent}
          </Link>
        </TooltipTrigger>
        <TooltipContent side="right">{item.title}</TooltipContent>
      </Tooltip>
    );
  };

  const renderGroup = (group: NavGroup) => {
    const isOpen = openGroups[group.id] ?? true;
    const hasActiveItem = group.items.some(item => 
      item.href && !item.external && location.pathname === item.href
    );

    // QUICK-ACCESS group: always expanded, non-collapsible, no header
    if (group.id === 'quick-access') {
      return (
        <div key={group.id} className="space-y-0.5 mb-1.5">
          {group.items.map(renderNavItem)}
          <div className="h-px bg-border/40 mx-1 mb-1.5" />
        </div>
      );
    }

    // Collapsed: show group icon with tooltip menu
    if (isCollapsed) {
      return (
        <div key={group.id} className="mb-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                className={cn(
                  "w-full flex items-center justify-center py-2.5 rounded-lg select-none",
                  "transition-all duration-100 active:scale-[0.97] active:opacity-90",
                  "focus:outline-none focus-visible:outline-none",
                  hasActiveItem
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
                onClick={() => toggleGroup(group.id)}
              >
                <group.icon className={cn(
                  ICON_SIZE,
                  "transition-colors",
                  hasActiveItem ? ICON_STROKE_ACTIVE : ICON_STROKE_DEFAULT
                )} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="p-0">
              <div className="py-2">
                <div className="px-3 pb-1 text-xs font-semibold text-muted-foreground">
                  {group.title}
                </div>
                {group.items.map(item => {
                  if (item.onClick) {
                    return (
                      <button
                        key={item.title}
                        onClick={item.onClick}
                        className="w-full flex items-center gap-2 px-3 py-1.5 text-sm transition-colors hover:bg-muted text-left"
                      >
                        <item.icon className={cn(ICON_SIZE_SMALL, ICON_STROKE_DEFAULT)} />
                        {item.title}
                        {item.badge && (
                          <span className="text-xs text-muted-foreground/70 ml-auto">{item.badge}</span>
                        )}
                      </button>
                    );
                  }
                  return (
                    <NavLink
                      key={item.href}
                      to={item.href!}
                      onClick={handleNavClick}
                      className={({ isActive }) => cn(
                        "flex items-center gap-2 px-3 py-1.5 text-sm transition-colors",
                        isActive ? "bg-muted text-foreground" : "hover:bg-muted"
                      )}
                    >
                      <item.icon className={cn(ICON_SIZE_SMALL, ICON_STROKE_DEFAULT)} />
                      {item.title}
                    </NavLink>
                  );
                })}
              </div>
            </TooltipContent>
          </Tooltip>
        </div>
      );
    }

    // Expanded: collapsible group
    return (
      <Collapsible
        key={group.id}
        open={isOpen}
        onOpenChange={() => toggleGroup(group.id)}
        className="mb-1"
      >
        <CollapsibleTrigger asChild>
          <button
            className={cn(
              "w-full flex items-center gap-2.5 px-2.5 py-[7px] rounded-md text-[11px] font-semibold uppercase tracking-wide select-none",
              "transition-all duration-150 active:scale-[0.98]",
              "focus:outline-none",
              hasActiveItem
                ? "text-foreground"
                : "text-muted-foreground/50 hover:text-muted-foreground"
            )}
          >
            <group.icon className="h-3.5 w-3.5 shrink-0" />
            <span className="flex-1 text-left truncate">{group.title}</span>
            <ChevronDown className={cn(
              "h-3 w-3 shrink-0 transition-transform duration-200",
              isOpen ? "rotate-0" : "-rotate-90"
            )} />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="ml-[13px] border-l border-border/40 pl-2 space-y-0.5 pt-0.5 pb-1">
          {group.items.map(renderNavItem)}
        </CollapsibleContent>
      </Collapsible>
    );
  };

  // Render Browse section with All Products and store categories
  const renderBrowseSection = () => {
    const isAllProductsActive = activeTab === null;
    const isBrowseActive = true; // Always has something active in store context

    if (isCollapsed) {
      return (
        <div className="mb-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                className={cn(
                  "w-full flex items-center justify-center py-2.5 rounded-lg select-none",
                  "transition-all duration-100 active:scale-[0.97] active:opacity-90",
                  "focus:outline-none focus-visible:outline-none",
                  isBrowseActive
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                <Package className={cn(
                  ICON_SIZE, "transition-colors",
                  isBrowseActive ? ICON_STROKE_ACTIVE : ICON_STROKE_DEFAULT
                )} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="p-0">
              <div className="py-2">
                <div className="px-3 pb-1 text-xs font-semibold text-muted-foreground">
                  Browse
                </div>
                <button
                  onClick={() => handleTabClick(null)}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-1.5 text-sm transition-colors text-left",
                    isAllProductsActive ? "bg-muted text-foreground" : "hover:bg-muted"
                  )}
                >
                  <LayoutGrid className={cn(ICON_SIZE_SMALL, ICON_STROKE_DEFAULT)} />
                  All Products
                  <span className="text-xs opacity-70 ml-auto">{productCount}</span>
                </button>
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => handleTabClick(tab.slug)}
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-1.5 text-sm transition-colors text-left",
                      activeTab === tab.slug ? "bg-muted text-foreground" : "hover:bg-muted"
                    )}
                  >
                    <Package className={cn(ICON_SIZE_SMALL, ICON_STROKE_DEFAULT)} />
                    {tab.name}
                  </button>
                ))}
              </div>
            </TooltipContent>
          </Tooltip>
        </div>
      );
    }

    return (
      <Collapsible
        open={openGroups['browse'] ?? true}
        onOpenChange={() => toggleGroup('browse')}
        className="mb-1"
      >
        <CollapsibleTrigger asChild>
          <button
            className={cn(
              "w-full flex items-center gap-2.5 px-2.5 py-[7px] rounded-md text-[11px] font-semibold uppercase tracking-wide select-none",
              "transition-all duration-150 active:scale-[0.98]",
              "focus:outline-none",
              isBrowseActive
                ? "text-foreground"
                : "text-muted-foreground/50 hover:text-muted-foreground"
            )}
          >
            <Package className="h-3.5 w-3.5 shrink-0" />
            <span className="flex-1 text-left truncate">Browse</span>
            <ChevronDown className={cn(
              "h-3 w-3 shrink-0 transition-transform duration-200",
              (openGroups['browse'] ?? true) ? "rotate-0" : "-rotate-90"
            )} />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="ml-[13px] border-l border-border/40 pl-2 space-y-0.5 pt-0.5 pb-1">
          {/* All Products */}
          <button
            onClick={() => handleTabClick(null)}
            className={cn(
              "w-full group rounded-md text-[13px] font-medium select-none",
              "transition-all duration-150 active:scale-[0.98] active:opacity-90",
              "flex items-center gap-2.5 px-2.5 py-[7px]",
              isAllProductsActive
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
            )}
          >
            <LayoutGrid className="h-4 w-4 shrink-0" />
            <span className="leading-none flex-1 text-left">All Products</span>
            <span className="text-xs opacity-70">{productCount}</span>
          </button>

          {/* Store Categories */}
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.slug)}
              className={cn(
                "w-full group rounded-md text-[13px] font-medium select-none",
                "transition-all duration-150 active:scale-[0.98] active:opacity-90",
                "flex items-center gap-2.5 px-2.5 py-[7px]",
                activeTab === tab.slug
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              )}
            >
              <Package className="h-4 w-4 shrink-0" />
              <span className="truncate leading-none flex-1 text-left">{tab.name}</span>
            </button>
          ))}
        </CollapsibleContent>
      </Collapsible>
    );
  };

  return (
    <aside 
      className={cn(
        "bg-card text-foreground flex flex-col transition-all duration-300 shrink-0",
        isMobileDrawer 
          ? "h-full w-full border-0 max-h-[100dvh] pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]" 
          : "h-[100dvh] sticky top-0 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] border-r border-border",
        !isMobileDrawer && (isCollapsed ? "w-14" : "w-60")
      )}
      data-gesture-exempt="true"
    >
      {/* Header spacer with collapse toggle - only show on desktop */}
      {!isMobileDrawer && (
        <div className="h-14 sm:h-16 shrink-0 flex items-end px-2 pb-1.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "w-full h-8 text-[hsl(var(--sidebar-foreground)/0.6)] hover:text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-accent))]",
                  isCollapsed ? "justify-center px-0" : "justify-between"
                )}
                onClick={() => {
                  hapticTap();
                  onToggle();
                }}
              >
                {!isCollapsed && <span className="text-xs">Collapse</span>}
                {isCollapsed ? (
                  <PanelLeft className={cn(ICON_SIZE, ICON_STROKE_DEFAULT)} />
                ) : (
                  <PanelLeftClose className={cn(ICON_SIZE, ICON_STROKE_DEFAULT)} />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              {isCollapsed ? 'Expand sidebar (⌘B)' : 'Collapse sidebar (⌘B)'}
            </TooltipContent>
          </Tooltip>
        </div>
      )}

      {/* Mobile drawer top spacer */}
      {isMobileDrawer && <div className="h-2 shrink-0" />}

      {/* Navigation */}
      <nav className="flex-1 p-2 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch] min-h-0">
        {navGroups.map((group) => (
          <div key={group.id}>
            {renderGroup(group)}
            {/* Insert Browse section after Store group */}
            {group.id === 'store' && renderBrowseSection()}
          </div>
        ))}
      </nav>
    </aside>
  );
}
