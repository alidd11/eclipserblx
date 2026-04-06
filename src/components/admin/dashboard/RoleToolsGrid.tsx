import { Link } from 'react-router-dom';
import { TrendingUp, Gavel, CreditCard, Settings, UserCheck, Headphones, Store, Bot, Ticket, BookOpen, ClipboardList, Timer, Shield } from 'lucide-react';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useUserPermissions } from '@/hooks/useUserPermissions';

interface RoleLink {
  title: string;
  href: string;
  icon: React.ElementType;
  description: string;
  permissions: string[];
}

const allRoleLinks: RoleLink[] = [
  { title: 'Revenue', href: '/admin/revenue', icon: CreditCard, description: 'Financial overview', permissions: ['view_income'] },
  { title: 'Disputes', href: '/admin/disputes', icon: Gavel, description: 'Handle disputes', permissions: ['view_orders', 'manage_orders'] },
  { title: 'Tickets', href: '/admin/customer-tickets', icon: Ticket, description: 'Customer tickets', permissions: ['view_live_chat', 'manage_live_chat'] },
  { title: 'Stores', href: '/admin/store-applications', icon: Store, description: 'Store applications', permissions: ['view_applications', 'manage_applications'] },
  { title: 'Messages', href: '/admin/messages', icon: Headphones, description: 'Internal messaging', permissions: [] },
  { title: 'Roles', href: '/admin/role-permissions', icon: UserCheck, description: 'Manage roles', permissions: ['manage_roles'] },
  { title: 'Settings', href: '/admin/settings', icon: Settings, description: 'System settings', permissions: ['manage_settings'] },
  { title: 'Moderation', href: '/admin/moderation', icon: Shield, description: 'Content review', permissions: ['view_products', 'manage_products'] },
  { title: 'Audit Logs', href: '/admin/audit-logs', icon: BookOpen, description: 'Activity logs', permissions: ['view_analytics'] },
  { title: 'Bot Setup', href: '/admin/bot-ghost-setup', icon: Bot, description: 'Discord bot config', permissions: ['manage_settings'] },
  { title: 'Affiliates', href: '/admin/affiliates', icon: TrendingUp, description: 'Affiliate hub', permissions: ['view_applications', 'manage_applications'] },
  { title: 'Staff Activity', href: '/admin/staff-activity', icon: Timer, description: 'Staff hours', permissions: ['view_analytics'] },
  { title: 'Duty Logs', href: '/admin/duty-logs', icon: ClipboardList, description: 'Your duty history', permissions: [] },
];

export function RoleToolsGrid() {
  const { isAdmin } = useAdminAuth();
  const { hasAnyPermission } = useUserPermissions();

  const roleLinks = (isAdmin
    ? allRoleLinks
    : allRoleLinks.filter(link => hasAnyPermission(link.permissions))
  ).slice(0, 9);

  if (roleLinks.length === 0) return null;

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-border bg-muted/30">
        <h3 className="font-semibold text-sm">Your Tools</h3>
      </div>
      <div className="p-4">
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-1.5 sm:gap-2">
          {roleLinks.map((link) => (
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
