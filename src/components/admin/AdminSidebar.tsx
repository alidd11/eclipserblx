import { useState, useEffect } from 'react';
import { 
  LayoutDashboard, Package, ShoppingCart, Users, Settings, LogOut, 
  ChevronLeft, ChevronRight, ChevronDown, MessageCircle, FileText, Star, 
  TrendingUp, Activity, ClipboardList, Mail, BarChart3, HelpCircle, 
  AlertTriangle, Tags, Ban, Gift, Key, Inbox, LucideIcon, Flag, Archive, Headphones, Shield, Megaphone
} from 'lucide-react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { SITE_NAME } from '@/lib/constants';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { SignOutConfirmDialog } from '@/components/auth/SignOutConfirmDialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { safeStorage } from '@/lib/safeStorage';

interface NavItem {
  title: string;
  icon: LucideIcon;
  href: string;
  roles: string[];
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
      { title: 'Dashboard', icon: LayoutDashboard, href: '/admin', roles: [] },
    ],
  },
  {
    id: 'analytics',
    title: 'Analytics & Finance',
    icon: BarChart3,
    items: [
      { title: 'Analytics', icon: BarChart3, href: '/admin/analytics', roles: ['admin'] },
      { title: 'Income', icon: TrendingUp, href: '/admin/income', roles: ['admin'] },
      { title: 'Referrals', icon: Gift, href: '/admin/referrals', roles: ['admin'] },
      { title: 'Staff Activity', icon: Activity, href: '/admin/staff-activity', roles: ['admin'] },
    ],
  },
  {
    id: 'store',
    title: 'Store Management',
    icon: Package,
    items: [
      { title: 'Products', icon: Package, href: '/admin/products', roles: ['admin', 'product_manager'] },
      { title: 'Reviews', icon: Star, href: '/admin/reviews', roles: ['admin'] },
      { title: 'Discounts', icon: Tags, href: '/admin/discounts', roles: ['admin'] },
      { title: 'Orders', icon: ShoppingCart, href: '/admin/orders', roles: ['admin', 'order_manager'] },
      { title: 'Bot Codes', icon: Key, href: '/admin/bot-codes', roles: ['admin'] },
    ],
  },
  {
    id: 'staff-comms',
    title: 'Staff Communications',
    icon: MessageCircle,
    items: [
      { title: 'Staff Messages', icon: MessageCircle, href: '/admin/staff-messages', roles: [] },
      { title: 'Admin Chat', icon: Shield, href: '/admin/admin-chat', roles: ['admin'] },
    ],
  },
  {
    id: 'customer-comms',
    title: 'Customer Support',
    icon: Headphones,
    items: [
      { title: 'Live Chat', icon: Inbox, href: '/admin/live-chat', roles: ['admin', 'support_agent'] },
      { title: 'Contact Messages', icon: Mail, href: '/admin/contact-messages', roles: ['admin', 'support_agent'] },
      { title: 'Forum Reports', icon: Flag, href: '/admin/forum-reports', roles: ['admin', 'support_agent'] },
    ],
  },
  {
    id: 'team',
    title: 'Recruitment',
    icon: FileText,
    items: [
      { title: 'Job Channels', icon: Megaphone, href: '/admin/job-channels', roles: ['admin', 'recruiter'] },
      { title: 'Applications', icon: FileText, href: '/admin/applications', roles: ['admin', 'recruiter'] },
      { title: 'Archived', icon: Archive, href: '/admin/archived-applications', roles: ['admin'] },
    ],
  },
  {
    id: 'users',
    title: 'User Management',
    icon: Users,
    items: [
      { title: 'Users', icon: Users, href: '/admin/users', roles: ['admin'] },
      { title: 'IP Bans', icon: Ban, href: '/admin/ip-bans', roles: ['admin'] },
      { title: 'Subscribers', icon: Mail, href: '/admin/subscribers', roles: ['admin'] },
    ],
  },
  {
    id: 'system',
    title: 'System',
    icon: Settings,
    items: [
      { title: 'Incidents', icon: AlertTriangle, href: '/admin/incidents', roles: ['admin'] },
      { title: 'Audit Logs', icon: ClipboardList, href: '/admin/audit-logs', roles: ['admin'] },
      { title: 'Settings', icon: Settings, href: '/admin/settings', roles: [] },
      { title: 'Help', icon: HelpCircle, href: '/admin/help', roles: [] },
    ],
  },
];

const STORAGE_KEY = 'admin-sidebar-groups';

interface AdminSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  onNavigate?: () => void;
  isMobileDrawer?: boolean;
}

export function AdminSidebar({ collapsed, onToggle, onNavigate, isMobileDrawer = false }: AdminSidebarProps) {
  const { signOut } = useAuth();
  const { isAdmin, hasRole } = useAdminAuth();
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
        item.href === currentPath || (item.href === '/admin' && currentPath === '/admin')
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
    onNavigate?.();
  };

  const toggleGroup = (groupId: string) => {
    setOpenGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  const canAccessItem = (item: NavItem) => 
    item.roles.length === 0 || isAdmin || item.roles.some(role => hasRole(role));

  const getFilteredGroups = () => {
    return navGroups
      .map(group => ({
        ...group,
        items: group.items.filter(canAccessItem),
      }))
      .filter(group => group.items.length > 0);
  };

  const filteredGroups = getFilteredGroups();

  // In mobile drawer mode, always show full sidebar (never collapsed)
  const isCollapsed = isMobileDrawer ? false : collapsed;

  const renderNavItem = (item: NavItem) => {
    const isActive = location.pathname === item.href || 
      (item.href === '/admin' && location.pathname === '/admin');

    const LinkContent = (
      <>
        <item.icon className="h-4 w-4 shrink-0" />
        {!isCollapsed && (
          <span className="min-w-0 truncate leading-none">{item.title}</span>
        )}
      </>
    );

    const linkClassName = cn(
      "rounded-lg transition-colors text-sm font-medium",
      isCollapsed
        ? "flex items-center justify-center py-2.5"
        : "flex flex-row flex-nowrap items-center gap-3 px-3 py-2 ml-4",
      isActive
        ? "bg-primary text-primary-foreground"
        : "text-muted-foreground hover:text-foreground hover:bg-muted"
    );

    if (!isCollapsed) {
      return (
        <NavLink
          key={item.href}
          to={item.href}
          end={item.href === '/admin'}
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
          <NavLink
            to={item.href}
            end={item.href === '/admin'}
            onClick={handleNavClick}
            className={linkClassName}
          >
            {LinkContent}
          </NavLink>
        </TooltipTrigger>
        <TooltipContent side="right">{item.title}</TooltipContent>
      </Tooltip>
    );
  };

  const renderGroup = (group: NavGroup & { items: NavItem[] }) => {
    const isOpen = openGroups[group.id] ?? true;
    const hasActiveItem = group.items.some(item => 
      location.pathname === item.href || 
      (item.href === '/admin' && location.pathname === '/admin')
    );

    // For single-item groups, just render the item directly
    if (group.items.length === 1) {
      return (
        <div key={group.id} className="mb-1">
          {renderNavItem(group.items[0])}
        </div>
      );
    }

    // Collapsed mode: show group icon with tooltip listing items
    if (isCollapsed) {
      return (
        <div key={group.id} className="mb-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                className={cn(
                  "w-full flex items-center justify-center py-2.5 rounded-lg transition-colors focus:outline-none focus-visible:outline-none",
                  hasActiveItem
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
                onClick={() => toggleGroup(group.id)}
              >
                <group.icon className="h-4 w-4" />
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
                    end={item.href === '/admin'}
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
              "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm font-medium focus:outline-none focus-visible:outline-none",
              hasActiveItem
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            <group.icon className="h-4 w-4 shrink-0" />
            <span className="flex-1 text-left truncate">{group.title}</span>
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
      "border-r border-border bg-card flex flex-col transition-all duration-300 shrink-0",
      isMobileDrawer ? "h-full w-full pb-[env(safe-area-inset-bottom)]" : "h-screen sticky top-0",
      !isMobileDrawer && (isCollapsed ? "w-14" : "w-64")
    )}>
      {/* Header */}
      <div className="p-4 border-b border-border">
        {!isCollapsed && (
          <>
            <h1 className="font-display font-bold text-xl">{SITE_NAME}</h1>
            <p className="text-xs text-muted-foreground">Admin Dashboard</p>
          </>
        )}
        {isCollapsed && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center justify-center">
                <span className="font-display font-bold text-lg">E</span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="right">{SITE_NAME}</TooltipContent>
          </Tooltip>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 overflow-y-auto">
        {filteredGroups.map(renderGroup)}

        {/* Sign Out - inline with nav items on mobile for visibility */}
        {isMobileDrawer && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-muted rounded-lg px-3 py-2.5 mt-2"
            onClick={() => setShowSignOutDialog(true)}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            <span className="ml-3">Sign Out</span>
          </Button>
        )}
      </nav>

      {/* Footer - Desktop only (mobile Sign Out is inline with nav) */}
      {!isMobileDrawer && (
        <div className="p-2 border-t border-border space-y-1">

        {/* Collapse Toggle */}
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "w-full text-muted-foreground hover:text-foreground",
            isCollapsed ? "justify-center px-2" : "justify-start"
          )}
          onClick={onToggle}
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

        {/* Sign Out */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "w-full text-muted-foreground hover:text-destructive",
                isCollapsed ? "justify-center px-2" : "justify-start"
              )}
              onClick={() => setShowSignOutDialog(true)}
            >
              <LogOut className="h-4 w-4 shrink-0" />
              {!isCollapsed && <span className="ml-3">Sign Out</span>}
            </Button>
          </TooltipTrigger>
          {isCollapsed && <TooltipContent side="right">Sign Out</TooltipContent>}
        </Tooltip>
        </div>
      )}

      {/* Sign Out Confirmation Dialog */}
      <SignOutConfirmDialog
        open={showSignOutDialog}
        onOpenChange={setShowSignOutDialog}
        onConfirm={handleSignOut}
        isLoading={isSigningOut}
      />
    </aside>
  );
}
