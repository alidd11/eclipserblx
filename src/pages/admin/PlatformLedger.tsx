import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Search, Download, Calendar, ChevronLeft, ChevronRight, BookOpen, TrendingUp, Percent, Store } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const PER_PAGE = 25;
const fmt = (v: number) =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(v);

export default function PlatformLedger() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [storeFilter, setStoreFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);

  // Fetch all stores for filter dropdown
  const { data: stores } = useQuery({
    queryKey: ['admin-ledger-stores'],
    queryFn: async () => {
      const { data } = await supabase
        .from('stores')
        .select('id, name')
        .order('name');
      return data || [];
    },
  });

  // Fetch transactions across all stores
  const { data, isLoading } = useQuery({
    queryKey: ['admin-platform-ledger', page, typeFilter, storeFilter, dateFrom, dateTo],
    queryFn: async () => {
      let query = supabase
        .from('seller_transactions')
        .select('*, stores(name)', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range((page - 1) * PER_PAGE, page * PER_PAGE - 1);

      if (typeFilter !== 'all') query = query.eq('type', typeFilter);
      if (storeFilter !== 'all') query = query.eq('store_id', storeFilter);
      if (dateFrom) query = query.gte('created_at', dateFrom);
      if (dateTo) query = query.lte('created_at', dateTo + 'T23:59:59');

      const { data: items, count, error } = await query;
      if (error) throw error;
      return { items: items || [], count: count || 0 };
    },
  });

  // Summary stats
  const { data: summary } = useQuery({
    queryKey: ['admin-ledger-summary', storeFilter, dateFrom, dateTo],
    queryFn: async () => {
      let query = supabase
        .from('seller_transactions')
        .select('gross_amount, platform_fee, stripe_fee, net_amount, type, refunded_at')
        .eq('type', 'sale')
        .is('refunded_at', null);

      if (storeFilter !== 'all') query = query.eq('store_id', storeFilter);
      if (dateFrom) query = query.gte('created_at', dateFrom);
      if (dateTo) query = query.lte('created_at', dateTo + 'T23:59:59');

      const { data: rows } = await query.limit(1000);
      if (!rows) return { totalGross: 0, totalCommission: 0, totalStripe: 0, totalNet: 0, txCount: 0 };

      return {
        totalGross: rows.reduce((s, r) => s + Number(r.gross_amount || 0), 0),
        totalCommission: rows.reduce((s, r) => s + Number(r.platform_fee || 0), 0),
        totalStripe: rows.reduce((s, r) => s + Number(r.stripe_fee || 0), 0),
        totalNet: rows.reduce((s, r) => s + Number(r.net_amount || 0), 0),
        txCount: rows.length,
      };
    },
  });

  const transactions = data?.items || [];
  const totalCount = data?.count || 0;
  const totalPages = Math.ceil(totalCount / PER_PAGE);

  const filtered = search
    ? transactions.filter((t: any) =>
        t.description?.toLowerCase().includes(search.toLowerCase()) ||
        t.id?.includes(search) ||
        t.order_id?.includes(search))
    : transactions;

  const exportCSV = () => {
    const headers = ['Date', 'Store', 'Type', 'Description', 'Gross', 'Commission', 'Stripe Fee', 'Seller Net', 'Status'];
    const rows = filtered.map((t: any) => [
      format(new Date(t.created_at), 'yyyy-MM-dd HH:mm'),
      (t.stores as any)?.name || 'Unknown',
      t.type,
      `"${(t.description || '').replace(/"/g, '""')}"`,
      Number(t.gross_amount || t.amount || 0).toFixed(2),
      Number(t.platform_fee || 0).toFixed(2),
      Number(t.stripe_fee || 0).toFixed(2),
      Number(t.net_amount || t.amount || 0).toFixed(2),
      t.refunded_at ? 'Refunded' : t.status || 'completed',
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `platform-ledger-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-display font-bold flex items-center gap-2">
            <BookOpen className="h-6 w-6" />
            Platform Ledger
          </h1>
          <p className="text-sm text-muted-foreground">
            Every transaction across all stores — sales, commissions, and fees.
          </p>
        </div>

        {/* Summary Cards */}
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 md:grid md:grid-cols-5 md:overflow-visible">
          <SummaryCard
            label="Gross Sales"
            value={fmt(summary?.totalGross || 0)}
            icon={<TrendingUp className="h-4 w-4" />}
          />
          <SummaryCard
            label="Commission Earned"
            value={fmt(summary?.totalCommission || 0)}
            icon={<Percent className="h-4 w-4" />}
            highlight
          />
          <SummaryCard
            label="Stripe Fees"
            value={fmt(summary?.totalStripe || 0)}
            icon={<TrendingUp className="h-4 w-4" />}
          />
          <SummaryCard
            label="Seller Net"
            value={fmt(summary?.totalNet || 0)}
            icon={<Store className="h-4 w-4" />}
          />
          <SummaryCard
            label="Transactions"
            value={String(summary?.txCount || 0)}
            icon={<BookOpen className="h-4 w-4" />}
          />
        </div>

        {/* Filters */}
        <div className="border border-border rounded-xl overflow-hidden">
          <div className="p-4 py-4">
            <div className="flex flex-col lg:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by description, ID, or order..."
                  value={search}
                  onChange={e => { setSearch(e.target.value); setPage(1); }}
                  className="pl-10"
                />
              </div>
              <Select value={typeFilter} onValueChange={v => { setTypeFilter(v); setPage(1); }}>
                <SelectTrigger className="w-auto min-w-[140px]">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="sale">Sales</SelectItem>
                  <SelectItem value="payout">Payouts</SelectItem>
                </SelectContent>
              </Select>
              <Select value={storeFilter} onValueChange={v => { setStoreFilter(v); setPage(1); }}>
                <SelectTrigger className="w-auto min-w-[140px]">
                  <SelectValue placeholder="Store" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stores</SelectItem>
                  {stores?.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                <Input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1); }} className="w-[140px]" />
                <span className="text-muted-foreground text-sm">to</span>
                <Input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1); }} className="w-[140px]" />
              </div>
              <Button variant="outline" size="sm" onClick={exportCSV} disabled={filtered.length === 0}>
                <Download className="h-4 w-4 mr-1" /> Export
              </Button>
            </div>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="border border-border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-muted/30">
            <h3 className="font-semibold text-sm">All Transactions</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{totalCount} transactions across all stores</p>
          </div>
          <div className="p-4 p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Store</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Gross</TableHead>
                    <TableHead className="text-right">Commission</TableHead>
                    <TableHead className="text-right">Stripe Fee</TableHead>
                    <TableHead className="text-right">Seller Net</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 9 }).map((_, j) => (
                          <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                        No transactions found
                      </TableCell>
                    </TableRow>
                  ) : filtered.map((t: any) => (
                    <TableRow key={t.id}>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {format(new Date(t.created_at), 'dd MMM yyyy HH:mm')}
                      </TableCell>
                      <TableCell className="text-sm font-medium">
                        {(t.stores as any)?.name || 'Unknown'}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={t.type === 'sale' ? 'default' : 'secondary'}
                          className="text-xs capitalize"
                        >
                          {t.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-48 truncate text-sm">
                        {t.description || '—'}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {fmt(Number(t.gross_amount || t.amount || 0))}
                      </TableCell>
                      <TableCell className="text-right text-sm font-medium text-green-600">
                        {fmt(Number(t.platform_fee || 0))}
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {fmt(Number(t.stripe_fee || 0))}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {fmt(Number(t.net_amount || t.amount || 0))}
                      </TableCell>
                      <TableCell>
                        {t.refunded_at ? (
                          <Badge variant="destructive" className="text-xs">Refunded</Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs text-green-500 border-green-500/30">
                            Completed
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                <p className="text-xs text-muted-foreground">{totalCount} transactions total</p>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                    <ChevronLeft className="h-4 w-4" /> Previous
                  </Button>
                  <span className="text-xs px-2">Page {page} of {totalPages}</span>
                  <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                    Next <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

function SummaryCard({ label, value, icon, highlight }: { label: string; value: string; icon: React.ReactNode; highlight?: boolean }) {
  return (
    <Card className={cn('min-w-[160px] flex-shrink-0 md:min-w-0', highlight && 'border-green-500/30 bg-green-500/5')}>
      <div className="p-4 pt-4 pb-3 px-4">
        <div className="flex items-center gap-2 text-muted-foreground mb-1">
          {icon}
          <span className="text-xs font-medium">{label}</span>
        </div>
        <p className={cn('text-lg font-bold', highlight && 'text-green-600')}>{value}</p>
      </div>
    </div>
  );
}
