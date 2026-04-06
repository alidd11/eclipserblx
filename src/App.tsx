import { Suspense, lazy } from "react";
import { focusManager, onlineManager } from "@tanstack/react-query";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
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
    <div className="min-h-screen bg-background flex items-center justify-center safe-area-page">
      <div className="space-y-4 w-full max-w-md px-4">
        <Skeleton className="h-8 w-3/4 mx-auto" />
        <Skeleton className="h-4 w-1/2 mx-auto" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    </div>
  );
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
                  <ChatPanelProvider>
                    <StoreDomainProvider>
                      <TooltipProvider>
                        <Sonner />
                        <BrowserRouter>
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
      </QueryClientProvider>
    </ConnectionErrorBoundary>
  );
}

export default App;
