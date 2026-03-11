import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { TrendingUp, Lock, Shield, Eye, EyeOff, Clock, Wallet, DollarSign } from 'lucide-react';
import { FinancialOverview } from '@/components/admin/income/FinancialOverview';
import { StripeBalanceTab } from '@/components/admin/income/StripeBalanceTab';
import { GrossRevenueTab } from '@/components/admin/income/GrossRevenueTab';
import { RobuxEarningsTab } from '@/components/admin/income/RobuxEarningsTab';
import { CreditsAnalyticsTab } from '@/components/admin/income/CreditsAnalyticsTab';
import { SellerEarningsTab } from '@/components/admin/income/SellerEarningsTab';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminHubProvider } from '@/components/admin/AdminHubContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { showSuccessNotification, showInfoNotification, showErrorNotification } from '@/lib/nativeNotification';
import { useAuth } from '@/hooks/useAuth';
import { lazy, Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

const AdminIncomeSources = lazy(() => import('@/pages/admin/IncomeSources').then(m => ({ default: m.default })));

const SESSION_TIMEOUT_MS = 10 * 60 * 1000;

// Tab config for mobile select
const tabs = [
  { value: 'overview', label: 'Overview', icon: TrendingUp },
  { value: 'sources', label: 'Sources', icon: DollarSign },
  { value: 'sellers', label: 'Seller Earnings', icon: Wallet },
] as const;

export default function RevenueHub() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isVerified, setIsVerified] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [lastActivity, setLastActivity] = useState<number>(Date.now());
  const [timeRemaining, setTimeRemaining] = useState<number>(SESSION_TIMEOUT_MS);

  const activeTab = searchParams.get('tab') || 'overview';
  const setActiveTab = (tab: string) => setSearchParams({ tab }, { replace: true });

  const resetActivityTimer = useCallback(() => {
    if (isVerified) setLastActivity(Date.now());
  }, [isVerified]);

  useEffect(() => {
    if (!isVerified) return;
    const checkTimeout = setInterval(() => {
      const elapsed = Date.now() - lastActivity;
      setTimeRemaining(Math.max(0, SESSION_TIMEOUT_MS - elapsed));
      if (elapsed >= SESSION_TIMEOUT_MS) {
        setIsVerified(false);
        setPassword('');
        showInfoNotification('Session Expired', 'Session expired due to inactivity. Please re-verify.');
      }
    }, 1000);

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach(e => window.addEventListener(e, resetActivityTimer));
    return () => {
      clearInterval(checkTimeout);
      events.forEach(e => window.removeEventListener(e, resetActivityTimer));
    };
  }, [isVerified, lastActivity, resetActivityTimer]);

  const handleVerifyPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.email || !password) return;
    setVerifying(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: user.email, password });
      if (error) {
        showErrorNotification('Authentication Failed', 'Incorrect password. Please try again.');
        setPassword('');
      } else {
        setIsVerified(true);
        setLastActivity(Date.now());
        await supabase.from('audit_logs').insert({
          user_id: user.id, action: 'access', resource: 'revenue_hub',
          details: { timestamp: new Date().toISOString() },
        });
      }
    } catch {
      showErrorNotification('Verification Failed', 'Verification failed. Please try again.');
    } finally {
      setVerifying(false);
    }
  };

  const formatTime = (ms: number) => {
    const m = Math.floor(ms / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

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
                Please re-enter your password to access revenue analytics. This is a security measure to protect sensitive financial data.
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
                      {showPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
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
        {/* Page Header */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-4">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <CardTitle className="text-2xl sm:text-3xl font-display flex items-center gap-2">
                  <TrendingUp className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
                  Revenue
                </CardTitle>
                <p className="text-muted-foreground text-sm mt-1">Comprehensive financial overview, income sources, and seller earnings</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted px-3 py-1.5 rounded-full">
                  <Clock className="h-4 w-4" />
                  <span>Session: {formatTime(timeRemaining)}</span>
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Financial Overview (always visible) */}
        <FinancialOverview />

        {/* Tabs — mobile select, desktop tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          {/* Desktop tabs */}
          <TabsList className="hidden sm:grid w-full max-w-xl grid-cols-3">
            {tabs.map(t => (
              <TabsTrigger key={t.value} value={t.value} className="gap-2">
                <t.icon className="h-4 w-4" />
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Mobile select */}
          <div className="sm:hidden">
            <Select value={activeTab} onValueChange={setActiveTab}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {tabs.map(t => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <TabsContent value="overview" className="space-y-6">
            {/* Income page tabs content (Stripe, Gross, Credits, Robux, Sellers) */}
            <Tabs defaultValue="stripe" className="space-y-6">
              <TabsList className="grid w-full max-w-3xl grid-cols-5">
                <TabsTrigger value="stripe" className="gap-2">
                  <Wallet className="h-4 w-4" />
                  <span className="hidden sm:inline">Stripe</span>
                </TabsTrigger>
                <TabsTrigger value="gross" className="gap-2">
                  <TrendingUp className="h-4 w-4" />
                  <span className="hidden sm:inline">Gross</span>
                </TabsTrigger>
                <TabsTrigger value="credits" className="gap-2">
                  <DollarSign className="h-4 w-4" />
                  <span className="hidden sm:inline">Credits</span>
                </TabsTrigger>
                <TabsTrigger value="robux" className="gap-2">
                  <DollarSign className="h-4 w-4" />
                  <span className="hidden sm:inline">Robux</span>
                </TabsTrigger>
                <TabsTrigger value="sellerEarnings" className="gap-2">
                  <DollarSign className="h-4 w-4" />
                  <span className="hidden sm:inline">Sellers</span>
                </TabsTrigger>
              </TabsList>
              <TabsContent value="stripe"><StripeBalanceTab /></TabsContent>
              <TabsContent value="gross"><GrossRevenueTab /></TabsContent>
              <TabsContent value="credits"><CreditsAnalyticsTab /></TabsContent>
              <TabsContent value="robux"><RobuxEarningsTab /></TabsContent>
              <TabsContent value="sellerEarnings"><SellerEarningsTab /></TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="sources">
            <Suspense fallback={<Skeleton className="h-96 w-full" />}>
              <IncomeSourcesContent />
            </Suspense>
          </TabsContent>

          <TabsContent value="sellers">
            <SellerEarningsTab />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}

/** Inline the IncomeSources page content without AdminLayout wrapper */
function IncomeSourcesContent() {
  // We lazy-load the full page but it wraps in AdminLayout — we need just the content
  // Instead, render the full page as-is since it has its own AdminLayout
  return <AdminIncomeSources />;
}
