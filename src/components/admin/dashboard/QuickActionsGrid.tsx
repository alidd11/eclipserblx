import { Link } from 'react-router-dom';
import { Package, ShoppingCart, Users, MessageCircle, FileText, BarChart3 } from 'lucide-react';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useUserPermissions } from '@/hooks/useUserPermissions';

interface QuickLink {
  title: string;
  href: string;
  icon: React.ElementType;
  description: string;
  permissions: string[];
}

const allQuickLinks: QuickLink[] = [
  { title: 'View Analytics', href: '/admin/analytics', icon: BarChart3, description: 'Detailed metrics & charts', permissions: ['view_analytics'] },
  { title: 'Manage Products', href: '/admin/products', icon: Package, description: 'Add or edit products', permissions: ['view_products', 'manage_products'] },
  { title: 'View Orders', href: '/admin/orders', icon: ShoppingCart, description: 'Manage orders', permissions: ['view_orders', 'manage_orders'] },
  { title: 'Live Chat', href: '/admin/live-chat', icon: MessageCircle, description: 'Support customers', permissions: ['view_live_chat', 'manage_live_chat'] },
  { title: 'Applications', href: '/admin/applications', icon: FileText, description: 'Review applications', permissions: ['view_applications', 'manage_applications'] },
  { title: 'Manage Customers', href: '/admin/users', icon: Users, description: 'Customer management', permissions: ['view_users', 'manage_users'] },
];

export function QuickActionsGrid() {
  const { isAdmin } = useAdminAuth();
  const { hasAnyPermission } = useUserPermissions();

  const quickLinks = isAdmin
    ? allQuickLinks
    : allQuickLinks.filter(link => hasAnyPermission(link.permissions));

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-border bg-muted/30">
        <h3 className="font-semibold text-sm">Quick Actions</h3>
      </div>
      <div className="p-4">
        <div className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-6 gap-1.5 sm:gap-2">
          {quickLinks.map((link) => (
            <Link key={link.href} to={link.href}>
              <div className="flex flex-col items-center gap-1 sm:gap-2 p-2 sm:p-3.5 rounded-lg bg-muted/50 hover:bg-accent hover:-translate-y-0.5 active:scale-[0.97] transition-all text-center group cursor-pointer">
                <div className="p-1.5 sm:p-2.5 rounded-xl bg-card border border-border group-hover:border-primary/30 transition-colors">
                  <link.icon className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                <div>
                  <span className="text-[10px] sm:text-xs font-medium block leading-tight">{link.title}</span>
                  <span className="text-[10px] text-muted-foreground hidden sm:block">{link.description}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
