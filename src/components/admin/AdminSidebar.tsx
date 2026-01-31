import { useState, useEffect } from 'react';
import { 
  LayoutDashboard, Package, ShoppingCart, Users, Settings, LogOut, 
  ChevronLeft, ChevronRight, ChevronDown, MessageCircle, FileText, Star, 
  TrendingUp, Activity, ClipboardList, Mail, BarChart3, HelpCircle, 
  AlertTriangle, Tags, Ban, Gift, Inbox, LucideIcon, Flag, Archive, Headphones, Shield, Megaphone, Bell, IdCard, Gamepad2, Store, FolderOpen, Percent, Ticket, Bot, RotateCcw
} from 'lucide-react';
import { NavLink, useNavigate, useLocation, Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useUserPermissions } from '@/hooks/useUserPermissions';
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
  permissions?: string[]; // Required permissions (any of these)
  dividerAfter?: boolean;
}

interface NavGroup {
  id: string;
  title: string;
  icon: LucideIcon;
  items: NavItem[];
}

// Navigation items with permission-based access
// Empty permissions array = accessible to all staff
const navGroups: NavGroup[] = [
  {
    id: 'overview',
    title: 'Overview',
    icon: LayoutDashboard,
    items: [
      { title: 'Dashboard', icon: LayoutDashboard, href: '/admin', permissions: [] },
    ],
  },
  {
    id: 'daily-ops',
    title: 'Daily Operations',
    icon: ShoppingCart,
    items: [
      { title: 'Analytics', icon: BarChart3, href: '/admin/analytics', permissions: ['view_analytics'] },
      { title: 'Income', icon: TrendingUp, href: '/admin/income', permissions: ['view_income'] },
      { title: 'Ad Analytics', icon: Megaphone, href: '/admin/advertisement-analytics', permissions: ['view_analytics'], dividerAfter: true },
      { title: 'Community Announcements', icon: Megaphone, href: '/admin/community-announcements', permissions: ['manage_discord_engagement'] },
      { title: 'Discord Polls', icon: BarChart3, href: '/admin/discord-polls', permissions: ['manage_discord_engagement'] },
      { title: 'QOTD', icon: MessageCircle, href: '/admin/discord-qotd', permissions: ['manage_discord_engagement'] },
      { title: 'Promotions', icon: Tags, href: '/admin/promotions', permissions: ['manage_discounts'], dividerAfter: true },
      { title: 'Manual Payouts', icon: TrendingUp, href: '/admin/manual-payouts', permissions: ['manage_affiliates'] },
      { title: 'Affiliates', icon: Gift, href: '/admin/affiliates', permissions: ['view_affiliates'] },
      { title: 'Affiliate Applications', icon: FileText, href: '/admin/affiliate-applications', permissions: ['review_affiliate_applications'], dividerAfter: true },
      { title: 'Discord Outreach', icon: Megaphone, href: '/admin/discord-outreach', permissions: ['view_job_channels'] },
      { title: 'Bot Servers', icon: Bell, href: '/admin/bot-servers', permissions: ['view_bot_codes'] },
    ],
  },
  {
    id: 'communications',
    title: 'Communications',
    icon: MessageCircle,
    items: [
      { title: 'Live Chat', icon: Inbox, href: '/admin/live-chat', permissions: ['view_live_chat'] },
      { title: 'Discord Modmail', icon: Mail, href: '/admin/discord-modmail', permissions: ['view_live_chat'] },
      { title: 'Contact Messages', icon: Mail, href: '/admin/contact-messages', permissions: ['view_contact_messages'] },
      { title: 'Forum Reports', icon: Flag, href: '/admin/forum-reports', permissions: ['view_forum_reports'] },
      { title: 'Transcripts', icon: FileText, href: '/admin/transcripts', permissions: ['view_live_chat'], dividerAfter: true },
      { title: 'Staff Messages', icon: MessageCircle, href: '/admin/staff-messages', permissions: [] },
      { title: 'Admin Chat', icon: Shield, href: '/admin/admin-chat', permissions: ['manage_staff'] },
      { title: 'Modmail Bot Setup', icon: Bot, href: '/admin/modmail-bot-setup', permissions: ['manage_settings'] },
    ],
  },
  {
    id: 'store',
    title: 'Store',
    icon: Package,
    items: [
      { title: 'Products', icon: Package, href: '/admin/products', permissions: ['view_products'] },
      { title: 'Categories', icon: FolderOpen, href: '/admin/categories', permissions: ['manage_products'] },
      { title: 'Orders', icon: ShoppingCart, href: '/admin/orders', permissions: ['view_orders'] },
      { title: 'Refunds', icon: RotateCcw, href: '/admin/refunds', permissions: ['manage_orders'] },
      { title: 'Reviews', icon: Star, href: '/admin/reviews', permissions: ['view_reviews'] },
    ],
  },
  {
    id: 'marketplace',
    title: 'Marketplace',
    icon: Store,
    items: [
      { title: 'Seller Stores', icon: Store, href: '/admin/seller-commissions', permissions: ['view_seller_stores'] },
      { title: 'Store Applications', icon: FileText, href: '/admin/store-applications', permissions: ['view_store_applications'] },
      { title: 'Seller Products', icon: Package, href: '/admin/seller-products', permissions: ['view_seller_stores'] },
      { title: 'Seller Payouts', icon: TrendingUp, href: '/admin/seller-payouts', permissions: ['view_seller_payouts'] },
      { title: 'Seller Tickets', icon: Ticket, href: '/admin/seller-tickets', permissions: ['view_seller_tickets'] },
      { title: 'Interest List', icon: Bell, href: '/admin/marketplace-interest', permissions: ['view_store_applications'], dividerAfter: true },
      { title: 'Seller Documents', icon: FolderOpen, href: '/admin/seller-documents', permissions: ['manage_seller_stores'] },
      { title: 'Public Documents', icon: FolderOpen, href: '/admin/public-documents', permissions: ['manage_seller_stores'] },
      { title: 'Seller Agreements', icon: ClipboardList, href: '/admin/seller-agreements', permissions: ['view_seller_stores'] },
    ],
  },
  {
    id: 'team',
    title: 'Team',
    icon: Users,
    items: [
      { title: 'Staff Directory', icon: IdCard, href: '/admin/staff-directory', permissions: ['view_staff_directory'] },
      { title: 'Staff Activity', icon: Activity, href: '/admin/staff-activity', permissions: ['view_staff_activity'] },
      { title: 'Staff Documents', icon: FolderOpen, href: '/admin/staff-documents', permissions: ['manage_staff'], dividerAfter: true },
      { title: 'Job Channels', icon: Megaphone, href: '/admin/job-channels', permissions: ['view_job_channels'] },
      { title: 'Applications', icon: FileText, href: '/admin/applications', permissions: ['view_applications'] },
      { title: 'Archived', icon: Archive, href: '/admin/archived-applications', permissions: ['review_applications'] },
    ],
  },
  {
    id: 'users-analytics',
    title: 'Customers',
    icon: Users,
    items: [
      { title: 'Customers', icon: Users, href: '/admin/users', permissions: ['view_users'] },
      { title: 'IP Bans', icon: Ban, href: '/admin/ip-bans', permissions: ['view_ip_bans'] },
      { title: 'Subscribers', icon: Mail, href: '/admin/subscribers', permissions: ['view_subscribers'] },
    ],
  },
  {
    id: 'system',
    title: 'System',
    icon: Settings,
    items: [
      { title: 'Incidents', icon: AlertTriangle, href: '/admin/incidents', permissions: ['view_incidents'] },
      { title: 'Audit Logs', icon: ClipboardList, href: '/admin/audit-logs', permissions: ['view_audit_logs'] },
      { title: 'Role Permissions', icon: Shield, href: '/admin/role-permissions', permissions: ['manage_permissions'], dividerAfter: true },
      { title: 'Discord', icon: MessageCircle, href: '/admin/discord-settings', permissions: ['manage_settings'] },
      { title: 'Roblox', icon: Gamepad2, href: '/admin/roblox-settings', permissions: ['manage_settings'], dividerAfter: true },
      { title: 'Settings', icon: Settings, href: '/admin/settings', permissions: [] },
      { title: 'Help', icon: HelpCircle, href: '/admin/help', permissions: [] },
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
  const { isAdmin } = useAdminAuth();
  const { hasAnyPermission } = useUserPermissions();
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

  // Permission-based access control
  const canAccessItem = (item: NavItem) => {
    // No permissions required = accessible to all staff
    if (!item.permissions || item.permissions.length === 0) return true;
    // Admin has full access
    if (isAdmin) return true;
    // Check if user has any of the required permissions
    return hasAnyPermission(item.permissions);
  };

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

  const renderNavItem = (item: NavItem, index: number) => {
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

    const navElement = !isCollapsed ? (
      <NavLink
        key={item.href}
        to={item.href}
        end={item.href === '/admin'}
        onClick={handleNavClick}
        className={linkClassName}
      >
        {LinkContent}
      </NavLink>
    ) : (
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

    // Return nav item with optional divider
    return (
      <div key={item.href}>
        {navElement}
        {item.dividerAfter && !isCollapsed && (
          <div className="flex justify-center my-2 px-4 ml-4">
            <div className="w-full border-t border-[hsl(var(--sidebar-border)/0.4)]" />
          </div>
        )}
      </div>
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
          {renderNavItem(group.items[0], 0)}
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
          {group.items.map((item, index) => renderNavItem(item, index))}
        </CollapsibleContent>
      </Collapsible>
    );
  };

  return (
    <aside className={cn(
      "flex flex-col transition-all duration-300 shrink-0",
      "bg-sidebar text-sidebar-foreground",
      isMobileDrawer 
        ? "h-[100dvh] max-h-[100dvh] w-full border-0 pb-2" 
        : "h-screen sticky top-0 border-r border-sidebar-border",
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
