import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, Server, Code, Shield, Zap, Settings, Bot, X,
  Gavel, BarChart3, ScrollText, ShieldAlert, SmilePlus, Terminal, Users
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

interface BotDashboardSidebarProps {
  onClose?: () => void;
}

const navItems = [
  { title: 'Overview', icon: LayoutDashboard, href: '/bot' },
  { title: 'Servers', icon: Server, href: '/bot/servers' },
  { title: 'Commands', icon: Code, href: '/bot/commands' },
  { title: 'Auto-Mod', icon: ShieldAlert, href: '/bot/automod' },
  { title: 'Moderation', icon: Gavel, href: '/bot/moderation' },
  { title: 'Reaction Roles', icon: SmilePlus, href: '/bot/reaction-roles' },
  { title: 'Custom Commands', icon: Terminal, href: '/bot/custom-commands' },
  { title: 'Community', icon: Users, href: '/bot/community' },
  { title: 'Roles', icon: Shield, href: '/bot/roles' },
  { title: 'Actions', icon: Zap, href: '/bot/actions' },
  { title: 'Analytics', icon: BarChart3, href: '/bot/analytics' },
  { title: 'Settings', icon: Settings, href: '/bot/settings' },
  { title: 'Logs', icon: ScrollText, href: '/bot/logs' },
];

export function BotDashboardSidebar({ onClose }: BotDashboardSidebarProps) {
  const location = useLocation();

  const isActive = (href: string) => {
    if (href === '/bot') return location.pathname === '/bot';
    return location.pathname.startsWith(href);
  };

  return (
    <div
      className="w-64 h-full bg-[hsl(228,15%,8%)] border-r border-white/10 flex flex-col"
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
    >
      {/* Brand header */}
      <div className="p-5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[hsl(258,90%,66%)] to-[hsl(235,86%,60%)] flex items-center justify-center shadow-lg shadow-[hsl(258,90%,66%)]/20">
            <Bot className="h-5 w-5 text-foreground" />
          </div>
          <div>
            <h1 className="font-bold text-sm text-foreground">Eclipse Bot</h1>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-xs text-foreground/50">Online</span>
            </div>
          </div>
        </div>
        {onClose && (
          <Button
            variant="ghost"
            size="icon" aria-label="Close"
            className="text-foreground/50 hover:text-foreground hover:bg-background/10 lg:hidden"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </Button>
        )}
      </div>

      {/* Navigation — scrollable if there are many items */}
      <ScrollArea className="flex-1">
        <nav className="px-3 py-2 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.href}
              to={item.href}
              end={item.href === '/bot'}
              onClick={onClose}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                isActive(item.href)
                  ? 'bg-[hsl(258,90%,66%)]/15 text-[hsl(258,90%,76%)] shadow-sm'
                  : 'text-foreground/60 hover:text-foreground hover:bg-background/5'
              )}
            >
              <item.icon className={cn(
                'h-[18px] w-[18px] shrink-0',
                isActive(item.href) ? 'text-[hsl(258,90%,66%)]' : ''
              )} />
              {item.title}
            </NavLink>
          ))}
        </nav>
      </ScrollArea>

      {/* Footer */}
      <div className="p-4 border-t border-white/5 shrink-0">
        <p className="text-xs text-foreground/30 text-center">Eclipse Portal Bot v2</p>
      </div>
    </div>
  );
}
