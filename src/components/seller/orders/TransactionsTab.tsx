import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Search, ChevronLeft, ChevronRight, ShoppingCart, Download, Calendar } from 'lucide-react';
import { format } from 'date-fns';

const TRANSACTIONS_PER_PAGE = 20;

interface TransactionsTabProps {
  storeId: string;
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(amount);

export function TransactionsTab({ storeId }: TransactionsTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const { data: transactionsData, isLoading } = useQuery({
    queryKey: ['seller-transactions', storeId, currentPage, dateFrom, dateTo],
    queryFn: async () => {
      const from = (currentPage - 1) * TRANSACTIONS_PER_PAGE;
      const to = from + TRANSACTIONS_PER_PAGE - 1;

      let query = supabase
        .from('seller_transactions')
        .select('*', { count: 'exact' })
        .eq('store_id', storeId)
        .order('created_at', { ascending: false });

      if (dateFrom) query = query.gte('created_at', dateFrom);
      if (dateTo) query = query.lte('created_at', dateTo + 'T23:59:59');

      const { data, count, error } = await query.range(from, to);
      if (error) throw error;
      return { transactions: data || [], totalCount: count || 0 };
    },
    enabled: !!storeId,
    staleTime: 30000,
  });

  const transactions = transactionsData?.transactions || [];
  const totalCount = transactionsData?.totalCount || 0;
  const totalPages = Math.ceil(totalCount / TRANSACTIONS_PER_PAGE);

  const filteredTransactions = transactions.filter((tx: any) => {
    const matchesSearch = !searchQuery || 
      tx.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.order_id?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || tx.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed': return <Badge variant="default" className="bg-green-600">Completed</Badge>;
      case 'pending': return <Badge variant="secondary">Pending</Badge>;
      case 'failed': return <Badge variant="destructive">Failed</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'sale': return <Badge variant="outline" className="text-green-600 border-green-600">Sale</Badge>;
      case 'refund': return <Badge variant="outline" className="text-red-600 border-red-600">Refund</Badge>;
      case 'payout': return <Badge variant="outline" className="text-blue-600 border-blue-600">Payout</Badge>;
      default: return <Badge variant="outline">{type}</Badge>;
    }
  };

  const exportCSV = () => {
    const headers = ['Date', 'Type', 'Description', 'Amount', 'Platform Fee', 'Net Amount', 'Status'];
    const rows = filteredTransactions.map((tx: any) => [
      format(new Date(tx.created_at), 'yyyy-MM-dd HH:mm'),
      tx.type, tx.description || '', tx.amount, tx.platform_fee || 0, tx.net_amount || tx.amount, tx.status,
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${v}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <Card className="mb-6">
        <CardContent className="py-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by order ID or description..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[160px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex gap-2 items-center">
              <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
              <Input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setCurrentPage(1); }} className="w-[140px]" />
              <span className="text-muted-foreground text-sm">to</span>
              <Input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setCurrentPage(1); }} className="w-[140px]" />
            </div>
            <Button variant="outline" size="sm" onClick={exportCSV} disabled={filteredTransactions.length === 0}>
              <Download className="h-4 w-4 mr-1" /> Export
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
          <CardDescription>All sales, refunds, and payouts for your store</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-16" />)}
            </div>
          ) : filteredTransactions.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Platform Fee</TableHead>
                    <TableHead>Net Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.map((tx: any) => (
                    <TableRow key={tx.id}>
                      <TableCell className="whitespace-nowrap">{format(new Date(tx.created_at), 'dd MMM yyyy')}</TableCell>
                      <TableCell>{getTypeBadge(tx.type)}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{tx.description || 'Transaction'}</p>
                          {tx.order_id && <p className="text-xs text-muted-foreground">Order: {tx.order_id.slice(0, 8)}...</p>}
                        </div>
                      </TableCell>
                      <TableCell>{formatCurrency(tx.amount)}</TableCell>
                      <TableCell className="text-muted-foreground">-{formatCurrency(tx.platform_fee || 0)}</TableCell>
                      <TableCell className={tx.type === 'sale' ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                        {tx.type === 'sale' ? '+' : '-'}{formatCurrency(tx.net_amount || tx.amount)}
                      </TableCell>
                      <TableCell>{getStatusBadge(tx.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12">
              <ShoppingCart className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-medium mb-2">No transactions yet</h3>
              <p className="text-muted-foreground">Your sales and transactions will appear here once you start selling.</p>
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t">
              <p className="text-sm text-muted-foreground">Page {currentPage} of {totalPages} ({totalCount} total)</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
                  <ChevronLeft className="h-4 w-4" /> Previous
                </Button>
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
                  Next <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
