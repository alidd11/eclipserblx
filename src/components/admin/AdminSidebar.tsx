 import { useState, useEffect } from 'react';
 import { 
   LayoutDashboard, Package, ShoppingCart, Users, Settings, LogOut, 
   ChevronLeft, ChevronRight, ChevronDown, MessageCircle, FileText, Star, 
   TrendingUp, Activity, ClipboardList, Mail, BarChart3, HelpCircle, 
   AlertTriangle, Tags, Ban, Gift, Inbox, LucideIcon, Archive, Headphones, Shield, Megaphone, Bell, IdCard, Gamepad2, Store, FolderOpen, Ticket, Bot, RotateCcw, Upload, Wallet
 } from 'lucide-react';
import { NavLink, useNavigate, useLocation, Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { SITE_NAME } from '@/lib/constants';
import eclipseStoreLogo from '@/assets/eclipse-store-moon-logo.png';
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
  roles?: string[]; // Required roles (any of these) - for role-based access without permissions
  dividerAfter?: boolean;
}

interface NavGroup {
  id: string;
  title: string;
  icon: LucideIcon;
  items: NavItem[];
}

// Top-level items (no group)
const topLevelItems: NavItem[] = [
  { title: 'Dashboard', icon: LayoutDashboard, href: '/admin', permissions: [] },
];

const navGroups: NavGroup[] = [
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
      { title: 'Discord Outreach', icon: Megaphone, href: '/admin/discord-outreach', permissions: ['view_discord_outreach'] },
      { title: 'Bot Servers', icon: Bell, href: '/admin/bot-servers', permissions: ['view_bot_codes'] },
    ],
  },
  {
    id: 'finance',
    title: 'Finance',
    icon: Wallet,
    items: [
      { title: 'Seller Payouts', icon: TrendingUp, href: '/admin/seller-payouts', permissions: ['view_seller_payouts'] },
      { title: 'Developer Payments', icon: Wallet, href: '/admin/developer-payments', permissions: [], roles: ['admin', 'developer'] },
      { title: 'Manual Payouts', icon: TrendingUp, href: '/admin/manual-payouts', permissions: ['manage_affiliates'], dividerAfter: true },
      { title: 'Affiliates', icon: Gift, href: '/admin/affiliates', permissions: ['view_affiliates'] },
      { title: 'Affiliate List', icon: FileText, href: '/admin/affiliate-applications', permissions: ['review_affiliate_applications'] },
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
       { title: 'Customer Tickets', icon: Ticket, href: '/admin/customer-tickets', permissions: ['view_live_chat'] },
      { title: 'Seller Tickets', icon: Ticket, href: '/admin/seller-tickets', permissions: ['view_seller_tickets'] },
      { title: 'Transcripts', icon: FileText, href: '/admin/transcripts', permissions: ['view_live_chat'], dividerAfter: true },
      { title: 'Staff Messages', icon: MessageCircle, href: '/admin/staff-messages', permissions: [] },
      { title: 'Admin Chat', icon: Shield, href: '/admin/admin-chat', permissions: ['view_admin_chat'] },
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
      { title: 'Disputes', icon: AlertTriangle, href: '/admin/disputes', permissions: ['manage_orders'] },
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
      { title: 'IP Reports', icon: Shield, href: '/admin/ip-reports', permissions: ['manage_seller_stores'], dividerAfter: true },
      { title: 'Developer Submissions', icon: Upload, href: '/admin/developer-submissions', permissions: ['manage_developer_submissions'], dividerAfter: true },
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
  const { isAdmin, hasRole } = useAdminAuth();
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
    // Admin has full access
    if (isAdmin) return true;
    
    // Check if item requires specific roles
    if (item.roles && item.roles.length > 0) {
      const hasRequiredRole = item.roles.some(role => hasRole(role));
      if (hasRequiredRole) return true;
    }
    
    // No permissions required = accessible to all staff (unless roles are specified)
    if (!item.permissions || item.permissions.length === 0) {
      // If no roles specified either, accessible to all
      if (!item.roles || item.roles.length === 0) return true;
      // If roles were specified but user doesn't have them, deny
      return false;
    }
    
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
            "h-4 w-4 transition-colors",
            isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"
          )} />
          <NotificationDot />
        </div>
        {!isCollapsed && (
          <span className="min-w-0 truncate">{item.title}</span>
        )}
      </>
    );

    const linkClassName = cn(
      "group rounded-md text-[13px] font-medium select-none",
      "transition-all duration-150 active:scale-[0.98] active:opacity-90",
      isCollapsed
        ? "flex items-center justify-center p-2.5"
        : "flex flex-row flex-nowrap items-center gap-2.5 px-2.5 py-[7px]",
      isActive
        ? "bg-primary text-primary-foreground shadow-sm"
        : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
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
          <div className="h-px bg-border/40 mx-1 my-1.5" />
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
                    end={item.href === '/admin'}
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

    // Expanded mode: collapsible group
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
          {group.items.map((item, index) => renderNavItem(item, index))}
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
        : "h-[100dvh] sticky top-0 border-r border-border",
      !isMobileDrawer && (isCollapsed ? "w-14" : "w-60")
    )}>
      {/* Header */}
      <div className="border-b border-border/50 p-4">
        {!isCollapsed && (
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg border-2 border-card bg-card shrink-0 overflow-hidden shadow-sm">
              <img src={eclipseStoreLogo} alt="Eclipse" className="h-full w-full object-cover" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="font-display font-bold text-sm text-foreground truncate">{SITE_NAME}</h1>
              <p className="text-[11px] text-muted-foreground/60 leading-none mt-0.5">Admin Dashboard</p>
            </div>
          </div>
        )}
        {isCollapsed && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center justify-center">
                <div className="h-8 w-8 rounded-lg border-2 border-card bg-card overflow-hidden shadow-sm">
                  <img src={eclipseStoreLogo} alt="Eclipse" className="h-full w-full object-cover" />
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent side="right">{SITE_NAME}</TooltipContent>
          </Tooltip>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch] min-h-0">
        {/* Top-level links */}
        <div className="space-y-0.5 mb-1.5">
          {topLevelItems.filter(canAccessItem).map((item, index) => renderNavItem(item, index))}
        </div>

        {/* Separator */}
        <div className="h-px bg-border/40 mx-1 mb-1.5" />

        {/* Grouped sections */}
        <div className="space-y-1.5">
          {filteredGroups.map(renderGroup)}
        </div>

        {/* Sign Out - inline with nav items on mobile */}
        {isMobileDrawer && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-muted/60 rounded-md px-2.5 py-[7px] mt-2 active:scale-[0.98] transition-all duration-150"
            onClick={() => {
              hapticTap();
              setShowSignOutDialog(true);
            }}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            <span className="ml-2.5">Sign Out</span>
          </Button>
        )}
      </nav>

      {/* Footer */}
      {!isMobileDrawer && (
        <div className="border-t border-border/50 p-2 space-y-0.5">
          {/* Collapse Toggle */}
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "w-full text-muted-foreground hover:text-foreground hover:bg-muted/60",
              isCollapsed ? "justify-center px-2" : "justify-start"
            )}
            onClick={onToggle}
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <>
                <ChevronLeft className="h-4 w-4 mr-2.5" />
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
                  "w-full text-muted-foreground hover:text-destructive hover:bg-muted/60",
                  isCollapsed ? "justify-center px-2" : "justify-start"
                )}
                onClick={() => setShowSignOutDialog(true)}
              >
                <LogOut className="h-4 w-4 shrink-0" />
                {!isCollapsed && <span className="ml-2.5">Sign Out</span>}
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
