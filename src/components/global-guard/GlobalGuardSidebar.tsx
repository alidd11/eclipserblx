import { Link, useLocation } from 'react-router-dom';
import { Shield, Users, Server, History, Settings, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { path: '/', label: 'Dashboard', icon: Home },
  { path: '/bans', label: 'Ban List', icon: Users },
  { path: '/servers', label: 'Servers', icon: Server },
  { path: '/history', label: 'History', icon: History },
  { path: '/settings', label: 'Settings', icon: Settings },
];

export function GlobalGuardSidebar() {
  const location = useLocation();

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 bg-card border-r border-border">
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
      <nav className="p-4 space-y-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                isActive 
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
      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border">
        <a 
          href="https://eclipserblx.com" 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Back to Eclipse
        </a>
      </div>
    </aside>
  );
}
