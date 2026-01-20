import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { CartProvider } from "@/hooks/useCart";
import { ChatPanelProvider } from "@/hooks/useChatPanel";
import { CookieConsentProvider } from "@/hooks/useCookieConsent";
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
const EclipsePlus = lazy(() => import("./pages/EclipsePlus"));
const LiveChat = lazy(() => import("./pages/LiveChat"));
const Affiliate = lazy(() => import("./pages/Affiliate"));

// Lazy loaded - admin pages
const AdminDashboard = lazy(() => import("./pages/admin/Dashboard"));
const AdminLogin = lazy(() => import("./pages/admin/Login"));
const AdminAnalytics = lazy(() => import("./pages/admin/Analytics"));
const AdminIncome = lazy(() => import("./pages/admin/Income"));
const AdminStaffActivity = lazy(() => import("./pages/admin/StaffActivity"));
const AdminStaffMessages = lazy(() => import("./pages/admin/StaffMessages"));
const AdminChat = lazy(() => import("./pages/admin/AdminChat"));

const AdminProducts = lazy(() => import("./pages/admin/Products"));
const AdminDiscounts = lazy(() => import("./pages/admin/Discounts"));
const AdminOrders = lazy(() => import("./pages/admin/Orders"));
const AdminUsers = lazy(() => import("./pages/admin/Users"));
const AdminSettings = lazy(() => import("./pages/admin/Settings"));
const AdminDiscordSettings = lazy(() => import("./pages/admin/DiscordSettings"));
const AdminRobloxSettings = lazy(() => import("./pages/admin/RobloxSettings"));
const AdminLiveChat = lazy(() => import("./pages/admin/LiveChat"));
const AdminApplications = lazy(() => import("./pages/admin/Applications"));
const AdminReviews = lazy(() => import("./pages/admin/Reviews"));
const AdminAuditLogs = lazy(() => import("./pages/admin/AuditLogs"));
const AdminIncidents = lazy(() => import("./pages/admin/Incidents"));
const AdminHelp = lazy(() => import("./pages/admin/Help"));
const AdminSubscribers = lazy(() => import("./pages/admin/Subscribers"));
const AdminIpBans = lazy(() => import("./pages/admin/IpBans"));
const AdminReferrals = lazy(() => import("./pages/admin/Referrals"));
const AdminAffiliates = lazy(() => import("./pages/admin/Affiliates"));
const AdminBotCodes = lazy(() => import("./pages/admin/BotCodes"));
const AdminBotRequests = lazy(() => import("./pages/admin/BotRequests"));
const AdminBotQueue = lazy(() => import("./pages/admin/BotQueue"));
const AdminContactMessages = lazy(() => import("./pages/admin/ContactMessages"));
const AdminForumReports = lazy(() => import("./pages/admin/ForumReports"));
const AdminArchivedApplications = lazy(() => import("./pages/admin/ArchivedApplications"));
const AdminJobChannels = lazy(() => import("./pages/admin/JobChannels"));
const AdminStaffDirectory = lazy(() => import("./pages/admin/StaffDirectory"));
const AdminStaffProfile = lazy(() => import("./pages/admin/StaffProfile"));
const AdminAffiliateApplications = lazy(() => import("./pages/admin/AffiliateApplications"));
const AdminStoreApplications = lazy(() => import("./pages/admin/StoreApplications"));
const AdminSellerProducts = lazy(() => import("./pages/admin/SellerProducts"));
const AdminSellerPayouts = lazy(() => import("./pages/admin/SellerPayouts"));
const AdminSellerRecruitment = lazy(() => import("./pages/admin/SellerRecruitment"));
const AdminSellerCommissions = lazy(() => import("./pages/admin/SellerCommissions"));
const AdminDocuments = lazy(() => import("./pages/admin/Documents"));

// Seller pages
const SellerDashboard = lazy(() => import("./pages/seller/SellerDashboard"));
const SellerProducts = lazy(() => import("./pages/seller/SellerProducts"));
const SellerProductEditor = lazy(() => import("./pages/seller/SellerProductEditor"));
const SellerOrders = lazy(() => import("./pages/seller/SellerOrders"));
const SellerBalance = lazy(() => import("./pages/seller/SellerBalance"));
const SellerSettings = lazy(() => import("./pages/seller/SellerSettings"));

// Public pages
const StorePage = lazy(() => import("./pages/StorePage"));

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
        <AuthProvider>
          <CartProvider>
            <ChatPanelProvider>
              <TooltipProvider>
                <Toaster />
                <Sonner />
                <BrowserRouter>
                  <IpBanCheck>
                    <PWAWrapper>
                <AdminManifestHandler />
                <AdminPWAHandler />
                <PWARouteRestorer />
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
                  <Route path="/eclipse-plus" element={<EclipsePlus />} />
                  <Route path="/affiliate" element={<Affiliate />} />
                  <Route path="/support/chat" element={<LiveChat />} />
                  {/* Seller routes */}
                  <Route path="/seller" element={<SellerDashboard />} />
                  <Route path="/seller/products" element={<SellerProducts />} />
                  <Route path="/seller/products/new" element={<SellerProductEditor />} />
                  <Route path="/seller/products/:productId/edit" element={<SellerProductEditor />} />
                  <Route path="/seller/orders" element={<SellerOrders />} />
                  <Route path="/seller/balance" element={<SellerBalance />} />
                  <Route path="/seller/settings" element={<SellerSettings />} />
                  {/* Public store page */}
                  <Route path="/store/:storeSlug" element={<StorePage />} />
                  <Route path="/admin" element={<AdminDashboard />} />
                  <Route path="/admin/login" element={<AdminLogin />} />
                  <Route path="/admin/analytics" element={<AdminAnalytics />} />
                  <Route path="/admin/income" element={<AdminIncome />} />
                  <Route path="/admin/staff-activity" element={<AdminStaffActivity />} />
                  <Route path="/admin/staff-messages" element={<AdminStaffMessages />} />
                  <Route path="/admin/admin-chat" element={<AdminChat />} />
                  
                  <Route path="/admin/products" element={<AdminProducts />} />
                  <Route path="/admin/discounts" element={<AdminDiscounts />} />
                  <Route path="/admin/orders" element={<AdminOrders />} />
                  <Route path="/admin/users" element={<AdminUsers />} />
                  <Route path="/admin/settings" element={<AdminSettings />} />
                  <Route path="/admin/discord-settings" element={<AdminDiscordSettings />} />
                  <Route path="/admin/roblox-settings" element={<AdminRobloxSettings />} />
                  <Route path="/admin/live-chat" element={<AdminLiveChat />} />
                  <Route path="/admin/applications" element={<AdminApplications />} />
                  <Route path="/admin/reviews" element={<AdminReviews />} />
                  <Route path="/admin/audit-logs" element={<AdminAuditLogs />} />
                  <Route path="/admin/incidents" element={<AdminIncidents />} />
                  <Route path="/admin/help" element={<AdminHelp />} />
                  <Route path="/admin/subscribers" element={<AdminSubscribers />} />
                  <Route path="/admin/ip-bans" element={<AdminIpBans />} />
                  <Route path="/admin/referrals" element={<AdminReferrals />} />
                  <Route path="/admin/affiliates" element={<AdminAffiliates />} />
                  <Route path="/admin/bot-codes" element={<AdminBotCodes />} />
                  <Route path="/admin/bot-requests" element={<AdminBotRequests />} />
                  <Route path="/admin/bot-queue" element={<AdminBotQueue />} />
                  <Route path="/admin/contact-messages" element={<AdminContactMessages />} />
                  <Route path="/admin/forum-reports" element={<AdminForumReports />} />
                  <Route path="/admin/archived-applications" element={<AdminArchivedApplications />} />
                  <Route path="/admin/job-channels" element={<AdminJobChannels />} />
                  <Route path="/admin/staff-directory" element={<AdminStaffDirectory />} />
                  <Route path="/admin/staff/:userId" element={<AdminStaffProfile />} />
                  <Route path="/admin/affiliate-applications" element={<AdminAffiliateApplications />} />
                  <Route path="/admin/store-applications" element={<AdminStoreApplications />} />
                  <Route path="/admin/seller-products" element={<AdminSellerProducts />} />
                  <Route path="/admin/seller-commissions" element={<AdminSellerCommissions />} />
                  <Route path="/admin/seller-payouts" element={<AdminSellerPayouts />} />
                  <Route path="/admin/documents" element={<AdminDocuments />} />
                  <Route path="/admin/seller-recruitment" element={<AdminSellerRecruitment />} />
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                  </Routes>
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
      </CookieConsentProvider>
    </QueryClientProvider>
  </ConnectionErrorBoundary>
);

export default App;