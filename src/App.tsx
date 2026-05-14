import { Suspense, lazy } from "react";
import { focusManager, onlineManager } from "@tanstack/react-query";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
// React Query Devtools — dev only, lazy-loaded so it never ships to production
const ReactQueryDevtools = import.meta.env.DEV
  ? lazy(() => import("@tanstack/react-query-devtools").then(m => ({ default: m.ReactQueryDevtools })))
  : null;
import { AuthProvider } from "@/hooks/useAuth";
import { DeviceProvider } from "@/hooks/useDevice";
import { ActiveStoreProvider } from "@/contexts/ActiveStoreContext";
import { CartProvider } from "@/hooks/useCart";
import { ChatPanelProvider } from "@/hooks/useChatPanel";
import { StoreDomainProvider } from "@/hooks/useStoreDomain";
import { CookieConsentProvider } from "@/hooks/useCookieConsent";
import { CurrencyProvider } from "@/hooks/useCurrency";
const InstallPrompt = lazy(() => import("@/components/pwa/InstallPrompt").then(m => ({ default: m.InstallPrompt })));
import { PWAWrapper } from "@/components/pwa/PWAWrapper";
const MobileTabBar = lazy(() => import("@/components/layout/MobileTabBar").then(m => ({ default: m.MobileTabBar })));
import { IpBanCheck } from "@/components/IpBanCheck";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminPWAHandler } from "@/components/pwa/AdminPWAHandler";
import { AdminManifestHandler } from "@/components/pwa/AdminManifestHandler";
import { ConnectionErrorBoundary } from "@/components/ConnectionErrorBoundary";
import { PWARouteRestorer } from "@/hooks/usePWALastRoute";
import { NavigationProgress } from "@/components/NavigationProgress";
import { ScrollToTop } from "@/components/ScrollToTop";
import { RouteAnnouncer } from "@/components/RouteAnnouncer";
import { GlobalBackground } from "@/components/layout/GlobalBackground";
import { SafeLazyWidget } from "@/components/SafeLazyWidget";
const AppRoutes = lazy(() => import("@/components/AppRoutes").then(m => ({ default: m.AppRoutes })));
import { EmailGuard } from "@/components/auth/EmailGuard";
import { usePredictivePreload } from "@/hooks/usePredictivePreload";

// Lazy-load heavy components that aren't needed on initial render
const ChatWidget = lazy(() => import("@/components/chat/ChatWidget").then(m => ({ default: m.ChatWidget })));
const ChatSidePanel = lazy(() => import("@/components/chat/ChatSidePanel").then(m => ({ default: m.ChatSidePanel })));
const CookieConsentBanner = lazy(() => import("@/components/cookies/CookieConsentBanner").then(m => ({ default: m.CookieConsentBanner })));
const ConnectivityBanner = lazy(() => import("@/components/ConnectivityBanner").then(m => ({ default: m.ConnectivityBanner })));
const BackgroundRefreshIndicator = lazy(() => import("@/components/BackgroundRefreshIndicator").then(m => ({ default: m.BackgroundRefreshIndicator })));

// ── Pause all refetch intervals when tab is hidden ──
// React Query's focusManager drives refetchOnWindowFocus.
// We also use it to pause refetchInterval when the tab is backgrounded,
// saving DB queries when the user isn't looking.
focusManager.setEventListener((handleFocus) => {
  const onVisibilityChange = () => handleFocus(document.visibilityState === 'visible');
  document.addEventListener('visibilitychange', onVisibilityChange, false);
  return () => document.removeEventListener('visibilitychange', onVisibilityChange);
});

// Optimized QueryClient with better caching
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes (formerly cacheTime)
      refetchOnWindowFocus: false,
      retry: 1,
      // refetchInterval queries automatically pause when focusManager reports unfocused
    },
    mutations: {
      onError: (error) => {
        // Global mutation error reporter — catches unhandled mutation failures
        console.error('[QueryClient] Mutation failed:', error);
        import('@/lib/sentry').then(({ captureException }) => {
          captureException(error instanceof Error ? error : new Error(String(error)), { source: 'mutation' });
        });
      },
    },
  },
});

// Minimal loading fallback
function PageLoader() {
  return (
    <div className="min-h-screen bg-background safe-area-page">
      {/* Match the actual page structure to prevent CLS when content replaces skeleton */}
      <div className="h-14" /> {/* Header placeholder */}
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 pt-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}

/** Invisible component that triggers predictive data preloading after auth */
function PredictivePreloader() {
  usePredictivePreload();
  return null;
}

function App() {
  return (
    <ConnectionErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <CookieConsentProvider>
          <CurrencyProvider>
            <DeviceProvider>
            <AuthProvider>
              <ActiveStoreProvider>
              <CartProvider>
                <PredictivePreloader />
                  <ChatPanelProvider>
                    <StoreDomainProvider>
                      <TooltipProvider>
                        <Sonner />
                        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                          <GlobalBackground />
                          <NavigationProgress />
                          <ScrollToTop />
                          <RouteAnnouncer />
                          <IpBanCheck>
                            <PWAWrapper>
                              <AdminManifestHandler />
                              <AdminPWAHandler />
                              <PWARouteRestorer />
                              <Suspense fallback={<PageLoader />}>
                                <EmailGuard>
                                  <AppRoutes />
                                </EmailGuard>
                              </Suspense>
                              <Suspense fallback={null}><InstallPrompt /></Suspense>
                            </PWAWrapper>
                            {/* Each non-critical widget is isolated so a chunk failure in one cannot crash the app */}
                            <SafeLazyWidget><MobileTabBar /></SafeLazyWidget>
                            <SafeLazyWidget><ChatWidget /></SafeLazyWidget>
                            <SafeLazyWidget><ChatSidePanel /></SafeLazyWidget>
                            <SafeLazyWidget><CookieConsentBanner /></SafeLazyWidget>
                            <SafeLazyWidget><ConnectivityBanner /></SafeLazyWidget>
                            <SafeLazyWidget><BackgroundRefreshIndicator /></SafeLazyWidget>
                          </IpBanCheck>
                        </BrowserRouter>
                      </TooltipProvider>
                    </StoreDomainProvider>
                  </ChatPanelProvider>
                </CartProvider>
              </ActiveStoreProvider>
            </AuthProvider>
            </DeviceProvider>
          </CurrencyProvider>
        </CookieConsentProvider>
        {ReactQueryDevtools && (
          <Suspense fallback={null}>
            <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />
          </Suspense>
        )}
      </QueryClientProvider>
    </ConnectionErrorBoundary>
  );
}

export default App;
