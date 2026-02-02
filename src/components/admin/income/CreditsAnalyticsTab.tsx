import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Coins, TrendingUp, TrendingDown, Gift, ShoppingCart, RefreshCw, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { startOfDay, startOfWeek, startOfMonth, startOfYear, isAfter, subDays, format } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';

export function CreditsAnalyticsTab() {
  // Fetch all credit transactions
  const { data: creditTransactions, isLoading, refetch } = useQuery({
    queryKey: ['admin-credit-transactions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('credit_transactions')
        .select('*, profiles!credit_transactions_user_id_fkey(display_name, username)')
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) throw error;
      return data ?? [];
    },
  });

  // Fetch credit balances summary
  const { data: balancesSummary } = useQuery({
    queryKey: ['admin-credit-balances-summary'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('credit_balances')
        .select('balance, total_purchased, total_gifted, total_spent, eclipse_plus_bonus_claimed');

      if (error) throw error;
      
      const balances = data ?? [];
      return {
        totalActiveBalance: balances.reduce((sum, b) => sum + Number(b.balance), 0),
        totalPurchased: balances.reduce((sum, b) => sum + Number(b.total_purchased), 0),
        totalGifted: balances.reduce((sum, b) => sum + Number(b.total_gifted), 0),
        totalSpent: balances.reduce((sum, b) => sum + Number(b.total_spent), 0),
        usersWithBalance: balances.filter(b => Number(b.balance) > 0).length,
        eclipseBonusesClaimed: balances.filter(b => b.eclipse_plus_bonus_claimed).length,
      };
    },
  });

  // Calculate breakdown by period
  const breakdown = useMemo(() => {
    if (!creditTransactions) return null;

    const now = new Date();
    const dayStart = startOfDay(now);
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const monthStart = startOfMonth(now);
    const yearStart = startOfYear(now);

    const calculatePeriod = (filterFn: (tx: typeof creditTransactions[0]) => boolean) => {
      const filtered = creditTransactions.filter(filterFn);
      const purchases = filtered.filter(t => t.type === 'purchase');
      const gifts = filtered.filter(t => t.type === 'gift' || t.type === 'subscription_bonus');
      const spends = filtered.filter(t => t.type === 'spend');
      const refunds = filtered.filter(t => t.type === 'refund');

      return {
        purchaseAmount: purchases.reduce((sum, t) => sum + Number(t.amount), 0),
        purchaseCount: purchases.length,
        giftAmount: gifts.reduce((sum, t) => sum + Number(t.amount), 0),
        giftCount: gifts.length,
        spendAmount: spends.reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0),
        spendCount: spends.length,
        refundAmount: refunds.reduce((sum, t) => sum + Number(t.amount), 0),
        refundCount: refunds.length,
      };
    };

    return {
      today: calculatePeriod(tx => isAfter(new Date(tx.created_at), dayStart)),
      week: calculatePeriod(tx => isAfter(new Date(tx.created_at), weekStart)),
      month: calculatePeriod(tx => isAfter(new Date(tx.created_at), monthStart)),
      year: calculatePeriod(tx => isAfter(new Date(tx.created_at), yearStart)),
      allTime: calculatePeriod(() => true),
    };
  }, [creditTransactions]);

  // 30-day trend data
  const trendData = useMemo(() => {
    if (!creditTransactions) return [];

    const dailyData: Record<string, { purchases: number; spends: number; gifts: number }> = {};
    for (let i = 29; i >= 0; i--) {
      const date = format(subDays(new Date(), i), 'yyyy-MM-dd');
      dailyData[date] = { purchases: 0, spends: 0, gifts: 0 };
    }

    creditTransactions.forEach((tx) => {
      const date = format(new Date(tx.created_at), 'yyyy-MM-dd');
      if (dailyData[date] !== undefined) {
        if (tx.type === 'purchase') {
          dailyData[date].purchases += Number(tx.amount);
        } else if (tx.type === 'spend') {
          dailyData[date].spends += Math.abs(Number(tx.amount));
        } else if (tx.type === 'gift' || tx.type === 'subscription_bonus') {
          dailyData[date].gifts += Number(tx.amount);
        }
      }
    });

    return Object.entries(dailyData).map(([date, data]) => ({
      date,
      displayDate: format(new Date(date), 'MMM d'),
      ...data,
    }));
  }, [creditTransactions]);

  // Recent transactions (last 50)
  const recentTransactions = useMemo(() => {
    return (creditTransactions ?? []).slice(0, 50);
  }, [creditTransactions]);

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'purchase': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'spend': return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'gift': return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
      case 'subscription_bonus': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'refund': return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'purchase': return 'Purchase';
      case 'spend': return 'Spent';
      case 'gift': return 'Gift';
      case 'subscription_bonus': return 'Bonus';
      case 'refund': return 'Refund';
      default: return type;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="default" className="bg-emerald-600">Credits System</Badge>
          <span className="text-sm text-muted-foreground">Store credit analytics and transactions</span>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => refetch()}
          disabled={isLoading}
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border-emerald-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <Coins className="h-4 w-4 text-emerald-500" />
              <span className="text-sm font-medium text-muted-foreground">Total Active Balance</span>
            </div>
            {isLoading ? (
              <Skeleton className="h-9 w-24" />
            ) : (
              <p className="text-3xl font-bold text-emerald-500">
                £{(balancesSummary?.totalActiveBalance ?? 0).toFixed(2)}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-1">Credits held by users</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium text-muted-foreground">Total Purchased</span>
            </div>
            {isLoading ? (
              <Skeleton className="h-9 w-24" />
            ) : (
              <p className="text-3xl font-bold text-blue-500">
                £{(balancesSummary?.totalPurchased ?? 0).toFixed(2)}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-1">All-time credit purchases</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <Gift className="h-4 w-4 text-purple-500" />
              <span className="text-sm font-medium text-muted-foreground">Total Gifted</span>
            </div>
            {isLoading ? (
              <Skeleton className="h-9 w-24" />
            ) : (
              <p className="text-3xl font-bold text-purple-500">
                £{(balancesSummary?.totalGifted ?? 0).toFixed(2)}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Inc. {balancesSummary?.eclipseBonusesClaimed ?? 0} Eclipse+ bonuses
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-500/10 to-red-600/5 border-red-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <ShoppingCart className="h-4 w-4 text-red-500" />
              <span className="text-sm font-medium text-muted-foreground">Total Spent</span>
            </div>
            {isLoading ? (
              <Skeleton className="h-9 w-24" />
            ) : (
              <p className="text-3xl font-bold text-red-500">
                £{(balancesSummary?.totalSpent ?? 0).toFixed(2)}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-1">Credits used on purchases</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-4 w-4 text-amber-500" />
              <span className="text-sm font-medium text-muted-foreground">Users with Balance</span>
            </div>
            {isLoading ? (
              <Skeleton className="h-9 w-16" />
            ) : (
              <p className="text-3xl font-bold text-amber-500">
                {balancesSummary?.usersWithBalance ?? 0}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-1">Active credit holders</p>
          </CardContent>
        </Card>
      </div>

      {/* Period Breakdown */}
      <div className="grid gap-4 lg:grid-cols-4">
        {[
          { label: 'Today', data: breakdown?.today },
          { label: 'This Week', data: breakdown?.week },
          { label: 'This Month', data: breakdown?.month },
          { label: 'This Year', data: breakdown?.year },
        ].map(({ label, data }) => (
          <Card key={label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">{label}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-5 w-full" />
                  <Skeleton className="h-5 w-full" />
                  <Skeleton className="h-5 w-full" />
                </div>
              ) : (
                <>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Purchased</span>
                    <span className="font-medium text-blue-500">
                      +£{(data?.purchaseAmount ?? 0).toFixed(2)}
                      <span className="text-xs text-muted-foreground ml-1">({data?.purchaseCount ?? 0})</span>
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Gifted/Bonus</span>
                    <span className="font-medium text-purple-500">
                      +£{(data?.giftAmount ?? 0).toFixed(2)}
                      <span className="text-xs text-muted-foreground ml-1">({data?.giftCount ?? 0})</span>
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Spent</span>
                    <span className="font-medium text-red-500">
                      -£{(data?.spendAmount ?? 0).toFixed(2)}
                      <span className="text-xs text-muted-foreground ml-1">({data?.spendCount ?? 0})</span>
                    </span>
                  </div>
                  {(data?.refundCount ?? 0) > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Refunds</span>
                      <span className="font-medium text-orange-500">
                        +£{(data?.refundAmount ?? 0).toFixed(2)}
                        <span className="text-xs text-muted-foreground ml-1">({data?.refundCount})</span>
                      </span>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 30-Day Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            30-Day Credit Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-[300px] w-full" />
          ) : (
            <ChartContainer config={{
              purchases: { label: 'Purchased', color: 'hsl(217 91% 60%)' },
              spends: { label: 'Spent', color: 'hsl(0 84% 60%)' },
              gifts: { label: 'Gifted', color: 'hsl(280 65% 60%)' },
            }} className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="displayDate" 
                    tick={{ fontSize: 12 }} 
                    tickLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }} 
                    tickLine={false}
                    tickFormatter={(value) => `£${value}`}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line 
                    type="monotone" 
                    dataKey="purchases" 
                    stroke="hsl(217 91% 60%)" 
                    strokeWidth={2}
                    dot={false}
                    name="Purchased"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="spends" 
                    stroke="hsl(0 84% 60%)" 
                    strokeWidth={2}
                    dot={false}
                    name="Spent"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="gifts" 
                    stroke="hsl(280 65% 60%)" 
                    strokeWidth={2}
                    dot={false}
                    name="Gifted"
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      {/* Recent Transactions Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5 text-primary" />
            Recent Credit Transactions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 10 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    </TableRow>
                  ))
                ) : recentTransactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      No credit transactions found
                    </TableCell>
                  </TableRow>
                ) : (
                  recentTransactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell className="font-medium">
                        {(tx.profiles as any)?.display_name || (tx.profiles as any)?.username || 'Unknown'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getTypeColor(tx.type)}>
                          {getTypeLabel(tx.type)}
                        </Badge>
                      </TableCell>
                      <TableCell className={tx.type === 'spend' ? 'text-red-500' : 'text-green-500'}>
                        {tx.type === 'spend' ? '-' : '+'}£{Math.abs(Number(tx.amount)).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-muted-foreground max-w-[200px] truncate">
                        {tx.description || '-'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(tx.created_at), 'MMM d, HH:mm')}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
