import { Suspense, useState, useEffect, useCallback } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useStoreDomain } from "@/hooks/useStoreDomain";
import { Skeleton } from "@/components/ui/skeleton";
import { RouteErrorBoundary } from "@/components/RouteErrorBoundary";
import { lazyWithRetry } from "@/lib/lazyWithRetry";

// Lazy load Global Guard router for /guard path
const GlobalGuardRouter = lazyWithRetry(() => import("@/components/global-guard/GlobalGuardRouter").then(m => ({ default: m.GlobalGuardRouter })));

// Lazy loaded - critical path (keeps initial bundle small)
const Index = lazyWithRetry(() => import("@/pages/Index"));
const Auth = lazyWithRetry(() => import("@/pages/Auth"));
const NotFound = lazyWithRetry(() => import("@/pages/NotFound"));

// Lazy loaded - OAuth callbacks
const AuthDiscordCallback = lazyWithRetry(() => import("@/pages/AuthDiscordCallback"));
const AuthRobloxCallback = lazyWithRetry(() => import("@/pages/AuthRobloxCallback"));
const CompleteProfile = lazyWithRetry(() => import("@/pages/CompleteProfile"));

// Lazy loaded - user pages
const Account = lazyWithRetry(() => import("@/pages/Account"));
const MyPurchases = lazyWithRetry(() => import("@/pages/MyPurchases"));
const Products = lazyWithRetry(() => import("@/pages/Products"));
const Featured = lazyWithRetry(() => import("@/pages/Featured"));
const Categories = lazyWithRetry(() => import("@/pages/Categories"));
const AllStores = lazyWithRetry(() => import("@/pages/AllStores"));

const ProductDetail = lazyWithRetry(() => import("@/pages/ProductDetail"));
const Cart = lazyWithRetry(() => import("@/pages/Cart"));
const Checkout = lazyWithRetry(() => import("@/pages/Checkout"));
const OrderSuccess = lazyWithRetry(() => import("@/pages/OrderSuccess"));
const ChatHistory = lazyWithRetry(() => import("@/pages/ChatHistory"));
const SupportTickets = lazyWithRetry(() => import("@/pages/SupportTickets"));
const SupportTicketDetail = lazyWithRetry(() => import("@/pages/SupportTicketDetail"));
const Jobs = lazyWithRetry(() => import("@/pages/Jobs"));
const RefundPolicy = lazyWithRetry(() => import("@/pages/RefundPolicy"));
const PrivacyPolicy = lazyWithRetry(() => import("@/pages/PrivacyPolicy"));
const TermsOfService = lazyWithRetry(() => import("@/pages/TermsOfService"));
const DMCA = lazyWithRetry(() => import("@/pages/DMCA"));
const FAQ = lazyWithRetry(() => import("@/pages/FAQ"));
const HelpCenter = lazyWithRetry(() => import("@/pages/HelpCenter"));
const HelpCenterBuyers = lazyWithRetry(() => import("@/pages/HelpCenterBuyers"));
const HelpCenterSellers = lazyWithRetry(() => import("@/pages/HelpCenterSellers"));
const Support = lazyWithRetry(() => import("@/pages/Support"));
const Contact = lazyWithRetry(() => import("@/pages/Contact"));
const Status = lazyWithRetry(() => import("@/pages/Status"));
const BotInstallation = lazyWithRetry(() => import("@/pages/BotInstallation"));
const BotDashboard = lazyWithRetry(() => import("@/pages/BotDashboard"));
const NotificationPreferences = lazyWithRetry(() => import("@/pages/NotificationPreferences"));


const LiveChat = lazyWithRetry(() => import("@/pages/LiveChat"));
const Affiliate = lazyWithRetry(() => import("@/pages/Affiliate"));
const Messages = lazyWithRetry(() => import("@/pages/Messages"));
const Advertise = lazyWithRetry(() => import("@/pages/Advertise"));
const Credits = lazyWithRetry(() => import("@/pages/Credits"));
const Sell = lazyWithRetry(() => import("@/pages/Sell"));
const BecomeSellerWizard = lazyWithRetry(() => import("@/pages/BecomeSellerWizard"));
const SearchResults = lazyWithRetry(() => import("@/pages/SearchResults"));
const FreeAssets = lazyWithRetry(() => import("@/pages/FreeAssets"));
const MyAdvertisementsPage = lazyWithRetry(() => import("@/pages/Account/MyAdvertisementsPage"));
const AdAnalyticsPage = lazyWithRetry(() => import("@/pages/Account/AdAnalyticsPage"));
const FollowingPage = lazyWithRetry(() => import("@/pages/Account/FollowingPage").then(m => ({ default: m.FollowingPage })));

// Lazy loaded - admin pages
const AdminDashboard = lazyWithRetry(() => import("@/pages/admin/Dashboard"));
const AdminLogin = lazyWithRetry(() => import("@/pages/admin/Login"));
const AdminAnalytics = lazyWithRetry(() => import("@/pages/admin/Analytics"));
const AdminIncome = lazyWithRetry(() => import("@/pages/admin/Income"));
const AdminIncomeSources = lazyWithRetry(() => import("@/pages/admin/IncomeSources"));
const AdminStaffActivity = lazyWithRetry(() => import("@/pages/admin/StaffActivity"));
const AdminDutyLogs = lazyWithRetry(() => import("@/pages/admin/DutyLogs"));
const AdminInternalMessages = lazyWithRetry(() => import("@/pages/admin/InternalMessages"));
const AdminProducts = lazyWithRetry(() => import("@/pages/admin/Products"));
const AdminCategories = lazyWithRetry(() => import("@/pages/admin/Categories"));
const AdminPromotions = lazyWithRetry(() => import("@/pages/admin/Promotions"));
const AdminOrders = lazyWithRetry(() => import("@/pages/admin/Orders"));
const AdminUsers = lazyWithRetry(() => import("@/pages/admin/Users"));
const AdminModerationQueue = lazyWithRetry(() => import("@/pages/admin/ModerationQueue"));
const AdminSettings = lazyWithRetry(() => import("@/pages/admin/Settings"));
const AdminDiscordSettings = lazyWithRetry(() => import("@/pages/admin/DiscordSettings"));
const AdminGameNewsFeeds = lazyWithRetry(() => import("@/pages/admin/GameNewsFeeds"));
const AdminRobloxSettings = lazyWithRetry(() => import("@/pages/admin/RobloxSettings"));
const AdminLiveChat = lazyWithRetry(() => import("@/pages/admin/LiveChat"));
const AdminApplications = lazyWithRetry(() => import("@/pages/admin/Applications"));
const AdminReviews = lazyWithRetry(() => import("@/pages/admin/Reviews"));
const AdminAuditLogs = lazyWithRetry(() => import("@/pages/admin/AuditLogs"));
const AdminIncidents = lazyWithRetry(() => import("@/pages/admin/Incidents"));
const AdminHelp = lazyWithRetry(() => import("@/pages/admin/Help"));
const AdminSubscribers = lazyWithRetry(() => import("@/pages/admin/Subscribers"));
const AdminIpBans = lazyWithRetry(() => import("@/pages/admin/IpBans"));
const AdminReferrals = lazyWithRetry(() => import("@/pages/admin/Referrals"));
const AdminAffiliates = lazyWithRetry(() => import("@/pages/admin/Affiliates"));
const AdminBotCodes = lazyWithRetry(() => import("@/pages/admin/BotCodes"));
const AdminBotRequests = lazyWithRetry(() => import("@/pages/admin/BotRequests"));
const AdminBotServers = lazyWithRetry(() => import("@/pages/admin/BotServers"));

const AdminCustomerTickets = lazyWithRetry(() => import("@/pages/admin/CustomerTickets"));
const AdminCustomerTicketDetail = lazyWithRetry(() => import("@/pages/admin/CustomerTicketDetail"));
const AdminArchivedApplications = lazyWithRetry(() => import("@/pages/admin/ArchivedApplications"));
const AdminJobChannels = lazyWithRetry(() => import("@/pages/admin/JobChannels"));
const AdminStaffDirectory = lazyWithRetry(() => import("@/pages/admin/StaffDirectory"));
const AdminStaffProfile = lazyWithRetry(() => import("@/pages/admin/StaffProfile"));
const AdminAffiliateApplications = lazyWithRetry(() => import("@/pages/admin/AffiliateApplications"));
const AdminStoreApplications = lazyWithRetry(() => import("@/pages/admin/StoreApplications"));
const AdminSellerProductReview = lazyWithRetry(() => import("@/pages/admin/SellerProductReview"));
const AdminSEOIndexing = lazyWithRetry(() => import("@/pages/admin/SEOIndexing"));
const AdminSellerProductsAll = lazyWithRetry(() => import("@/pages/admin/SellerProductsAll"));
const AdminSellerPayouts = lazyWithRetry(() => import("@/pages/admin/SellerPayouts"));
const AdminSellerRecruitment = lazyWithRetry(() => import("@/pages/admin/SellerRecruitment"));
const AdminSellerCommissions = lazyWithRetry(() => import("@/pages/admin/SellerCommissions"));
const AdminSellerStoreDetail = lazyWithRetry(() => import("@/pages/admin/SellerStoreDetail"));
const AdminSellerAgreements = lazyWithRetry(() => import("@/pages/admin/SellerAgreements"));
const AdminStaffDocuments = lazyWithRetry(() => import("@/pages/admin/StaffDocuments"));
const AdminPublicDocuments = lazyWithRetry(() => import("@/pages/admin/PublicDocuments"));
const AdminSellerDocuments = lazyWithRetry(() => import("@/pages/admin/SellerDocuments"));
const AdminManualPayouts = lazyWithRetry(() => import("@/pages/admin/ManualPayouts"));
const AdminSellerTickets = lazyWithRetry(() => import("@/pages/admin/SellerTickets"));
const AdminRolePermissions = lazyWithRetry(() => import("@/pages/admin/RolePermissions"));

const AdminCommunityAnnouncements = lazyWithRetry(() => import("@/pages/admin/CommunityAnnouncements"));
const AdminDiscordPolls = lazyWithRetry(() => import("@/pages/admin/DiscordPolls"));
const AdminDiscordQOTD = lazyWithRetry(() => import("@/pages/admin/DiscordQOTD"));
const AdminTranscripts = lazyWithRetry(() => import("@/pages/admin/Transcripts"));
const AdminEmailTemplates = lazyWithRetry(() => import("@/pages/admin/EmailTemplates"));
const AdminRefunds = lazyWithRetry(() => import("@/pages/admin/Refunds"));
const AdminDisputes = lazyWithRetry(() => import("@/pages/admin/Disputes"));
const AdminAdvertisementAnalytics = lazyWithRetry(() => import("@/pages/admin/AdvertisementAnalytics"));
const AdminGiftCredits = lazyWithRetry(() => import("@/pages/admin/GiftCredits"));
const AdminIPReports = lazyWithRetry(() => import("@/pages/admin/IPReports"));

const AdminDeveloperSubmissions = lazyWithRetry(() => import("@/pages/admin/DeveloperSubmissions"));
const AdminDeveloperPayments = lazyWithRetry(() => import("@/pages/admin/DeveloperPayments"));
const AdminDeveloperPaymentDetail = lazyWithRetry(() => import("@/pages/admin/DeveloperPaymentDetail"));
const AdminGDPRCompliance = lazyWithRetry(() => import("@/pages/admin/GDPRCompliance"));

const AdminPortalBotSetup = lazyWithRetry(() => import("@/pages/admin/PortalBotSetup"));
const AdminBotDashboard = lazyWithRetry(() => import("@/pages/admin/AdminBotDashboard"));
const AdminTwitterPosts = lazyWithRetry(() => import("@/pages/admin/TwitterPosts"));
const AdminYouTubePodcasts = lazyWithRetry(() => import("@/pages/admin/YouTubePodcasts"));

// Standalone bot dashboard pages
const BotOverviewPage = lazyWithRetry(() => import("@/pages/bot/BotOverview"));
const BotServersPage = lazyWithRetry(() => import("@/pages/bot/BotServers"));
const BotCommandsPage = lazyWithRetry(() => import("@/pages/bot/BotCommands"));
const BotRolesPage = lazyWithRetry(() => import("@/pages/bot/BotRoles"));
const BotActionsPage = lazyWithRetry(() => import("@/pages/bot/BotActions"));
const BotSettingsPage = lazyWithRetry(() => import("@/pages/bot/BotSettings"));
const BotModerationPage = lazyWithRetry(() => import("@/pages/bot/BotModeration"));
const BotAnalyticsPage = lazyWithRetry(() => import("@/pages/bot/BotAnalytics"));
const BotLogsPage = lazyWithRetry(() => import("@/pages/bot/BotLogs"));
const BotAutoModPage = lazyWithRetry(() => import("@/pages/bot/BotAutoMod"));
const BotReactionRolesPage = lazyWithRetry(() => import("@/pages/bot/BotReactionRoles"));
const BotCustomCommandsPage = lazyWithRetry(() => import("@/pages/bot/BotCustomCommands"));
const BotCommunityPage = lazyWithRetry(() => import("@/pages/bot/BotCommunity"));
const AdminInternalNotes = lazyWithRetry(() => import("@/pages/admin/InternalNotes"));
const AdminRevenueHub = lazyWithRetry(() => import("@/pages/admin/RevenueHub"));
const AdminPayoutsHub = lazyWithRetry(() => import("@/pages/admin/PayoutsHub"));
const AdminDisputesRefundsHub = lazyWithRetry(() => import("@/pages/admin/DisputesRefundsHub"));
const AdminAffiliateHub = lazyWithRetry(() => import("@/pages/admin/AffiliateHub"));
const AdminPlatformLedger = lazyWithRetry(() => import("@/pages/admin/PlatformLedger"));
const AdminCustomDomains = lazyWithRetry(() => import("@/pages/admin/CustomDomains"));


// Seller pages
const SellerDashboard = lazyWithRetry(() => import("@/pages/seller/SellerDashboard"));
const SellerSetup = lazyWithRetry(() => import("@/pages/seller/SellerSetup"));
const SellerProducts = lazyWithRetry(() => import("@/pages/seller/SellerProducts"));
const SellerProductEditor = lazyWithRetry(() => import("@/pages/seller/SellerProductEditor"));
const SellerOrders = lazyWithRetry(() => import("@/pages/seller/SellerOrders"));
const SellerBalance = lazyWithRetry(() => import("@/pages/seller/SellerBalance"));
const SellerRevenueBreakdown = lazyWithRetry(() => import("@/pages/seller/SellerRevenueBreakdown"));
const SellerTransactionHistory = lazyWithRetry(() => import("@/pages/seller/SellerTransactionHistory"));
const SellerTaxFeeSummary = lazyWithRetry(() => import("@/pages/seller/SellerTaxFeeSummary"));
const SellerStoreTabs = lazyWithRetry(() => import("@/pages/seller/SellerStoreTabs"));
const SellerCategories = lazyWithRetry(() => import("@/pages/seller/SellerCategories"));
const SellerDiscounts = lazyWithRetry(() => import("@/pages/seller/SellerDiscounts"));

const SellerAnnouncements = lazyWithRetry(() => import("@/pages/seller/SellerAnnouncements"));
const SellerRefunds = lazyWithRetry(() => import("@/pages/seller/SellerRefunds"));
const SellerFlashSales = lazyWithRetry(() => import("@/pages/seller/SellerFlashSales"));
const SellerBundles = lazyWithRetry(() => import("@/pages/seller/SellerBundles"));
const SellerNotifications = lazyWithRetry(() => import("@/pages/seller/SellerNotifications"));
const SellerCustomSections = lazyWithRetry(() => import("@/pages/seller/SellerCustomSections"));
const SellerAnalytics = lazyWithRetry(() => import("@/pages/seller/SellerAnalytics"));
const SellerDocuments = lazyWithRetry(() => import("@/pages/seller/SellerDocuments"));
const SellerTermsOfService = lazyWithRetry(() => import("@/pages/seller/SellerTermsOfService"));
const SellerGuide = lazyWithRetry(() => import("@/pages/seller/SellerGuide"));
const ProductListingGuide = lazyWithRetry(() => import("@/pages/seller/documents/ProductListingGuide"));
const PayoutsFinanceGuide = lazyWithRetry(() => import("@/pages/seller/documents/PayoutsFinanceGuide"));
const StoreSetupGuide = lazyWithRetry(() => import("@/pages/seller/documents/StoreSetupGuide"));
const IntegrationsGuide = lazyWithRetry(() => import("@/pages/seller/documents/IntegrationsGuide"));
const CommunityGuidelines = lazyWithRetry(() => import("@/pages/seller/documents/CommunityGuidelines"));
const SellerFAQ = lazyWithRetry(() => import("@/pages/seller/documents/SellerFAQ"));
const SellerSettingsProfile = lazyWithRetry(() => import("@/pages/seller/SellerSettingsProfile"));
const SellerSettingsAppearance = lazyWithRetry(() => import("@/pages/seller/SellerSettingsAppearance"));
const SellerSettingsTeam = lazyWithRetry(() => import("@/pages/seller/SellerSettingsTeam"));
const AcceptTeamInvite = lazyWithRetry(() => import("@/pages/seller/AcceptTeamInvite"));
const SellerSettingsPayments = lazyWithRetry(() => import("@/pages/seller/SellerSettingsPayments"));
const SellerSettingsNotifications = lazyWithRetry(() => import("@/pages/seller/SellerSettingsNotifications"));
const SellerSettingsRoblox = lazyWithRetry(() => import("@/pages/seller/SellerSettingsRoblox"));
const SellerSupport = lazyWithRetry(() => import("@/pages/seller/SellerSupport"));
const SellerMessages = lazyWithRetry(() => import("@/pages/seller/SellerMessages"));
const SellerReviews = lazyWithRetry(() => import("@/pages/seller/SellerReviews"));
const SellerDiscord = lazyWithRetry(() => import("@/pages/seller/SellerDiscord"));
const SellerBots = lazyWithRetry(() => import("@/pages/seller/SellerBots"));
const SellerImport = lazyWithRetry(() => import("@/pages/seller/SellerImport"));
const SellerPromotions = lazyWithRetry(() => import("@/pages/seller/SellerPromotions"));
const SellerTaxSummary = lazyWithRetry(() => import("@/pages/seller/SellerTaxSummary"));
const SellerSettingsDomain = lazyWithRetry(() => import("@/pages/seller/SellerSettingsDomain"));
const SellerStorePages = lazyWithRetry(() => import("@/pages/seller/SellerStorePages"));
const SellerStoreBuilder = lazyWithRetry(() => import("@/pages/seller/SellerStoreBuilder"));
const SellerProPage = lazyWithRetry(() => import("@/pages/seller/SellerProPage"));
const SellerFinanceHub = lazyWithRetry(() => import("@/pages/seller/SellerFinanceHub"));
const SellerCustomerInsights = lazyWithRetry(() => import("@/pages/seller/SellerCustomerInsights"));
const SellerCampaigns = lazyWithRetry(() => import("@/pages/seller/SellerCampaigns"));
const SellerGoals = lazyWithRetry(() => import("@/pages/seller/SellerGoals"));

// Product comparison page
const Compare = lazyWithRetry(() => import("@/pages/Compare"));

// Store custom page
const StoreCustomPage = lazyWithRetry(() => import("@/pages/StoreCustomPage"));

// Store standalone page for custom domains
const StoreStandalonePage = lazyWithRetry(() => import("@/pages/StoreStandalonePage"));


// Public pages
const StorePage = lazyWithRetry(() => import("@/pages/StorePage"));
const StoreAbout = lazyWithRetry(() => import("@/pages/StoreAbout"));
const StoreReviewsPage = lazyWithRetry(() => import("@/pages/StoreReviewsPage"));
const Wishlist = lazyWithRetry(() => import("@/pages/Wishlist"));
const StoreMessages = lazyWithRetry(() => import("@/pages/StoreMessages"));

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

/**
 * Main app routes - checks subdomain first and routes accordingly
 */
/** Hook that bumps a counter when the app resumes from background (Safari/iOS) */
function useResumeCounter() {
  const [counter, setCounter] = useState(0);

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        setCounter(c => c + 1);
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, []);

  return counter;
}

export function AppRoutes() {
  const hostname = window.location.hostname;
  const isGlobalGuardDomain = hostname.startsWith('guard.') || hostname === 'guard.eclipserblx.com';
  const { isCustomStoreDomain, loading: domainLoading } = useStoreDomain();
  const location = useLocation();
  const resumeCounter = useResumeCounter();

  // Combine location key + resume counter so the boundary resets on nav or app resume
  const boundaryResetKey = `${location.key}-${resumeCounter}`;

  // If on Global Guard subdomain, render the Global Guard app
  if (isGlobalGuardDomain) {
    return (
      <Suspense fallback={<PageLoader />}>
        <GlobalGuardRouter />
      </Suspense>
    );
  }

  // If on a store custom domain/subdomain, render standalone store
  if (isCustomStoreDomain) {
    if (domainLoading) return <PageLoader />;
    return (
      <Suspense fallback={<PageLoader />}>
        <StoreStandalonePage />
      </Suspense>
    );
  }

  // Otherwise render the main app routes
  return (
    <RouteErrorBoundary resetKey={boundaryResetKey}>
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/auth/discord/callback" element={<AuthDiscordCallback />} />
        <Route path="/auth/roblox/callback" element={<AuthRobloxCallback />} />
        <Route path="/complete-profile" element={<CompleteProfile />} />
        <Route path="/account" element={<Account />} />
        <Route path="/messages" element={<Messages />} />
        <Route path="/purchases" element={<MyPurchases />} />
        <Route path="/downloads" element={<MyPurchases />} />
        <Route path="/orders" element={<MyPurchases />} />
        <Route path="/products" element={<Products />} />
        <Route path="/search" element={<SearchResults />} />
        <Route path="/free" element={<FreeAssets />} />
        <Route path="/featured" element={<Featured />} />
        <Route path="/categories" element={<Categories />} />
        
        <Route path="/product/:productNumber" element={<ProductDetail />} />
        <Route path="/products/:productNumber" element={<ProductDetail />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/order-success" element={<OrderSuccess />} />
        <Route path="/chat-history" element={<ChatHistory />} />
        <Route path="/support/tickets" element={<SupportTickets />} />
        <Route path="/support/tickets/:ticketId" element={<SupportTicketDetail />} />
        <Route path="/jobs" element={<Jobs />} />
        <Route path="/refunds" element={<RefundPolicy />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<TermsOfService />} />
        <Route path="/dmca" element={<DMCA />} />
        <Route path="/faq" element={<FAQ />} />
        <Route path="/help-center" element={<HelpCenter />} />
        <Route path="/help-center/buyers" element={<HelpCenterBuyers />} />
        <Route path="/help-center/sellers" element={<HelpCenterSellers />} />
        <Route path="/support" element={<Support />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/status" element={<Status />} />
        <Route path="/bot-installation" element={<BotInstallation />} />
        <Route path="/bot-dashboard" element={<BotDashboard />} />
        <Route path="/notifications" element={<NotificationPreferences />} />
        
        <Route path="/marketplace" element={<Products />} />
        <Route path="/stores" element={<AllStores />} />
        <Route path="/affiliate" element={<Affiliate />} />
        
        <Route path="/advertise" element={<Advertise />} />
        <Route path="/credits" element={<Credits />} />
        <Route path="/sell" element={<Sell />} />
        <Route path="/become-seller" element={<BecomeSellerWizard />} />
        <Route path="/account/advertisements" element={<MyAdvertisementsPage />} />
        <Route path="/account/ad-analytics" element={<AdAnalyticsPage />} />
        <Route path="/account/following" element={<FollowingPage />} />
        <Route path="/support/chat" element={<LiveChat />} />
        {/* Legacy compatibility redirect */}
        <Route path="/live-chat" element={<Navigate to="/support/chat" replace />} />
        <Route path="/wishlist" element={<Wishlist />} />
        <Route path="/compare" element={<Compare />} />
        <Route path="/store-messages" element={<StoreMessages />} />
        {/* Seller routes */}
        <Route path="/seller" element={<SellerDashboard />} />
        <Route path="/seller/setup" element={<SellerSetup />} />
        <Route path="/seller/analytics" element={<SellerAnalytics />} />
        <Route path="/seller/products" element={<SellerProducts />} />
        <Route path="/seller/bots" element={<SellerBots />} />
        <Route path="/seller/products/new" element={<SellerProductEditor />} />
        <Route path="/seller/products/:productId/edit" element={<SellerProductEditor />} />
        <Route path="/seller/orders" element={<SellerOrders />} />
        <Route path="/seller/finance" element={<SellerFinanceHub />} />
        <Route path="/seller/balance" element={<Navigate to="/seller/finance?tab=overview" replace />} />
        <Route path="/seller/revenue" element={<Navigate to="/seller/finance?tab=revenue" replace />} />
        <Route path="/seller/transactions" element={<Navigate to="/seller/finance?tab=transactions" replace />} />
        <Route path="/seller/fees" element={<Navigate to="/seller/finance?tab=fees" replace />} />
        <Route path="/seller/tax-summary" element={<Navigate to="/seller/finance?tab=tax" replace />} />
        <Route path="/seller/tabs" element={<SellerStoreTabs />} />
        <Route path="/seller/store-builder" element={<SellerStoreBuilder />} />
        <Route path="/seller/categories" element={<SellerCategories />} />
        <Route path="/seller/discounts" element={<SellerDiscounts />} />
        
        <Route path="/seller/announcements" element={<SellerAnnouncements />} />
        <Route path="/seller/refunds" element={<SellerRefunds />} />
        <Route path="/seller/flash-sales" element={<SellerFlashSales />} />
        <Route path="/seller/bundles" element={<SellerBundles />} />
        <Route path="/seller/notifications" element={<SellerNotifications />} />
        <Route path="/seller/custom-sections" element={<SellerCustomSections />} />
        <Route path="/seller/documents" element={<SellerDocuments />} />
        <Route path="/seller/documents/terms" element={<SellerTermsOfService />} />
        <Route path="/seller/documents/guide" element={<SellerGuide />} />
        <Route path="/seller/documents/product-listing" element={<ProductListingGuide />} />
        <Route path="/seller/documents/payouts-finance" element={<PayoutsFinanceGuide />} />
        <Route path="/seller/documents/store-setup" element={<StoreSetupGuide />} />
        <Route path="/seller/documents/integrations" element={<IntegrationsGuide />} />
        <Route path="/seller/documents/community-guidelines" element={<CommunityGuidelines />} />
        <Route path="/seller/documents/faq" element={<SellerFAQ />} />
        
        <Route path="/seller/settings/profile" element={<SellerSettingsProfile />} />
        <Route path="/seller/settings/appearance" element={<SellerSettingsAppearance />} />
        <Route path="/seller/settings/team" element={<SellerSettingsTeam />} />
        <Route path="/seller/team/accept" element={<AcceptTeamInvite />} />
        <Route path="/seller/settings/payments" element={<SellerSettingsPayments />} />
        <Route path="/seller/settings/notifications" element={<SellerSettingsNotifications />} />
        <Route path="/seller/roblox" element={<SellerSettingsRoblox />} />
        <Route path="/seller/settings/domain" element={<SellerSettingsDomain />} />
        <Route path="/seller/support" element={<SellerSupport />} />
        <Route path="/seller/messages" element={<SellerMessages />} />
        <Route path="/seller/reviews" element={<SellerReviews />} />
        <Route path="/seller/discord" element={<SellerDiscord />} />
        <Route path="/seller/import" element={<SellerImport />} />
        <Route path="/seller/promote" element={<SellerPromotions />} />
        <Route path="/seller/store-pages" element={<SellerStorePages />} />
        <Route path="/seller/pro" element={<SellerProPage />} />
        <Route path="/seller/customer-insights" element={<SellerCustomerInsights />} />
        <Route path="/seller/campaigns" element={<SellerCampaigns />} />
        <Route path="/seller/goals" element={<SellerGoals />} />
        {/* Public store page */}
        <Route path="/store/:storeSlug" element={<StorePage />} />
        <Route path="/store/:storeSlug/reviews" element={<StoreReviewsPage />} />
        <Route path="/store/:storeSlug/about" element={<StoreAbout />} />
        <Route path="/store/:storeSlug/page/:pageSlug" element={<StoreCustomPage />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/analytics" element={<AdminAnalytics />} />
        {/* Finance Hub routes */}
        <Route path="/admin/revenue" element={<AdminRevenueHub />} />
        <Route path="/admin/payouts" element={<AdminPayoutsHub />} />
        <Route path="/admin/disputes-refunds" element={<AdminDisputesRefundsHub />} />
        <Route path="/admin/affiliate-hub" element={<AdminAffiliateHub />} />
        {/* Legacy redirects for old finance routes */}
        <Route path="/admin/income" element={<Navigate to="/admin/revenue?tab=overview" replace />} />
        <Route path="/admin/income-sources" element={<Navigate to="/admin/revenue?tab=sources" replace />} />
        <Route path="/admin/staff-activity" element={<AdminStaffActivity />} />
        <Route path="/admin/duty-logs" element={<AdminDutyLogs />} />
        <Route path="/admin/staff-messages" element={<AdminStaffMessages />} />
        <Route path="/admin/admin-chat" element={<AdminChat />} />
        {/* Legacy compatibility redirect */}
        <Route path="/admin/chat" element={<Navigate to="/admin/admin-chat" replace />} />
        <Route path="/admin/products" element={<AdminProducts />} />
        <Route path="/admin/categories" element={<AdminCategories />} />
        <Route path="/admin/promotions" element={<AdminPromotions />} />
        <Route path="/admin/orders" element={<AdminOrders />} />
        <Route path="/admin/refunds" element={<Navigate to="/admin/disputes-refunds?tab=refunds" replace />} />
        <Route path="/admin/disputes" element={<Navigate to="/admin/disputes-refunds?tab=disputes" replace />} />
        <Route path="/admin/users" element={<AdminUsers />} />
        <Route path="/admin/moderation-queue" element={<AdminModerationQueue />} />
        <Route path="/admin/settings" element={<AdminSettings />} />
        <Route path="/admin/discord-settings" element={<AdminDiscordSettings />} />
        <Route path="/admin/game-news-feeds" element={<AdminGameNewsFeeds />} />
        <Route path="/admin/roblox-settings" element={<AdminRobloxSettings />} />
        <Route path="/admin/live-chat" element={<AdminLiveChat />} />
        <Route path="/admin/applications" element={<AdminApplications />} />
        <Route path="/admin/reviews" element={<AdminReviews />} />
        <Route path="/admin/audit-logs" element={<AdminAuditLogs />} />
        <Route path="/admin/incidents" element={<AdminIncidents />} />
        <Route path="/admin/help" element={<AdminHelp />} />
        <Route path="/admin/subscribers" element={<AdminSubscribers />} />
        <Route path="/admin/ip-bans" element={<AdminIpBans />} />
        <Route path="/admin/referrals" element={<Navigate to="/admin/affiliate-hub?tab=referrals" replace />} />
        <Route path="/admin/affiliates" element={<Navigate to="/admin/affiliate-hub?tab=overview" replace />} />
        <Route path="/admin/bot-codes" element={<Navigate to="/bot/settings?tab=license-codes" replace />} />
        <Route path="/admin/bot-requests" element={<AdminBotRequests />} />
        <Route path="/admin/bot-servers" element={<Navigate to="/bot/servers" replace />} />
        
        <Route path="/admin/customer-tickets" element={<AdminCustomerTickets />} />
        <Route path="/admin/customer-tickets/:ticketId" element={<AdminCustomerTicketDetail />} />
        <Route path="/admin/archived-applications" element={<AdminArchivedApplications />} />
        <Route path="/admin/job-channels" element={<AdminJobChannels />} />
        <Route path="/admin/staff-directory" element={<AdminStaffDirectory />} />
        <Route path="/admin/staff/:userId" element={<AdminStaffProfile />} />
        <Route path="/admin/affiliate-applications" element={<Navigate to="/admin/affiliate-hub?tab=applications" replace />} />
        <Route path="/admin/store-applications" element={<AdminStoreApplications />} />
        <Route path="/admin/seller-product-review" element={<AdminSellerProductReview />} />
        <Route path="/admin/seo-indexing" element={<AdminSEOIndexing />} />
        <Route path="/admin/seller-products" element={<AdminSellerProductsAll />} />
        <Route path="/admin/seller-commissions" element={<AdminSellerCommissions />} />
        <Route path="/admin/seller-commissions/:storeId" element={<AdminSellerStoreDetail />} />
        <Route path="/admin/seller-payouts" element={<Navigate to="/admin/payouts?tab=seller" replace />} />
        <Route path="/admin/seller-agreements" element={<AdminSellerAgreements />} />
        <Route path="/admin/staff-documents" element={<AdminStaffDocuments />} />
        <Route path="/admin/public-documents" element={<AdminPublicDocuments />} />
        <Route path="/admin/seller-documents" element={<AdminSellerDocuments />} />
        <Route path="/admin/seller-recruitment" element={<AdminSellerRecruitment />} />
        <Route path="/admin/manual-payouts" element={<Navigate to="/admin/payouts?tab=manual" replace />} />
        <Route path="/admin/seller-tickets" element={<AdminSellerTickets />} />
        <Route path="/admin/role-permissions" element={<AdminRolePermissions />} />
        
        <Route path="/admin/community-announcements" element={<AdminCommunityAnnouncements />} />
        <Route path="/admin/discord-polls" element={<AdminDiscordPolls />} />
        <Route path="/admin/discord-qotd" element={<AdminDiscordQOTD />} />
        <Route path="/admin/transcripts" element={<AdminTranscripts />} />
        <Route path="/admin/email-templates" element={<AdminEmailTemplates />} />
        <Route path="/admin/advertisement-analytics" element={<AdminAdvertisementAnalytics />} />
        <Route path="/admin/gift-credits" element={<AdminGiftCredits />} />
        <Route path="/admin/ip-reports" element={<AdminIPReports />} />
        
        <Route path="/admin/developer-submissions" element={<AdminDeveloperSubmissions />} />
        <Route path="/admin/developer-payments" element={<Navigate to="/admin/payouts?tab=developer" replace />} />
        <Route path="/admin/developer-payments/:id" element={<AdminDeveloperPaymentDetail />} />
        <Route path="/admin/gdpr-compliance" element={<AdminGDPRCompliance />} />
        <Route path="/admin/botghost-setup" element={<Navigate to="/bot/settings" replace />} />
        <Route path="/admin/portal-bot-setup" element={<AdminPortalBotSetup />} />
        <Route path="/admin/bot-control" element={<AdminBotDashboard />} />
        {/* Standalone bot dashboard */}
        <Route path="/bot" element={<BotOverviewPage />} />
        <Route path="/bot/servers" element={<BotServersPage />} />
        <Route path="/bot/commands" element={<BotCommandsPage />} />
        <Route path="/bot/moderation" element={<BotModerationPage />} />
        <Route path="/bot/roles" element={<BotRolesPage />} />
        <Route path="/bot/actions" element={<BotActionsPage />} />
        <Route path="/bot/analytics" element={<BotAnalyticsPage />} />
        <Route path="/bot/settings" element={<BotSettingsPage />} />
        <Route path="/bot/logs" element={<BotLogsPage />} />
        <Route path="/bot/automod" element={<BotAutoModPage />} />
        <Route path="/bot/reaction-roles" element={<BotReactionRolesPage />} />
        <Route path="/bot/custom-commands" element={<BotCustomCommandsPage />} />
        <Route path="/bot/community" element={<BotCommunityPage />} />
        <Route path="/admin/twitter-posts" element={<AdminTwitterPosts />} />
        <Route path="/admin/youtube-podcasts" element={<AdminYouTubePodcasts />} />
        <Route path="/admin/internal-notes" element={<AdminInternalNotes />} />
        <Route path="/admin/platform-ledger" element={<AdminPlatformLedger />} />
        <Route path="/admin/custom-domains" element={<AdminCustomDomains />} />
        {/* Global Guard routes (path-based instead of subdomain) */}
        <Route path="/guard/*" element={<GlobalGuardRouter />} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
    </RouteErrorBoundary>
  );
}
