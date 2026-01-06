import { LayoutDashboard, Package, ShoppingCart, Users, Settings, LogOut, ChevronLeft, ChevronRight, MessageCircle, FileText, Star, TrendingUp } from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { SITE_NAME } from '@/lib/constants';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const navItems = [
  { title: 'Dashboard', icon: LayoutDashboard, href: '/admin', roles: [] },
  { title: 'Income', icon: TrendingUp, href: '/admin/income', roles: ['admin'] },
  { title: 'Products', icon: Package, href: '/admin/products', roles: ['admin', 'product_manager'] },
  { title: 'Orders', icon: ShoppingCart, href: '/admin/orders', roles: ['admin', 'order_manager'] },
  { title: 'Reviews', icon: Star, href: '/admin/reviews', roles: ['admin'] },
  { title: 'Live Chat', icon: MessageCircle, href: '/admin/live-chat', roles: ['admin', 'support_agent'] },
  { title: 'Applications', icon: FileText, href: '/admin/applications', roles: ['admin', 'recruiter'] },
  { title: 'Users', icon: Users, href: '/admin/users', roles: ['admin'] },
  { title: 'Settings', icon: Settings, href: '/admin/settings', roles: ['admin'] },
];

interface AdminSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function AdminSidebar({ collapsed, onToggle }: AdminSidebarProps) {
  const { signOut } = useAuth();
  const { isAdmin, hasRole } = useAdminAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const filteredItems = navItems.filter(item => 
    item.roles.length === 0 || isAdmin || item.roles.some(role => hasRole(role))
  );

  return (
    <aside className={cn(
      "border-r border-border bg-card flex flex-col h-screen sticky top-0 transition-all duration-300",
      collapsed ? "w-14" : "w-64"
    )}>
      {/* Header */}
      <div className="p-4 border-b border-border">
        {!collapsed && (
          <>
            <NavLink to="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
              <ChevronLeft className="h-4 w-4" />
              <span className="text-sm">Back to Store</span>
            </NavLink>
            <h1 className="font-display font-bold text-xl mt-3">{SITE_NAME}</h1>
            <p className="text-xs text-muted-foreground">Admin Dashboard</p>
          </>
        )}
        {collapsed && (
          <Tooltip>
            <TooltipTrigger asChild>
              <NavLink to="/" className="flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                <ChevronLeft className="h-5 w-5" />
              </NavLink>
            </TooltipTrigger>
            <TooltipContent side="right">Back to Store</TooltipContent>
          </Tooltip>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        {filteredItems.map((item) => (
          <Tooltip key={item.href}>
            <TooltipTrigger asChild>
              <NavLink
                to={item.href}
                end={item.href === '/admin'}
                className={({ isActive }) => cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm font-medium",
                  collapsed && "justify-center px-2",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {!collapsed && item.title}
              </NavLink>
            </TooltipTrigger>
            {collapsed && <TooltipContent side="right">{item.title}</TooltipContent>}
          </Tooltip>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-2 border-t border-border space-y-1">
        {/* Collapse Toggle */}
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "w-full text-muted-foreground hover:text-foreground",
            collapsed ? "justify-center px-2" : "justify-start"
          )}
          onClick={onToggle}
        >
          {collapsed ? (
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
                collapsed ? "justify-center px-2" : "justify-start"
              )}
              onClick={handleSignOut}
            >
              <LogOut className="h-4 w-4 shrink-0" />
              {!collapsed && <span className="ml-3">Sign Out</span>}
            </Button>
          </TooltipTrigger>
          {collapsed && <TooltipContent side="right">Sign Out</TooltipContent>}
        </Tooltip>
      </div>
    </aside>
  );
}
