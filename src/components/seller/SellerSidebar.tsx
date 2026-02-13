import { useState, useEffect } from 'react';
import { 
  LayoutDashboard, Package, ShoppingCart, Settings, LogOut, 
  ChevronLeft, ChevronRight, ChevronDown, LucideIcon, DollarSign, 
  LayoutGrid, Store, ExternalLink, Palette, CreditCard, Bell, Users,
  Tag, BarChart3, FileText, HelpCircle, MessageCircle, Star, Bot, Import,
  Gamepad2, Layers, TrendingUp, Receipt, LineChart
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
];

const navGroups: NavGroup[] = [
  {
    id: 'daily-ops',
    title: 'Daily Operations',
    icon: BarChart3,
    items: [
      { title: 'Analytics', icon: BarChart3, href: '/seller/analytics' },
      { title: 'Recent Orders', icon: ShoppingCart, href: '/seller/orders' },
      { title: 'Customer Messages', icon: MessageCircle, href: '/seller/messages' },
      { title: 'Support Tickets', icon: HelpCircle, href: '/seller/support' },
      { title: 'Reviews', icon: Star, href: '/seller/reviews' },
      { title: 'Discounts', icon: Tag, href: '/seller/discounts' },
      { title: 'Documents', icon: FileText, href: '/seller/documents' },
    ],
  },
  {
    id: 'products',
    title: 'Products',
    icon: Package,
    items: [
      { title: 'All Products', icon: Package, href: '/seller/products' },
      { title: 'Import', icon: Import, href: '/seller/import' },
      { title: 'Categories', icon: LayoutGrid, href: '/seller/categories' },
      { title: 'Store Sections', icon: Layers, href: '/seller/tabs' },
      { title: 'Discord Bots', icon: Bot, href: '/seller/bots' },
    ],
  },
  {
    id: 'finance',
    title: 'Finance',
    icon: DollarSign,
    items: [
      { title: 'Balance & Payouts', icon: DollarSign, href: '/seller/balance' },
      { title: 'Revenue Breakdown', icon: LineChart, href: '/seller/revenue' },
      { title: 'Transactions', icon: Receipt, href: '/seller/transactions' },
      { title: 'Fees & Summary', icon: TrendingUp, href: '/seller/fees' },
    ],
  },
  {
    id: 'integrations',
    title: 'Integrations',
    icon: Gamepad2,
    items: [
      { title: 'Discord', icon: MessageCircle, href: '/seller/discord' },
      { title: 'Roblox', icon: Gamepad2, href: '/seller/roblox' },
    ],
  },
  {
    id: 'settings',
    title: 'Settings',
    icon: Settings,
    items: [
      { title: 'Team', icon: Users, href: '/seller/settings/team' },
      { title: 'Store Profile', icon: Store, href: '/seller/settings/profile' },
      { title: 'Appearance', icon: Palette, href: '/seller/settings/appearance' },
      { title: 'Payments', icon: CreditCard, href: '/seller/settings/payments' },
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
    return navGroups.reduce((acc, group) => ({ ...acc, [group.id]: true }), {});
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
          isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"
        )} />
        {!isCollapsed && (
          <span className="min-w-0 truncate">{item.title}</span>
        )}
      </>
    );

    const linkClass = cn(
      "group rounded-md text-[13px] font-medium select-none transition-all duration-150",
      "active:scale-[0.98] active:opacity-90",
      isCollapsed
        ? "flex items-center justify-center p-2.5"
        : "flex items-center gap-2.5 px-2.5 py-[7px]",
      isActive
        ? "bg-primary text-primary-foreground shadow-sm"
        : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
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
                  "transition-all duration-150 active:scale-[0.98]",
                  "focus:outline-none",
                  hasActiveItem
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
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
                      isActive ? "bg-primary text-primary-foreground" : "hover:bg-muted"
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
            <ChevronDown 
              className={cn(
                "h-3 w-3 shrink-0 transition-transform duration-200",
                isOpen ? "rotate-0" : "-rotate-90"
              )} 
            />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="ml-[13px] border-l border-border/40 pl-2 space-y-0.5 pt-0.5 pb-1">
          {group.items.map(item => renderNavLink(item))}
        </CollapsibleContent>
      </Collapsible>
    );
  };

  return (
    <aside className={cn(
      "flex flex-col transition-all duration-300 shrink-0",
      "bg-card text-foreground",
      isMobileDrawer 
        ? "h-full w-full border-0 max-h-[100dvh]" 
        : "h-screen sticky top-0 border-r border-border",
      !isMobileDrawer && (isCollapsed ? "w-14" : "w-60"),
      className
    )}>
      {/* Header with banner + logo */}
      <div className="border-b border-border/50 overflow-hidden">
        {/* Banner */}
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

        {/* Store info overlaid at bottom of banner */}
        {!isCollapsed ? (
          <div className="relative px-3 pb-3 -mt-5 flex items-end gap-2.5">
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
              <p className="text-[11px] text-muted-foreground/60 leading-none mt-0.5">Seller Dashboard</p>
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive hover:bg-muted/60"
                  onClick={() => { hapticTap(); setShowSignOutDialog(true); }}
                >
                  <LogOut className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Sign Out</TooltipContent>
            </Tooltip>
          </div>
        ) : (
          <div className="relative px-1 pb-2 -mt-4 flex flex-col items-center gap-2">
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
                  size="icon"
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

      {/* Navigation */}
      <nav className="flex-1 p-2 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch] min-h-0">
        {/* Top-level links */}
        <div className="space-y-0.5 mb-1.5">
          {topLevelItems.map(item => renderNavLink(item, item.href === '/seller'))}
        </div>

        {/* Separator */}
        <div className="h-px bg-border/40 mx-1 mb-1.5" />

        {/* Grouped sections */}
        <div className="space-y-1.5">
          {navGroups.map(renderGroup)}
        </div>
      </nav>
      
      {/* Footer */}
      <div className="border-t border-border/50 p-2 space-y-0.5">
        {storeUrl && (
          isCollapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  to={storeUrl}
                  onClick={handleNavClick}
                  className="flex items-center justify-center p-2.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all"
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
              className="flex items-center gap-2.5 px-2.5 py-[7px] rounded-md text-[13px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all"
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
