import { Suspense, lazy, forwardRef } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { CartProvider } from "@/hooks/useCart";
import { ChatPanelProvider } from "@/hooks/useChatPanel";
import { StoreDomainProvider } from "@/hooks/useStoreDomain";
import { CookieConsentProvider } from "@/hooks/useCookieConsent";
import { CurrencyProvider } from "@/hooks/useCurrency";
const InstallPrompt = lazy(() => import("@/components/pwa/InstallPrompt").then(m => ({ default: m.InstallPrompt })));
import { PWAWrapper } from "@/components/pwa/PWAWrapper";
import { IpBanCheck } from "@/components/IpBanCheck";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminPWAHandler } from "@/components/pwa/AdminPWAHandler";
import { AdminManifestHandler } from "@/components/pwa/AdminManifestHandler";
import { ConnectionErrorBoundary } from "@/components/ConnectionErrorBoundary";
import { PWARouteRestorer } from "@/hooks/usePWALastRoute";
import { ScrollToTop } from "@/components/ScrollToTop";
import { GlobalBackground } from "@/components/layout/GlobalBackground";
const AppRoutes = lazy(() => import("@/components/AppRoutes").then(m => ({ default: m.AppRoutes })));
import { EmailGuard } from "@/components/auth/EmailGuard";

// Lazy-load heavy components that aren't needed on initial render
const ChatWidget = lazy(() => import("@/components/chat/ChatWidget").then(m => ({ default: m.ChatWidget })));
const ChatSidePanel = lazy(() => import("@/components/chat/ChatSidePanel").then(m => ({ default: m.ChatSidePanel })));
const CookieConsentBanner = lazy(() => import("@/components/cookies/CookieConsentBanner").then(m => ({ default: m.CookieConsentBanner })));

// Optimized QueryClient with better caching
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes (formerly cacheTime)
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Minimal loading fallback
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

const App = forwardRef<HTMLDivElement>((_, ref) => (
  <div ref={ref}>
  <ConnectionErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <CookieConsentProvider>
        <CurrencyProvider>
          <AuthProvider>
            <CartProvider>
              <ChatPanelProvider>
                <StoreDomainProvider>
                <TooltipProvider>
                  <Toaster />
                  <Sonner />
                  <BrowserRouter>
                    <GlobalBackground />
                    <ScrollToTop />
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
                        <InstallPrompt />
                      </PWAWrapper>
                      {/* Chat components rendered OUTSIDE PWAWrapper to prevent transform-related positioning issues */}
                      <Suspense fallback={null}>
                        <ChatWidget />
                        <ChatSidePanel />
                        <CookieConsentBanner />
                      </Suspense>
                    </IpBanCheck>
                  </BrowserRouter>
                </TooltipProvider>
                </StoreDomainProvider>
              </ChatPanelProvider>
            </CartProvider>
          </AuthProvider>
        </CurrencyProvider>
      </CookieConsentProvider>
    </QueryClientProvider>
  </ConnectionErrorBoundary>
  </div>
));

App.displayName = 'App';

export default App;
