import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useSellerStatus } from '@/hooks/useSellerStatus';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SellerLayout } from '@/components/seller/SellerLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  CheckCircle,
  AlertCircle,
  ExternalLink,
  CreditCard,
  BarChart3
} from 'lucide-react';
import { toast } from 'sonner';
import { EarningsCalculator } from '@/components/seller/EarningsCalculator';

export default function SellerSettingsPayments() {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { store, isSeller } = useSellerStatus();

  const stripeOnboardingComplete = searchParams.get('stripe_onboarding') === 'complete';

  const { data: connectStatus, refetch: refetchConnectStatus, isLoading: connectStatusLoading } = useQuery({
    queryKey: ['connect-status', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('check-connect-status');
      if (error) throw error;
      return data as {
        hasAccount: boolean;
        isOnboarded: boolean;
        canReceivePayments: boolean;
        chargesEnabled: boolean;
        accountId: string | null;
      };
    },
    enabled: !!user && isSeller,
    staleTime: 0,
  });

  useEffect(() => {
    if (stripeOnboardingComplete) {
      setSearchParams({});
      refetchConnectStatus();
      queryClient.invalidateQueries({ queryKey: ['seller-store'] });
    }
  }, [stripeOnboardingComplete, refetchConnectStatus, queryClient, setSearchParams]);

  const setupStripeConnect = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('create-connect-account', {
        body: { store_id: store?.id },
      });

      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      }
    },
    onError: (error) => {
      toast.error('Failed to setup Stripe Connect: ' + error.message);
    },
  });

  return (
    <SellerLayout>
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Payments & Earnings</h1>
          <p className="text-muted-foreground">
            Manage your payment setup and view earnings
          </p>
        </div>

        <div className="space-y-6">
          {/* Stripe Connect */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Stripe Connect
              </CardTitle>
              <CardDescription>
                Connect your Stripe account to receive automatic payouts
              </CardDescription>
            </CardHeader>
            <CardContent>
              {connectStatusLoading ? (
                <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  <div className="flex-1">
                    <p className="font-medium">Checking payment status...</p>
                  </div>
                </div>
              ) : connectStatus?.canReceivePayments || store?.payouts_enabled ? (
                <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-green-500" />
                  <div className="flex-1">
                    <p className="font-medium">Stripe Connect Active</p>
                    <p className="text-sm text-muted-foreground">
                      Your account is set up to receive payouts
                    </p>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <a href="https://dashboard.stripe.com" target="_blank" rel="noopener noreferrer">
                      Dashboard
                      <ExternalLink className="h-4 w-4 ml-2" />
                    </a>
                  </Button>
                </div>
              ) : connectStatus?.hasAccount || store?.stripe_account_id ? (
                <div className="flex items-center gap-3 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                  <AlertCircle className="h-6 w-6 text-yellow-500" />
                  <div className="flex-1">
                    <p className="font-medium">Setup Incomplete</p>
                    <p className="text-sm text-muted-foreground">
                      Please complete your Stripe Connect onboarding
                    </p>
                  </div>
                  <Button 
                    variant="default"
                    onClick={() => setupStripeConnect.mutate()}
                    disabled={setupStripeConnect.isPending}
                  >
                    {setupStripeConnect.isPending ? 'Loading...' : 'Complete Setup'}
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
                  <CreditCard className="h-6 w-6 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="font-medium">Connect Stripe</p>
                    <p className="text-sm text-muted-foreground">
                      Set up Stripe Connect to receive payouts for your sales
                    </p>
                  </div>
                  <Button 
                    variant="default"
                    onClick={() => setupStripeConnect.mutate()}
                    disabled={setupStripeConnect.isPending}
                  >
                    {setupStripeConnect.isPending ? 'Loading...' : 'Connect Stripe'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Earnings Calculator */}
          <EarningsCalculator commissionRate={store?.commission_rate || 15} />

          {/* Store Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Store Statistics
              </CardTitle>
              <CardDescription>
                Your store's performance overview
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Total Sales</p>
                  <p className="text-2xl font-bold">{store?.total_sales || 0}</p>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Total Revenue</p>
                  <p className="text-2xl font-bold">
                    £{((store?.total_revenue || 0) / 100).toFixed(2)}
                  </p>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Products</p>
                  <p className="text-2xl font-bold">{store?.product_count || 0}</p>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Rating</p>
                  <p className="text-2xl font-bold">
                    {store?.average_rating ? store.average_rating.toFixed(1) : 'N/A'}
                  </p>
                </div>
              </div>

              <Separator className="my-4" />

              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Commission Rate</span>
                <span className="font-medium">{store?.commission_rate || 15}%</span>
              </div>
              <div className="flex items-center justify-between text-sm mt-2">
                <span className="text-muted-foreground">Member Since</span>
                <span className="font-medium">
                  {store?.created_at ? new Date(store.created_at).toLocaleDateString() : 'N/A'}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </SellerLayout>
  );
}
