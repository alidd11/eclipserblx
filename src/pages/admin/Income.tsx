import { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp, Calendar, FileDown, Lock, Shield, Eye, EyeOff, Clock, Percent, Gamepad2, CheckCircle2, XCircle, Package, ExternalLink, Wallet, RefreshCw, Coins } from 'lucide-react';
import { CreditsAnalyticsTab } from '@/components/admin/income/CreditsAnalyticsTab';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { startOfDay, startOfWeek, startOfMonth, startOfYear, isAfter, subDays, format } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { showSuccessNotification, showInfoNotification, showErrorNotification } from '@/lib/nativeNotification';
import { useAuth } from '@/hooks/useAuth';

// DevEx rate: R$1000 = ~$3.50 USD, assume £1 = $1.27
const ROBUX_TO_GBP_RATE = 0.00275; // Approximate R$1 = £0.00275

const SESSION_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

// Types for Stripe balance data
interface StripeBalanceData {
  balance: {
    available: number;
    pending: number;
    currency: string;
  };
  summary: {
    today: { gross: number; fees: number; net: number; refunds?: number; refundCount?: number };
    last7Days: { gross: number; fees: number; net: number; refunds?: number; refundCount?: number };
    last30Days: { gross: number; fees: number; net: number; refunds?: number; refundCount?: number };
    avgFeePercent: string;
  };
  dailyTrend: Array<{ date: string; gross: number; fees: number; net: number; count: number; refunds?: number; refundCount?: number }>;
  transactionCount: number;
  refundCount?: number;
}

export default function AdminIncome() {
  const { user } = useAuth();
  const [isVerified, setIsVerified] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [lastActivity, setLastActivity] = useState<number>(Date.now());
  const [timeRemaining, setTimeRemaining] = useState<number>(SESSION_TIMEOUT_MS);

  // Reset activity timer on user interaction
  const resetActivityTimer = useCallback(() => {
    if (isVerified) {
      setLastActivity(Date.now());
    }
  }, [isVerified]);

  // Session timeout effect
  useEffect(() => {
    if (!isVerified) return;

    const checkTimeout = setInterval(() => {
      const elapsed = Date.now() - lastActivity;
      const remaining = SESSION_TIMEOUT_MS - elapsed;
      setTimeRemaining(Math.max(0, remaining));

      if (elapsed >= SESSION_TIMEOUT_MS) {
        setIsVerified(false);
        setPassword('');
        showInfoNotification('Session Expired', 'Session expired due to inactivity. Please re-verify.');
      }
    }, 1000);

    // Add activity listeners
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach(event => window.addEventListener(event, resetActivityTimer));

    return () => {
      clearInterval(checkTimeout);
      events.forEach(event => window.removeEventListener(event, resetActivityTimer));
    };
  }, [isVerified, lastActivity, resetActivityTimer]);

  const handleVerifyPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.email || !password) return;

    setVerifying(true);
    try {
      // Re-authenticate the user with their password
      const { error } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: password,
      });

      if (error) {
        showErrorNotification('Authentication Failed', 'Incorrect password. Please try again.');
        setPassword('');
      } else {
        setIsVerified(true);
        setLastActivity(Date.now());
        
        // Log access to audit_logs (notification disabled)
        await supabase.from('audit_logs').insert({
          user_id: user.id,
          action: 'access',
          resource: 'income_analytics',
          details: { timestamp: new Date().toISOString() },
        });
      }
    } catch (error) {
      showErrorNotification('Verification Failed', 'Verification failed. Please try again.');
    } finally {
      setVerifying(false);
    }
  };

  const formatTimeRemaining = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Income breakdown query for gross revenue
  const { data: incomeBreakdown } = useQuery({
    queryKey: ['admin-income-breakdown'],
    queryFn: async () => {
      const { data: orders, error } = await supabase
        .from('orders')
        .select('total, status, created_at')
        .in('status', ['paid', 'fulfilled']);

      if (error) throw error;

      const now = new Date();
      const dayStart = startOfDay(now);
      const weekStart = startOfWeek(now, { weekStartsOn: 1 });
      const monthStart = startOfMonth(now);
      const yearStart = startOfYear(now);

      const paidOrders = orders ?? [];

      const calculatePeriod = (filterFn: (order: typeof paidOrders[0]) => boolean) => {
        const filtered = paidOrders.filter(filterFn);
        const gross = filtered.reduce((sum, o) => sum + (o.total || 0), 0);
        const orderCount = filtered.length;
        return { gross, orderCount };
      };

      const daily = calculatePeriod(o => isAfter(new Date(o.created_at), dayStart));
      const weekly = calculatePeriod(o => isAfter(new Date(o.created_at), weekStart));
      const monthly = calculatePeriod(o => isAfter(new Date(o.created_at), monthStart));
      const yearly = calculatePeriod(o => isAfter(new Date(o.created_at), yearStart));
      const allTime = calculatePeriod(() => true);

      return { daily, weekly, monthly, yearly, allTime };
    },
    enabled: isVerified,
  });

  // Real Stripe balance and fees from edge function
  const { data: stripeBalance, isLoading: stripeBalanceLoading, refetch: refetchStripeBalance } = useQuery<StripeBalanceData>({
    queryKey: ['admin-stripe-balance'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('get-stripe-balance');
      if (error) throw error;
      return data as StripeBalanceData;
    },
    enabled: isVerified,
    staleTime: 60000, // Cache for 1 minute
  });

  // Format Stripe daily trend for chart
  const stripeChartData = useMemo(() => {
    if (!stripeBalance?.dailyTrend) return [];
    return stripeBalance.dailyTrend.map(day => ({
      ...day,
      displayDate: format(new Date(day.date), 'MMM d'),
    }));
  }, [stripeBalance]);

  // 30-day income trend query for gross revenue chart
  const { data: incomeTrend } = useQuery({
    queryKey: ['admin-income-trend'],
    queryFn: async () => {
      const { data: orders, error } = await supabase
        .from('orders')
        .select('total, created_at')
        .in('status', ['paid', 'fulfilled'])
        .gte('created_at', subDays(new Date(), 30).toISOString());

      if (error) throw error;

      // Create a map for the last 30 days
      const dailyData: Record<string, { total: number; orderCount: number }> = {};
      for (let i = 29; i >= 0; i--) {
        const date = format(subDays(new Date(), i), 'yyyy-MM-dd');
        dailyData[date] = { total: 0, orderCount: 0 };
      }

      // Sum up orders by day
      (orders ?? []).forEach((order) => {
        const date = format(new Date(order.created_at), 'yyyy-MM-dd');
        if (dailyData[date] !== undefined) {
          dailyData[date].total += order.total || 0;
          dailyData[date].orderCount += 1;
        }
      });

      return Object.entries(dailyData).map(([date, data]) => ({
        date,
        displayDate: format(new Date(date), 'MMM d'),
        total: data.total,
        orderCount: data.orderCount,
      }));
    },
    enabled: isVerified,
  });

  // Robux transactions query
  const { data: robuxTransactions } = useQuery({
    queryKey: ['admin-robux-transactions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('robux_transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data ?? [];
    },
    enabled: isVerified,
  });

  // Robux breakdown calculation - memoized
  const robuxBreakdown = useMemo(() => {
    if (!robuxTransactions) return null;

    const now = new Date();
    const dayStart = startOfDay(now);
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const monthStart = startOfMonth(now);
    const yearStart = startOfYear(now);

    const calculatePeriod = (filterFn: (tx: typeof robuxTransactions[0]) => boolean) => {
      const filtered = robuxTransactions.filter(filterFn);
      const grossRobux = filtered.reduce((sum, tx) => sum + (tx.robux_amount || 0), 0);
      const netRobux = filtered.reduce((sum, tx) => sum + (tx.robux_after_tax || 0), 0);
      const count = filtered.length;
      return { grossRobux, netRobux, count, gbpEstimate: netRobux * ROBUX_TO_GBP_RATE };
    };

    return {
      daily: calculatePeriod(tx => isAfter(new Date(tx.created_at), dayStart)),
      weekly: calculatePeriod(tx => isAfter(new Date(tx.created_at), weekStart)),
      monthly: calculatePeriod(tx => isAfter(new Date(tx.created_at), monthStart)),
      yearly: calculatePeriod(tx => isAfter(new Date(tx.created_at), yearStart)),
      allTime: calculatePeriod(() => true),
    };
  }, [robuxTransactions]);

  // Robux 30-day trend - memoized
  const robuxTrendData = useMemo(() => {
    if (!robuxTransactions) return [];

    const dailyData: Record<string, { gross: number; net: number; count: number }> = {};
    for (let i = 29; i >= 0; i--) {
      const date = format(subDays(new Date(), i), 'yyyy-MM-dd');
      dailyData[date] = { gross: 0, net: 0, count: 0 };
    }

    robuxTransactions.forEach((tx) => {
      const date = format(new Date(tx.created_at), 'yyyy-MM-dd');
      if (dailyData[date] !== undefined) {
        dailyData[date].gross += tx.robux_amount || 0;
        dailyData[date].net += tx.robux_after_tax || 0;
        dailyData[date].count += 1;
      }
    });

    return Object.entries(dailyData).map(([date, data]) => ({
      date,
      displayDate: format(new Date(date), 'MMM d'),
      gross: data.gross,
      net: data.net,
      count: data.count,
    }));
  }, [robuxTransactions]);

  // Memoized income trend stats to avoid recalculation
  const incomeTrendStats = useMemo(() => {
    if (!incomeTrend) return null;
    const total30d = incomeTrend.reduce((sum, day) => sum + day.total, 0);
    const bestDayGross = Math.max(...incomeTrend.map((day) => day.total), 0);
    return { total30d, bestDayGross, avgGross: total30d / 30 };
  }, [incomeTrend]);

  // Memoized robux trend stats
  const robuxTrendStats = useMemo(() => {
    const total30d = robuxTrendData.reduce((sum, day) => sum + day.net, 0);
    const txCount = robuxTrendData.reduce((sum, day) => sum + day.count, 0);
    const bestDay = Math.max(...robuxTrendData.map((day) => day.net), 0);
    return { total30d, txCount, bestDay };
  }, [robuxTrendData]);

  // Products with Robux status query
  const { data: productsWithRobuxStatus } = useQuery({
    queryKey: ['admin-products-robux-status'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, slug, price, robux_enabled, robux_product_id, robux_price, is_active, category_id')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;

      // Get category info to exclude bots
      const { data: categories } = await supabase
        .from('categories')
        .select('id, slug');

      const botCategoryId = categories?.find(c => c.slug === 'bots')?.id;

      // Filter out bot products (they can't use Robux)
      const eligibleProducts = (data ?? []).filter(p => p.category_id !== botCategoryId);

      const configured = eligibleProducts.filter(p => p.robux_enabled && p.robux_product_id);
      const notConfigured = eligibleProducts.filter(p => !p.robux_enabled || !p.robux_product_id);

      return { configured, notConfigured, total: eligibleProducts.length };
    },
    enabled: isVerified,
  });

  const exportIncomeReport = () => {
    if (!incomeTrend) {
      showErrorNotification('Export Failed', 'No data to export');
      return;
    }

    const headers = ['Date', 'Gross Income (£)'];
    const rows = incomeTrend.map((day) => [
      day.date, 
      day.total.toFixed(2)
    ]);
    
    // Add summary
    const totalGross = incomeTrend.reduce((sum, day) => sum + day.total, 0);
    rows.push(['', '']);
    rows.push(['Summary', 'Gross']);
    rows.push(['30-Day Total', totalGross.toFixed(2)]);
    rows.push(['Daily Average', (totalGross / 30).toFixed(2)]);
    rows.push(['Today', (incomeBreakdown?.daily.gross ?? 0).toFixed(2)]);
    rows.push(['This Week', (incomeBreakdown?.weekly.gross ?? 0).toFixed(2)]);
    rows.push(['This Month', (incomeBreakdown?.monthly.gross ?? 0).toFixed(2)]);
    rows.push(['This Year', (incomeBreakdown?.yearly.gross ?? 0).toFixed(2)]);
    rows.push(['All Time', (incomeBreakdown?.allTime.gross ?? 0).toFixed(2)]);

    const csvContent = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `income-report-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showSuccessNotification('Export Complete', 'Report exported successfully');
  };

  // robuxBreakdown and robuxTrendData are now memoized above

  // Password verification screen
  if (!isVerified) {
    return (
      <AdminLayout requiredPermissions={['view_income']}>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="flex items-center justify-center gap-2">
                <Lock className="h-5 w-5" />
                Secure Area
              </CardTitle>
              <CardDescription>
                Please re-enter your password to access income analytics. This is a security measure to protect sensitive financial data.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleVerifyPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      required
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={verifying || !password}>
                  {verifying ? 'Verifying...' : 'Verify & Access'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout requiredPermissions={['view_income']}>
      <div className="space-y-8 w-full">
        <Card className="bg-card border-border">
          <CardHeader className="pb-4">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <CardTitle className="text-2xl sm:text-3xl font-display flex items-center gap-2">
                  <TrendingUp className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
                  Income Analytics
                </CardTitle>
                <p className="text-muted-foreground text-sm mt-1">Detailed financial overview and reports</p>
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground bg-muted px-3 py-1.5 rounded-full">
                  <Clock className="h-4 w-4" />
                  <span>Session: {formatTimeRemaining(timeRemaining)}</span>
                </div>
                <Button onClick={exportIncomeReport} className="gap-2 w-full sm:w-auto">
                  <FileDown className="h-4 w-4" />
                  Export Report
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Income Tabs */}
        <Tabs defaultValue="stripe" className="space-y-6">
          <TabsList className="grid w-full max-w-2xl grid-cols-4">
            <TabsTrigger value="stripe" className="gap-2">
              <Wallet className="h-4 w-4" />
              Stripe Balance
            </TabsTrigger>
            <TabsTrigger value="credits" className="gap-2">
              <Coins className="h-4 w-4" />
              Credits
            </TabsTrigger>
            <TabsTrigger value="gross" className="gap-2">
              <TrendingUp className="h-4 w-4" />
              Gross Revenue
            </TabsTrigger>
            <TabsTrigger value="robux" className="gap-2">
              <Gamepad2 className="h-4 w-4" />
              Robux
            </TabsTrigger>
          </TabsList>

          {/* Stripe Balance Tab - REAL DATA */}
          <TabsContent value="stripe" className="space-y-6">
            {/* Stripe Balance Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="default" className="bg-green-600">Live Data</Badge>
                <span className="text-sm text-muted-foreground">Real-time data from Stripe API</span>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => refetchStripeBalance()}
                disabled={stripeBalanceLoading}
                className="gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${stripeBalanceLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>

            {/* Stripe Balance Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 mb-2">
                    <Wallet className="h-4 w-4 text-green-500" />
                    <span className="text-sm font-medium text-muted-foreground">Available Balance</span>
                  </div>
                  {stripeBalanceLoading ? (
                    <Skeleton className="h-9 w-24" />
                  ) : (
                    <p className="text-3xl font-bold text-green-500">
                      £{(stripeBalance?.balance.available ?? 0).toFixed(2)}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">Ready to pay out</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 border-yellow-500/20">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-4 w-4 text-yellow-500" />
                    <span className="text-sm font-medium text-muted-foreground">Pending Balance</span>
                  </div>
                  {stripeBalanceLoading ? (
                    <Skeleton className="h-9 w-24" />
                  ) : (
                    <p className="text-3xl font-bold text-yellow-500">
                      £{(stripeBalance?.balance.pending ?? 0).toFixed(2)}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">In transit</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="h-4 w-4 text-blue-500" />
                    <span className="text-sm font-medium text-muted-foreground">30-Day Net</span>
                  </div>
                  {stripeBalanceLoading ? (
                    <Skeleton className="h-9 w-24" />
                  ) : (
                    <p className="text-3xl font-bold text-blue-500">
                      £{(stripeBalance?.summary.last30Days.net ?? 0).toFixed(2)}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">After Stripe fees</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-red-500/10 to-red-600/5 border-red-500/20">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 mb-2">
                    <Percent className="h-4 w-4 text-red-500" />
                    <span className="text-sm font-medium text-muted-foreground">Avg Fee Rate</span>
                  </div>
                  {stripeBalanceLoading ? (
                    <Skeleton className="h-9 w-16" />
                  ) : (
                    <p className="text-3xl font-bold text-red-500">
                      {stripeBalance?.summary.avgFeePercent ?? '0'}%
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">Actual fees paid</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border-orange-500/20">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 mb-2">
                    <RefreshCw className="h-4 w-4 text-orange-500" />
                    <span className="text-sm font-medium text-muted-foreground">30-Day Refunds</span>
                  </div>
                  {stripeBalanceLoading ? (
                    <Skeleton className="h-9 w-24" />
                  ) : (
                    <p className="text-3xl font-bold text-orange-500">
                      £{(stripeBalance?.summary.last30Days.refunds ?? 0).toFixed(2)}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {stripeBalance?.summary.last30Days.refundCount ?? 0} refund{(stripeBalance?.summary.last30Days.refundCount ?? 0) !== 1 ? 's' : ''}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Detailed Stripe Summary */}
            <div className="grid gap-4 lg:grid-cols-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Today</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {stripeBalanceLoading ? (
                    <div className="space-y-2">
                      <Skeleton className="h-5 w-full" />
                      <Skeleton className="h-5 w-full" />
                      <Skeleton className="h-5 w-full" />
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Gross</span>
                        <span className="font-medium">£{(stripeBalance?.summary.today.gross ?? 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Fees</span>
                        <span className="font-medium text-red-500">-£{(stripeBalance?.summary.today.fees ?? 0).toFixed(2)}</span>
                      </div>
                      {(stripeBalance?.summary.today.refunds ?? 0) > 0 && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Refunds</span>
                          <span className="font-medium text-orange-500">-£{(stripeBalance?.summary.today.refunds ?? 0).toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between border-t pt-2">
                        <span className="font-medium">Net</span>
                        <span className="font-bold text-green-600">£{(stripeBalance?.summary.today.net ?? 0).toFixed(2)}</span>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Last 7 Days</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {stripeBalanceLoading ? (
                    <div className="space-y-2">
                      <Skeleton className="h-5 w-full" />
                      <Skeleton className="h-5 w-full" />
                      <Skeleton className="h-5 w-full" />
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Gross</span>
                        <span className="font-medium">£{(stripeBalance?.summary.last7Days.gross ?? 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Fees</span>
                        <span className="font-medium text-red-500">-£{(stripeBalance?.summary.last7Days.fees ?? 0).toFixed(2)}</span>
                      </div>
                      {(stripeBalance?.summary.last7Days.refunds ?? 0) > 0 && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Refunds ({stripeBalance?.summary.last7Days.refundCount})</span>
                          <span className="font-medium text-orange-500">-£{(stripeBalance?.summary.last7Days.refunds ?? 0).toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between border-t pt-2">
                        <span className="font-medium">Net</span>
                        <span className="font-bold text-green-600">£{(stripeBalance?.summary.last7Days.net ?? 0).toFixed(2)}</span>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Last 30 Days</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {stripeBalanceLoading ? (
                    <div className="space-y-2">
                      <Skeleton className="h-5 w-full" />
                      <Skeleton className="h-5 w-full" />
                      <Skeleton className="h-5 w-full" />
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Gross</span>
                        <span className="font-medium">£{(stripeBalance?.summary.last30Days.gross ?? 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Fees</span>
                        <span className="font-medium text-red-500">-£{(stripeBalance?.summary.last30Days.fees ?? 0).toFixed(2)}</span>
                      </div>
                      {(stripeBalance?.summary.last30Days.refunds ?? 0) > 0 && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Refunds ({stripeBalance?.summary.last30Days.refundCount})</span>
                          <span className="font-medium text-orange-500">-£{(stripeBalance?.summary.last30Days.refunds ?? 0).toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between border-t pt-2">
                        <span className="font-medium">Net</span>
                        <span className="font-bold text-green-600">£{(stripeBalance?.summary.last30Days.net ?? 0).toFixed(2)}</span>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Stripe 30-Day Trend Chart */}
            <Card>
              <CardHeader>
                <CardTitle>30-Day Revenue Trend (Actual)</CardTitle>
                <CardDescription>Daily gross vs net earnings with actual Stripe fees</CardDescription>
              </CardHeader>
              <CardContent>
                {stripeBalanceLoading ? (
                  <Skeleton className="h-[300px] w-full" />
                ) : (
                  <div className="h-[300px] w-full">
                    <ChartContainer
                      config={{
                        gross: {
                          label: "Gross Revenue",
                          color: "hsl(var(--primary))",
                        },
                        net: {
                          label: "Net Revenue",
                          color: "hsl(142 76% 36%)",
                        },
                      }}
                    >
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={stripeChartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis
                            dataKey="displayDate"
                            tick={{ fontSize: 12 }}
                            className="text-muted-foreground"
                            tickLine={false}
                            axisLine={false}
                            interval="preserveStartEnd"
                          />
                          <YAxis
                            tickFormatter={(value) => `£${value}`}
                            tick={{ fontSize: 12 }}
                            className="text-muted-foreground"
                            tickLine={false}
                            axisLine={false}
                          />
                          <ChartTooltip
                            content={({ active, payload }) => {
                              if (!active || !payload?.length) return null;
                              const data = payload[0].payload;
                              return (
                                <div className="bg-background border rounded-lg p-3 shadow-lg">
                                  <p className="font-medium mb-2">{data.displayDate}</p>
                                  <div className="space-y-1 text-sm">
                                    <div className="flex justify-between gap-4">
                                      <span className="text-muted-foreground">Gross:</span>
                                      <span>£{data.gross.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between gap-4">
                                      <span className="text-muted-foreground">Fees:</span>
                                      <span className="text-red-500">-£{data.fees.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between gap-4 border-t pt-1">
                                      <span className="font-medium">Net:</span>
                                      <span className="text-green-600 font-medium">£{data.net.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between gap-4 text-xs text-muted-foreground">
                                      <span>Transactions:</span>
                                      <span>{data.count}</span>
                                    </div>
                                  </div>
                                </div>
                              );
                            }}
                          />
                          <Line
                            type="monotone"
                            dataKey="gross"
                            stroke="hsl(var(--primary))"
                            strokeWidth={2}
                            dot={false}
                            activeDot={{ r: 6, fill: "hsl(var(--primary))" }}
                          />
                          <Line
                            type="monotone"
                            dataKey="net"
                            stroke="hsl(142 76% 36%)"
                            strokeWidth={2}
                            dot={false}
                            activeDot={{ r: 6, fill: "hsl(142 76% 36%)" }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Info about data source */}
            <Card className="bg-blue-500/5 border-blue-500/20">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-blue-500 mt-0.5" />
                  <div>
                    <p className="font-medium">Accurate Fee Tracking</p>
                    <p className="text-sm text-muted-foreground">
                      This tab shows <strong>actual fees</strong> charged by Stripe for each transaction, 
                      including international card surcharges, currency conversion fees, and any other applicable charges. 
                      Unlike estimated calculations, these numbers match your Stripe dashboard exactly.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Credits Tab */}
          <TabsContent value="credits" className="space-y-6">
            <CreditsAnalyticsTab />
          </TabsContent>

          {/* Gross Revenue Tab */}
          <TabsContent value="gross" className="space-y-6">
            {/* Gross Income Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="h-4 w-4 text-green-500" />
                    <span className="text-sm font-medium text-muted-foreground">Today</span>
                  </div>
                  <p className="text-3xl font-bold text-green-500">£{(incomeBreakdown?.daily.gross ?? 0).toFixed(2)}</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="h-4 w-4 text-blue-500" />
                    <span className="text-sm font-medium text-muted-foreground">This Week</span>
                  </div>
                  <p className="text-3xl font-bold text-blue-500">£{(incomeBreakdown?.weekly.gross ?? 0).toFixed(2)}</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="h-4 w-4 text-purple-500" />
                    <span className="text-sm font-medium text-muted-foreground">This Month</span>
                  </div>
                  <p className="text-3xl font-bold text-purple-500">£{(incomeBreakdown?.monthly.gross ?? 0).toFixed(2)}</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-500/20">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="h-4 w-4 text-amber-500" />
                    <span className="text-sm font-medium text-muted-foreground">This Year</span>
                  </div>
                  <p className="text-3xl font-bold text-amber-500">£{(incomeBreakdown?.yearly.gross ?? 0).toFixed(2)}</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium text-muted-foreground">All Time</span>
                  </div>
                  <p className="text-3xl font-bold text-primary">£{(incomeBreakdown?.allTime.gross ?? 0).toFixed(2)}</p>
                </CardContent>
              </Card>
            </div>

            {/* 30-Day Gross Trend Chart with Statistics */}
            <div className="grid gap-4 lg:grid-cols-[1fr,280px]">
              <Card>
                <CardHeader>
                  <CardTitle>30-Day Gross Revenue Trend</CardTitle>
                  <CardDescription>Daily gross revenue over the past 30 days</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px] w-full">
                    <ChartContainer
                      config={{
                        total: {
                          label: "Gross Revenue",
                          color: "hsl(var(--primary))",
                        },
                      }}
                    >
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={incomeTrend ?? []} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis
                            dataKey="displayDate"
                            tick={{ fontSize: 12 }}
                            className="text-muted-foreground"
                            tickLine={false}
                            axisLine={false}
                            interval="preserveStartEnd"
                          />
                          <YAxis
                            tickFormatter={(value) => `£${value}`}
                            tick={{ fontSize: 12 }}
                            className="text-muted-foreground"
                            tickLine={false}
                            axisLine={false}
                          />
                          <ChartTooltip
                            content={
                              <ChartTooltipContent
                                formatter={(value) => [`£${Number(value).toFixed(2)}`, 'Gross Revenue']}
                              />
                            }
                          />
                          <Line
                            type="monotone"
                            dataKey="total"
                            stroke="hsl(var(--primary))"
                            strokeWidth={2}
                            dot={false}
                            activeDot={{ r: 6, fill: "hsl(var(--primary))" }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Gross Statistics Summary - Side Panel */}
              {incomeTrendStats && (
                <div className="flex flex-col gap-4">
                  <Card>
                    <CardContent className="pt-6">
                      <p className="text-sm text-muted-foreground">30-Day Total (Gross)</p>
                      <p className="text-3xl font-bold text-primary">
                        £{incomeTrendStats.total30d.toFixed(2)}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <p className="text-sm text-muted-foreground">Daily Average (Gross)</p>
                      <p className="text-3xl font-bold">
                        £{incomeTrendStats.avgGross.toFixed(2)}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <p className="text-sm text-muted-foreground">Best Day (30d)</p>
                      <p className="text-3xl font-bold text-green-500">
                        £{incomeTrendStats.bestDayGross.toFixed(2)}
                      </p>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </TabsContent>


          {/* Robux Earnings Tab */}
          <TabsContent value="robux" className="space-y-6">
            {/* DevEx Info */}
            <Card className="bg-muted/50 border-dashed">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Gamepad2 className="h-4 w-4" />
                  <span>Robux earnings after 30% Roblox tax. GBP estimates based on DevEx rate (~R$1000 ≈ £2.75)</span>
                </div>
              </CardContent>
            </Card>

            {/* Product Robux Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Product Robux Configuration
                </CardTitle>
                <CardDescription>
                  Products configured for Robux payments in your Roblox games
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 mb-6">
                  <div className="flex items-center gap-3 p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                    <div className="h-10 w-10 rounded-full bg-green-500/20 flex items-center justify-center">
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-green-500">
                        {productsWithRobuxStatus?.configured.length ?? 0}
                      </p>
                      <p className="text-sm text-muted-foreground">Configured for Robux</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <div className="h-10 w-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                      <XCircle className="h-5 w-5 text-amber-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-amber-500">
                        {productsWithRobuxStatus?.notConfigured.length ?? 0}
                      </p>
                      <p className="text-sm text-muted-foreground">Not Configured</p>
                    </div>
                  </div>
                </div>

                {/* Mobile Card Layout */}
                <div className="sm:hidden space-y-3">
                  <ScrollArea className="h-[320px]">
                    <div className="space-y-2 pr-2">
                      {productsWithRobuxStatus?.configured.map((product) => (
                        <div key={product.id} className="p-3 rounded-lg border border-green-500/30 bg-green-500/5">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <p className="font-medium text-sm leading-tight flex-1">{product.name}</p>
                            <Badge variant="default" className="bg-green-500 hover:bg-green-600 shrink-0 text-xs">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              OK
                            </Badge>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <span className="text-muted-foreground">GBP:</span>{' '}
                              <span className="font-medium">£{product.price.toFixed(2)}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Robux:</span>{' '}
                              <span className="font-medium text-purple-500">R${product.robux_price?.toLocaleString() ?? '-'}</span>
                            </div>
                          </div>
                          <div className="mt-2 pt-2 border-t border-border/50">
                            <span className="text-xs text-muted-foreground">ID: </span>
                            <span className="font-mono text-xs text-muted-foreground break-all">{product.robux_product_id}</span>
                          </div>
                        </div>
                      ))}
                      {productsWithRobuxStatus?.notConfigured.map((product) => (
                        <div key={product.id} className="p-3 rounded-lg border border-amber-500/30 bg-muted/30 opacity-70">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <p className="font-medium text-sm leading-tight flex-1">{product.name}</p>
                            <Badge variant="outline" className="border-amber-500/50 text-amber-500 shrink-0 text-xs">
                              <XCircle className="h-3 w-3 mr-1" />
                              No
                            </Badge>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <span className="text-muted-foreground">GBP:</span>{' '}
                              <span className="font-medium">£{product.price.toFixed(2)}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Robux:</span>{' '}
                              <span className="text-muted-foreground">Not set</span>
                            </div>
                          </div>
                        </div>
                      ))}
                      {(!productsWithRobuxStatus || productsWithRobuxStatus.total === 0) && (
                        <div className="text-center text-muted-foreground py-8">
                          No eligible products found. Bot products are excluded.
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </div>

                {/* Desktop Table Layout */}
                <div className="hidden sm:block overflow-x-auto -mx-6">
                  <ScrollArea className="h-[300px]">
                    <Table className="min-w-[500px]">
                      <TableHeader>
                        <TableRow>
                          <TableHead className="whitespace-nowrap min-w-[180px]">Product</TableHead>
                          <TableHead className="whitespace-nowrap text-center">GBP</TableHead>
                          <TableHead className="whitespace-nowrap text-center">Robux</TableHead>
                          <TableHead className="whitespace-nowrap">Product ID</TableHead>
                          <TableHead className="text-right whitespace-nowrap pr-6">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {productsWithRobuxStatus?.configured.map((product) => (
                          <TableRow key={product.id}>
                            <TableCell className="min-w-[180px]">
                              <span className="font-medium">{product.name}</span>
                            </TableCell>
                            <TableCell className="whitespace-nowrap text-center">£{product.price.toFixed(2)}</TableCell>
                            <TableCell className="text-purple-500 font-medium whitespace-nowrap text-center">
                              R${product.robux_price?.toLocaleString() ?? '-'}
                            </TableCell>
                            <TableCell>
                              <span className="font-mono text-xs text-muted-foreground">
                                {product.robux_product_id}
                              </span>
                            </TableCell>
                            <TableCell className="text-right pr-6">
                              <Badge variant="default" className="bg-green-500 hover:bg-green-600 whitespace-nowrap">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                OK
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                        {productsWithRobuxStatus?.notConfigured.map((product) => (
                          <TableRow key={product.id} className="opacity-60">
                            <TableCell className="min-w-[180px]">
                              <span className="font-medium">{product.name}</span>
                            </TableCell>
                            <TableCell className="whitespace-nowrap text-center">£{product.price.toFixed(2)}</TableCell>
                            <TableCell className="text-muted-foreground text-center">-</TableCell>
                            <TableCell className="text-muted-foreground">-</TableCell>
                            <TableCell className="text-right pr-6">
                              <Badge variant="outline" className="border-amber-500/50 text-amber-500 whitespace-nowrap">
                                <XCircle className="h-3 w-3 mr-1" />
                                No
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                        {(!productsWithRobuxStatus || productsWithRobuxStatus.total === 0) && (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                              No eligible products found. Bot products are excluded.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </div>

                <p className="text-xs text-muted-foreground mt-4">
                  Configure Robux settings in the product editor. Products in the "Bots" category are excluded as they cannot use Robux payments.
                </p>
              </CardContent>
            </Card>

            {/* Robux Summary Cards */}
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
              <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="h-4 w-4 text-green-500" />
                    <span className="text-sm font-medium text-muted-foreground">Today</span>
                  </div>
                  <p className="text-3xl font-bold text-green-500">R${(robuxBreakdown?.daily.netRobux ?? 0).toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    ≈ £{(robuxBreakdown?.daily.gbpEstimate ?? 0).toFixed(2)}
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="h-4 w-4 text-blue-500" />
                    <span className="text-sm font-medium text-muted-foreground">This Week</span>
                  </div>
                  <p className="text-3xl font-bold text-blue-500">R${(robuxBreakdown?.weekly.netRobux ?? 0).toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    ≈ £{(robuxBreakdown?.weekly.gbpEstimate ?? 0).toFixed(2)}
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="h-4 w-4 text-purple-500" />
                    <span className="text-sm font-medium text-muted-foreground">This Month</span>
                  </div>
                  <p className="text-3xl font-bold text-purple-500">R${(robuxBreakdown?.monthly.netRobux ?? 0).toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    ≈ £{(robuxBreakdown?.monthly.gbpEstimate ?? 0).toFixed(2)}
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-500/20">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="h-4 w-4 text-amber-500" />
                    <span className="text-sm font-medium text-muted-foreground">This Year</span>
                  </div>
                  <p className="text-3xl font-bold text-amber-500">R${(robuxBreakdown?.yearly.netRobux ?? 0).toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    ≈ £{(robuxBreakdown?.yearly.gbpEstimate ?? 0).toFixed(2)}
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium text-muted-foreground">All Time</span>
                  </div>
                  <p className="text-3xl font-bold text-primary">R${(robuxBreakdown?.allTime.netRobux ?? 0).toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    ≈ £{(robuxBreakdown?.allTime.gbpEstimate ?? 0).toFixed(2)}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* 30-Day Robux Trend Chart */}
            <div className="grid gap-4 lg:grid-cols-[1fr,280px]">
              <Card>
                <CardHeader>
                  <CardTitle>30-Day Robux Earnings Trend</CardTitle>
                  <CardDescription>Daily Robux earnings (after tax) over the past 30 days</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px] w-full">
                    <ChartContainer
                      config={{
                        net: {
                          label: "Net Robux",
                          color: "hsl(280 60% 50%)",
                        },
                      }}
                    >
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={robuxTrendData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis
                            dataKey="displayDate"
                            tick={{ fontSize: 12 }}
                            className="text-muted-foreground"
                            tickLine={false}
                            axisLine={false}
                            interval="preserveStartEnd"
                          />
                          <YAxis
                            tickFormatter={(value) => `R$${value}`}
                            tick={{ fontSize: 12 }}
                            className="text-muted-foreground"
                            tickLine={false}
                            axisLine={false}
                          />
                          <ChartTooltip
                            content={
                              <ChartTooltipContent
                                formatter={(value) => [`R$${Number(value).toLocaleString()}`, 'Net Robux']}
                              />
                            }
                          />
                          <Line
                            type="monotone"
                            dataKey="net"
                            stroke="hsl(280 60% 50%)"
                            strokeWidth={2}
                            dot={false}
                            activeDot={{ r: 6, fill: "hsl(280 60% 50%)" }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Robux Statistics Summary */}
              <div className="flex flex-col gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground">30-Day Net Total</p>
                    <p className="text-3xl font-bold text-purple-500">
                      R${robuxTrendStats.total30d.toLocaleString()}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground">30-Day Transactions</p>
                    <p className="text-3xl font-bold">
                      {robuxTrendStats.txCount}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground">Best Day (30d)</p>
                    <p className="text-3xl font-bold text-green-500">
                      R${robuxTrendStats.bestDay.toLocaleString()}
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Transaction Log */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gamepad2 className="h-5 w-5" />
                  Recent Transactions
                </CardTitle>
                <CardDescription>Latest Robux purchases from your Roblox games</CardDescription>
              </CardHeader>
              <CardContent>
                {/* Mobile Card Layout */}
                <div className="sm:hidden">
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-2 pr-2">
                      {robuxTransactions && robuxTransactions.length > 0 ? (
                        robuxTransactions.map((tx) => (
                          <div key={tx.id} className="p-3 rounded-lg border border-border bg-muted/20">
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm">{tx.roblox_username}</p>
                                <p className="text-xs text-muted-foreground">
                                  {format(new Date(tx.created_at), 'MMM d, HH:mm')}
                                </p>
                              </div>
                              <div className="text-right shrink-0">
                                <p className="font-medium text-green-500 text-sm">R${tx.robux_after_tax.toLocaleString()}</p>
                                <p className="text-xs text-muted-foreground">net</p>
                              </div>
                            </div>
                            <div className="pt-2 border-t border-border/50">
                              <p className="text-xs text-muted-foreground mb-0.5">Product</p>
                              <p className="text-sm">{tx.product_name}</p>
                            </div>
                            <div className="flex justify-between items-center mt-2 text-xs text-muted-foreground">
                              <span>Gross: R${tx.robux_amount.toLocaleString()}</span>
                              <span>Tax: R${(tx.robux_amount - tx.robux_after_tax).toLocaleString()}</span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center text-muted-foreground py-8">
                          No transactions yet. Set up the Lua script in your Roblox game to start tracking.
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </div>

                {/* Desktop Table Layout */}
                <div className="hidden sm:block overflow-x-auto -mx-6 px-6">
                  <ScrollArea className="h-[400px]">
                    <Table className="min-w-[500px]">
                      <TableHeader>
                        <TableRow>
                          <TableHead className="whitespace-nowrap">Date</TableHead>
                          <TableHead className="whitespace-nowrap">Username</TableHead>
                          <TableHead className="whitespace-nowrap">Product</TableHead>
                          <TableHead className="text-right whitespace-nowrap">Gross</TableHead>
                          <TableHead className="text-right whitespace-nowrap">Net</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {robuxTransactions && robuxTransactions.length > 0 ? (
                          robuxTransactions.map((tx) => (
                            <TableRow key={tx.id}>
                              <TableCell className="text-muted-foreground whitespace-nowrap">
                                {format(new Date(tx.created_at), 'MMM d, HH:mm')}
                              </TableCell>
                              <TableCell className="font-medium whitespace-nowrap">{tx.roblox_username}</TableCell>
                              <TableCell>{tx.product_name}</TableCell>
                              <TableCell className="text-right text-muted-foreground whitespace-nowrap">
                                R${tx.robux_amount.toLocaleString()}
                              </TableCell>
                              <TableCell className="text-right font-medium text-green-500 whitespace-nowrap">
                                R${tx.robux_after_tax.toLocaleString()}
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                              No transactions yet. Set up the Lua script in your Roblox game to start tracking.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </div>
              </CardContent>
            </Card>

            {/* Integration Instructions */}
            <Card className="border-dashed">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <ExternalLink className="h-5 w-5" />
                  Roblox Integration
                </CardTitle>
                <CardDescription>
                  Add the tracking script to your Roblox game to automatically log purchases
                </CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-2">
                <p>1. Enable HTTP Requests in your game settings on Roblox</p>
                <p>2. Create a Script in ServerScriptService</p>
                <p>3. Use the webhook URL: <code className="bg-muted px-1.5 py-0.5 rounded">https://qlnbergwjfrmgkjhrbkj.supabase.co/functions/v1/robux-webhook</code></p>
                <p>4. Include your ROBUX_WEBHOOK_SECRET in requests</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
