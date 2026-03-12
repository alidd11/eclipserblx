import { useState, useEffect, useCallback } from 'react';
import { TrendingUp, FileDown, Lock, Shield, Eye, EyeOff, Clock, Wallet, Coins, Gamepad2, Store } from 'lucide-react';
import { FinancialOverview } from '@/components/admin/income/FinancialOverview';
import { StripeBalanceTab } from '@/components/admin/income/StripeBalanceTab';
import { GrossRevenueTab } from '@/components/admin/income/GrossRevenueTab';
import { RobuxEarningsTab } from '@/components/admin/income/RobuxEarningsTab';
import { CreditsAnalyticsTab } from '@/components/admin/income/CreditsAnalyticsTab';
import { SellerEarningsTab } from '@/components/admin/income/SellerEarningsTab';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { showSuccessNotification, showInfoNotification, showErrorNotification } from '@/lib/nativeNotification';
import { useAuth } from '@/hooks/useAuth';

const SESSION_TIMEOUT_MS = 10 * 60 * 1000;
const INCOME_VERIFIED_KEY = 'income_verified_at';

function getPersistedVerification(): boolean {
  try {
    const stored = sessionStorage.getItem(INCOME_VERIFIED_KEY);
    if (stored) {
      const elapsed = Date.now() - parseInt(stored, 10);
      if (!isNaN(elapsed) && elapsed < SESSION_TIMEOUT_MS) return true;
      sessionStorage.removeItem(INCOME_VERIFIED_KEY);
    }
  } catch {}
  return false;
}

export default function AdminIncome() {
  const { user } = useAuth();
  const [isVerified, setIsVerified] = useState(() => getPersistedVerification());
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [lastActivity, setLastActivity] = useState<number>(Date.now());
  const [timeRemaining, setTimeRemaining] = useState<number>(SESSION_TIMEOUT_MS);

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
          user_id: user.id, action: 'access', resource: 'income_analytics',
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
                  Income Analytics
                </CardTitle>
                <p className="text-muted-foreground text-sm mt-1">Comprehensive financial overview and reports</p>
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

        {/* Detailed Tabs */}
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
              <Coins className="h-4 w-4" />
              <span className="hidden sm:inline">Credits</span>
            </TabsTrigger>
            <TabsTrigger value="robux" className="gap-2">
              <Gamepad2 className="h-4 w-4" />
              <span className="hidden sm:inline">Robux</span>
            </TabsTrigger>
            <TabsTrigger value="sellers" className="gap-2">
              <Store className="h-4 w-4" />
              <span className="hidden sm:inline">Sellers</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="stripe"><StripeBalanceTab /></TabsContent>
          <TabsContent value="gross"><GrossRevenueTab /></TabsContent>
          <TabsContent value="credits"><CreditsAnalyticsTab /></TabsContent>
          <TabsContent value="robux"><RobuxEarningsTab /></TabsContent>
          <TabsContent value="sellers"><SellerEarningsTab /></TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
