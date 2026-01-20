import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useSellerStatus } from '@/hooks/useSellerStatus';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SellerLayout } from '@/components/seller/SellerLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Store, 
  Image as ImageIcon,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Save,
  Palette,
  Link as LinkIcon,
  Globe,
  MessageCircle,
  Bell,
  Send,
  CreditCard,
  BarChart3,
  Settings2
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
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { store, isSeller } = useSellerStatus();

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
    staleTime: 0,
  });

  // Auto-check status after returning from Stripe onboarding
  useEffect(() => {
    if (stripeOnboardingComplete) {
      setSearchParams({});
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
    discord_url: '',
    twitter_url: '',
    youtube_url: '',
    tiktok_url: '',
    website_url: '',
    discord_webhook_url: '',
  });
  const [isTestingWebhook, setIsTestingWebhook] = useState(false);

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
        discord_url: store.discord_url || '',
        twitter_url: store.twitter_url || '',
        youtube_url: store.youtube_url || '',
        tiktok_url: store.tiktok_url || '',
        website_url: store.website_url || '',
        discord_webhook_url: store.discord_webhook_url || '',
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
          discord_url: data.discord_url || null,
          twitter_url: data.twitter_url || null,
          youtube_url: data.youtube_url || null,
          tiktok_url: data.tiktok_url || null,
          website_url: data.website_url || null,
          discord_webhook_url: data.discord_webhook_url || null,
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateStore.mutate(formData);
  };

  const testDiscordWebhook = async () => {
    if (!formData.discord_webhook_url) {
      toast.error('Please enter a Discord webhook URL first');
      return;
    }

    // Basic webhook URL validation
    if (!formData.discord_webhook_url.startsWith('https://discord.com/api/webhooks/') && 
        !formData.discord_webhook_url.startsWith('https://discordapp.com/api/webhooks/')) {
      toast.error('Please enter a valid Discord webhook URL');
      return;
    }

    setIsTestingWebhook(true);
    try {
      const response = await fetch(formData.discord_webhook_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          embeds: [{
            title: '🎉 Test Notification',
            description: `This is a test notification from **${store?.name || 'your store'}** on Eclipse Store.`,
            color: 0x8b5cf6,
            fields: [
              { name: 'Store', value: store?.name || 'Your Store', inline: true },
              { name: 'Status', value: '✅ Webhook Connected', inline: true },
            ],
            footer: { text: 'Eclipse Store • Seller Notifications' },
            timestamp: new Date().toISOString(),
          }],
        }),
      });

      if (response.ok) {
        toast.success('Test notification sent! Check your Discord channel.');
      } else {
        throw new Error('Webhook request failed');
      }
    } catch (error) {
      toast.error('Failed to send test notification. Please check your webhook URL.');
    } finally {
      setIsTestingWebhook(false);
    }
  };

  return (
    <SellerLayout>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Store Settings</h1>
          <p className="text-muted-foreground">
            Manage your store profile, payments, and notifications
          </p>
        </div>

        {/* Store ID Badge */}
        <div className="flex items-center gap-2 mb-6">
          {store?.is_verified && (
            <Badge variant="default" className="gap-1">
              <CheckCircle className="h-3 w-3" />
              Verified
            </Badge>
          )}
          <Badge variant="outline">
            Store ID: {store?.store_id}
          </Badge>
        </div>

        {/* Settings Tabs */}
        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 h-auto">
            <TabsTrigger value="profile" className="flex items-center gap-2 py-2">
              <Store className="h-4 w-4" />
              <span className="hidden sm:inline">Profile</span>
            </TabsTrigger>
            <TabsTrigger value="appearance" className="flex items-center gap-2 py-2">
              <Palette className="h-4 w-4" />
              <span className="hidden sm:inline">Appearance</span>
            </TabsTrigger>
            <TabsTrigger value="payments" className="flex items-center gap-2 py-2">
              <CreditCard className="h-4 w-4" />
              <span className="hidden sm:inline">Payments</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2 py-2">
              <Bell className="h-4 w-4" />
              <span className="hidden sm:inline">Notifications</span>
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
            {/* Basic Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Store className="h-5 w-5" />
                  Basic Information
                </CardTitle>
                <CardDescription>
                  Your store's public name and description
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
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
                  <Label htmlFor="bio">Store Bio</Label>
                  <Textarea
                    id="bio"
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    placeholder="A short bio about you or your store..."
                    rows={3}
                  />
                </div>

                <Button onClick={handleSubmit} disabled={updateStore.isPending}>
                  <Save className="h-4 w-4 mr-2" />
                  {updateStore.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
              </CardContent>
            </Card>

            {/* Branding */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ImageIcon className="h-5 w-5" />
                  Branding
                </CardTitle>
                <CardDescription>
                  Your store's logo and banner images
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
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

                <Button onClick={handleSubmit} disabled={updateStore.isPending}>
                  <Save className="h-4 w-4 mr-2" />
                  {updateStore.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
              </CardContent>
            </Card>

            {/* Social Links */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LinkIcon className="h-5 w-5" />
                  Social Links
                </CardTitle>
                <CardDescription>
                  Connect your social media accounts to display on your store
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="discord_url" className="flex items-center gap-2">
                      <MessageCircle className="h-4 w-4" />
                      Discord Server
                    </Label>
                    <Input
                      id="discord_url"
                      value={formData.discord_url}
                      onChange={(e) => setFormData({ ...formData, discord_url: e.target.value })}
                      placeholder="https://discord.gg/your-server"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="twitter_url" className="flex items-center gap-2">
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                      </svg>
                      X (Twitter)
                    </Label>
                    <Input
                      id="twitter_url"
                      value={formData.twitter_url}
                      onChange={(e) => setFormData({ ...formData, twitter_url: e.target.value })}
                      placeholder="https://twitter.com/username"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="youtube_url" className="flex items-center gap-2">
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                      </svg>
                      YouTube
                    </Label>
                    <Input
                      id="youtube_url"
                      value={formData.youtube_url}
                      onChange={(e) => setFormData({ ...formData, youtube_url: e.target.value })}
                      placeholder="https://youtube.com/@channel"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tiktok_url" className="flex items-center gap-2">
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
                      </svg>
                      TikTok
                    </Label>
                    <Input
                      id="tiktok_url"
                      value={formData.tiktok_url}
                      onChange={(e) => setFormData({ ...formData, tiktok_url: e.target.value })}
                      placeholder="https://tiktok.com/@username"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="website_url" className="flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    Website
                  </Label>
                  <Input
                    id="website_url"
                    value={formData.website_url}
                    onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
                    placeholder="https://yourwebsite.com"
                  />
                </div>

                <Button onClick={handleSubmit} disabled={updateStore.isPending}>
                  <Save className="h-4 w-4 mr-2" />
                  {updateStore.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Appearance Tab */}
          <TabsContent value="appearance" className="space-y-6">
            {/* Theme Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-5 w-5" />
                  Store Theme
                </CardTitle>
                <CardDescription>
                  Choose a visual style for your storefront
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
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

                <Button onClick={handleSubmit} disabled={updateStore.isPending}>
                  <Save className="h-4 w-4 mr-2" />
                  {updateStore.isPending ? 'Saving...' : 'Save Theme'}
                </Button>
              </CardContent>
            </Card>

            {/* Accent Color */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings2 className="h-5 w-5" />
                  Accent Color
                </CardTitle>
                <CardDescription>
                  Choose your store's primary accent color
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-3">
                  {ACCENT_COLORS.map((color) => (
                    <button
                      key={color.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, accent_color: color.id })}
                      className={`w-12 h-12 rounded-full border-2 transition-all ${
                        formData.accent_color === color.id
                          ? 'border-foreground scale-110 ring-2 ring-offset-2 ring-offset-background'
                          : 'border-transparent hover:scale-105'
                      }`}
                      style={{ backgroundColor: color.id }}
                      title={color.name}
                    />
                  ))}
                </div>
                <p className="text-sm text-muted-foreground">
                  Selected: <span className="font-medium">{ACCENT_COLORS.find(c => c.id === formData.accent_color)?.name || 'Purple'}</span>
                </p>

                <Button onClick={handleSubmit} disabled={updateStore.isPending}>
                  <Save className="h-4 w-4 mr-2" />
                  {updateStore.isPending ? 'Saving...' : 'Save Color'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Payments Tab */}
          <TabsContent value="payments" className="space-y-6">
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
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Discord Notifications
                </CardTitle>
                <CardDescription>
                  Receive order notifications directly in your Discord server
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="discord_webhook_url" className="flex items-center gap-2">
                    <MessageCircle className="h-4 w-4" />
                    Discord Webhook URL
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="discord_webhook_url"
                      type="password"
                      value={formData.discord_webhook_url}
                      onChange={(e) => setFormData({ ...formData, discord_webhook_url: e.target.value })}
                      placeholder="https://discord.com/api/webhooks/..."
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={testDiscordWebhook}
                      disabled={isTestingWebhook || !formData.discord_webhook_url}
                    >
                      <Send className="h-4 w-4 mr-2" />
                      {isTestingWebhook ? 'Sending...' : 'Test'}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Get notified when someone purchases from your store. 
                    <a 
                      href="https://support.discord.com/hc/en-us/articles/228383668-Intro-to-Webhooks" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:underline ml-1"
                    >
                      How to create a webhook
                      <ExternalLink className="h-3 w-3 inline ml-1" />
                    </a>
                  </p>
                </div>

                {formData.discord_webhook_url && (
                  <div className="flex items-center gap-3 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <div>
                      <p className="text-sm font-medium">Webhook Configured</p>
                      <p className="text-xs text-muted-foreground">
                        You'll receive notifications when orders are placed
                      </p>
                    </div>
                  </div>
                )}

                <Button 
                  onClick={handleSubmit}
                  disabled={updateStore.isPending}
                  className="w-full"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {updateStore.isPending ? 'Saving...' : 'Save Notification Settings'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </SellerLayout>
  );
}
