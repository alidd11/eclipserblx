import { useState, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, Server, Code, Shield, Zap, Settings, Bot, LogOut,
  Gavel, BarChart3, ScrollText, ShieldAlert, SmilePlus, Terminal, Users,
  ChevronDown, LucideIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { SignOutConfirmDialog } from '@/components/auth/SignOutConfirmDialog';
import { useAuth } from '@/hooks/useAuth';
import { safeStorage } from '@/lib/safeStorage';
import { hapticTap } from '@/lib/haptics';
import marketplaceLogo from '@/assets/marketplace-logo-icon.webp';

interface NavItem {
  title: string;
  icon: LucideIcon;
  href: string;
}

interface NavGroup {
  id: string;
  title: string;
  items: NavItem[];
}

const topLevelItems: NavItem[] = [
  { title: 'Overview', icon: LayoutDashboard, href: '/bot' },
  { title: 'Servers', icon: Server, href: '/bot/servers' },
  { title: 'Analytics', icon: BarChart3, href: '/bot/analytics' },
];

const navGroups: NavGroup[] = [
  {
    id: 'moderation',
    title: 'Moderation',
    items: [
      { title: 'Auto-Mod', icon: ShieldAlert, href: '/bot/automod' },
      { title: 'Moderation', icon: Gavel, href: '/bot/moderation' },
      { title: 'Roles', icon: Shield, href: '/bot/roles' },
    ],
  },
  {
    id: 'engagement',
    title: 'Engagement',
    items: [
      { title: 'Commands', icon: Code, href: '/bot/commands' },
      { title: 'Custom Commands', icon: Terminal, href: '/bot/custom-commands' },
      { title: 'Reaction Roles', icon: SmilePlus, href: '/bot/reaction-roles' },
      { title: 'Community', icon: Users, href: '/bot/community' },
    ],
  },
  {
    id: 'system',
    title: 'System',
    items: [
      { title: 'Actions', icon: Zap, href: '/bot/actions' },
      { title: 'Settings', icon: Settings, href: '/bot/settings' },
      { title: 'Logs', icon: ScrollText, href: '/bot/logs' },
    ],
  },
];

const STORAGE_KEY = 'bot-sidebar-groups';

interface BotDashboardSidebarProps {
  onClose?: () => void;
  isMobileDrawer?: boolean;
}

export function BotDashboardSidebar({ onClose, isMobileDrawer = false }: BotDashboardSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [showSignOutDialog, setShowSignOutDialog] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const stored = safeStorage.getItem(STORAGE_KEY);
    if (stored) {
      try { return JSON.parse(stored); } catch { return {}; }
    }
    return navGroups.reduce((acc, g) => ({ ...acc, [g.id]: true }), {});
  });

  useEffect(() => {
    safeStorage.setItem(STORAGE_KEY, JSON.stringify(openGroups));
  }, [openGroups]);

  useEffect(() => {
    navGroups.forEach(group => {
      const hasActive = group.items.some(i => location.pathname === i.href);
      if (hasActive && !openGroups[group.id]) {
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
    onClose?.();
  };

  const toggleGroup = (groupId: string) => {
    hapticTap();
    setOpenGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  const isActive = (href: string) => {
    if (href === '/bot') return location.pathname === '/bot';
    return location.pathname === href;
  };

  const renderNavLink = (item: NavItem) => {
    const active = isActive(item.href);
    return (
      <NavLink
        key={item.href}
        to={item.href}
        end={item.href === '/bot'}
        onClick={handleNavClick}
        className={cn(
          'group rounded-md text-[13px] font-medium select-none transition-all duration-150',
          'flex items-center gap-2.5 px-2.5 py-[7px]',
          active
            ? 'border-l-2 border-primary bg-muted/60 text-foreground !rounded-l-none pl-[calc(0.625rem-2px)]'
            : 'text-foreground/80 hover:text-foreground hover:bg-muted/60'
        )}
      >
        <item.icon className={cn(
          'h-4 w-4 shrink-0 transition-colors',
          active ? 'stroke-[2.25] text-primary' : 'stroke-[1.75] text-muted-foreground group-hover:text-foreground'
        )} />
        <span className="min-w-0 truncate">{item.title}</span>
      </NavLink>
    );
  };

  const renderGroup = (group: NavGroup) => {
    const isOpen = openGroups[group.id] ?? true;
    const hasActiveItem = group.items.some(i => isActive(i.href));

    return (
      <Collapsible
        key={group.id}
        open={isOpen}
        onOpenChange={() => toggleGroup(group.id)}
      >
        <CollapsibleTrigger asChild>
          <button
            className={cn(
              'w-full flex items-center gap-2.5 px-2.5 py-[7px] rounded-md text-[11px] font-semibold uppercase tracking-wider select-none',
              'transition-all duration-150 focus:outline-none',
              hasActiveItem
                ? 'text-foreground'
                : 'text-muted-foreground/70 hover:text-muted-foreground'
            )}
          >
            <span className="flex-1 text-left truncate">{group.title}</span>
            <ChevronDown className={cn(
              'h-3 w-3 shrink-0 transition-transform duration-200',
              isOpen ? 'rotate-0' : '-rotate-90'
            )} />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="ml-3 space-y-px pt-px pb-0.5">
          {group.items.map(renderNavLink)}
        </CollapsibleContent>
      </Collapsible>
    );
  };

  return (
    <aside className={cn(
      'flex flex-col shrink-0 bg-card text-foreground',
      isMobileDrawer
        ? 'h-full w-full border-0'
        : 'w-64 h-full border-r border-border'
    )}>
      {/* Header */}
      <div className="border-b border-border/50 p-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg border-2 border-card bg-card shrink-0 overflow-hidden shadow-sm">
            <img src={marketplaceLogo} alt="Eclipse" className="h-full w-full object-contain" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="font-display font-bold text-sm text-foreground truncate">Eclipse Bot</h1>
            <p className="text-[10px] text-primary/70 font-semibold uppercase tracking-wider leading-none mt-0.5">
              Bot Dashboard
            </p>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive hover:bg-muted/60"
                onClick={() => { hapticTap(); setShowSignOutDialog(true); }}
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Sign Out</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Navigation */}
      <nav className={cn(
        'flex-1 p-2 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch] min-h-0 touch-pan-y',
        isMobileDrawer && 'pb-[env(safe-area-inset-bottom)]'
      )}>
        {/* Top-level links */}
        <div className="space-y-px mb-1.5">
          {topLevelItems.map(item => renderNavLink(item))}
        </div>

        {/* Separator */}
        <div className="h-px bg-border/40 mx-1 mb-1.5" />

        {/* Grouped sections */}
        <div className="space-y-1.5">
          {navGroups.map(renderGroup)}
        </div>
      </nav>

      {/* Footer */}
      {!isMobileDrawer && (
        <div className="border-t border-border/50 p-3">
          <p className="text-[10px] text-muted-foreground/50 text-center">Eclipse Portal Bot v2</p>
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
