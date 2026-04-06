import { useSellerStatus } from '@/hooks/useSellerStatus';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  TrendingUp,
  Star,
  Clock,
  MessageCircle,
  CheckCircle,
  AlertTriangle,
  XCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { CardLoadingSkeleton } from './DashboardPlaceholders';

interface HealthMetric {
  name: string;
  score: number;
  status: 'good' | 'warning' | 'critical';
  description: string;
  icon: React.ElementType;
}

export function StoreHealthScore() {
  const { store } = useSellerStatus();

  const { data: healthData, isLoading } = useQuery({
    queryKey: ['store-health', store?.id],
    queryFn: async () => {
      if (!store?.id) return null;

      const { count: productCount } = await supabase
        .from('products')
        .select('id', { count: 'exact', head: true })
        .eq('store_id', store.id)
        .eq('is_active', true);

      const { data: reviewStats } = await supabase
        .from('reviews')
        .select('rating, product_id, products!inner(store_id)')
        .eq('products.store_id', store.id)
        .eq('is_approved', true);

      const reviewCount = reviewStats?.length || 0;
      const avgRating = reviewCount > 0
        ? reviewStats!.reduce((sum, r) => sum + r.rating, 0) / reviewCount
        : 0;

      const { count: replyCount } = await supabase
        .from('store_messages')
        .select('id', { count: 'exact', head: true })
        .eq('store_id', store.id)
        .eq('sender_type', 'seller');

      const responseTimeScore = (replyCount || 0) > 0 ? 85 : 50;

      const { data: transactions } = await supabase
        .from('seller_transactions')
        .select('status, refunded_at')
        .eq('store_id', store.id)
        .eq('type', 'sale')
        .is('refunded_at', null);

      const totalOrders = transactions?.length || 0;
      const completedOrders = transactions?.filter(t => t.status === 'completed' || t.status === 'pending').length || 0;
      const fulfillmentRate = totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 100;

      return {
        productCount: productCount || 0,
        avgRating,
        reviewCount,
        responseTimeScore,
        fulfillmentRate,
        totalOrders,
      };
    },
    enabled: !!store?.id,
    staleTime: 5 * 60 * 1000,
  });

  const getScoreStatus = (score: number): 'good' | 'warning' | 'critical' => {
    if (score >= 80) return 'good';
    if (score >= 50) return 'warning';
    return 'critical';
  };

  const metrics: HealthMetric[] = healthData ? [
    {
      name: 'Product Catalog',
      score: Math.min(100, (healthData.productCount / 5) * 100),
      status: getScoreStatus(Math.min(100, (healthData.productCount / 5) * 100)),
      description: `${healthData.productCount} active products`,
      icon: TrendingUp,
    },
    {
      name: 'Customer Rating',
      score: (healthData.avgRating / 5) * 100,
      status: getScoreStatus((healthData.avgRating / 5) * 100),
      description: healthData.reviewCount > 0
        ? `${healthData.avgRating.toFixed(1)}★ from ${healthData.reviewCount} reviews`
        : 'No reviews yet',
      icon: Star,
    },
    {
      name: 'Response Time',
      score: healthData.responseTimeScore,
      status: getScoreStatus(healthData.responseTimeScore),
      description: healthData.responseTimeScore >= 80 ? 'Fast responder' : 'Needs improvement',
      icon: MessageCircle,
    },
    {
      name: 'Order Fulfillment',
      score: healthData.fulfillmentRate,
      status: getScoreStatus(healthData.fulfillmentRate),
      description: `${healthData.fulfillmentRate.toFixed(0)}% of ${healthData.totalOrders} orders`,
      icon: Clock,
    },
  ] : [];

  const overallScore = metrics.length
    ? Math.round(metrics.reduce((sum, m) => sum + m.score, 0) / metrics.length)
    : 0;

  const overallStatus = getScoreStatus(overallScore);

  const statusColors = {
    good: 'text-green-600 bg-green-500/10',
    warning: 'text-amber-600 bg-amber-500/10',
    critical: 'text-red-600 bg-red-500/10',
  };

  const statusIcons = {
    good: CheckCircle,
    warning: AlertTriangle,
    critical: XCircle,
  };

  const StatusIcon = statusIcons[overallStatus];

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border/50 bg-card">
        <div className="p-4 pb-2">
          <h3 className="text-base font-medium">Store Health</h3>
        </div>
        <div className="p-4 pt-0">
          <CardLoadingSkeleton rows={4} />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border/50 bg-card">
      <div className="flex items-center justify-between p-4 pb-2">
        <h3 className="text-base font-medium">Store Health</h3>
        <Badge className={cn('gap-1', statusColors[overallStatus])}>
          <StatusIcon className="h-3 w-3" />
          {overallScore}%
        </Badge>
      </div>
      <div className="p-4 pt-0 space-y-4">
        {/* Overall Score */}
        <div className="text-center py-2">
          <div className="relative inline-flex items-center justify-center">
            <svg className="h-20 w-20 transform -rotate-90">
              <circle cx="40" cy="40" r="36" strokeWidth="6" className="fill-none stroke-muted" />
              <circle
                cx="40" cy="40" r="36" strokeWidth="6"
                strokeDasharray={`${(overallScore / 100) * 226} 226`}
                className={cn(
                  'fill-none transition-all duration-500',
                  overallStatus === 'good' && 'stroke-green-500',
                  overallStatus === 'warning' && 'stroke-amber-500',
                  overallStatus === 'critical' && 'stroke-red-500'
                )}
                strokeLinecap="round"
              />
            </svg>
            <span className="absolute text-xl font-bold">{overallScore}</span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">Overall Score</p>
        </div>

        {/* Individual Metrics */}
        <div className="space-y-3">
          {metrics.map((metric) => (
            <div key={metric.name} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <metric.icon className={cn(
                    'h-4 w-4',
                    metric.status === 'good' && 'text-green-600',
                    metric.status === 'warning' && 'text-amber-600',
                    metric.status === 'critical' && 'text-red-600'
                  )} />
                  <span className="font-medium">{metric.name}</span>
                </div>
                <span className="text-muted-foreground text-xs">{metric.description}</span>
              </div>
              <Progress
                value={metric.score}
                className={cn(
                  'h-1.5',
                  metric.status === 'good' && '[&>div]:bg-green-500',
                  metric.status === 'warning' && '[&>div]:bg-amber-500',
                  metric.status === 'critical' && '[&>div]:bg-red-500'
                )}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
