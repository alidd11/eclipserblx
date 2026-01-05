import { LayoutDashboard, Package, ShoppingCart, Users, Settings, LogOut, ChevronLeft } from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { SITE_NAME } from '@/lib/constants';

const navItems = [
  { title: 'Dashboard', icon: LayoutDashboard, href: '/admin', roles: [] },
  { title: 'Products', icon: Package, href: '/admin/products', roles: ['admin', 'product_manager'] },
  { title: 'Orders', icon: ShoppingCart, href: '/admin/orders', roles: ['admin', 'order_manager'] },
  { title: 'Users', icon: Users, href: '/admin/users', roles: ['admin'] },
  { title: 'Settings', icon: Settings, href: '/admin/settings', roles: ['admin'] },
];

export function AdminSidebar() {
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
    <aside className="w-64 border-r border-border bg-card flex flex-col h-screen sticky top-0">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <NavLink to="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="h-4 w-4" />
          <span className="text-sm">Back to Store</span>
        </NavLink>
        <h1 className="font-display font-bold text-xl mt-3">{SITE_NAME}</h1>
        <p className="text-xs text-muted-foreground">Admin Dashboard</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {filteredItems.map((item) => (
          <NavLink
            key={item.href}
            to={item.href}
            end={item.href === '/admin'}
            className={({ isActive }) => cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm font-medium",
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            <item.icon className="h-4 w-4" />
            {item.title}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-border">
        <Button
          variant="ghost"
          className="w-full justify-start text-muted-foreground hover:text-destructive"
          onClick={handleSignOut}
        >
          <LogOut className="h-4 w-4 mr-3" />
          Sign Out
        </Button>
      </div>
    </aside>
  );
}
