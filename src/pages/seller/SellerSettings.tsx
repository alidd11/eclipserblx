import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useSellerStatus } from '@/hooks/useSellerStatus';
import { useMarketplaceAccess } from '@/hooks/useFeatureFlag';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Store, 
  Image as ImageIcon,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Save,
  Palette
} from 'lucide-react';
import { toast } from 'sonner';
import { EarningsCalculator } from '@/components/seller/EarningsCalculator';

const STORE_THEMES = [
  { id: 'default', name: 'Default', description: 'Clean and modern' },
  { id: 'minimal', name: 'Minimal', description: 'Simple and elegant' },
  { id: 'bold', name: 'Bold', description: 'Strong colors and contrast' },
  { id: 'gradient', name: 'Gradient', description: 'Smooth color transitions' },
  { id: 'dark', name: 'Dark Mode', description: 'Dark themed storefront' },
];

const ACCENT_COLORS = [
  { id: '#8b5cf6', name: 'Purple' },
  { id: '#3b82f6', name: 'Blue' },
  { id: '#10b981', name: 'Green' },
  { id: '#f59e0b', name: 'Amber' },
  { id: '#ef4444', name: 'Red' },
  { id: '#ec4899', name: 'Pink' },
  { id: '#06b6d4', name: 'Cyan' },
];

export default function SellerSettings() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { user, loading: authLoading } = useAuth();
  const { hasAccess, loading: flagLoading } = useMarketplaceAccess();
  const { store, isSeller, loading: sellerLoading } = useSellerStatus();

  // Check for Stripe onboarding completion
  const stripeOnboardingComplete = searchParams.get('stripe_onboarding') === 'complete';

  // Query to check Connect status
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
    staleTime: 0, // Always fetch fresh data
  });

  // Auto-check status after returning from Stripe onboarding
  useEffect(() => {
    if (stripeOnboardingComplete) {
      // Clear the query param
      setSearchParams({});
      // Refetch connect status and seller data
      refetchConnectStatus();
      queryClient.invalidateQueries({ queryKey: ['seller-store'] });
    }
  }, [stripeOnboardingComplete, refetchConnectStatus, queryClient, setSearchParams]);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    logo_url: '',
    banner_url: '',
    bio: '',
    theme: 'default',
    accent_color: '#8b5cf6',
  });

  useEffect(() => {
    if (store) {
      setFormData({
        name: store.name || '',
        description: store.description || '',
        logo_url: store.logo_url || '',
        banner_url: store.banner_url || '',
        bio: store.bio || '',
        theme: store.theme || 'default',
        accent_color: store.accent_color || '#8b5cf6',
      });
    }
  }, [store]);

  // Update store mutation
  const updateStore = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (!store?.id) throw new Error('No store found');
      
      const { error } = await supabase
        .from('stores')
        .update({
          name: data.name,
          description: data.description,
          logo_url: data.logo_url || null,
          banner_url: data.banner_url || null,
          bio: data.bio || null,
          theme: data.theme,
          accent_color: data.accent_color,
          updated_at: new Date().toISOString(),
        })
        .eq('id', store.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Store settings updated successfully');
      queryClient.invalidateQueries({ queryKey: ['seller-store'] });
    },
    onError: (error) => {
      toast.error('Failed to update store: ' + error.message);
    },
  });

  // Setup Stripe Connect
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

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!flagLoading && !hasAccess) {
      navigate('/');
    }
  }, [hasAccess, flagLoading, navigate]);

  useEffect(() => {
    if (!sellerLoading && !isSeller) {
      navigate('/account');
    }
  }, [isSeller, sellerLoading, navigate]);

  if (authLoading || flagLoading || sellerLoading) {
    return (
      <MainLayout>
        <div className="container py-8">
          <Skeleton className="h-10 w-64 mb-6" />
          <Skeleton className="h-96" />
        </div>
      </MainLayout>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateStore.mutate(formData);
  };

  return (
    <MainLayout>
      <div className="container py-8 max-w-3xl">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Store Settings</h1>
          <p className="text-muted-foreground">
            Manage your store profile and payment settings
          </p>
        </div>

        {/* Store Info Card */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Store className="h-5 w-5" />
                  Store Profile
                </CardTitle>
                <CardDescription>
                  Update your store's public information
                </CardDescription>
              </div>
              <div className="flex gap-2">
                {store?.is_verified && (
                  <Badge variant="default" className="gap-1">
                    <CheckCircle className="h-3 w-3" />
                    Verified
                  </Badge>
                )}
                <Badge variant="outline">
                  ID: {store?.store_id}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Store Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Your Store Name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Tell customers about your store..."
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="logo_url">Logo URL</Label>
                <div className="flex gap-2">
                  <Input
                    id="logo_url"
                    value={formData.logo_url}
                    onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                    placeholder="https://example.com/logo.png"
                  />
                  {formData.logo_url && (
                    <div className="h-10 w-10 rounded border overflow-hidden flex-shrink-0">
                      <img 
                        src={formData.logo_url} 
                        alt="Logo preview" 
                        className="h-full w-full object-cover"
                        onError={(e) => (e.currentTarget.style.display = 'none')}
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="banner_url">Banner URL</Label>
                <Input
                  id="banner_url"
                  value={formData.banner_url}
                  onChange={(e) => setFormData({ ...formData, banner_url: e.target.value })}
                  placeholder="https://example.com/banner.png"
                />
                {formData.banner_url && (
                  <div className="h-24 rounded border overflow-hidden">
                    <img 
                      src={formData.banner_url} 
                      alt="Banner preview" 
                      className="h-full w-full object-cover"
                      onError={(e) => (e.currentTarget.style.display = 'none')}
                    />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Store Bio</Label>
                <Textarea
                  id="bio"
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  placeholder="A short bio about you or your store..."
                  rows={3}
                />
              </div>

              <Separator />

              {/* Theme Selection */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Palette className="h-5 w-5 text-muted-foreground" />
                  <Label className="text-base font-medium">Store Theme</Label>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {STORE_THEMES.map((theme) => (
                    <div
                      key={theme.id}
                      onClick={() => setFormData({ ...formData, theme: theme.id })}
                      className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                        formData.theme === theme.id
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <p className="font-medium text-sm">{theme.name}</p>
                      <p className="text-xs text-muted-foreground">{theme.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Accent Color */}
              <div className="space-y-3">
                <Label>Accent Color</Label>
                <div className="flex flex-wrap gap-2">
                  {ACCENT_COLORS.map((color) => (
                    <button
                      key={color.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, accent_color: color.id })}
                      className={`w-10 h-10 rounded-full border-2 transition-all ${
                        formData.accent_color === color.id
                          ? 'border-foreground scale-110'
                          : 'border-transparent hover:scale-105'
                      }`}
                      style={{ backgroundColor: color.id }}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>

              <Button type="submit" disabled={updateStore.isPending}>
                <Save className="h-4 w-4 mr-2" />
                {updateStore.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Stripe Connect Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Payment Settings</CardTitle>
            <CardDescription>
              Connect your Stripe account to receive payouts
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
                <ImageIcon className="h-6 w-6 text-muted-foreground" />
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
            <CardTitle>Store Statistics</CardTitle>
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
                  ${((store?.total_revenue || 0) / 100).toFixed(2)}
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
    </MainLayout>
  );
}
