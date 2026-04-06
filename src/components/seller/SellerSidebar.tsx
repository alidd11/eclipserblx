import { useState, useEffect } from 'react';
import { 
  LayoutDashboard, Package, ShoppingCart, Settings, LogOut, 
  ChevronLeft, ChevronRight, ChevronDown, LucideIcon, DollarSign, 
  LayoutGrid, Store, ExternalLink, Palette, CreditCard, Bell, Users,
  Tag, BarChart3, FileText, HelpCircle, MessageCircle, Star, Bot, Import,
  Gamepad2, Layers, TrendingUp, Receipt, LineChart, Megaphone,
  RotateCcw, PackagePlus, Globe, Inbox, Sparkles, Calculator, Crown, Shield, Webhook, Activity
} from 'lucide-react';
import { NavLink, useNavigate, useLocation, Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useSellerStatus } from '@/hooks/useSellerStatus';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { SignOutConfirmDialog } from '@/components/auth/SignOutConfirmDialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { safeStorage } from '@/lib/safeStorage';
import { hapticTap } from '@/lib/haptics';
import { useSellerUnreadCount } from '@/hooks/useSellerUnreadCount';
import { StoreSwitcher } from './StoreSwitcher';

interface NavItem {
  title: string;
  icon: LucideIcon;
  href: string;
}

interface NavGroup {
  id: string;
  title: string;
  icon: LucideIcon;
  items: NavItem[];
}

// Top-level items (no group)
const topLevelItems: NavItem[] = [
  { title: 'Dashboard', icon: LayoutDashboard, href: '/seller' },
  { title: 'Orders', icon: ShoppingCart, href: '/seller/orders' },
  { title: 'Analytics', icon: BarChart3, href: '/seller/analytics' },
  { title: 'Store Builder', icon: Sparkles, href: '/seller/store-builder' },
  { title: 'Asset Protection', icon: Shield, href: '/seller/security' },
  { title: 'Account Health', icon: Activity, href: '/seller/account-health' },
  { title: 'Eclipse Pro', icon: Crown, href: '/seller/pro' },
];

const navGroups: NavGroup[] = [
  {
    id: 'products',
    title: 'Products & Content',
    icon: Package,
    items: [
      { title: 'Products', icon: Package, href: '/seller/products' },
      { title: 'Categories', icon: LayoutGrid, href: '/seller/categories' },
      { title: 'Store Sections', icon: Layers, href: '/seller/tabs' },
      { title: 'Pages', icon: FileText, href: '/seller/store-pages' },
      { title: 'Import', icon: Import, href: '/seller/import' },
    ],
  },
  {
    id: 'marketing',
    title: 'Marketing & Sales',
    icon: Megaphone,
    items: [
      { title: 'Ad Manager', icon: Sparkles, href: '/seller/promote' },
      { title: 'Discount Codes', icon: Tag, href: '/seller/discounts' },
      { title: 'Campaigns', icon: Megaphone, href: '/seller/campaigns' },
      { title: 'Bundle Deals', icon: PackagePlus, href: '/seller/bundles' },
      { title: 'Announcements', icon: Bell, href: '/seller/announcements' },
    ],
  },
  {
    id: 'customers',
    title: 'Customers & Inbox',
    icon: Inbox,
    items: [
      { title: 'Messages', icon: MessageCircle, href: '/seller/messages' },
      { title: 'Reviews', icon: Star, href: '/seller/reviews' },
      { title: 'Disputes', icon: RotateCcw, href: '/seller/refunds' },
      { title: 'Notifications', icon: Bell, href: '/seller/notifications' },
    ],
  },
  {
    id: 'finance',
    title: 'Finance',
    icon: DollarSign,
    items: [
      { title: 'Finance', icon: DollarSign, href: '/seller/finance' },
      { title: 'Documents', icon: FileText, href: '/seller/documents' },
      { title: 'Goals', icon: TrendingUp, href: '/seller/goals' },
    ],
  },
  {
    id: 'integrations',
    title: 'Integrations',
    icon: Gamepad2,
    items: [
      { title: 'Discord', icon: MessageCircle, href: '/seller/discord' },
      { title: 'Discord Bots', icon: Bot, href: '/seller/bots' },
      { title: 'Roblox', icon: Gamepad2, href: '/seller/roblox' },
      { title: 'Webhooks', icon: Webhook, href: '/seller/webhooks' },
    ],
  },
  {
    id: 'settings',
    title: 'Settings',
    icon: Settings,
    items: [
      { title: 'Store Profile', icon: Store, href: '/seller/settings/profile' },
      { title: 'Appearance', icon: Palette, href: '/seller/settings/appearance' },
      { title: 'Custom Domain', icon: Globe, href: '/seller/settings/domain' },
      { title: 'Payments', icon: CreditCard, href: '/seller/settings/payments' },
      { title: 'Team', icon: Users, href: '/seller/settings/team' },
    ],
  },
];

const STORAGE_KEY = 'seller-sidebar-groups';

interface SellerSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  onNavigate?: () => void;
  isMobileDrawer?: boolean;
  className?: string;
}

export function SellerSidebar({ collapsed, onToggle, onNavigate, isMobileDrawer = false, className }: SellerSidebarProps) {
  const { signOut } = useAuth();
  const { store } = useSellerStatus();
  const navigate = useNavigate();
  const location = useLocation();
  const unreadCount = useSellerUnreadCount();
  const [showSignOutDialog, setShowSignOutDialog] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const stored = safeStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return {};
      }
    }
    return { products: true, customers: true, marketing: false, finance: false, integrations: false, settings: false };
  });

  useEffect(() => {
    safeStorage.setItem(STORAGE_KEY, JSON.stringify(openGroups));
  }, [openGroups]);

  useEffect(() => {
    const currentPath = location.pathname;
    navGroups.forEach(group => {
      const hasActiveItem = group.items.some(item => item.href === currentPath);
      if (hasActiveItem && !openGroups[group.id]) {
        setOpenGroups(prev => ({ ...prev, [group.id]: true }));
      }
    });
  }, [location.pathname]);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    await signOut();
    setIsSigningOut(false);
    setShowSignOutDialog(false);
    navigate('/');
  };

  const handleNavClick = () => {
    hapticTap();
    onNavigate?.();
  };

  const toggleGroup = (groupId: string) => {
    hapticTap();
    setOpenGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  const isCollapsed = isMobileDrawer ? false : collapsed;
  const storeUrl = store?.slug ? `/store/${store.slug}` : '';

  const renderNavLink = (item: NavItem, end = false) => {
    const isActive = location.pathname === item.href;

    const content = (
      <>
        <item.icon className={cn(
          "h-4 w-4 shrink-0 transition-colors",
          isActive ? "stroke-[2.25]" : "stroke-[1.75] text-muted-foreground group-hover:text-foreground"
        )} />
        {!isCollapsed && (
          <span className="min-w-0 truncate flex-1">{item.title}</span>
        )}
        {item.title === 'Notifications' && unreadCount > 0 && (
          <span className={cn(
            "inline-flex items-center justify-center text-[10px] font-bold rounded-full shrink-0",
            isCollapsed ? "absolute -top-1 -right-1 h-4 min-w-4 px-1 bg-destructive text-destructive-foreground" : "h-5 min-w-5 px-1.5 bg-destructive text-destructive-foreground"
          )}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </>
    );

    const linkClass = cn(
      "group rounded-md text-[13px] font-medium select-none transition-all duration-150 relative",
      "",
      isCollapsed
        ? "flex items-center justify-center p-2"
        : "flex items-center gap-2.5 px-2.5 py-1.5",
      isActive
        ? "border-l-2 border-primary bg-muted/60 text-foreground !rounded-l-none pl-[calc(0.625rem-2px)]"
        : "text-foreground/80 hover:text-foreground hover:bg-muted/60"
    );

    if (isCollapsed) {
      return (
        <Tooltip key={item.href}>
          <TooltipTrigger asChild>
            <Link to={item.href} onClick={handleNavClick} className={linkClass}>
              {content}
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right">{item.title}</TooltipContent>
        </Tooltip>
      );
    }

    return (
      <NavLink
        key={item.href}
        to={item.href}
        end={end}
        onClick={handleNavClick}
        className={linkClass}
      >
        {content}
      </NavLink>
    );
  };

  const renderGroup = (group: NavGroup) => {
    const isOpen = openGroups[group.id] ?? true;
    const hasActiveItem = group.items.some(item => location.pathname === item.href);

    if (isCollapsed) {
      return (
        <div key={group.id}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                className={cn(
                  "w-full flex items-center justify-center p-2.5 rounded-md select-none",
                  "transition-all duration-150",
                  "focus:outline-none",
                  hasActiveItem
                    ? "bg-primary/10 text-primary"
                    : "text-foreground/80 hover:text-foreground hover:bg-muted/60"
                )}
                onClick={() => toggleGroup(group.id)}
              >
                <group.icon className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="p-0">
              <div className="py-1.5">
                <div className="px-3 pb-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                  {group.title}
                </div>
                {group.items.map(item => (
                  <NavLink
                    key={item.href}
                    to={item.href}
                    onClick={handleNavClick}
                    className={({ isActive }) => cn(
                      "flex items-center gap-2 px-3 py-1.5 text-sm transition-colors",
                      isActive ? "bg-muted/60 text-foreground border-l-2 border-primary pl-[calc(0.75rem-2px)]" : "hover:bg-muted"
                    )}
                  >
                    <item.icon className="h-3.5 w-3.5" />
                    {item.title}
                  </NavLink>
                ))}
              </div>
            </TooltipContent>
          </Tooltip>
        </div>
      );
    }

    return (
      <Collapsible
        key={group.id}
        open={isOpen}
        onOpenChange={() => toggleGroup(group.id)}
      >
        <CollapsibleTrigger asChild>
          <button
            className={cn(
              "w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[11px] font-semibold uppercase tracking-wider select-none",
              "transition-all duration-150",
              "focus:outline-none",
              hasActiveItem
                ? "text-foreground"
                : "text-muted-foreground/70 hover:text-muted-foreground"
            )}
          >
            <span className="flex-1 text-left truncate">{group.title}</span>
            <ChevronDown
              className={cn(
                "h-3.5 w-3.5 shrink-0 transition-transform duration-200",
                isOpen ? "rotate-0" : "-rotate-90"
              )} 
            />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="ml-3 space-y-px pt-px pb-0.5">
          {group.items.map(item => renderNavLink(item))}
        </CollapsibleContent>
      </Collapsible>
    );
  };

  return (
    <aside className={cn(
      "flex flex-col transition-all duration-300 shrink-0 overflow-x-hidden",
      "bg-card text-foreground",
      isMobileDrawer 
        ? "h-full w-full border-0" 
        : "h-[100dvh] sticky top-0 border-r border-border",
      !isMobileDrawer && (isCollapsed ? "w-14" : "w-56"),
      className
    )}>
      {/* Header with banner + logo */}
      <div className="border-b border-border/50 overflow-hidden">
        {/* Banner - hidden on mobile drawer to save space */}
        {!isMobileDrawer && (
          <div className="relative h-16 pt-[env(safe-area-inset-top)]">
            {store?.banner_url ? (
              <img
                src={store.banner_url}
                alt=""
                className="absolute inset-0 w-full h-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 bg-primary/10" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-card via-card/60 to-transparent" />
          </div>
        )}

        {/* Store info below banner */}
        {!isCollapsed ? (
          <div className={cn("relative px-3 pb-2.5 flex items-center gap-2.5", isMobileDrawer ? "pt-3" : "pt-2")}>
            <div className="h-10 w-10 rounded-lg border-2 border-card bg-card shrink-0 overflow-hidden shadow-sm">
              {store?.logo_url ? (
                <img src={store.logo_url} alt={store?.name || 'Store'} className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full bg-primary/10 flex items-center justify-center">
                  <Store className="h-5 w-5 text-primary" />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="font-display font-bold text-sm text-foreground truncate">
                {store?.name || 'My Store'}
              </h1>
              <p className="text-[10px] text-primary/70 font-semibold uppercase tracking-wider leading-none mt-1">Seller Dashboard</p>
            </div>
            {isMobileDrawer ? (
              <Button
                variant="ghost"
                size="icon" aria-label="Log out"
                className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive hover:bg-muted/60"
                onClick={() => { hapticTap(); setShowSignOutDialog(true); }}
              >
                <LogOut className="h-3.5 w-3.5" />
              </Button>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon" aria-label="Log out"
                    className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive hover:bg-muted/60"
                    onClick={() => { hapticTap(); setShowSignOutDialog(true); }}
                  >
                    <LogOut className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">Sign Out</TooltipContent>
              </Tooltip>
            )}
          </div>
        ) : (
          <div className="relative px-1 pb-2 pt-2 flex flex-col items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="h-8 w-8 rounded-lg border-2 border-card bg-card overflow-hidden shadow-sm">
                  {store?.logo_url ? (
                    <img src={store.logo_url} alt={store?.name || 'Store'} className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full bg-primary/10 flex items-center justify-center">
                      <Store className="h-4 w-4 text-primary" />
                    </div>
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent side="right">{store?.name || 'My Store'}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon" aria-label="Log out"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-muted/60"
                  onClick={() => { hapticTap(); setShowSignOutDialog(true); }}
                >
                  <LogOut className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Sign Out</TooltipContent>
            </Tooltip>
          </div>
        )}
      </div>

      {/* Store Switcher (multi-store access) */}
      {!isCollapsed && (
        <div className="border-b border-border/50 px-1.5 py-1">
          <StoreSwitcher />
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 p-1.5 pb-[env(safe-area-inset-bottom)] overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch] min-h-0">
        {/* Top-level links */}
        <div className="space-y-px mb-1">
          {topLevelItems.map(item => renderNavLink(item, item.href === '/seller'))}
        </div>

        {/* Separator */}
        <div className="h-px bg-border/40 mx-1 mb-1" />

        {/* Grouped sections */}
        <div className="space-y-0.5">
          {navGroups.map(renderGroup)}
        </div>
      </nav>
      
      {/* Footer */}
      <div className="border-t border-border/50 p-1.5 space-y-px">
        {storeUrl && (
          isCollapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  to={storeUrl}
                  onClick={handleNavClick}
                  className="flex items-center justify-center p-2.5 rounded-md text-foreground/80 hover:text-foreground hover:bg-muted/60 transition-all"
                >
                  <ExternalLink className="h-4 w-4" />
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">View Store</TooltipContent>
            </Tooltip>
          ) : (
            <Link
              to={storeUrl}
              onClick={handleNavClick}
              className="flex items-center gap-2.5 px-2.5 py-[7px] rounded-md text-[13px] font-medium text-foreground/80 hover:text-foreground hover:bg-muted/60 transition-all"
            >
              <ExternalLink className="h-4 w-4" />
              <span>View Store</span>
            </Link>
          )
        )}

      </div>

      <SignOutConfirmDialog
        open={showSignOutDialog}
        onOpenChange={setShowSignOutDialog}
        onConfirm={handleSignOut}
        isLoading={isSigningOut}
      />
    </aside>
  );
}
