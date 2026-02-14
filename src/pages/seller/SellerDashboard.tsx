import { Link } from 'react-router-dom';
import { useSellerStatus } from '@/hooks/useSellerStatus';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SellerLayout } from '@/components/seller/SellerLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StoreHealthScore } from '@/components/seller/StoreHealthScore';
import { NotificationCenter } from '@/components/seller/NotificationCenter';
import { FileReviewConsentBanner } from '@/components/seller/FileReviewConsentBanner';
import { SellerHeroBanner } from '@/components/seller/SellerHeroBanner';
import { StoreSetupChecklist } from '@/components/seller/StoreSetupChecklist';
import { SellerOnboardingWizard } from '@/components/seller/SellerOnboardingWizard';
import { RevenueChart } from '@/components/seller/RevenueChart';
import { TopProductsLeaderboard } from '@/components/seller/TopProductsLeaderboard';
import { CustomerDemographics } from '@/components/seller/CustomerDemographics';
import { PayoutTimeline } from '@/components/seller/PayoutTimeline';
import { StorePreviewCard } from '@/components/seller/StorePreviewCard';
import { motion } from 'framer-motion';
import { 
  Package, 
  ShoppingCart, 
  Plus,
  Clock,
  Scale,
  AlertTriangle,
  BarChart3,
  Tag,
  DollarSign,
  LayoutGrid
} from 'lucide-react';

const CURRENT_TOS_VERSION = "1.0";

export default function SellerDashboard() {
  const { store } = useSellerStatus();

  // Check if TOS is signed
  const { data: hasSignedTos, isLoading: tosLoading } = useQuery({
    queryKey: ['seller-tos-signed', store?.id, CURRENT_TOS_VERSION],
    queryFn: async () => {
      if (!store?.id) return false;
      const { data, error } = await supabase
        .from('seller_agreements')
        .select('id')
        .eq('store_id', store.id)
        .eq('agreement_version', CURRENT_TOS_VERSION)
        .maybeSingle();
      if (error) throw error;
      return !!data;
    },
    enabled: !!store?.id,
  });

  // Fetch product stats
  const { data: productStats } = useQuery({
    queryKey: ['seller-product-stats', store?.id],
    queryFn: async () => {
      if (!store?.id) return { total: 0, pending: 0, approved: 0 };
      const { data, error } = await supabase
        .from('products')
        .select('id, moderation_status')
        .eq('store_id', store.id);
      if (error) throw error;
      const products = data || [];
      return {
        total: products.length,
        pending: products.filter(p => p.moderation_status === 'pending').length,
        approved: products.filter(p => p.moderation_status === 'approved').length,
      };
    },
    enabled: !!store?.id,
  });

  const quickActions = [
    { title: 'Analytics', href: '/seller/analytics', icon: BarChart3, description: 'View store metrics' },
    { title: 'Products', href: '/seller/products', icon: Package, description: 'Manage listings' },
    { title: 'Orders', href: '/seller/orders', icon: ShoppingCart, description: 'View sales' },
    { title: 'Balance', href: '/seller/balance', icon: DollarSign, description: 'Payouts & earnings' },
    { title: 'Discounts', href: '/seller/discounts', icon: Tag, description: 'Create promos' },
    { title: 'Categories', href: '/seller/tabs', icon: LayoutGrid, description: 'Customize pages' },
  ];

  return (
    <SellerLayout>
      <div className="max-w-6xl mx-auto space-y-5">
        {/* TOS Warning Banner */}
        {!tosLoading && !hasSignedTos && (
          <Card className="border-amber-500/50 bg-amber-500/5">
            <CardContent className="flex flex-col sm:flex-row items-start sm:items-center gap-4 py-4">
              <div className="flex items-center gap-3 flex-1">
                <div className="p-2 rounded-lg bg-amber-500/10">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <p className="font-semibold text-amber-600 dark:text-amber-400">
                    Store Inactive - Agreement Required
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Your store is not visible until you sign the Seller Terms of Service.
                  </p>
                </div>
              </div>
              <Button asChild className="w-full sm:w-auto">
                <Link to="/seller/documents/terms">
                  <Scale className="h-4 w-4 mr-2" />
                  Sign Agreement
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* File Review Consent Banners */}
        <FileReviewConsentBanner />

        {/* ── Onboarding Wizard (modal, shows once for new sellers) ── */}
        <SellerOnboardingWizard />

        {/* ── Hero Banner ── */}
        <SellerHeroBanner />

        {/* ── Store Setup Checklist (soft nudge) ── */}
        <StoreSetupChecklist />

        {/* ── Quick Actions Grid ── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-3 lg:grid-cols-6 gap-2">
              {quickActions.map((action, i) => (
                <Link key={action.href} to={action.href}>
                  <motion.div
                    whileHover={{ y: -2, scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                    className="flex flex-col items-center gap-2 p-3.5 rounded-lg bg-muted/50 hover:bg-accent transition-colors text-center group cursor-pointer"
                  >
                    <div className="p-2.5 rounded-xl bg-card border border-border group-hover:border-primary/30 transition-colors">
                      <action.icon className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <div>
                      <span className="text-xs font-medium block">{action.title}</span>
                      <span className="text-[10px] text-muted-foreground hidden sm:block">{action.description}</span>
                    </div>
                  </motion.div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* ── Revenue Chart + Top Products ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <RevenueChart />
          <TopProductsLeaderboard />
        </div>

        {/* ── Activity Feed + Store Health ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <NotificationCenter />
          <StoreHealthScore />
        </div>

        {/* ── Demographics + Payout Timeline + Store Preview ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <CustomerDemographics />
          <PayoutTimeline />
          <StorePreviewCard />
        </div>

        {/* Pending Items Alert */}
        {productStats && productStats.pending > 0 && (
          <Card className="border-yellow-500/50 bg-yellow-500/5">
            <CardContent className="flex items-center gap-4 py-4">
              <Clock className="h-8 w-8 text-yellow-500" />
              <div className="flex-1">
                <p className="font-medium">Products Pending Review</p>
                <p className="text-sm text-muted-foreground">
                  You have {productStats.pending} product(s) awaiting moderation approval.
                </p>
              </div>
              <Button variant="outline" asChild>
                <Link to="/seller/products">View Products</Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </SellerLayout>
  );
}
