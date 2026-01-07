import { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp, Calendar, FileDown, Lock, Shield, Eye, EyeOff, Clock } from 'lucide-react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { startOfDay, startOfWeek, startOfMonth, startOfYear, isAfter, subDays, format } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

const SESSION_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

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
        toast.info('Session expired due to inactivity. Please re-verify.');
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
        toast.error('Incorrect password. Please try again.');
        setPassword('');
      } else {
        setIsVerified(true);
        setLastActivity(Date.now());
        toast.success('Access granted to income analytics');
        
        // Log access to audit_logs
        await supabase.from('audit_logs').insert({
          user_id: user.id,
          action: 'access',
          resource: 'income_analytics',
          details: { timestamp: new Date().toISOString() },
        });
      }
    } catch (error) {
      toast.error('Verification failed. Please try again.');
    } finally {
      setVerifying(false);
    }
  };

  const formatTimeRemaining = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Income breakdown query
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

      const daily = paidOrders
        .filter(o => isAfter(new Date(o.created_at), dayStart))
        .reduce((sum, o) => sum + (o.total || 0), 0);

      const weekly = paidOrders
        .filter(o => isAfter(new Date(o.created_at), weekStart))
        .reduce((sum, o) => sum + (o.total || 0), 0);

      const monthly = paidOrders
        .filter(o => isAfter(new Date(o.created_at), monthStart))
        .reduce((sum, o) => sum + (o.total || 0), 0);

      const yearly = paidOrders
        .filter(o => isAfter(new Date(o.created_at), yearStart))
        .reduce((sum, o) => sum + (o.total || 0), 0);

      const allTime = paidOrders.reduce((sum, o) => sum + (o.total || 0), 0);

      return { daily, weekly, monthly, yearly, allTime };
    },
    enabled: isVerified,
  });

  // 30-day income trend query
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
      const dailyTotals: Record<string, number> = {};
      for (let i = 29; i >= 0; i--) {
        const date = format(subDays(new Date(), i), 'yyyy-MM-dd');
        dailyTotals[date] = 0;
      }

      // Sum up orders by day
      (orders ?? []).forEach((order) => {
        const date = format(new Date(order.created_at), 'yyyy-MM-dd');
        if (dailyTotals[date] !== undefined) {
          dailyTotals[date] += order.total || 0;
        }
      });

      return Object.entries(dailyTotals).map(([date, total]) => ({
        date,
        displayDate: format(new Date(date), 'MMM d'),
        total,
      }));
    },
    enabled: isVerified,
  });

  const exportIncomeReport = () => {
    if (!incomeTrend) {
      toast.error('No data to export');
      return;
    }

    const headers = ['Date', 'Income (£)'];
    const rows = incomeTrend.map((day) => [day.date, day.total.toFixed(2)]);
    
    // Add summary
    const totalIncome = incomeTrend.reduce((sum, day) => sum + day.total, 0);
    rows.push(['', '']);
    rows.push(['Summary', '']);
    rows.push(['30-Day Total', totalIncome.toFixed(2)]);
    rows.push(['Daily Average', (totalIncome / 30).toFixed(2)]);
    rows.push(['Today', (incomeBreakdown?.daily ?? 0).toFixed(2)]);
    rows.push(['This Week', (incomeBreakdown?.weekly ?? 0).toFixed(2)]);
    rows.push(['This Month', (incomeBreakdown?.monthly ?? 0).toFixed(2)]);
    rows.push(['This Year', (incomeBreakdown?.yearly ?? 0).toFixed(2)]);
    rows.push(['All Time', (incomeBreakdown?.allTime ?? 0).toFixed(2)]);

    const csvContent = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `income-report-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Report exported successfully');
  };

  // Password verification screen
  if (!isVerified) {
    return (
      <AdminLayout requiredRoles={['admin']}>
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
    <AdminLayout requiredRoles={['admin']}>
      <div className="space-y-8">
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

        {/* Income Summary Cards */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
          <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium text-muted-foreground">Today</span>
              </div>
              <p className="text-3xl font-bold text-green-500">£{(incomeBreakdown?.daily ?? 0).toFixed(2)}</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium text-muted-foreground">This Week</span>
              </div>
              <p className="text-3xl font-bold text-blue-500">£{(incomeBreakdown?.weekly ?? 0).toFixed(2)}</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="h-4 w-4 text-purple-500" />
                <span className="text-sm font-medium text-muted-foreground">This Month</span>
              </div>
              <p className="text-3xl font-bold text-purple-500">£{(incomeBreakdown?.monthly ?? 0).toFixed(2)}</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-500/20">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="h-4 w-4 text-amber-500" />
                <span className="text-sm font-medium text-muted-foreground">This Year</span>
              </div>
              <p className="text-3xl font-bold text-amber-500">£{(incomeBreakdown?.yearly ?? 0).toFixed(2)}</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-muted-foreground">All Time</span>
              </div>
              <p className="text-3xl font-bold text-primary">£{(incomeBreakdown?.allTime ?? 0).toFixed(2)}</p>
            </CardContent>
          </Card>
        </div>

        {/* 30-Day Trend Chart */}
        <Card>
          <CardHeader>
            <CardTitle>30-Day Income Trend</CardTitle>
            <CardDescription>Daily income over the past 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[400px] w-full">
              <ChartContainer
                config={{
                  total: {
                    label: "Income",
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
                          formatter={(value) => [`£${Number(value).toFixed(2)}`, 'Income']}
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

        {/* Statistics Summary */}
        {incomeTrend && (
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">30-Day Total</p>
                <p className="text-3xl font-bold text-primary">
                  £{incomeTrend.reduce((sum, day) => sum + day.total, 0).toFixed(2)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Daily Average</p>
                <p className="text-3xl font-bold">
                  £{(incomeTrend.reduce((sum, day) => sum + day.total, 0) / 30).toFixed(2)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Best Day (30d)</p>
                <p className="text-3xl font-bold text-green-500">
                  £{Math.max(...incomeTrend.map((day) => day.total), 0).toFixed(2)}
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}