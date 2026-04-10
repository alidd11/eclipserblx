import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AlertTriangle, ShieldAlert, Clock, Package, MessageCircle, FileText, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface AlertItem {
  id: string;
  label: string;
  count: number;
  severity: 'critical' | 'warning' | 'info';
  icon: React.ElementType;
  href: string;
}

export function SystemAlerts() {
  const { data: alerts, isLoading } = useQuery({
    queryKey: ['admin-system-alerts'],
    queryFn: async () => {
      const [
        pendingModeration,
        openDisputes,
        pendingStoreApps,
        pendingJobApps,
        unresolvedTickets,
        pendingSellerProducts,
      ] = await Promise.all([
        supabase.from('products').select('id', { count: 'exact', head: true }).eq('moderation_status', 'pending').eq('is_seller_product', true),
        supabase.from('refund_requests').select('id', { count: 'exact', head: true }).in('status', ['pending', 'escalated']),
        supabase.from('store_applications').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('job_applications').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('support_tickets').select('id', { count: 'exact', head: true }).in('status', ['open', 'in_progress']),
        supabase.from('developer_product_submissions').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      ]);

      const items: AlertItem[] = [];

      if ((openDisputes.count || 0) > 0) {
        items.push({
          id: 'disputes',
          label: 'Open Disputes',
          count: openDisputes.count || 0,
          severity: 'critical',
          icon: ShieldAlert,
          href: '/admin/disputes',
        });
      }

      if ((pendingModeration.count || 0) > 0) {
        items.push({
          id: 'moderation',
          label: 'Pending Moderation',
          count: pendingModeration.count || 0,
          severity: 'warning',
          icon: Package,
          href: '/admin/seller-product-review',
        });
      }

      if ((pendingSellerProducts.count || 0) > 0) {
        items.push({
          id: 'seller-products',
          label: 'Seller Product Reviews',
          count: pendingSellerProducts.count || 0,
          severity: 'warning',
          icon: FileText,
          href: '/admin/seller-product-review',
        });
      }

      if ((unresolvedTickets.count || 0) > 0) {
        items.push({
          id: 'tickets',
          label: 'Unresolved Tickets',
          count: unresolvedTickets.count || 0,
          severity: 'info',
          icon: MessageCircle,
          href: '/admin/customer-tickets',
        });
      }

      if ((pendingStoreApps.count || 0) > 0) {
        items.push({
          id: 'store-apps',
          label: 'Store Applications',
          count: pendingStoreApps.count || 0,
          severity: 'info',
          icon: Clock,
          href: '/admin/store-applications',
        });
      }

      if ((pendingJobApps.count || 0) > 0) {
        items.push({
          id: 'job-apps',
          label: 'Job Applications',
          count: pendingJobApps.count || 0,
          severity: 'info',
          icon: FileText,
          href: '/admin/applications',
        });
      }

      return items;
    },
    refetchInterval: 5 * 60_000,
    staleTime: 2 * 60_000,
  });

  const severityStyles = {
    critical: 'border-destructive/30 bg-destructive/5 hover:bg-destructive/10',
    warning: 'border-orange-500/30 bg-orange-500/5 hover:bg-orange-500/10',
    info: 'border-primary/20 bg-primary/5 hover:bg-primary/10',
  };

  const severityBadge = {
    critical: 'bg-destructive text-destructive-foreground',
    warning: 'bg-orange-500 text-foreground',
    info: 'bg-primary/20 text-primary',
  };

  const severityIconColor = {
    critical: 'text-destructive',
    warning: 'text-orange-500',
    info: 'text-primary',
  };

  // "All clear" state instead of hiding entirely
  if (isLoading) return null;

  if (!alerts?.length) {
    return (
      <div className="border border-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          <h3 className="font-semibold text-sm">System Status</h3>
        </div>
        <div className="p-4">
          <p className="text-sm text-muted-foreground">All clear — no items need attention right now.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-orange-500" />
        <h3 className="font-semibold text-sm">Needs Attention</h3>
        <Badge variant="secondary" className="ml-auto text-xs">
          {alerts.length} {alerts.length === 1 ? 'item' : 'items'}
        </Badge>
      </div>
      <div className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {alerts.map((alert) => (
            <Link key={alert.id} to={alert.href}>
              <div className={cn(
                'flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer',
                severityStyles[alert.severity]
              )}>
                <div className="relative">
                  <alert.icon className={cn('h-4 w-4 shrink-0', severityIconColor[alert.severity])} />
                  {alert.severity === 'critical' && (
                    <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-destructive animate-pulse" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{alert.label}</p>
                </div>
                <Badge className={cn('shrink-0', severityBadge[alert.severity])}>
                  {alert.count}
                </Badge>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
