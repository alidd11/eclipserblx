import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { useGlobalGuardSession } from '@/hooks/useGlobalGuardSession';
import { GlobalGuardAuth } from './GlobalGuardAuth';
import { GlobalGuardCallback } from './GlobalGuardCallback';

// Lazy load Global Guard pages
const GlobalGuardDashboard = lazy(() => import('@/pages/global-guard/Dashboard'));
const GlobalGuardBans = lazy(() => import('@/pages/global-guard/Bans'));
const GlobalGuardServers = lazy(() => import('@/pages/global-guard/Servers'));
const GlobalGuardHistory = lazy(() => import('@/pages/global-guard/History'));
const GlobalGuardPermissions = lazy(() => import('@/pages/global-guard/Permissions'));
const GlobalGuardSettings = lazy(() => import('@/pages/global-guard/Settings'));

function PageLoader() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="space-y-4 w-full max-w-md px-4">
        <Skeleton className="h-8 w-3/4 mx-auto" />
        <Skeleton className="h-4 w-1/2 mx-auto" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    </div>
  );
}

function AuthenticatedRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route index element={<GlobalGuardDashboard />} />
        <Route path="bans" element={<GlobalGuardBans />} />
        <Route path="servers" element={<GlobalGuardServers />} />
        <Route path="history" element={<GlobalGuardHistory />} />
        <Route path="permissions" element={<GlobalGuardPermissions />} />
        <Route path="settings" element={<GlobalGuardSettings />} />
        <Route path="*" element={<GlobalGuardDashboard />} />
      </Routes>
    </Suspense>
  );
}

export function GlobalGuardRouter() {
  const { isAuthenticated, loading } = useGlobalGuardSession();

  if (loading) {
    return <PageLoader />;
  }

  return (
    <Routes>
      {/* OAuth callback route - always accessible */}
      <Route path="callback" element={<GlobalGuardCallback />} />
      
      {/* Protected routes */}
      <Route
        path="*"
        element={isAuthenticated ? <AuthenticatedRoutes /> : <GlobalGuardAuth />}
      />
    </Routes>
  );
}
