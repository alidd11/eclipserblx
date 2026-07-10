import { Link } from 'react-router-dom';
import { ArrowRight, Gavel, Package, Ticket, ShoppingCart } from 'lucide-react';
import { AdminSection } from '@/components/admin/AdminSection';
import { useAdminOverview } from '@/hooks/useAdminOverview';
import { cn } from '@/lib/utils';

interface QueueRow {
  label: string;
  count: number;
  href: string;
  icon: React.ElementType;
  tone: 'critical' | 'warn' | 'info';
}

const toneStyles = {
  critical: 'text-destructive',
  warn: 'text-orange-500',
  info: 'text-primary',
};

export function TodayQueue() {
  const { data, isLoading } = useAdminOverview();

  const rows: QueueRow[] = [
    {
      label: 'Pending refunds',
      count: data?.pending_refunds ?? 0,
      href: '/admin/disputes-refunds',
      icon: Gavel,
      tone: 'critical',
    },
    {
      label: 'Products awaiting review',
      count: data?.products_awaiting_review ?? 0,
      href: '/admin/seller-product-review',
      icon: Package,
      tone: 'warn',
    },
    {
      label: 'Open customer tickets',
      count: data?.open_tickets ?? 0,
      href: '/admin/customer-tickets',
      icon: Ticket,
      tone: 'info',
    },
    {
      label: 'Active orders',
      count: data?.active_orders ?? 0,
      href: '/admin/orders',
      icon: ShoppingCart,
      tone: 'info',
    },
  ];

  return (
    <AdminSection title="Today's queue" padded={false}>
      <ul className="divide-y divide-border">
        {rows.map((row) => (
          <li key={row.label}>
            <Link
              to={row.href}
              className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors"
            >
              <row.icon className={cn('h-4 w-4 shrink-0', toneStyles[row.tone])} />
              <span className="text-sm flex-1 truncate">{row.label}</span>
              <span className="text-sm font-semibold tabular-nums">
                {isLoading ? '—' : row.count}
              </span>
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
            </Link>
          </li>
        ))}
      </ul>
    </AdminSection>
  );
}
