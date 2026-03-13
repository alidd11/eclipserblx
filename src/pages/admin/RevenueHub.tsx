import { useState, useCallback, useRef, memo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { TrendingUp, Lock, Shield, Eye, EyeOff, Clock } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminHubProvider } from '@/components/admin/AdminHubContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { showInfoNotification, showErrorNotification } from '@/lib/nativeNotification';
import { useAuth } from '@/hooks/useAuth';
import { useEffect } from 'react';
import { RevenueDashboard } from '@/components/admin/income/RevenueDashboard';

// Static verification client
const verifyClient = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

const SESSION_TIMEOUT_MS = 10 * 60 * 1000;
const REVENUE_VERIFIED_KEY = 'revenue_verified_at';

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
  const [isVerified, setIsVerified] = useState(() => getPersistedVerification());
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const lastActivityRef = useRef<number>(Date.now());
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
                Re-enter your password to access revenue analytics.
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
      <AdminHubProvider>
        <RevenueDashboard />
      </AdminHubProvider>
    </AdminLayout>
  );
}
