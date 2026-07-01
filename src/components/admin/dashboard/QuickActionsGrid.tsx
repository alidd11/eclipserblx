import { Link } from 'react-router-dom';
import { Package, ShoppingCart, Users, MessageCircle, BarChart3, TrendingUp, Gavel, CreditCard, Settings, UserCheck, Headphones, Ticket, BookOpen, ClipboardList, Timer, Shield } from 'lucide-react';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useUserPermissions } from '@/hooks/useUserPermissions';

interface QuickLink {
  title: string;
  href: string;
  icon: React.ElementType;
  permissions: string[];
}

const allLinks: QuickLink[] = [
  { title: 'Analytics', href: '/admin/analytics', icon: BarChart3, permissions: ['view_analytics'] },
  { title: 'Products', href: '/admin/products', icon: Package, permissions: ['view_products', 'manage_products'] },
  { title: 'Orders', href: '/admin/orders', icon: ShoppingCart, permissions: ['view_orders', 'manage_orders'] },
  { title: 'Live Chat', href: '/admin/live-chat', icon: MessageCircle, permissions: ['view_live_chat', 'manage_live_chat'] },
  { title: 'Applications', href: '/admin/applications', icon: FileText, permissions: ['view_applications', 'manage_applications'] },
  { title: 'Customers', href: '/admin/users', icon: Users, permissions: ['view_users', 'manage_users'] },
  { title: 'Revenue', href: '/admin/revenue', icon: CreditCard, permissions: ['view_income'] },
  { title: 'Disputes', href: '/admin/disputes', icon: Gavel, permissions: ['view_orders', 'manage_orders'] },
  { title: 'Tickets', href: '/admin/customer-tickets', icon: Ticket, permissions: ['view_live_chat', 'manage_live_chat'] },
  { title: 'Stores', href: '/admin/store-applications', icon: Store, permissions: ['view_applications', 'manage_applications'] },
  { title: 'Messages', href: '/admin/messages', icon: Headphones, permissions: [] },
  { title: 'Roles', href: '/admin/role-permissions', icon: UserCheck, permissions: ['manage_roles'] },
  { title: 'Settings', href: '/admin/settings', icon: Settings, permissions: ['manage_settings'] },
  { title: 'Moderation', href: '/admin/moderation', icon: Shield, permissions: ['view_products', 'manage_products'] },
  { title: 'Audit Logs', href: '/admin/audit-logs', icon: BookOpen, permissions: ['view_analytics'] },
  { title: 'Bot Setup', href: '/admin/bot-ghost-setup', icon: Bot, permissions: ['manage_settings'] },
  { title: 'Affiliates', href: '/admin/affiliates', icon: TrendingUp, permissions: ['view_applications', 'manage_applications'] },
  { title: 'Staff Activity', href: '/admin/staff-activity', icon: Timer, permissions: ['view_analytics'] },
  { title: 'Duty Logs', href: '/admin/duty-logs', icon: ClipboardList, permissions: [] },
];

export function QuickActionsGrid() {
  const { isAdmin } = useAdminAuth();
  const { hasAnyPermission } = useUserPermissions();

  const links = (isAdmin
    ? allLinks
    : allLinks.filter(link => hasAnyPermission(link.permissions))
  ).slice(0, 12);

  if (links.length === 0) return null;

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-border bg-muted/30">
        <h3 className="font-semibold text-sm">Command Center</h3>
      </div>
      <div className="p-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-1.5 sm:gap-2">
          {links.map((link) => (
            <Link key={link.href} to={link.href}>
              <div className="flex flex-col items-center gap-1.5 p-3 sm:p-3.5 rounded-lg bg-muted/50 hover:bg-accent transition-all text-center group cursor-pointer">
                <link.icon className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                <span className="text-xs font-medium leading-tight">{link.title}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
