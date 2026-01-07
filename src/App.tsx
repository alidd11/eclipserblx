import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { CartProvider } from "@/hooks/useCart";
import { ChatWidget } from "@/components/chat/ChatWidget";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Account from "./pages/Account";
import Downloads from "./pages/Downloads";
import Products from "./pages/Products";
import Categories from "./pages/Categories";
import ProductDetail from "./pages/ProductDetail";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import OrderSuccess from "./pages/OrderSuccess";
import ChatHistory from "./pages/ChatHistory";
import Forum from "./pages/Forum";
import ThreadDetail from "./pages/ThreadDetail";
import Jobs from "./pages/Jobs";
import RefundPolicy from "./pages/RefundPolicy";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import FAQ from "./pages/FAQ";
import Support from "./pages/Support";
import Contact from "./pages/Contact";
import AdminDashboard from "./pages/admin/Dashboard";
import AdminLogin from "./pages/admin/Login";
import AdminAnalytics from "./pages/admin/Analytics";
import AdminIncome from "./pages/admin/Income";
import AdminStaffActivity from "./pages/admin/StaffActivity";
import AdminStaffMessages from "./pages/admin/StaffMessages";
import AdminProducts from "./pages/admin/Products";
import AdminOrders from "./pages/admin/Orders";
import AdminUsers from "./pages/admin/Users";
import AdminSettings from "./pages/admin/Settings";
import AdminLiveChat from "./pages/admin/LiveChat";
import AdminApplications from "./pages/admin/Applications";
import AdminReviews from "./pages/admin/Reviews";
import AdminAuditLogs from "./pages/admin/AuditLogs";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <CartProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
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
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route path="/admin/analytics" element={<AdminAnalytics />} />
              <Route path="/admin/income" element={<AdminIncome />} />
              <Route path="/admin/staff-activity" element={<AdminStaffActivity />} />
              <Route path="/admin/staff-messages" element={<AdminStaffMessages />} />
              <Route path="/admin/products" element={<AdminProducts />} />
              <Route path="/admin/orders" element={<AdminOrders />} />
              <Route path="/admin/users" element={<AdminUsers />} />
              <Route path="/admin/settings" element={<AdminSettings />} />
              <Route path="/admin/live-chat" element={<AdminLiveChat />} />
              <Route path="/admin/applications" element={<AdminApplications />} />
              <Route path="/admin/reviews" element={<AdminReviews />} />
              <Route path="/admin/audit-logs" element={<AdminAuditLogs />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            <ChatWidget />
            <InstallPrompt />
          </BrowserRouter>
        </TooltipProvider>
      </CartProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
