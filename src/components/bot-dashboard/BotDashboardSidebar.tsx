import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, Server, Code, Shield, Zap, Settings, Bot, X
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BotDashboardSidebarProps {
  onClose?: () => void;
}

const navItems = [
  { title: 'Overview', icon: LayoutDashboard, href: '/bot' },
  { title: 'Servers', icon: Server, href: '/bot/servers' },
  { title: 'Commands', icon: Code, href: '/bot/commands' },
  { title: 'Roles', icon: Shield, href: '/bot/roles' },
  { title: 'Actions', icon: Zap, href: '/bot/actions' },
  { title: 'Settings & Logs', icon: Settings, href: '/bot/settings' },
];

export function BotDashboardSidebar({ onClose }: BotDashboardSidebarProps) {
  const location = useLocation();

  const isActive = (href: string) => {
    if (href === '/bot') return location.pathname === '/bot';
    return location.pathname.startsWith(href);
  };

  return (
    <div className="w-64 h-full bg-[hsl(228,15%,8%)] border-r border-white/10 flex flex-col"
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
    >
      {/* Brand header */}
      <div className="p-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[hsl(258,90%,66%)] to-[hsl(235,86%,60%)] flex items-center justify-center shadow-lg shadow-[hsl(258,90%,66%)]/20">
            <Bot className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-sm text-white">Eclipse Bot</h1>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-xs text-white/50">Online</span>
            </div>
          </div>
        </div>
        {onClose && (
          <Button
            variant="ghost"
            size="icon"
            className="text-white/50 hover:text-white hover:bg-white/10 lg:hidden"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </Button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-2 space-y-1">
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
                : 'text-white/60 hover:text-white hover:bg-white/5'
            )}
          >
            <item.icon className={cn(
              'h-4.5 w-4.5 shrink-0',
              isActive(item.href) ? 'text-[hsl(258,90%,66%)]' : ''
            )} />
            {item.title}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-white/5">
        <p className="text-xs text-white/30 text-center">Eclipse Portal Bot v2</p>
      </div>
    </div>
  );
}
