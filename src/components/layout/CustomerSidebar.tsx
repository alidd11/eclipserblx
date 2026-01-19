import { useState, useEffect } from 'react';
import { 
  Package, Grid3X3, Star, Circle, MessageSquare, Briefcase, 
  HelpCircle, Mail, FileQuestion, Activity, FileText, Shield, 
  RotateCcw, ChevronDown, ChevronLeft, ChevronRight, ShoppingCart, 
  User, LogOut, LucideIcon, Home, Search, TrendingUp
} from 'lucide-react';
import { NavLink, useLocation, useNavigate, Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useCart } from '@/hooks/useCart';
import { SITE_NAME } from '@/lib/constants';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { SignOutConfirmDialog } from '@/components/auth/SignOutConfirmDialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { safeStorage } from '@/lib/safeStorage';
import { hapticTap } from '@/lib/haptics';
import { EclipseLogo } from '@/components/ui/EclipseLogo';
import { useDiscordUrl } from '@/hooks/useDiscordUrl';
import { supabase } from '@/integrations/supabase/client';
import { useSearchCommand } from '@/hooks/useSearchCommand';

interface NavItem {
  title: string;
  icon: LucideIcon;
  href: string;
  external?: boolean;
  showStatusDot?: boolean;
}

interface NavGroup {
  id: string;
  title: string;
  icon: LucideIcon;
  items: NavItem[];
}

// Discord icon component
const DiscordIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
  </svg>
);

const STORAGE_KEY = 'customer-sidebar-groups';
const COLLAPSED_KEY = 'customer-sidebar-collapsed';

type SystemStatus = 'online' | 'degraded' | 'offline' | 'checking';

interface CustomerSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  onNavigate?: () => void;
  isMobileDrawer?: boolean;
  className?: string;
}

export function CustomerSidebar({ collapsed, onToggle, onNavigate, isMobileDrawer = false, className }: CustomerSidebarProps) {
  const { user, signOut } = useAuth();
  const { itemCount } = useCart();
  const { discordUrl } = useDiscordUrl();
  const searchCommand = useSearchCommand();
  const navigate = useNavigate();
  const location = useLocation();
  const [showSignOutDialog, setShowSignOutDialog] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [systemStatus, setSystemStatus] = useState<SystemStatus>('checking');

  // Use collapsed from props unless in mobile drawer mode
  const isCollapsed = isMobileDrawer ? false : collapsed;

  // Navigation groups
  const navGroups: NavGroup[] = [
    {
      id: 'home',
      title: 'Home',
      icon: Home,
      items: [
        { title: 'Home', icon: Home, href: '/' },
      ],
    },
    {
      id: 'products',
      title: 'Products',
      icon: Package,
      items: [
        { title: 'All Products', icon: Grid3X3, href: '/products' },
        { title: 'Categories', icon: Grid3X3, href: '/categories' },
        { title: 'Featured', icon: Star, href: '/products?featured=true' },
        { title: 'Eclipse+', icon: Circle, href: '/eclipse-plus' },
      ],
    },
    {
      id: 'affiliate',
      title: 'Affiliate',
      icon: TrendingUp,
      items: [
        { title: 'Affiliate Program', icon: TrendingUp, href: '/affiliate' },
      ],
    },
    {
      id: 'community',
      title: 'Community',
      icon: MessageSquare,
      items: [
        { title: 'Forum', icon: MessageSquare, href: '/forum' },
        { title: 'Jobs', icon: Briefcase, href: '/jobs' },
        { title: 'Discord', icon: DiscordIcon as unknown as LucideIcon, href: discordUrl, external: true },
      ],
    },
    {
      id: 'support',
      title: 'Support',
      icon: HelpCircle,
      items: [
        { title: 'Help Center', icon: HelpCircle, href: '/support' },
        { title: 'Contact Us', icon: Mail, href: '/contact' },
        { title: 'FAQ', icon: FileQuestion, href: '/faq' },
        { title: 'System Status', icon: Activity, href: '/status', showStatusDot: true },
      ],
    },
    {
      id: 'legal',
      title: 'Legal',
      icon: FileText,
      items: [
        { title: 'Terms of Service', icon: FileText, href: '/terms' },
        { title: 'Privacy Policy', icon: Shield, href: '/privacy' },
        { title: 'Refund Policy', icon: RotateCcw, href: '/refunds' },
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

  // Auto-expand group containing current route
  useEffect(() => {
    const currentPath = location.pathname;
    navGroups.forEach(group => {
      const hasActiveItem = group.items.some(item => 
        !item.external && (item.href === currentPath || (item.href === '/' && currentPath === '/'))
      );
      if (hasActiveItem && !openGroups[group.id]) {
        setOpenGroups(prev => ({ ...prev, [group.id]: true }));
      }
    });
  }, [location.pathname]);

  // Check system status
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const start = Date.now();
        const { error } = await supabase.from('categories').select('id').limit(1);
        const latency = Date.now() - start;
        
        if (error) {
          setSystemStatus('offline');
        } else if (latency > 2000) {
          setSystemStatus('degraded');
        } else {
          setSystemStatus('online');
        }
      } catch {
        setSystemStatus('offline');
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 60000);
    return () => clearInterval(interval);
  }, []);

  const statusConfig = {
    online: { color: 'text-green-500', bg: 'bg-green-500' },
    degraded: { color: 'text-yellow-500', bg: 'bg-yellow-500' },
    offline: { color: 'text-red-500', bg: 'bg-red-500' },
    checking: { color: 'text-muted-foreground', bg: 'bg-muted-foreground' },
  };

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

  const renderNavItem = (item: NavItem) => {
    const isActive = !item.external && (
      location.pathname === item.href || 
      (item.href === '/' && location.pathname === '/') ||
      (item.href.includes('?') && location.pathname + location.search === item.href)
    );

    const LinkContent = (
      <>
        <div className="relative shrink-0">
          {typeof item.icon === 'function' && 'render' in item.icon ? (
            <item.icon className={cn(
              "h-4 w-4 transition-all",
              isActive ? "stroke-[2.5]" : "stroke-[1.5]"
            )} />
          ) : (
            <item.icon className={cn(
              "h-4 w-4 transition-all",
              isActive ? "stroke-[2.5]" : "stroke-[1.5]"
            )} />
          )}
        </div>
        {!isCollapsed && (
          <span className="min-w-0 truncate leading-none flex-1">{item.title}</span>
        )}
        {!isCollapsed && item.showStatusDot && (
          <Circle className={cn('h-2.5 w-2.5 fill-current shrink-0', statusConfig[systemStatus].color)} />
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
        ? "bg-primary text-primary-foreground"
        : "text-muted-foreground hover:text-foreground hover:bg-muted"
    );

    // External link (Discord)
    if (item.external) {
      if (isCollapsed) {
        return (
          <Tooltip key={item.title}>
            <TooltipTrigger asChild>
              <a
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleNavClick}
                className={linkClassName}
              >
                {LinkContent}
              </a>
            </TooltipTrigger>
            <TooltipContent side="right">{item.title}</TooltipContent>
          </Tooltip>
        );
      }
      return (
        <a
          key={item.title}
          href={item.href}
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleNavClick}
          className={linkClassName}
        >
          {LinkContent}
        </a>
      );
    }

    // Internal link
    if (!isCollapsed) {
      return (
        <NavLink
          key={item.href}
          to={item.href}
          end={item.href === '/'}
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
      !item.external && (
        location.pathname === item.href || 
        (item.href === '/' && location.pathname === '/') ||
        (item.href.includes('?') && location.pathname + location.search === item.href)
      )
    );

    // Single-item groups render directly
    if (group.items.length === 1) {
      return (
        <div key={group.id} className="mb-1">
          {renderNavItem(group.items[0])}
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
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
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
                {group.items.map(item => {
                  if (item.external) {
                    return (
                      <a
                        key={item.title}
                        href={item.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={handleNavClick}
                        className="flex items-center gap-2 px-3 py-1.5 text-sm transition-colors hover:bg-muted"
                      >
                        <item.icon className="h-3.5 w-3.5" />
                        {item.title}
                      </a>
                    );
                  }
                  return (
                    <NavLink
                      key={item.href}
                      to={item.href}
                      end={item.href === '/'}
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
                      {item.showStatusDot && (
                        <Circle className={cn('h-2 w-2 fill-current ml-auto', statusConfig[systemStatus].color)} />
                      )}
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
              "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium select-none",
              "transition-all duration-100 active:scale-[0.98] active:opacity-90",
              "focus:outline-none focus-visible:outline-none",
              hasActiveItem
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
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
    <aside 
      className={cn(
        "bg-card flex flex-col transition-all duration-300 shrink-0 h-screen sticky top-0 border-r border-border",
        isCollapsed ? "w-14" : "w-64",
        className
      )}
      data-gesture-exempt="true"
    >
      {/* Header */}
      <div className="p-4 border-b border-border pt-[max(1rem,env(safe-area-inset-top))]">
        <Link to="/" className="flex items-center gap-2" onClick={handleNavClick}>
          <EclipseLogo size="sm" />
          {!isCollapsed && (
            <span className="font-display text-lg font-bold gradient-text">
              {SITE_NAME}
            </span>
          )}
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch] min-h-0">
        {navGroups.map(renderGroup)}
      </nav>

      {/* Footer */}
      <div className="p-2 border-t border-border space-y-1 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {/* Cart */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              to="/cart"
              onClick={handleNavClick}
              className={cn(
                "flex items-center rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-100 active:scale-[0.97]",
                isCollapsed ? "justify-center py-2.5" : "gap-3 px-3 py-2"
              )}
            >
              <div className="relative shrink-0">
                <ShoppingCart className="h-4 w-4" />
                {itemCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-primary text-[10px] font-medium text-primary-foreground flex items-center justify-center">
                    {itemCount}
                  </span>
                )}
              </div>
              {!isCollapsed && <span>Cart</span>}
            </Link>
          </TooltipTrigger>
          {isCollapsed && <TooltipContent side="right">Cart {itemCount > 0 && `(${itemCount})`}</TooltipContent>}
        </Tooltip>

        {/* Account or Sign In */}
        {user ? (
          <>
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  to="/account"
                  onClick={handleNavClick}
                  className={cn(
                    "flex items-center rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-100 active:scale-[0.97]",
                    isCollapsed ? "justify-center py-2.5" : "gap-3 px-3 py-2"
                  )}
                >
                  <User className="h-4 w-4 shrink-0" />
                  {!isCollapsed && <span>My Account</span>}
                </Link>
              </TooltipTrigger>
              {isCollapsed && <TooltipContent side="right">My Account</TooltipContent>}
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "w-full text-muted-foreground hover:text-destructive hover:bg-muted",
                    isCollapsed ? "justify-center px-2" : "justify-start"
                  )}
                  onClick={() => {
                    hapticTap();
                    setShowSignOutDialog(true);
                  }}
                >
                  <LogOut className="h-4 w-4 shrink-0" />
                  {!isCollapsed && <span className="ml-3">Sign Out</span>}
                </Button>
              </TooltipTrigger>
              {isCollapsed && <TooltipContent side="right">Sign Out</TooltipContent>}
            </Tooltip>
          </>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                to="/auth"
                onClick={handleNavClick}
                className={cn(
                  "flex items-center rounded-lg text-sm font-medium transition-all duration-100 active:scale-[0.97]",
                  isCollapsed 
                    ? "justify-center py-2.5 gradient-button text-primary-foreground" 
                    : "gap-3 px-3 py-2 gradient-button text-primary-foreground"
                )}
              >
                <User className="h-4 w-4 shrink-0" />
                {!isCollapsed && <span>Sign In</span>}
              </Link>
            </TooltipTrigger>
            {isCollapsed && <TooltipContent side="right">Sign In</TooltipContent>}
          </Tooltip>
        )}

        {/* Collapse Toggle - hide in mobile drawer */}
        {!isMobileDrawer && (
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "w-full text-muted-foreground hover:text-foreground",
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
                <ChevronLeft className="h-4 w-4 mr-3" />
                Collapse
              </>
            )}
          </Button>
        )}
      </div>

      {/* Sign Out Dialog */}
      <SignOutConfirmDialog
        open={showSignOutDialog}
        onOpenChange={setShowSignOutDialog}
        onConfirm={handleSignOut}
        isLoading={isSigningOut}
      />
    </aside>
  );
}
