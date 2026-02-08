import { Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { CartProvider } from "@/hooks/useCart";
import { ChatPanelProvider } from "@/hooks/useChatPanel";
import { CookieConsentProvider } from "@/hooks/useCookieConsent";
import { CurrencyProvider } from "@/hooks/useCurrency";
import { ChatWidget } from "@/components/chat/ChatWidget";
import { ChatSidePanel } from "@/components/chat/ChatSidePanel";
import { CookieConsentBanner } from "@/components/cookies/CookieConsentBanner";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import { PWAWrapper } from "@/components/pwa/PWAWrapper";
import { IpBanCheck } from "@/components/IpBanCheck";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminPWAHandler } from "@/components/pwa/AdminPWAHandler";
import { AdminManifestHandler } from "@/components/pwa/AdminManifestHandler";
import { ConnectionErrorBoundary } from "@/components/ConnectionErrorBoundary";
import { PWARouteRestorer } from "@/hooks/usePWALastRoute";
import { GlobalBackground } from "@/components/layout/GlobalBackground";
import { AppRoutes } from "@/components/AppRoutes";

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

const App = () => (
  <ConnectionErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <CookieConsentProvider>
        <CurrencyProvider>
          <AuthProvider>
            <CartProvider>
              <ChatPanelProvider>
                <TooltipProvider>
                  <Toaster />
                  <Sonner />
                  <BrowserRouter>
                    <GlobalBackground />
                    <IpBanCheck>
                      <PWAWrapper>
                        <AdminManifestHandler />
                        <AdminPWAHandler />
                        <PWARouteRestorer />
                        <Suspense fallback={<PageLoader />}>
                          <AppRoutes />
                        </Suspense>
                        <InstallPrompt />
                      </PWAWrapper>
                      {/* Chat components rendered OUTSIDE PWAWrapper to prevent transform-related positioning issues */}
                      <ChatWidget />
                      <ChatSidePanel />
                      <CookieConsentBanner />
                    </IpBanCheck>
                  </BrowserRouter>
                </TooltipProvider>
              </ChatPanelProvider>
            </CartProvider>
          </AuthProvider>
        </CurrencyProvider>
      </CookieConsentProvider>
    </QueryClientProvider>
  </ConnectionErrorBoundary>
);

export default App;
