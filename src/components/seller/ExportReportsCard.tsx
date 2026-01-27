import { useState } from 'react';
import { useSellerStatus } from '@/hooks/useSellerStatus';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Download, FileSpreadsheet, Loader2, Calendar } from 'lucide-react';
import { format, subDays, subMonths } from 'date-fns';
import { toast } from 'sonner';

type ReportType = 'orders' | 'revenue' | 'products' | 'analytics';
type TimeRange = '7d' | '30d' | '90d' | 'all';

export function ExportReportsCard() {
  const { store } = useSellerStatus();
  const [reportType, setReportType] = useState<ReportType>('orders');
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');
  const [isExporting, setIsExporting] = useState(false);

  const getDateFilter = () => {
    const now = new Date();
    switch (timeRange) {
      case '7d': return subDays(now, 7);
      case '30d': return subDays(now, 30);
      case '90d': return subDays(now, 90);
      default: return null;
    }
  };

  const exportToCsv = async () => {
    if (!store?.id) {
      toast.error('Store not found');
      return;
    }

    setIsExporting(true);
    try {
      let data: any[] = [];
      let headers: string[] = [];
      let filename = '';
      const dateFilter = getDateFilter();

      switch (reportType) {
        case 'orders': {
          let query = supabase
            .from('seller_transactions')
            .select('*')
            .eq('store_id', store.id)
            .eq('type', 'sale')
            .order('created_at', { ascending: false });

          if (dateFilter) {
            query = query.gte('created_at', dateFilter.toISOString());
          }

          const { data: transactions, error } = await query;
          if (error) throw error;

          headers = ['Date', 'Order ID', 'Description', 'Amount', 'Platform Fee', 'Net Amount', 'Status'];
          data = (transactions || []).map((tx: any) => [
            format(new Date(tx.created_at), 'yyyy-MM-dd HH:mm'),
            tx.order_id || '',
            tx.description || '',
            tx.amount?.toFixed(2) || '0.00',
            tx.platform_fee?.toFixed(2) || '0.00',
            tx.net_amount?.toFixed(2) || '0.00',
            tx.status || '',
          ]);
          filename = `orders_${format(new Date(), 'yyyy-MM-dd')}.csv`;
          break;
        }

        case 'revenue': {
          let query = supabase
            .from('seller_transactions')
            .select('*')
            .eq('store_id', store.id)
            .order('created_at', { ascending: false });

          if (dateFilter) {
            query = query.gte('created_at', dateFilter.toISOString());
          }

          const { data: transactions, error } = await query;
          if (error) throw error;

          // Group by date
          const dailyRevenue: Record<string, { sales: number; revenue: number; fees: number; refunds: number }> = {};
          (transactions || []).forEach((tx: any) => {
            const date = format(new Date(tx.created_at), 'yyyy-MM-dd');
            if (!dailyRevenue[date]) {
              dailyRevenue[date] = { sales: 0, revenue: 0, fees: 0, refunds: 0 };
            }
            if (tx.type === 'sale') {
              dailyRevenue[date].sales += 1;
              dailyRevenue[date].revenue += tx.net_amount || 0;
              dailyRevenue[date].fees += tx.platform_fee || 0;
            } else if (tx.type === 'refund') {
              dailyRevenue[date].refunds += tx.amount || 0;
            }
          });

          headers = ['Date', 'Sales Count', 'Revenue (Net)', 'Platform Fees', 'Refunds'];
          data = Object.entries(dailyRevenue)
            .sort(([a], [b]) => b.localeCompare(a))
            .map(([date, stats]) => [
              date,
              stats.sales.toString(),
              stats.revenue.toFixed(2),
              stats.fees.toFixed(2),
              stats.refunds.toFixed(2),
            ]);
          filename = `revenue_${format(new Date(), 'yyyy-MM-dd')}.csv`;
          break;
        }

        case 'products': {
          const { data: products, error } = await supabase
            .from('products')
            .select('name, price, download_count, moderation_status, is_active, created_at, categories(name)')
            .eq('store_id', store.id)
            .order('created_at', { ascending: false });

          if (error) throw error;

          headers = ['Product Name', 'Price', 'Downloads', 'Category', 'Status', 'Active', 'Created Date'];
          data = (products || []).map((p: any) => [
            p.name,
            p.price?.toFixed(2) || '0.00',
            p.download_count?.toString() || '0',
            p.categories?.name || 'Uncategorized',
            p.moderation_status || 'pending',
            p.is_active ? 'Yes' : 'No',
            format(new Date(p.created_at), 'yyyy-MM-dd'),
          ]);
          filename = `products_${format(new Date(), 'yyyy-MM-dd')}.csv`;
          break;
        }

        case 'analytics': {
          let query = supabase
            .from('seller_analytics')
            .select('*')
            .eq('store_id', store.id)
            .order('created_at', { ascending: false });

          if (dateFilter) {
            query = query.gte('created_at', dateFilter.toISOString());
          }

          const { data: analytics, error } = await query;
          if (error) throw error;

          // Group by date and event type
          const dailyAnalytics: Record<string, Record<string, number>> = {};
          (analytics || []).forEach((event: any) => {
            const date = format(new Date(event.created_at), 'yyyy-MM-dd');
            if (!dailyAnalytics[date]) {
              dailyAnalytics[date] = {};
            }
            const eventType = event.event_type || 'unknown';
            dailyAnalytics[date][eventType] = (dailyAnalytics[date][eventType] || 0) + 1;
          });

          headers = ['Date', 'Store Views', 'Product Views', 'Add to Cart', 'Purchases'];
          data = Object.entries(dailyAnalytics)
            .sort(([a], [b]) => b.localeCompare(a))
            .map(([date, events]) => [
              date,
              (events['store_view'] || 0).toString(),
              (events['product_view'] || 0).toString(),
              (events['add_to_cart'] || 0).toString(),
              (events['purchase'] || 0).toString(),
            ]);
          filename = `analytics_${format(new Date(), 'yyyy-MM-dd')}.csv`;
          break;
        }
      }

      if (data.length === 0) {
        toast.info('No data to export for the selected criteria');
        return;
      }

      // Create CSV content
      const csvContent = [
        headers.join(','),
        ...data.map(row => row.map((cell: string) => `"${cell.replace(/"/g, '""')}"`).join(',')),
      ].join('\n');

      // Download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(`Exported ${data.length} rows to ${filename}`);
    } catch (error: any) {
      console.error('Export error:', error);
      toast.error('Failed to export data: ' + error.message);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5" />
          Export Reports
        </CardTitle>
        <CardDescription>
          Download CSV reports of your store data
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Report Type</Label>
            <Select value={reportType} onValueChange={(v: ReportType) => setReportType(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="orders">Orders & Transactions</SelectItem>
                <SelectItem value="revenue">Daily Revenue Summary</SelectItem>
                <SelectItem value="products">Product Catalog</SelectItem>
                <SelectItem value="analytics">Traffic Analytics</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Time Range</Label>
            <Select value={timeRange} onValueChange={(v: TimeRange) => setTimeRange(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
                <SelectItem value="all">All time</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button 
          onClick={exportToCsv} 
          disabled={isExporting}
          className="w-full"
        >
          {isExporting ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Download className="h-4 w-4 mr-2" />
          )}
          {isExporting ? 'Exporting...' : 'Download CSV'}
        </Button>
      </CardContent>
    </Card>
  );
}
