import { useState, useEffect } from 'react';
import { 
  Package, Grid3X3, Star, Circle, MessageSquare, Briefcase, 
  HelpCircle, ShoppingCart, 
  User, LucideIcon, Home, TrendingUp, Store, Bell,
  Sparkles, Heart, LogOut, ChevronLeft, ChevronRight,
  MessageSquareText, Megaphone, FileQuestion, LayoutGrid, Shield,
  Globe, PenTool, Zap, Crown, ShoppingBag
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { categoryIconMap, PackageIcon, BotIcon } from '@/components/icons/CategoryIcons';
import { NavLink, useLocation, useNavigate, Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { EclipseLogo } from '@/components/ui/EclipseLogo';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { SignOutConfirmDialog } from '@/components/auth/SignOutConfirmDialog';
import { safeStorage } from '@/lib/safeStorage';
import { hapticTap } from '@/lib/haptics';
import { useDiscordUrl } from '@/hooks/useDiscordUrl';
import { supabase } from '@/integrations/supabase/client';
import { useSystemStatus } from '@/hooks/useSystemStatus';
import { useSellerStatus } from '@/hooks/useSellerStatus';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useTranslation } from 'react-i18next';
import { useNotifications } from '@/hooks/useNotifications';

import { DiscordIcon } from './sidebar/SidebarBrandIcons';
import { ICON_SIZE, ICON_SIZE_SMALL, ICON_STROKE_ACTIVE, ICON_STROKE_DEFAULT, SIDEBAR_STORAGE_KEY } from './sidebar/sidebarConstants';
import { SidebarFooter } from './sidebar/SidebarFooter';

interface NavItem {
  title: string;
  icon: LucideIcon;
  href: string;
  external?: boolean;
  showStatusDot?: boolean;
  showNotificationDot?: boolean;
}

interface NavGroup {
  id: string;
  title: string;
  icon: LucideIcon;
  items: NavItem[];
}

interface CustomerSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  onNavigate?: () => void;
  isMobileDrawer?: boolean;
  className?: string;
}

export function CustomerSidebar({ collapsed, onToggle, onNavigate, isMobileDrawer = false, className }: CustomerSidebarProps) {
  const { user, signOut } = useAuth();
  const { discordUrl } = useDiscordUrl();
  const { isSeller } = useSellerStatus();
  const { isStaff } = useAdminAuth();
  const navigate = useNavigate();

  // Fetch user profile data (avatar + username)
  const { data: profileData } = useQuery({
    queryKey: ['sidebar-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('profiles')
        .select('avatar_url, username')
        .eq('user_id', user.id)
        .maybeSingle();
      return data || null;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  const profileAvatar = profileData?.avatar_url || null;
  const profileUsername = profileData?.username || null;
  const location = useLocation();
  const { t } = useTranslation();
  const [showSignOutDialog, setShowSignOutDialog] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const systemStatus = useSystemStatus();

  // Fetch parent categories for Browse section
  const { data: parentCategories } = useQuery({
    queryKey: ['sidebar-categories'],
    queryFn: async () => {
      const { data } = await supabase
        .from('categories')
        .select('id, name, slug, icon')
        .is('parent_id', null)
        .order('display_order', { ascending: true });
      return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const { unreadCount: unreadNotifications } = useNotifications();
  const isCollapsed = isMobileDrawer ? false : collapsed;

  // Build browse items: explore + resource categories merged
  const browseItems: NavItem[] = [
    { title: t('sidebar.allProducts'), icon: Grid3X3, href: '/products' },
    { title: t('sidebar.allStores'), icon: Store, href: '/stores' },
    { title: t('sidebar.featured'), icon: Star, href: '/featured' },
    ...(parentCategories?.filter(cat => cat.slug !== 'bots').map((cat) => {
      const CatIcon = categoryIconMap[cat.slug] || PackageIcon;
      return {
        title: cat.name,
        icon: CatIcon as unknown as LucideIcon,
        href: `/products?category=${cat.slug}`,
      };
    }) ?? []),
    { title: 'Discord Bots', icon: BotIcon as unknown as LucideIcon, href: '/products?category=bots' },
  ];

  const navGroups: NavGroup[] = [
    // Quick access — rendered without header
    {
      id: 'quick-access',
      title: '',
      icon: Home,
      items: [
        { title: t('sidebar.home'), icon: Home, href: '/' },
        ...(isStaff ? [{ title: 'Admin Dashboard', icon: Shield, href: '/admin' }] : []),
      ],
    },
    {
      id: 'account',
      title: t('sidebar.myAccount'),
      icon: User,
      items: [
        { title: t('sidebar.profile'), icon: User, href: '/account' },
        { title: t('sidebar.notifications'), icon: Bell, href: '/messages', showNotificationDot: true },
        { title: t('sidebar.cart'), icon: ShoppingCart, href: '/cart' },
      ],
    },
    {
      id: 'browse',
      title: t('sidebar.explore', 'Browse'),
      icon: Grid3X3,
      items: browseItems,
    },
    {
      id: 'support',
      title: t('sidebar.support'),
      icon: HelpCircle,
      items: [
        { title: t('sidebar.helpCenter'), icon: HelpCircle, href: '/support' },
        { title: t('sidebar.myTickets'), icon: MessageSquareText, href: '/support/tickets' },
        { title: t('sidebar.faq'), icon: FileQuestion, href: '/faq' },
        { title: t('sidebar.advertise'), icon: Megaphone, href: '/advertise' },
        { title: t('sidebar.jobs'), icon: Briefcase, href: '/jobs' },
        { title: t('sidebar.discord'), icon: DiscordIcon as unknown as LucideIcon, href: discordUrl, external: true },
      ],
    },
  ];

  // Initialize open groups from localStorage
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const stored = safeStorage.getItem(SIDEBAR_STORAGE_KEY);
    if (stored) {
      try { return JSON.parse(stored); } catch { return {}; }
    }
    return navGroups.reduce((acc, group) => ({ ...acc, [group.id]: true }), {});
  });

  useEffect(() => {
    safeStorage.setItem(SIDEBAR_STORAGE_KEY, JSON.stringify(openGroups));
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
          <item.icon className={cn(
            ICON_SIZE, "transition-colors",
            isActive ? ICON_STROKE_ACTIVE : ICON_STROKE_DEFAULT
          )} />
          {item.showNotificationDot && unreadNotifications > 0 && (
            <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-red-500" />
          )}
        </div>
        {!isCollapsed && (
          <span className="min-w-0 flex-1 leading-tight break-words [overflow-wrap:anywhere]">{item.title}</span>
        )}
        {!isCollapsed && item.showStatusDot && (
          <Circle className={cn('h-2.5 w-2.5 fill-current shrink-0', statusConfig[systemStatus].color)} />
        )}
        {!isCollapsed && item.showNotificationDot && unreadNotifications > 0 && (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white px-1.5">
            {unreadNotifications > 99 ? '99+' : unreadNotifications}
          </span>
        )}
      </>
    );

    const linkClassName = cn(
      "text-[13px] font-medium select-none transition-all duration-100",
      isCollapsed
        ? "flex w-full max-w-full items-center justify-center py-2 rounded-lg overflow-hidden"
        : "flex w-full max-w-full min-w-0 flex-row flex-nowrap items-center gap-3 px-3 py-2 ml-2 rounded-lg overflow-hidden active:scale-[0.98] active:opacity-80 border-l-2 border-transparent",
      isActive
        ? "bg-primary/10 text-foreground font-semibold !border-l-2 !border-primary"
        : "text-foreground/70 hover:text-foreground hover:bg-muted/50 hover:border-primary/40"
    );

    if (item.external) {
      if (isCollapsed) {
        return (
          <Tooltip key={item.title}>
            <TooltipTrigger asChild>
              <a href={item.href} target="_blank" rel="noopener noreferrer" onClick={handleNavClick} className={linkClassName}>
                {LinkContent}
              </a>
            </TooltipTrigger>
            <TooltipContent side="right">{item.title}</TooltipContent>
          </Tooltip>
        );
      }
      return (
        <a key={item.title} href={item.href} target="_blank" rel="noopener noreferrer" onClick={handleNavClick} className={linkClassName}>
          {LinkContent}
        </a>
      );
    }

    if (!isCollapsed) {
      return (
        <NavLink key={item.href} to={item.href} end={item.href === '/'} onClick={handleNavClick} className={linkClassName}>
          {LinkContent}
        </NavLink>
      );
    }

    return (
      <Tooltip key={item.href}>
        <TooltipTrigger asChild>
          <Link to={item.href} onClick={handleNavClick} className={linkClassName}>
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
      return <div key={group.id} className="mb-1">{renderNavItem(group.items[0])}</div>;
    }

    // Quick-access: always expanded, no header
    if (group.id === 'quick-access') {
      return (
        <div key={group.id} className="mb-1 space-y-0.5">
          {group.items.map(renderNavItem)}
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
                  hasActiveItem ? "bg-muted text-foreground" : "text-foreground/80 hover:text-foreground hover:bg-muted"
                )}
                onClick={() => toggleGroup(group.id)}
              >
                <group.icon className={cn(ICON_SIZE, "transition-colors", hasActiveItem ? ICON_STROKE_ACTIVE : ICON_STROKE_DEFAULT)} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="p-0">
              <div className="py-2">
                <div className="px-3 pb-1 text-xs font-semibold text-muted-foreground">{group.title}</div>
                {group.items.map(item => {
                  if (item.external) {
                    return (
                      <a key={item.title} href={item.href} target="_blank" rel="noopener noreferrer" onClick={handleNavClick}
                        className="flex items-center gap-2 px-3 py-1.5 text-sm transition-colors hover:bg-muted">
                        <item.icon className={cn(ICON_SIZE_SMALL, ICON_STROKE_DEFAULT)} />
                        {item.title}
                      </a>
                    );
                  }
                  return (
                    <NavLink key={item.href} to={item.href} end={item.href === '/'} onClick={handleNavClick}
                      className={({ isActive }) => cn(
                        "flex items-center gap-2 px-3 py-1.5 text-sm transition-colors",
                        isActive ? "bg-muted text-foreground" : "hover:bg-muted"
                      )}>
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

    // Expanded: always-open group with divider label
    return (
      <div key={group.id} className="mb-1">
        <div className="border-t border-border/30 mt-1 pt-2 mb-1">
          <span className="px-3 text-[11px] font-semibold tracking-wide text-muted-foreground/80">
            {group.title}
          </span>
        </div>
        <div className="space-y-0.5 pt-0.5">
          {group.items.map(renderNavItem)}
        </div>
      </div>
    );
  };

  return (
    <aside
      aria-label="Main navigation"
      className={cn(
        "bg-sidebar text-sidebar-foreground flex flex-col transition-all duration-200 shrink-0 overflow-x-hidden",
        isMobileDrawer
          ? "h-full w-full border-0"
          : "h-[100dvh] sticky top-0 border-r border-border/40",
        !isMobileDrawer && (isCollapsed ? "w-12" : "w-56"),
        className
      )}
      data-gesture-exempt="true"
    >
      {/* Branded Header */}
      <div className={cn(
        "border-b border-border/50 flex items-center shrink-0",
        isCollapsed ? "px-1.5 py-3 justify-center" : "px-4 py-3.5 gap-2.5"
      )}>
        <EclipseLogo size="sm" />
        {!isCollapsed && (
          <span className="font-display font-bold text-sm text-foreground tracking-wide flex-1">Eclipse</span>
        )}
        {!isMobileDrawer && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 min-h-0 min-w-0 text-muted-foreground hover:text-foreground"
                onClick={onToggle}
                haptic
              >
                {isCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">{isCollapsed ? 'Expand' : 'Collapse'}</TooltipContent>
          </Tooltip>
        )}
      </div>

      {/* Profile Section — enterprise: tight, no gaming visuals */}
      {user && !isCollapsed && (
        <div className="border-b border-border/50 px-4 py-3 space-y-2">
          <div className="flex items-center gap-3">
            {/* Clean avatar — no gradient ring, no online dot */}
            <div className="shrink-0">
              {profileAvatar ? (
                <img
                  src={profileAvatar}
                  alt=""
                  className="h-9 w-9 rounded-full object-cover bg-muted"
                />
              ) : (
                <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center">
                  <span className="text-xs font-semibold text-muted-foreground">
                    {(user.user_metadata?.display_name || user.email || '?')[0].toUpperCase()}
                  </span>
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold truncate leading-tight">{user.user_metadata?.display_name || 'User'}</p>
              {profileUsername && (
                <p className="text-[11px] text-muted-foreground truncate leading-tight mt-0.5">@{profileUsername}</p>
              )}
            </div>
          </div>

          {/* Seller Dashboard — subtle enterprise CTA */}
          {isSeller && (
            <a
              href="/seller"
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleNavClick}
              className="flex items-center justify-center gap-2 w-full rounded-lg bg-primary/10 text-primary border border-primary/20 py-2 text-[13px] font-semibold transition-colors hover:bg-primary/15 active:scale-[0.98]"
            >
              <Zap className="h-3.5 w-3.5" />
              Seller Dashboard
            </a>
          )}
        </div>
      )}

      {/* Collapsed: seller CTA */}
      {user && isCollapsed && isSeller && (
        <div className="border-b border-border/50 px-1.5 py-2 flex justify-center">
          <Tooltip>
            <TooltipTrigger asChild>
              <a
                href="/seller"
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleNavClick}
                className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary/10 text-primary border border-primary/20 transition-colors hover:bg-primary/15 active:scale-[0.95]"
              >
                <Zap className="h-3.5 w-3.5" />
              </a>
            </TooltipTrigger>
            <TooltipContent side="right">Seller Dashboard</TooltipContent>
          </Tooltip>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-2 py-2 overflow-y-auto overflow-x-hidden overscroll-contain [-webkit-overflow-scrolling:touch] min-h-0">
        <div className="space-y-0.5">
          {navGroups.map(group => (
            <div key={group.id}>{renderGroup(group)}</div>
          ))}
        </div>
      </nav>

      {/* Sign Out Footer */}
      <SidebarFooter
        isCollapsed={isCollapsed}
        onSignOut={() => setShowSignOutDialog(true)}
      />

      <SignOutConfirmDialog
        open={showSignOutDialog}
        onOpenChange={setShowSignOutDialog}
        onConfirm={handleSignOut}
        isLoading={isSigningOut}
      />
    </aside>
  );
}
