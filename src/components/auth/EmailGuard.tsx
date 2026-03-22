import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useRequireEmail } from '@/hooks/useRequireEmail';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { RefreshCw, LogIn } from 'lucide-react';

const BOOT_DEADLINE_MS = 8000;

/**
 * Wraps the app to redirect users with placeholder emails to /complete-profile.
 * Shows a branded loader instead of a blank screen while auth initializes.
 */
export function EmailGuard({ children }: { children: React.ReactNode }) {
  const { needsEmail, loading } = useRequireEmail();
  const [deadlineHit, setDeadlineHit] = useState(false);

  useEffect(() => {
    if (!loading) return;
    const timer = setTimeout(() => {
      console.warn('[EmailGuard] Boot deadline reached — auth still loading after', BOOT_DEADLINE_MS, 'ms');
      setDeadlineHit(true);
    }, BOOT_DEADLINE_MS);
    return () => clearTimeout(timer);
  }, [loading]);

  // Reset deadline if loading resolves
  useEffect(() => {
    if (!loading) setDeadlineHit(false);
  }, [loading]);

  if (loading && !deadlineHit) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center safe-area-page">
        <div className="space-y-4 w-full max-w-md px-4 text-center">
          <Skeleton className="h-8 w-3/4 mx-auto" />
          <Skeleton className="h-4 w-1/2 mx-auto" />
          <Skeleton className="h-64 w-full rounded-lg" />
          <p className="text-sm text-muted-foreground animate-pulse">Loading…</p>
        </div>
      </div>
    );
  }

  if (loading && deadlineHit) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center safe-area-page">
        <div className="space-y-4 w-full max-w-xs px-4 text-center">
          <p className="text-foreground font-medium">Taking longer than expected</p>
          <p className="text-sm text-muted-foreground">Your session may have expired.</p>
          <div className="flex flex-col gap-2">
            <Button onClick={() => window.location.reload()} variant="default" className="w-full">
              <RefreshCw className="mr-2 h-4 w-4" /> Retry
            </Button>
            <Button onClick={() => { window.location.href = '/auth'; }} variant="outline" className="w-full">
              <LogIn className="mr-2 h-4 w-4" /> Sign In
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (needsEmail) {
    const path = window.location.pathname;
    const allowedPaths = ['/complete-profile', '/auth', '/auth/discord/callback', '/auth/roblox/callback'];
    
    if (!allowedPaths.some(p => path.startsWith(p))) {
      return <Navigate to="/complete-profile" replace />;
    }
  }

  return <>{children}</>;
}
