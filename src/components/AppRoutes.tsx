import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";

// Lazy load Global Guard router for /guard path
const GlobalGuardRouter = lazy(() => import("@/components/global-guard/GlobalGuardRouter").then(m => ({ default: m.GlobalGuardRouter })));

// Eagerly loaded - critical path
import Index from "@/pages/Index";
import Auth from "@/pages/Auth";
import NotFound from "@/pages/NotFound";

// Lazy loaded - OAuth callbacks
const AuthDiscordCallback = lazy(() => import("@/pages/AuthDiscordCallback"));
const AuthRobloxCallback = lazy(() => import("@/pages/AuthRobloxCallback"));

// Lazy loaded - user pages
const Account = lazy(() => import("@/pages/Account"));
const MyPurchases = lazy(() => import("@/pages/MyPurchases"));
const Products = lazy(() => import("@/pages/Products"));
const Featured = lazy(() => import("@/pages/Featured"));
const Categories = lazy(() => import("@/pages/Categories"));
const AllStores = lazy(() => import("@/pages/AllStores"));

const ProductDetail = lazy(() => import("@/pages/ProductDetail"));
const Cart = lazy(() => import("@/pages/Cart"));
const Checkout = lazy(() => import("@/pages/Checkout"));
const OrderSuccess = lazy(() => import("@/pages/OrderSuccess"));
const ChatHistory = lazy(() => import("@/pages/ChatHistory"));
const SupportTickets = lazy(() => import("@/pages/SupportTickets"));
const SupportTicketDetail = lazy(() => import("@/pages/SupportTicketDetail"));
const Jobs = lazy(() => import("@/pages/Jobs"));
const RefundPolicy = lazy(() => import("@/pages/RefundPolicy"));
const PrivacyPolicy = lazy(() => import("@/pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("@/pages/TermsOfService"));
const DMCA = lazy(() => import("@/pages/DMCA"));
const FAQ = lazy(() => import("@/pages/FAQ"));
const Support = lazy(() => import("@/pages/Support"));
const Contact = lazy(() => import("@/pages/Contact"));
const Status = lazy(() => import("@/pages/Status"));
const BotInstallation = lazy(() => import("@/pages/BotInstallation"));
const BotDashboard = lazy(() => import("@/pages/BotDashboard"));
const NotificationPreferences = lazy(() => import("@/pages/NotificationPreferences"));
const EclipsePlus = lazy(() => import("@/pages/EclipsePlus"));

const LiveChat = lazy(() => import("@/pages/LiveChat"));
const Affiliate = lazy(() => import("@/pages/Affiliate"));
const Messages = lazy(() => import("@/pages/Messages"));
const Advertise = lazy(() => import("@/pages/Advertise"));
const Credits = lazy(() => import("@/pages/Credits"));
const MyAdvertisementsPage = lazy(() => import("@/pages/Account/MyAdvertisementsPage"));
const AdAnalyticsPage = lazy(() => import("@/pages/Account/AdAnalyticsPage"));
const FollowingPage = lazy(() => import("@/pages/Account/FollowingPage").then(m => ({ default: m.FollowingPage })));

// Lazy loaded - admin pages
const AdminDashboard = lazy(() => import("@/pages/admin/Dashboard"));
const AdminLogin = lazy(() => import("@/pages/admin/Login"));
const AdminAnalytics = lazy(() => import("@/pages/admin/Analytics"));
const AdminIncome = lazy(() => import("@/pages/admin/Income"));
const AdminStaffActivity = lazy(() => import("@/pages/admin/StaffActivity"));
const AdminStaffMessages = lazy(() => import("@/pages/admin/StaffMessages"));
const AdminChat = lazy(() => import("@/pages/admin/AdminChat"));
const AdminProducts = lazy(() => import("@/pages/admin/Products"));
const AdminCategories = lazy(() => import("@/pages/admin/Categories"));
const AdminPromotions = lazy(() => import("@/pages/admin/Promotions"));
const AdminOrders = lazy(() => import("@/pages/admin/Orders"));
const AdminUsers = lazy(() => import("@/pages/admin/Users"));
const AdminSettings = lazy(() => import("@/pages/admin/Settings"));
const AdminDiscordSettings = lazy(() => import("@/pages/admin/DiscordSettings"));
const AdminRobloxSettings = lazy(() => import("@/pages/admin/RobloxSettings"));
const AdminLiveChat = lazy(() => import("@/pages/admin/LiveChat"));
const AdminApplications = lazy(() => import("@/pages/admin/Applications"));
const AdminReviews = lazy(() => import("@/pages/admin/Reviews"));
const AdminAuditLogs = lazy(() => import("@/pages/admin/AuditLogs"));
const AdminIncidents = lazy(() => import("@/pages/admin/Incidents"));
const AdminHelp = lazy(() => import("@/pages/admin/Help"));
const AdminSubscribers = lazy(() => import("@/pages/admin/Subscribers"));
const AdminIpBans = lazy(() => import("@/pages/admin/IpBans"));
const AdminReferrals = lazy(() => import("@/pages/admin/Referrals"));
const AdminAffiliates = lazy(() => import("@/pages/admin/Affiliates"));
const AdminBotCodes = lazy(() => import("@/pages/admin/BotCodes"));
const AdminBotRequests = lazy(() => import("@/pages/admin/BotRequests"));
const AdminBotServers = lazy(() => import("@/pages/admin/BotServers"));
const AdminContactMessages = lazy(() => import("@/pages/admin/ContactMessages"));
const AdminCustomerTickets = lazy(() => import("@/pages/admin/CustomerTickets"));
const AdminCustomerTicketDetail = lazy(() => import("@/pages/admin/CustomerTicketDetail"));
const AdminArchivedApplications = lazy(() => import("@/pages/admin/ArchivedApplications"));
const AdminJobChannels = lazy(() => import("@/pages/admin/JobChannels"));
const AdminStaffDirectory = lazy(() => import("@/pages/admin/StaffDirectory"));
const AdminStaffProfile = lazy(() => import("@/pages/admin/StaffProfile"));
const AdminAffiliateApplications = lazy(() => import("@/pages/admin/AffiliateApplications"));
const AdminStoreApplications = lazy(() => import("@/pages/admin/StoreApplications"));
const AdminSellerProducts = lazy(() => import("@/pages/admin/SellerProducts"));
const AdminSellerPayouts = lazy(() => import("@/pages/admin/SellerPayouts"));
const AdminSellerRecruitment = lazy(() => import("@/pages/admin/SellerRecruitment"));
const AdminSellerCommissions = lazy(() => import("@/pages/admin/SellerCommissions"));
const AdminSellerStoreDetail = lazy(() => import("@/pages/admin/SellerStoreDetail"));
const AdminSellerAgreements = lazy(() => import("@/pages/admin/SellerAgreements"));
const AdminStaffDocuments = lazy(() => import("@/pages/admin/StaffDocuments"));
const AdminPublicDocuments = lazy(() => import("@/pages/admin/PublicDocuments"));
const AdminSellerDocuments = lazy(() => import("@/pages/admin/SellerDocuments"));
const AdminManualPayouts = lazy(() => import("@/pages/admin/ManualPayouts"));
const AdminSellerTickets = lazy(() => import("@/pages/admin/SellerTickets"));
const AdminRolePermissions = lazy(() => import("@/pages/admin/RolePermissions"));
const AdminDiscordModmail = lazy(() => import("@/pages/admin/DiscordModmail"));
const AdminCommunityAnnouncements = lazy(() => import("@/pages/admin/CommunityAnnouncements"));
const AdminDiscordPolls = lazy(() => import("@/pages/admin/DiscordPolls"));
const AdminDiscordQOTD = lazy(() => import("@/pages/admin/DiscordQOTD"));
const AdminTranscripts = lazy(() => import("@/pages/admin/Transcripts"));
const AdminDiscordOutreach = lazy(() => import("@/pages/admin/DiscordOutreach"));
const AdminDiscordOutreachDetail = lazy(() => import("@/pages/admin/DiscordOutreachDetail"));
const AdminEmailTemplates = lazy(() => import("@/pages/admin/EmailTemplates"));
const AdminRefunds = lazy(() => import("@/pages/admin/Refunds"));
const AdminDisputes = lazy(() => import("@/pages/admin/Disputes"));
const AdminAdvertisementAnalytics = lazy(() => import("@/pages/admin/AdvertisementAnalytics"));
const AdminGiftCredits = lazy(() => import("@/pages/admin/GiftCredits"));
const AdminIPReports = lazy(() => import("@/pages/admin/IPReports"));
const AdminDeveloperSubmissions = lazy(() => import("@/pages/admin/DeveloperSubmissions"));
const AdminDeveloperPayments = lazy(() => import("@/pages/admin/DeveloperPayments"));
const AdminDeveloperPaymentDetail = lazy(() => import("@/pages/admin/DeveloperPaymentDetail"));
const AdminRecruiters = lazy(() => import("@/pages/admin/Recruiters"));
const AdminRecruiterApplications = lazy(() => import("@/pages/admin/RecruiterApplications"));
const AdminRecruiterPayouts = lazy(() => import("@/pages/admin/RecruiterPayouts"));
const AdminRecruiterCommissions = lazy(() => import("@/pages/admin/RecruiterCommissions"));

// Recruiter page
const Recruiter = lazy(() => import("@/pages/Recruiter"));

// Seller pages
const SellerDashboard = lazy(() => import("@/pages/seller/SellerDashboard"));
const SellerProducts = lazy(() => import("@/pages/seller/SellerProducts"));
const SellerProductEditor = lazy(() => import("@/pages/seller/SellerProductEditor"));
const SellerOrders = lazy(() => import("@/pages/seller/SellerOrders"));
const SellerBalance = lazy(() => import("@/pages/seller/SellerBalance"));
const SellerRevenueBreakdown = lazy(() => import("@/pages/seller/SellerRevenueBreakdown"));
const SellerTransactionHistory = lazy(() => import("@/pages/seller/SellerTransactionHistory"));
const SellerTaxFeeSummary = lazy(() => import("@/pages/seller/SellerTaxFeeSummary"));
const SellerStoreTabs = lazy(() => import("@/pages/seller/SellerStoreTabs"));
const SellerCategories = lazy(() => import("@/pages/seller/SellerCategories"));
const SellerDiscounts = lazy(() => import("@/pages/seller/SellerDiscounts"));

const SellerAnnouncements = lazy(() => import("@/pages/seller/SellerAnnouncements"));
const SellerRefunds = lazy(() => import("@/pages/seller/SellerRefunds"));
const SellerFlashSales = lazy(() => import("@/pages/seller/SellerFlashSales"));
const SellerBundles = lazy(() => import("@/pages/seller/SellerBundles"));
const SellerNotifications = lazy(() => import("@/pages/seller/SellerNotifications"));
const SellerCustomSections = lazy(() => import("@/pages/seller/SellerCustomSections"));
const SellerAnalytics = lazy(() => import("@/pages/seller/SellerAnalytics"));
const SellerDocuments = lazy(() => import("@/pages/seller/SellerDocuments"));
const SellerTermsOfService = lazy(() => import("@/pages/seller/SellerTermsOfService"));
const SellerGuide = lazy(() => import("@/pages/seller/SellerGuide"));
const ProductListingGuide = lazy(() => import("@/pages/seller/documents/ProductListingGuide"));
const PayoutsFinanceGuide = lazy(() => import("@/pages/seller/documents/PayoutsFinanceGuide"));
const StoreSetupGuide = lazy(() => import("@/pages/seller/documents/StoreSetupGuide"));
const IntegrationsGuide = lazy(() => import("@/pages/seller/documents/IntegrationsGuide"));
const CommunityGuidelines = lazy(() => import("@/pages/seller/documents/CommunityGuidelines"));
const SellerFAQ = lazy(() => import("@/pages/seller/documents/SellerFAQ"));
const SellerSettingsProfile = lazy(() => import("@/pages/seller/SellerSettingsProfile"));
const SellerSettingsAppearance = lazy(() => import("@/pages/seller/SellerSettingsAppearance"));
const SellerSettingsTeam = lazy(() => import("@/pages/seller/SellerSettingsTeam"));
const SellerSettingsPayments = lazy(() => import("@/pages/seller/SellerSettingsPayments"));
const SellerSettingsNotifications = lazy(() => import("@/pages/seller/SellerSettingsNotifications"));
const SellerSettingsRoblox = lazy(() => import("@/pages/seller/SellerSettingsRoblox"));
const SellerSupport = lazy(() => import("@/pages/seller/SellerSupport"));
const SellerMessages = lazy(() => import("@/pages/seller/SellerMessages"));
const SellerReviews = lazy(() => import("@/pages/seller/SellerReviews"));
const SellerDiscord = lazy(() => import("@/pages/seller/SellerDiscord"));
const SellerBots = lazy(() => import("@/pages/seller/SellerBots"));
const SellerImport = lazy(() => import("@/pages/seller/SellerImport"));

// Public pages
const StorePage = lazy(() => import("@/pages/StorePage"));
const StoreAbout = lazy(() => import("@/pages/StoreAbout"));
const StoreReviewsPage = lazy(() => import("@/pages/StoreReviewsPage"));
const Wishlist = lazy(() => import("@/pages/Wishlist"));
const StoreMessages = lazy(() => import("@/pages/StoreMessages"));

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

/**
 * Main app routes - checks subdomain first and routes accordingly
 */
export function AppRoutes() {
  const hostname = window.location.hostname;
  const isGlobalGuardDomain = hostname.startsWith('guard.') || hostname === 'guard.eclipserblx.com';

  // If on Global Guard subdomain, render the Global Guard app
  if (isGlobalGuardDomain) {
    return (
      <Suspense fallback={<PageLoader />}>
        <GlobalGuardRouter />
      </Suspense>
    );
  }

  // Otherwise render the main app routes
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/auth/discord/callback" element={<AuthDiscordCallback />} />
        <Route path="/auth/roblox/callback" element={<AuthRobloxCallback />} />
        <Route path="/account" element={<Account />} />
        <Route path="/messages" element={<Messages />} />
        <Route path="/purchases" element={<MyPurchases />} />
        <Route path="/downloads" element={<MyPurchases />} />
        <Route path="/orders" element={<MyPurchases />} />
        <Route path="/products" element={<Products />} />
        <Route path="/featured" element={<Featured />} />
        <Route path="/categories" element={<Categories />} />
        
        <Route path="/products/:slug" element={<ProductDetail />} />
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
        <Route path="/support" element={<Support />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/status" element={<Status />} />
        <Route path="/bot-installation" element={<BotInstallation />} />
        <Route path="/bot-dashboard" element={<BotDashboard />} />
        <Route path="/notifications" element={<NotificationPreferences />} />
        <Route path="/eclipse-plus" element={<EclipsePlus />} />
        <Route path="/marketplace" element={<Navigate to="/" replace />} />
        <Route path="/stores" element={<AllStores />} />
        <Route path="/affiliate" element={<Affiliate />} />
        <Route path="/recruiter" element={<Recruiter />} />
        <Route path="/advertise" element={<Advertise />} />
        <Route path="/credits" element={<Credits />} />
        <Route path="/account/advertisements" element={<MyAdvertisementsPage />} />
        <Route path="/account/ad-analytics" element={<AdAnalyticsPage />} />
        <Route path="/account/following" element={<FollowingPage />} />
        <Route path="/support/chat" element={<LiveChat />} />
        <Route path="/wishlist" element={<Wishlist />} />
        <Route path="/store-messages" element={<StoreMessages />} />
        {/* Seller routes */}
        <Route path="/seller" element={<SellerDashboard />} />
        <Route path="/seller/analytics" element={<SellerAnalytics />} />
        <Route path="/seller/products" element={<SellerProducts />} />
        <Route path="/seller/bots" element={<SellerBots />} />
        <Route path="/seller/products/new" element={<SellerProductEditor />} />
        <Route path="/seller/products/:productId/edit" element={<SellerProductEditor />} />
        <Route path="/seller/orders" element={<SellerOrders />} />
        <Route path="/seller/balance" element={<SellerBalance />} />
        <Route path="/seller/revenue" element={<SellerRevenueBreakdown />} />
        <Route path="/seller/transactions" element={<SellerTransactionHistory />} />
        <Route path="/seller/fees" element={<SellerTaxFeeSummary />} />
        <Route path="/seller/tabs" element={<SellerStoreTabs />} />
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
        <Route path="/seller/settings/payments" element={<SellerSettingsPayments />} />
        <Route path="/seller/settings/notifications" element={<SellerSettingsNotifications />} />
        <Route path="/seller/roblox" element={<SellerSettingsRoblox />} />
        <Route path="/seller/support" element={<SellerSupport />} />
        <Route path="/seller/messages" element={<SellerMessages />} />
        <Route path="/seller/reviews" element={<SellerReviews />} />
        <Route path="/seller/discord" element={<SellerDiscord />} />
        <Route path="/seller/import" element={<SellerImport />} />
        {/* Public store page */}
        <Route path="/store/:storeSlug" element={<StorePage />} />
        <Route path="/store/:storeSlug/reviews" element={<StoreReviewsPage />} />
        <Route path="/store/:slug/about" element={<StoreAbout />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/analytics" element={<AdminAnalytics />} />
        <Route path="/admin/income" element={<AdminIncome />} />
        <Route path="/admin/staff-activity" element={<AdminStaffActivity />} />
        <Route path="/admin/staff-messages" element={<AdminStaffMessages />} />
        <Route path="/admin/admin-chat" element={<AdminChat />} />
        <Route path="/admin/products" element={<AdminProducts />} />
        <Route path="/admin/categories" element={<AdminCategories />} />
        <Route path="/admin/promotions" element={<AdminPromotions />} />
        <Route path="/admin/orders" element={<AdminOrders />} />
        <Route path="/admin/refunds" element={<AdminRefunds />} />
        <Route path="/admin/disputes" element={<AdminDisputes />} />
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
        <Route path="/admin/bot-servers" element={<AdminBotServers />} />
        <Route path="/admin/contact-messages" element={<AdminContactMessages />} />
        <Route path="/admin/customer-tickets" element={<AdminCustomerTickets />} />
        <Route path="/admin/customer-tickets/:ticketId" element={<AdminCustomerTicketDetail />} />
        <Route path="/admin/archived-applications" element={<AdminArchivedApplications />} />
        <Route path="/admin/job-channels" element={<AdminJobChannels />} />
        <Route path="/admin/staff-directory" element={<AdminStaffDirectory />} />
        <Route path="/admin/staff/:userId" element={<AdminStaffProfile />} />
        <Route path="/admin/affiliate-applications" element={<AdminAffiliateApplications />} />
        <Route path="/admin/store-applications" element={<AdminStoreApplications />} />
        <Route path="/admin/seller-products" element={<AdminSellerProducts />} />
        <Route path="/admin/seller-commissions" element={<AdminSellerCommissions />} />
        <Route path="/admin/seller-commissions/:storeId" element={<AdminSellerStoreDetail />} />
        <Route path="/admin/seller-payouts" element={<AdminSellerPayouts />} />
        <Route path="/admin/seller-agreements" element={<AdminSellerAgreements />} />
        <Route path="/admin/staff-documents" element={<AdminStaffDocuments />} />
        <Route path="/admin/public-documents" element={<AdminPublicDocuments />} />
        <Route path="/admin/seller-documents" element={<AdminSellerDocuments />} />
        <Route path="/admin/seller-recruitment" element={<AdminSellerRecruitment />} />
        <Route path="/admin/manual-payouts" element={<AdminManualPayouts />} />
        <Route path="/admin/seller-tickets" element={<AdminSellerTickets />} />
        <Route path="/admin/role-permissions" element={<AdminRolePermissions />} />
        <Route path="/admin/discord-modmail" element={<AdminDiscordModmail />} />
        <Route path="/admin/community-announcements" element={<AdminCommunityAnnouncements />} />
        <Route path="/admin/discord-polls" element={<AdminDiscordPolls />} />
        <Route path="/admin/discord-qotd" element={<AdminDiscordQOTD />} />
        <Route path="/admin/transcripts" element={<AdminTranscripts />} />
        <Route path="/admin/discord-outreach" element={<AdminDiscordOutreach />} />
        <Route path="/admin/discord-outreach/:id" element={<AdminDiscordOutreachDetail />} />
        <Route path="/admin/email-templates" element={<AdminEmailTemplates />} />
        <Route path="/admin/advertisement-analytics" element={<AdminAdvertisementAnalytics />} />
        <Route path="/admin/gift-credits" element={<AdminGiftCredits />} />
        <Route path="/admin/ip-reports" element={<AdminIPReports />} />
        <Route path="/admin/developer-submissions" element={<AdminDeveloperSubmissions />} />
        <Route path="/admin/developer-payments" element={<AdminDeveloperPayments />} />
        <Route path="/admin/developer-payments/:id" element={<AdminDeveloperPaymentDetail />} />
        <Route path="/admin/recruiters" element={<AdminRecruiters />} />
        <Route path="/admin/recruiter-applications" element={<AdminRecruiterApplications />} />
        <Route path="/admin/recruiter-payouts" element={<AdminRecruiterPayouts />} />
        <Route path="/admin/recruiter-commissions" element={<AdminRecruiterCommissions />} />
        {/* Global Guard routes (path-based instead of subdomain) */}
        <Route path="/guard/*" element={<GlobalGuardRouter />} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}
