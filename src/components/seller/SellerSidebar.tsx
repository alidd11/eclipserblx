import { useState, useEffect } from 'react';
import { 
  LayoutDashboard, Package, ShoppingCart, Settings, LogOut, 
  ChevronLeft, ChevronRight, ChevronDown, LucideIcon, DollarSign, 
  LayoutGrid, Store, ExternalLink, Palette, CreditCard, Bell, Users, Gamepad2,
  Tag, BarChart3, FileText, HelpCircle, MessageCircle, Star
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

const navGroups: NavGroup[] = [
  {
    id: 'overview',
    title: 'Overview',
    icon: LayoutDashboard,
    items: [
      { title: 'Dashboard', icon: LayoutDashboard, href: '/seller' },
      { title: 'Analytics', icon: BarChart3, href: '/seller/analytics' },
    ],
  },
  {
    id: 'store',
    title: 'Store Management',
    icon: Package,
    items: [
      { title: 'Products', icon: Package, href: '/seller/products' },
      { title: 'Store Tabs', icon: LayoutGrid, href: '/seller/tabs' },
      { title: 'Discounts', icon: Tag, href: '/seller/discounts' },
      { title: 'Reviews', icon: Star, href: '/seller/reviews' },
    ],
  },
  {
    id: 'sales',
    title: 'Sales & Finance',
    icon: DollarSign,
    items: [
      { title: 'Orders', icon: ShoppingCart, href: '/seller/orders' },
      { title: 'Balance & Payouts', icon: DollarSign, href: '/seller/balance' },
      { title: 'All Documents', icon: FileText, href: '/seller/documents' },
    ],
  },
  {
    id: 'integrations',
    title: 'Integrations',
    icon: Gamepad2,
    items: [
      { title: 'Roblox', icon: Gamepad2, href: '/seller/roblox' },
      { title: 'Discord', icon: Bell, href: '/seller/settings/notifications' },
    ],
  },
  {
    id: 'support',
    title: 'Support',
    icon: HelpCircle,
    items: [
      { title: 'Customer Messages', icon: MessageCircle, href: '/seller/messages' },
      { title: 'Support Tickets', icon: HelpCircle, href: '/seller/support' },
    ],
  },
  {
    id: 'settings',
    title: 'Settings',
    icon: Settings,
    items: [
      { title: 'Store Settings', icon: Store, href: '/seller/settings/profile' },
      { title: 'Appearance', icon: Palette, href: '/seller/settings/appearance' },
      { title: 'Team', icon: Users, href: '/seller/settings/team' },
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
  
  // Initialize open groups from localStorage or default to all open
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const stored = safeStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return {};
      }
    }
    // Default: all groups open
    return navGroups.reduce((acc, group) => ({ ...acc, [group.id]: true }), {});
  });

  // Persist open groups to localStorage
  useEffect(() => {
    safeStorage.setItem(STORAGE_KEY, JSON.stringify(openGroups));
  }, [openGroups]);

  // Auto-expand group containing current route
  useEffect(() => {
    const currentPath = location.pathname;
    navGroups.forEach(group => {
      const hasActiveItem = group.items.some(item => 
        item.href === currentPath || (item.href === '/seller' && currentPath === '/seller')
      );
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

  // In mobile drawer mode, always show full sidebar (never collapsed)
  const isCollapsed = isMobileDrawer ? false : collapsed;

  const storeUrl = store?.slug ? `/store/${store.slug}` : '';

  const renderNavItem = (item: NavItem) => {
    const isActive = location.pathname === item.href || 
      (item.href === '/seller' && location.pathname === '/seller');

    const LinkContent = (
      <>
        <item.icon className={cn(
          "h-4 w-4 shrink-0 transition-all",
          isActive ? "stroke-[2.5]" : "stroke-[1.5]"
        )} />
        {!isCollapsed && (
          <span className="min-w-0 truncate leading-none">{item.title}</span>
        )}
      </>
    );

    const linkClassName = cn(
      "rounded-lg text-sm font-medium select-none",
      "transition-all duration-100 active:scale-[0.97] active:opacity-90",
      isCollapsed
        ? "flex items-center justify-center py-2.5"
        : "flex flex-row flex-nowrap items-center gap-3 px-3 py-2 ml-4",
      isActive
        ? "bg-[hsl(var(--sidebar-primary))] text-[hsl(var(--sidebar-primary-foreground))]"
        : "text-[hsl(var(--sidebar-foreground)/0.7)] hover:text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-accent))]"
    );

    if (!isCollapsed) {
      return (
        <NavLink
          key={item.href}
          to={item.href}
          end={item.href === '/seller'}
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
          <Link
            to={item.href}
            onClick={handleNavClick}
            className={linkClassName}
          >
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
      location.pathname === item.href || 
      (item.href === '/seller' && location.pathname === '/seller')
    );

    // All groups now render as collapsible sections regardless of item count

    // Collapsed mode: show group icon with tooltip listing items
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
                    ? "bg-[hsl(var(--sidebar-primary)/0.15)] text-[hsl(var(--sidebar-primary))]"
                    : "text-[hsl(var(--sidebar-foreground)/0.7)] hover:text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-accent))]"
                )}
                onClick={() => toggleGroup(group.id)}
              >
                <group.icon className={cn(
                  "h-4 w-4 transition-all",
                  hasActiveItem ? "stroke-[2.5]" : "stroke-[1.5]"
                )} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="p-0">
              <div className="py-2">
                <div className="px-3 pb-1 text-xs font-semibold text-muted-foreground">
                  {group.title}
                </div>
                {group.items.map(item => (
                  <NavLink
                    key={item.href}
                    to={item.href}
                    end={item.href === '/seller'}
                    onClick={handleNavClick}
                    className={({ isActive }) => cn(
                      "flex items-center gap-2 px-3 py-1.5 text-sm transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted"
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

    // Expanded mode: collapsible group
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
              "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium select-none",
              "transition-all duration-100 active:scale-[0.98] active:opacity-90",
              "focus:outline-none focus-visible:outline-none",
              hasActiveItem
                ? "text-[hsl(var(--sidebar-primary))]"
                : "text-[hsl(var(--sidebar-foreground)/0.6)] hover:text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-accent)/0.5)]"
            )}
          >
            <group.icon className={cn(
              "h-4 w-4 shrink-0 transition-all",
              hasActiveItem ? "stroke-[2.5]" : "stroke-[1.5]"
            )} />
            <span className="flex-1 text-left truncate text-xs uppercase tracking-wider">{group.title}</span>
            <ChevronDown 
              className={cn(
                "h-4 w-4 shrink-0 transition-transform duration-200",
                isOpen ? "rotate-0" : "-rotate-90"
              )} 
            />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-0.5 pt-0.5">
          {group.items.map(renderNavItem)}
        </CollapsibleContent>
      </Collapsible>
    );
  };

  return (
    <aside className={cn(
      "flex flex-col transition-all duration-300 shrink-0",
      "bg-[hsl(var(--sidebar-background))] text-[hsl(var(--sidebar-foreground))]",
      isMobileDrawer 
        ? "h-full w-full border-0 max-h-[100dvh]" 
        : "h-screen sticky top-0 border-r border-[hsl(var(--sidebar-border))]",
      !isMobileDrawer && (isCollapsed ? "w-14" : "w-64"),
      className
    )}>
      {/* Header */}
      <div className="p-4 pt-[calc(env(safe-area-inset-top)+1rem)] border-b border-[hsl(var(--sidebar-border))]">
        {!isCollapsed && (
          <>
            <h1 className="font-display font-bold text-xl text-[hsl(var(--sidebar-primary))] truncate">
              {store?.name || 'My Store'}
            </h1>
            <p className="text-xs text-[hsl(var(--sidebar-foreground)/0.6)]">Seller Dashboard</p>
          </>
        )}
        {isCollapsed && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center justify-center">
                <Store className="h-5 w-5 text-[hsl(var(--sidebar-primary))]" />
              </div>
            </TooltipTrigger>
            <TooltipContent side="right">{store?.name || 'My Store'}</TooltipContent>
          </Tooltip>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch] min-h-0">
        <div className="space-y-1">
          {navGroups.map(renderGroup)}
        </div>
      </nav>
      
      {/* Footer Links */}
      <div className="border-t border-[hsl(var(--sidebar-border))] p-2 space-y-1">
        {/* View Store Link */}
        {storeUrl && (
          <>
            {isCollapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    to={storeUrl}
                    onClick={handleNavClick}
                    className="flex items-center justify-center py-2.5 rounded-lg text-[hsl(var(--sidebar-foreground)/0.7)] hover:text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-accent))] transition-all"
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
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-[hsl(var(--sidebar-foreground)/0.7)] hover:text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-accent))] transition-all"
              >
                <ExternalLink className="h-4 w-4" />
                <span>View Store</span>
              </Link>
            )}
          </>
        )}

        {/* Sign Out */}
        {isCollapsed ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-center text-[hsl(var(--sidebar-foreground)/0.7)] hover:text-destructive hover:bg-[hsl(var(--sidebar-accent))]"
                onClick={() => {
                  hapticTap();
                  setShowSignOutDialog(true);
                }}
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Sign Out</TooltipContent>
          </Tooltip>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-[hsl(var(--sidebar-foreground)/0.7)] hover:text-destructive hover:bg-[hsl(var(--sidebar-accent))] rounded-lg px-3 py-2.5"
            onClick={() => {
              hapticTap();
              setShowSignOutDialog(true);
            }}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            <span className="ml-3">Sign Out</span>
          </Button>
        )}
      </div>

      {/* Desktop-only Collapse Toggle */}
      {!isMobileDrawer && (
        <div className="p-2 border-t border-[hsl(var(--sidebar-border))]">
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "w-full text-[hsl(var(--sidebar-foreground)/0.7)] hover:text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-accent))]",
              isCollapsed ? "justify-center px-2" : "justify-start"
            )}
            onClick={() => {
              hapticTap();
              onToggle();
            }}
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <>
                <ChevronLeft className="h-4 w-4 mr-2" />
                Collapse
              </>
            )}
          </Button>
        </div>
      )}

      <SignOutConfirmDialog
        open={showSignOutDialog}
        onOpenChange={setShowSignOutDialog}
        onConfirm={handleSignOut}
        isLoading={isSigningOut}
      />
    </aside>
  );
}
