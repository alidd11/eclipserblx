import { Link, useLocation } from 'react-router-dom';
import { Shield, Users, Server, History, Settings, Home, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { path: '/guard', label: 'Dashboard', icon: Home },
  { path: '/guard/bans', label: 'Ban List', icon: Users },
  { path: '/guard/servers', label: 'Servers', icon: Server },
  { path: '/guard/history', label: 'History', icon: History },
  { path: '/guard/settings', label: 'Settings', icon: Settings },
];

interface GlobalGuardSidebarProps {
  className?: string;
  isMobile?: boolean;
  onNavigate?: () => void;
}

export function GlobalGuardSidebar({ className, isMobile, onNavigate }: GlobalGuardSidebarProps) {
  const location = useLocation();

  // Check if current path matches nav item (handle both exact and nested routes)
  const isActive = (path: string) => {
    if (path === '/guard') {
      return location.pathname === '/guard' || location.pathname === '/guard/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <aside 
      className={cn(
        "flex-col bg-card border-r border-border",
        isMobile 
          ? "flex w-full h-full" 
          : "fixed left-0 top-0 z-40 h-screen w-64",
        className
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 p-6 border-b border-border">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center">
          <Shield className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="font-bold text-foreground">Global Guard</h1>
          <p className="text-xs text-muted-foreground">Ban Management</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const active = isActive(item.path);
          const Icon = item.icon;
          
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                active 
                  ? "bg-gradient-to-r from-blue-600/20 to-violet-600/20 text-blue-400 border border-blue-500/30" 
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
            >
              <Icon className="w-5 h-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-border">
        <Link 
          to="/"
          onClick={onNavigate}
          className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-3 h-3" />
          Back to Eclipse
        </Link>
      </div>
    </aside>
  );
}
