import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSellerStatus } from '@/hooks/useSellerStatus';
import { SellerLayout } from '@/components/seller/SellerLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Search, Download, ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function SellerTransactionHistory() {
  const { store } = useSellerStatus();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const perPage = 25;

  const { data, isLoading } = useQuery({
    queryKey: ['seller-transaction-history', store?.id, page, typeFilter],
    queryFn: async () => {
      if (!store?.id) return { items: [], count: 0 };
      let query = supabase
        .from('seller_transactions')
        .select('*', { count: 'exact' })
        .eq('store_id', store.id)
        .order('created_at', { ascending: false })
        .range((page - 1) * perPage, page * perPage - 1);

      if (typeFilter !== 'all') {
        query = query.eq('type', typeFilter);
      }

      const { data: items, count, error } = await query;
      if (error) throw error;
      return { items: items || [], count: count || 0 };
    },
    enabled: !!store?.id,
  });

  const transactions = data?.items || [];
  const totalCount = data?.count || 0;
  const totalPages = Math.ceil(totalCount / perPage);

  const filtered = search
    ? transactions.filter((t: any) => t.description?.toLowerCase().includes(search.toLowerCase()) || t.id.includes(search))
    : transactions;

  const exportCSV = () => {
    const headers = ['Date', 'Type', 'Description', 'Gross', 'Platform Fee', 'Stripe Fee', 'Net Amount', 'Status'];
    const rows = filtered.map((t: any) => [
      format(new Date(t.created_at), 'yyyy-MM-dd HH:mm'),
      t.type, t.description || '', 
      t.gross_amount || t.amount, t.platform_fee || 0, t.stripe_fee || 0, t.net_amount || t.amount,
      t.refunded_at ? 'Refunded' : t.status || 'completed'
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <SellerLayout><div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold">Transaction History</h1>
        <p className="text-sm text-muted-foreground">Complete log of every sale, refund, and fee.</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search transactions..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
            <div className="flex items-center gap-2">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="sale">Sales</SelectItem>
                  <SelectItem value="payout">Payouts</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={exportCSV}>
                <Download className="h-4 w-4 mr-1" /> Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Gross</TableHead>
                  <TableHead className="text-right">Fees</TableHead>
                  <TableHead className="text-right">Net</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No transactions found</TableCell></TableRow>
                ) : filtered.map((t: any) => (
                  <TableRow key={t.id}>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{format(new Date(t.created_at), 'dd MMM yyyy HH:mm')}</TableCell>
                    <TableCell>
                      <Badge variant={t.type === 'sale' ? 'default' : 'secondary'} className="text-xs capitalize">{t.type}</Badge>
                    </TableCell>
                    <TableCell className="max-w-48 truncate text-sm">{t.description || '—'}</TableCell>
                    <TableCell className="text-right text-sm">£{Number(t.gross_amount || t.amount || 0).toFixed(2)}</TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      £{(Number(t.platform_fee || 0) + Number(t.stripe_fee || 0)).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium">£{Number(t.net_amount || t.amount || 0).toFixed(2)}</TableCell>
                    <TableCell>
                      {t.refunded_at ? (
                        <Badge variant="destructive" className="text-xs">Refunded</Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs text-green-500 border-green-500/30">Completed</Badge>
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
              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
                <span className="text-xs px-2">Page {page} of {totalPages}</span>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div></SellerLayout>
  );
}
