import { useSellerStatus } from '@/hooks/useSellerStatus';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

interface HealthMetric {
  name: string;
  score: number;
  status: 'good' | 'warning' | 'critical';
  description: string;
  icon: React.ElementType;
}

export function StoreHealthScore() {
  const { store } = useSellerStatus();

  // Fetch health metrics
  const { data: healthData, isLoading } = useQuery({
    queryKey: ['store-health', store?.id],
    queryFn: async () => {
      if (!store?.id) return null;

      // Get products count
      const { count: productCount } = await supabase
        .from('products')
        .select('id', { count: 'exact', head: true })
        .eq('store_id', store.id)
        .eq('is_active', true);

      // Get reviews for this store's products
      const { data: products } = await supabase
        .from('products')
        .select('id')
        .eq('store_id', store.id);

      const productIds = products?.map(p => p.id) || [];
      
      let avgRating = 0;
      let reviewCount = 0;
      
      if (productIds.length > 0) {
        const { data: reviews } = await supabase
          .from('reviews')
          .select('rating')
          .in('product_id', productIds)
          .eq('is_approved', true);
        
        reviewCount = reviews?.length || 0;
        avgRating = reviewCount > 0 
          ? reviews!.reduce((sum, r) => sum + r.rating, 0) / reviewCount 
          : 0;
      }

      // Get response time from messages (sender_type = 'seller' means store replied)
      const { data: messages } = await supabase
        .from('store_messages')
        .select('created_at, conversation_id')
        .eq('store_id', store.id)
        .eq('sender_type', 'seller')
        .order('created_at', { ascending: false })
        .limit(10);

      const responseTimeScore = (messages as any[])?.length ? 85 : 50; // Simplified

      // Get order fulfillment rate
      const { data: transactions } = await supabase
        .from('seller_transactions')
        .select('status')
        .eq('store_id', store.id)
        .eq('type', 'sale');

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
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Store Health</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-32 flex items-center justify-center">
            <div className="animate-pulse text-muted-foreground">Loading...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Store Health</CardTitle>
          <Badge className={cn('gap-1', statusColors[overallStatus])}>
            <StatusIcon className="h-3 w-3" />
            {overallScore}%
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall Score */}
        <div className="text-center py-2">
          <div className="relative inline-flex items-center justify-center">
            <svg className="h-20 w-20 transform -rotate-90">
              <circle
                cx="40"
                cy="40"
                r="36"
                strokeWidth="6"
                className="fill-none stroke-muted"
              />
              <circle
                cx="40"
                cy="40"
                r="36"
                strokeWidth="6"
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
      </CardContent>
    </Card>
  );
}
