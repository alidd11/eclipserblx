import { useState, useEffect, useCallback, lazy, Suspense, useRef, memo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { TrendingUp, Lock, Shield, Eye, EyeOff, Clock, Wallet, DollarSign, Coins, Gamepad2, Store } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
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
import { showInfoNotification, showErrorNotification } from '@/lib/nativeNotification';
import { useAuth } from '@/hooks/useAuth';
import { Skeleton } from '@/components/ui/skeleton';

// Static verification client — no dynamic import, no session persistence
const verifyClient = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

const AdminIncomeSources = lazy(() => import('@/pages/admin/IncomeSources').then(m => ({ default: m.default })));

const MemoFinancialOverview = memo(FinancialOverview);
const MemoStripeBalanceTab = memo(StripeBalanceTab);
const MemoGrossRevenueTab = memo(GrossRevenueTab);
const MemoCreditsAnalyticsTab = memo(CreditsAnalyticsTab);
const MemoRobuxEarningsTab = memo(RobuxEarningsTab);
const MemoSellerEarningsTab = memo(SellerEarningsTab);

const SESSION_TIMEOUT_MS = 10 * 60 * 1000;
const REVENUE_VERIFIED_KEY = 'revenue_verified_at';

// Flat tab config — single level, no nesting
const tabs = [
  { value: 'overview', label: 'Overview', icon: TrendingUp },
  { value: 'stripe', label: 'Stripe', icon: Wallet },
  { value: 'gross', label: 'Gross', icon: DollarSign },
  { value: 'credits', label: 'Credits', icon: Coins },
  { value: 'robux', label: 'Robux', icon: Gamepad2 },
  { value: 'sellers', label: 'Sellers', icon: Store },
  { value: 'sources', label: 'Sources', icon: DollarSign },
] as const;

function getPersistedVerification(): boolean {
  try {
    const stored = sessionStorage.getItem(REVENUE_VERIFIED_KEY);
    if (stored) {
      const elapsed = Date.now() - parseInt(stored, 10);
      if (!isNaN(elapsed) && elapsed < SESSION_TIMEOUT_MS) return true;
      sessionStorage.removeItem(REVENUE_VERIFIED_KEY);
    }
  } catch {}
  return false;
}

export default function RevenueHub() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isVerified, setIsVerified] = useState(() => getPersistedVerification());
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const lastActivityRef = useRef<number>(Date.now());
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeTab = searchParams.get('tab') || 'overview';
  const setActiveTab = (tab: string) => setSearchParams({ tab }, { replace: true });

  const expireSession = useCallback(() => {
    setIsVerified(false);
    setPassword('');
    try { sessionStorage.removeItem(REVENUE_VERIFIED_KEY); } catch {}
    showInfoNotification('Session Expired', 'Session expired due to inactivity. Please re-verify.');
  }, []);

  const resetActivityTimer = useCallback(() => {
    if (!isVerified) return;
    lastActivityRef.current = Date.now();
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(expireSession, SESSION_TIMEOUT_MS);
  }, [isVerified, expireSession]);

  useEffect(() => {
    if (!isVerified) return;

    resetActivityTimer();
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach(e => window.addEventListener(e, resetActivityTimer));

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      events.forEach(e => window.removeEventListener(e, resetActivityTimer));
    };
  }, [isVerified, resetActivityTimer]);

  const verifyingRef = useRef(false);

  const handleVerifyPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.email || !password || verifyingRef.current) return;
    verifyingRef.current = true;
    setVerifying(true);
    try {
      const { error } = await verifyClient.auth.signInWithPassword({ email: user.email, password });
      if (error) {
        showErrorNotification('Authentication Failed', 'Incorrect password. Please try again.');
        setPassword('');
      } else {
        // Sign out ONLY the ephemeral client — scope: 'local' prevents revoking the main session
        verifyClient.auth.signOut({ scope: 'local' }).catch(() => {});
        const now = Date.now();
        lastActivityRef.current = now;
        setIsVerified(true);
        setPassword('');
        try { sessionStorage.setItem(REVENUE_VERIFIED_KEY, now.toString()); } catch {}
        await supabase.from('audit_logs').insert({
          user_id: user.id, action: 'access', resource: 'revenue_hub',
          details: { timestamp: new Date().toISOString() },
        });
      }
    } catch {
      showErrorNotification('Verification Failed', 'Verification failed. Please try again.');
    } finally {
      setVerifying(false);
      verifyingRef.current = false;
    }
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
      <div className="space-y-6 w-full">
        {/* Page Header */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <CardTitle className="text-2xl font-display flex items-center gap-2">
                  <TrendingUp className="h-6 w-6 text-primary" />
                  Revenue
                </CardTitle>
                <p className="text-muted-foreground text-sm mt-1">Financial overview, income sources & seller earnings</p>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted px-3 py-1.5 rounded-full w-fit">
                <Clock className="h-4 w-4" />
                <span>10m inactivity timeout</span>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Single flat tab level */}
        <AdminHubProvider>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            {/* Desktop tabs */}
            <TabsList className="hidden sm:grid w-full max-w-3xl grid-cols-7">
              {tabs.map(t => (
                <TabsTrigger key={t.value} value={t.value} className="gap-1.5 text-xs">
                  <t.icon className="h-4 w-4" />
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>

            {/* Mobile select */}
            <div className="sm:hidden">
              <Select value={activeTab} onValueChange={setActiveTab}>
                <SelectTrigger className="w-auto min-w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {tabs.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <TabsContent value="overview">
              <MemoFinancialOverview />
            </TabsContent>

            <TabsContent value="stripe"><MemoStripeBalanceTab /></TabsContent>
            <TabsContent value="gross"><MemoGrossRevenueTab /></TabsContent>
            <TabsContent value="credits"><MemoCreditsAnalyticsTab /></TabsContent>
            <TabsContent value="robux"><MemoRobuxEarningsTab /></TabsContent>
            <TabsContent value="sellers"><MemoSellerEarningsTab /></TabsContent>

            <TabsContent value="sources">
              <Suspense fallback={<Skeleton className="h-96 w-full" />}>
                <AdminIncomeSources />
              </Suspense>
            </TabsContent>
          </Tabs>
        </AdminHubProvider>
      </div>
    </AdminLayout>
  );
}
