import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { CartProvider } from "@/hooks/useCart";
import { ChatWidget } from "@/components/chat/ChatWidget";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import { PWAWrapper } from "@/components/pwa/PWAWrapper";
import { IpBanCheck } from "@/components/IpBanCheck";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminPWAHandler } from "@/components/pwa/AdminPWAHandler";
import { AdminManifestHandler } from "@/components/pwa/AdminManifestHandler";

// Eagerly loaded - critical path
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

// Lazy loaded - user pages
const Account = lazy(() => import("./pages/Account"));
const Downloads = lazy(() => import("./pages/Downloads"));
const Products = lazy(() => import("./pages/Products"));
const Categories = lazy(() => import("./pages/Categories"));
const ProductDetail = lazy(() => import("./pages/ProductDetail"));
const Cart = lazy(() => import("./pages/Cart"));
const Checkout = lazy(() => import("./pages/Checkout"));
const OrderSuccess = lazy(() => import("./pages/OrderSuccess"));
const ChatHistory = lazy(() => import("./pages/ChatHistory"));
const Forum = lazy(() => import("./pages/Forum"));
const ThreadDetail = lazy(() => import("./pages/ThreadDetail"));
const Jobs = lazy(() => import("./pages/Jobs"));
const RefundPolicy = lazy(() => import("./pages/RefundPolicy"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const FAQ = lazy(() => import("./pages/FAQ"));
const Support = lazy(() => import("./pages/Support"));
const Contact = lazy(() => import("./pages/Contact"));
const Status = lazy(() => import("./pages/Status"));
const BotInstallation = lazy(() => import("./pages/BotInstallation"));
const NotificationPreferences = lazy(() => import("./pages/NotificationPreferences"));

// Lazy loaded - admin pages
const AdminDashboard = lazy(() => import("./pages/admin/Dashboard"));
const AdminLogin = lazy(() => import("./pages/admin/Login"));
const AdminAnalytics = lazy(() => import("./pages/admin/Analytics"));
const AdminIncome = lazy(() => import("./pages/admin/Income"));
const AdminStaffActivity = lazy(() => import("./pages/admin/StaffActivity"));
const AdminStaffMessages = lazy(() => import("./pages/admin/StaffMessages"));
const AdminProducts = lazy(() => import("./pages/admin/Products"));
const AdminDiscounts = lazy(() => import("./pages/admin/Discounts"));
const AdminOrders = lazy(() => import("./pages/admin/Orders"));
const AdminUsers = lazy(() => import("./pages/admin/Users"));
const AdminSettings = lazy(() => import("./pages/admin/Settings"));
const AdminLiveChat = lazy(() => import("./pages/admin/LiveChat"));
const AdminApplications = lazy(() => import("./pages/admin/Applications"));
const AdminReviews = lazy(() => import("./pages/admin/Reviews"));
const AdminAuditLogs = lazy(() => import("./pages/admin/AuditLogs"));
const AdminIncidents = lazy(() => import("./pages/admin/Incidents"));
const AdminHelp = lazy(() => import("./pages/admin/Help"));
const AdminSubscribers = lazy(() => import("./pages/admin/Subscribers"));
const AdminIpBans = lazy(() => import("./pages/admin/IpBans"));
const AdminReferrals = lazy(() => import("./pages/admin/Referrals"));
const AdminBotCodes = lazy(() => import("./pages/admin/BotCodes"));
const AdminContactMessages = lazy(() => import("./pages/admin/ContactMessages"));

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
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <CartProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <IpBanCheck>
              <PWAWrapper>
                <AdminManifestHandler />
                <AdminPWAHandler />
                <Suspense fallback={<PageLoader />}>
                  <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/account" element={<Account />} />
                  <Route path="/downloads" element={<Downloads />} />
                  <Route path="/products" element={<Products />} />
                  <Route path="/categories" element={<Categories />} />
                  <Route path="/products/:slug" element={<ProductDetail />} />
                  <Route path="/cart" element={<Cart />} />
                  <Route path="/checkout" element={<Checkout />} />
                  <Route path="/order-success" element={<OrderSuccess />} />
                  <Route path="/chat-history" element={<ChatHistory />} />
                  <Route path="/forum" element={<Forum />} />
                  <Route path="/forum/:categorySlug" element={<Forum />} />
                  <Route path="/forum/:categorySlug/:threadSlug" element={<ThreadDetail />} />
                  <Route path="/jobs" element={<Jobs />} />
                  <Route path="/refunds" element={<RefundPolicy />} />
                  <Route path="/privacy" element={<PrivacyPolicy />} />
                  <Route path="/terms" element={<TermsOfService />} />
                  <Route path="/faq" element={<FAQ />} />
                  <Route path="/support" element={<Support />} />
                  <Route path="/contact" element={<Contact />} />
                  <Route path="/status" element={<Status />} />
                  <Route path="/bot-installation" element={<BotInstallation />} />
                  <Route path="/notifications" element={<NotificationPreferences />} />
                  <Route path="/admin" element={<AdminDashboard />} />
                  <Route path="/admin/login" element={<AdminLogin />} />
                  <Route path="/admin/analytics" element={<AdminAnalytics />} />
                  <Route path="/admin/income" element={<AdminIncome />} />
                  <Route path="/admin/staff-activity" element={<AdminStaffActivity />} />
                  <Route path="/admin/staff-messages" element={<AdminStaffMessages />} />
                  <Route path="/admin/products" element={<AdminProducts />} />
                  <Route path="/admin/discounts" element={<AdminDiscounts />} />
                  <Route path="/admin/orders" element={<AdminOrders />} />
                  <Route path="/admin/users" element={<AdminUsers />} />
                  <Route path="/admin/settings" element={<AdminSettings />} />
                  <Route path="/admin/live-chat" element={<AdminLiveChat />} />
                  <Route path="/admin/applications" element={<AdminApplications />} />
                  <Route path="/admin/reviews" element={<AdminReviews />} />
                  <Route path="/admin/audit-logs" element={<AdminAuditLogs />} />
                  <Route path="/admin/incidents" element={<AdminIncidents />} />
                  <Route path="/admin/help" element={<AdminHelp />} />
                  <Route path="/admin/subscribers" element={<AdminSubscribers />} />
                  <Route path="/admin/ip-bans" element={<AdminIpBans />} />
                  <Route path="/admin/referrals" element={<AdminReferrals />} />
                  <Route path="/admin/bot-codes" element={<AdminBotCodes />} />
                  <Route path="/admin/contact-messages" element={<AdminContactMessages />} />
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
                {/* Keep global widgets mounted even while routes are loading */}
                <ChatWidget />
                <InstallPrompt />
              </PWAWrapper>
            </IpBanCheck>
          </BrowserRouter>
        </TooltipProvider>
      </CartProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;