import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useIsMobile } from '@/hooks/use-mobile';
import { Link } from 'react-router-dom';
import {
  Package, Store, Star, Upload, Clock, AlertTriangle,
  ShieldAlert, ExternalLink, ArrowRight
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

type QueueTab = 'all' | 'products' | 'stores' | 'reviews' | 'submissions';

interface QueueItem {
  id: string;
  type: 'product' | 'store' | 'review' | 'submission';
  title: string;
  subtitle: string;
  status: string;
  severity: 'critical' | 'warning' | 'info';
  createdAt: string;
  href: string;
  flagged?: boolean;
}

export default function ModerationQueue() {
  const [activeTab, setActiveTab] = useState<QueueTab>('all');
  const isMobile = useIsMobile();

  // Fetch all pending items in parallel
  const { data: pendingProducts = [], isLoading: loadingProducts } = useQuery({
    queryKey: ['mod-queue-products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, created_at, moderation_status, moderation_flags, stores!products_store_id_fkey(name)')
        .eq('is_seller_product', true)
        .eq('moderation_status', 'pending')
        .order('created_at', { ascending: true })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
    staleTime: 30_000,
  });

  const { data: pendingStoreApps = [], isLoading: loadingStores } = useQuery({
    queryKey: ['mod-queue-stores'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('store_applications')
        .select('id, store_name, created_at, status, profiles!store_applications_user_id_fkey(display_name)')
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
    staleTime: 30_000,
  });

  const { data: pendingReviews = [], isLoading: loadingReviews } = useQuery({
    queryKey: ['mod-queue-reviews'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reviews')
        .select('id, title, content, rating, created_at, products(name)')
        .eq('is_approved', false)
        .order('created_at', { ascending: true })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
    staleTime: 30_000,
  });

  const { data: pendingSubmissions = [], isLoading: loadingSubmissions } = useQuery({
    queryKey: ['mod-queue-submissions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('developer_product_submissions')
        .select('id, product_name, created_at, status, profiles!developer_product_submissions_developer_id_fkey(display_name)')
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
    staleTime: 30_000,
  });

  const isLoading = loadingProducts || loadingStores || loadingReviews || loadingSubmissions;

  // Transform to unified QueueItem[]
  const allItems = useMemo<QueueItem[]>(() => {
    const items: QueueItem[] = [];

    pendingProducts.forEach(p => {
      const hasModerationFlags = p.moderation_flags != null;
      items.push({
        id: p.id,
        type: 'product',
        title: p.name || 'Untitled Product',
        subtitle: (p.stores as any)?.name || 'Unknown Store',
        status: hasModerationFlags ? 'Flagged' : 'Pending Review',
        severity: hasModerationFlags ? 'critical' : 'warning',
        createdAt: p.created_at,
        href: '/admin/seller-product-review',
        flagged: hasModerationFlags,
      });
    });

    pendingStoreApps.forEach(a => {
      items.push({
        id: a.id,
        type: 'store',
        title: a.store_name || 'Unnamed Store',
        subtitle: (a.profiles as any)?.display_name || 'Unknown Applicant',
        status: 'Pending Approval',
        severity: 'warning',
        createdAt: a.created_at,
        href: '/admin/store-applications',
      });
    });

    pendingReviews.forEach(r => {
      items.push({
        id: r.id,
        type: 'review',
        title: r.title || `${r.rating}★ Review`,
        subtitle: (r.products as any)?.name || 'Unknown Product',
        status: 'Awaiting Approval',
        severity: 'info',
        createdAt: r.created_at,
        href: '/admin/reviews',
      });
    });

    pendingSubmissions.forEach(s => {
      items.push({
        id: s.id,
        type: 'submission',
        title: s.product_name || 'Untitled Submission',
        subtitle: (s.profiles as any)?.display_name || 'Unknown Developer',
        status: 'Pending Review',
        severity: 'warning',
        createdAt: s.created_at,
        href: '/admin/developer-submissions',
      });
    });

    // Sort: critical first, then by date (oldest first)
    items.sort((a, b) => {
      const severityOrder = { critical: 0, warning: 1, info: 2 };
      const diff = severityOrder[a.severity] - severityOrder[b.severity];
      if (diff !== 0) return diff;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

    return items;
  }, [pendingProducts, pendingStoreApps, pendingReviews, pendingSubmissions]);

  const filteredItems = activeTab === 'all'
    ? allItems
    : allItems.filter(i => {
        if (activeTab === 'products') return i.type === 'product';
        if (activeTab === 'stores') return i.type === 'store';
        if (activeTab === 'reviews') return i.type === 'review';
        if (activeTab === 'submissions') return i.type === 'submission';
        return true;
      });

  const counts = {
    all: allItems.length,
    products: allItems.filter(i => i.type === 'product').length,
    stores: allItems.filter(i => i.type === 'store').length,
    reviews: allItems.filter(i => i.type === 'review').length,
    submissions: allItems.filter(i => i.type === 'submission').length,
  };

  const typeConfig: Record<string, { icon: React.ElementType; color: string; label: string }> = {
    product: { icon: Package, color: 'text-blue-500', label: 'Product' },
    store: { icon: Store, color: 'text-emerald-500', label: 'Store App' },
    review: { icon: Star, color: 'text-amber-500', label: 'Review' },
    submission: { icon: Upload, color: 'text-purple-500', label: 'Submission' },
  };

  const severityBadge = (severity: string) => {
    if (severity === 'critical') return <Badge variant="destructive" className="text-xs">Flagged</Badge>;
    if (severity === 'warning') return <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/30 text-xs">Pending</Badge>;
    return <Badge variant="secondary" className="text-xs">Info</Badge>;
  };

  const tabs = [
    { value: 'all', label: 'All', count: counts.all },
    { value: 'products', label: 'Products', count: counts.products },
    { value: 'stores', label: 'Stores', count: counts.stores },
    { value: 'reviews', label: 'Reviews', count: counts.reviews },
    { value: 'submissions', label: 'Submissions', count: counts.submissions },
  ];

  return (
    <AdminLayout requiredPermissions={['view_seller_stores']}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-display font-bold">Moderation Queue</h1>
          <p className="text-muted-foreground">
            {counts.all} item{counts.all !== 1 ? 's' : ''} awaiting review
          </p>
        </div>

        {/* Inline Stats */}
        <div className="flex items-center gap-4 text-sm flex-wrap">
          <span className="text-muted-foreground">
            <span className="font-semibold text-blue-500">{counts.products}</span> products
          </span>
          <span className="text-muted-foreground">
            <span className="font-semibold text-emerald-500">{counts.stores}</span> store apps
          </span>
          <span className="text-muted-foreground">
            <span className="font-semibold text-amber-500">{counts.reviews}</span> reviews
          </span>
          <span className="text-muted-foreground">
            <span className="font-semibold text-purple-500">{counts.submissions}</span> submissions
          </span>
        </div>

        {/* Mobile: Select, Desktop: Tabs */}
        <div className="sm:hidden">
          <Select value={activeTab} onValueChange={v => setActiveTab(v as QueueTab)}>
            <SelectTrigger className="bg-card">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {tabs.map(t => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label} ({t.count})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Tabs value={activeTab} onValueChange={v => setActiveTab(v as QueueTab)} className="hidden sm:block">
          <TabsList>
            {tabs.map(t => (
              <TabsTrigger key={t.value} value={t.value} className="gap-1.5">
                {t.label}
                {t.count > 0 && (
                  <Badge variant="secondary" className="text-xs h-5 px-1.5 min-w-[20px] justify-center">
                    {t.count}
                  </Badge>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {/* Queue Items */}
        <div className="space-y-2">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="border border-border rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
              </div>
            ))
          ) : filteredItems.length === 0 ? (
            <div className="border border-border rounded-xl p-8 text-center text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Queue is clear!</p>
              <p className="text-sm mt-1">No items awaiting moderation.</p>
            </div>
          ) : (
            filteredItems.map(item => {
              const config = typeConfig[item.type];
              const Icon = config.icon;
              return (
                <Link key={`${item.type}-${item.id}`} to={item.href} className="block group">
                  <div className="border border-border rounded-xl transition-colors hover:bg-muted/50 active:scale-[0.995] p-4">
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg bg-muted shrink-0 ${config.color}`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-medium text-sm truncate">{item.title}</h3>
                            {severityBadge(item.severity)}
                            <Badge variant="outline" className="text-xs">{config.label}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">{item.subtitle}</p>
                          <div className="flex items-center gap-1 mt-1.5 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                          </div>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-1" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
