import { useState, useEffect } from 'react';
import { 
  LayoutDashboard, Package, ShoppingCart, Users, Settings, LogOut, 
  ChevronLeft, ChevronRight, ChevronDown, MessageCircle, FileText, Star, 
  TrendingUp, Activity, ClipboardList, Mail, BarChart3, HelpCircle, 
  AlertTriangle, Tags, Ban, Gift, Key, Inbox, LucideIcon, Flag, Archive, Headphones, Shield, Megaphone, Bell, IdCard, Gamepad2, Store
} from 'lucide-react';
import { NavLink, useNavigate, useLocation, Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { SITE_NAME } from '@/lib/constants';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { SignOutConfirmDialog } from '@/components/auth/SignOutConfirmDialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { safeStorage } from '@/lib/safeStorage';
import { hapticTap } from '@/lib/haptics';
import { useChatNotifications } from '@/hooks/useChatNotifications';

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
      { title: 'Affiliates', icon: Gift, href: '/admin/affiliates', roles: ['admin'] },
      { title: 'Affiliate Applications', icon: FileText, href: '/admin/affiliate-applications', roles: ['admin'] },
      { title: 'Staff Activity', icon: Activity, href: '/admin/staff-activity', roles: ['admin'] },
    ],
  },
  {
    id: 'marketplace',
    title: 'Marketplace',
    icon: Store,
    items: [
      { title: 'Store Applications', icon: FileText, href: '/admin/store-applications', roles: ['admin'] },
      { title: 'Seller Products', icon: Package, href: '/admin/seller-products', roles: ['admin'] },
      { title: 'Seller Payouts', icon: TrendingUp, href: '/admin/seller-payouts', roles: ['admin'] },
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
      { title: 'Bot Queue', icon: Bell, href: '/admin/bot-queue', roles: [] },
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
      { title: 'Staff Directory', icon: IdCard, href: '/admin/staff-directory', roles: ['admin'] },
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
      { title: 'Discord', icon: MessageCircle, href: '/admin/discord-settings', roles: ['admin'] },
      { title: 'Roblox', icon: Gamepad2, href: '/admin/roblox-settings', roles: ['admin'] },
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
  const chatNotifications = useChatNotifications();
  
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
    hapticTap();
    onNavigate?.();
  };

  const toggleGroup = (groupId: string) => {
    hapticTap();
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

    // Determine notification status for chat items
    let hasMention = false;
    let hasUnread = false;
    
    if (item.href === '/admin/staff-messages') {
      hasMention = chatNotifications.staffMessagesMention;
      hasUnread = chatNotifications.staffMessagesUnread && !hasMention;
    } else if (item.href === '/admin/admin-chat') {
      hasMention = chatNotifications.adminChatMention;
      hasUnread = chatNotifications.adminChatUnread && !hasMention;
    }

    const NotificationDot = () => {
      if (hasMention) {
        return (
          <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-card animate-pulse" />
        );
      }
      if (hasUnread) {
        return (
          <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-yellow-500 ring-2 ring-card" />
        );
      }
      return null;
    };

    const LinkContent = (
      <>
        <div className="relative shrink-0">
          <item.icon className={cn(
            "h-4 w-4 transition-all",
            isActive ? "stroke-[2.5]" : "stroke-[1.5]"
          )} />
          <NotificationDot />
        </div>
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
      !isMobileDrawer && (isCollapsed ? "w-14" : "w-64")
    )}>
      {/* Header */}
      <div className="p-4 border-b border-[hsl(var(--sidebar-border))]">
        {!isCollapsed && (
          <>
            <h1 className="font-display font-bold text-xl text-[hsl(var(--sidebar-primary))]">{SITE_NAME}</h1>
            <p className="text-xs text-[hsl(var(--sidebar-foreground)/0.6)]">Admin Dashboard</p>
          </>
        )}
        {isCollapsed && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center justify-center">
                <span className="font-display font-bold text-lg text-[hsl(var(--sidebar-primary))]">E</span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="right">{SITE_NAME}</TooltipContent>
          </Tooltip>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch] min-h-0">
        {filteredGroups.map(renderGroup)}

        {/* Sign Out - inline with nav items on mobile for visibility */}
        {isMobileDrawer && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-[hsl(var(--sidebar-foreground)/0.7)] hover:text-destructive hover:bg-[hsl(var(--sidebar-accent))] rounded-lg px-3 py-2.5 mt-2 active:scale-[0.97] active:opacity-90 transition-all duration-100"
            onClick={() => {
              hapticTap();
              setShowSignOutDialog(true);
            }}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            <span className="ml-3">Sign Out</span>
          </Button>
        )}
      </nav>

      {/* Footer - Desktop only (mobile Sign Out is inline with nav) */}
      {!isMobileDrawer && (
        <div className="p-2 border-t border-[hsl(var(--sidebar-border))] space-y-1">

        {/* Collapse Toggle */}
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "w-full text-[hsl(var(--sidebar-foreground)/0.7)] hover:text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-accent))]",
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
                "w-full text-[hsl(var(--sidebar-foreground)/0.7)] hover:text-destructive hover:bg-[hsl(var(--sidebar-accent))]",
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
