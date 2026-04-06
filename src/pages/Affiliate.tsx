import { useState, useEffect } from 'react';
import { useAffiliateConnectStatus } from '@/hooks/useAffiliateConnectStatus';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { 
  DollarSign, TrendingUp, Loader2, CheckCircle, AlertCircle,
  ArrowUpRight, Clock, Users, Gift, Zap, Copy, ExternalLink,
  CreditCard, BadgePercent, Star, Construction, MousePointerClick, UserPlus,
  Link as LinkIcon, Wallet, Building2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { MainLayout } from '@/components/layout/MainLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { useAffiliateSettings } from '@/hooks/useAffiliateSettings';
import { usePageMeta } from '@/hooks/usePageMeta';
import { format } from '@/lib/dateUtils';
import { Link, useSearchParams } from 'react-router-dom';

export default function Affiliate() {
  usePageMeta({ title: 'Affiliate Programme', description: 'Earn commissions by referring customers to Eclipse marketplace. Join our affiliate programme today.', canonicalPath: '/affiliate' });
  const { user } = useAuth();
  
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const { settings: affiliateSettings, isLoading: settingsLoading } = useAffiliateSettings();
  const [payoutAmount, setPayoutAmount] = useState('');
  const [isConnectingStripe, setIsConnectingStripe] = useState(false);

  // Payout settings state
  const [payoutSettings, setPayoutSettings] = useState({
    preferred_method: 'stripe' as 'stripe' | 'paypal' | 'bank_transfer',
    paypal_email: '',
    bank_account_holder: '',
    bank_account_number: '',
    bank_swift_bic: '',
    bank_name: '',
    bank_country: '',
    bank_routing_number: '',
  });
  const [paypalEmailError, setPaypalEmailError] = useState<string | null>(null);

  const validateEmail = (email: string): boolean => {
    if (!email) return true;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  // Handle Stripe onboarding return
  useEffect(() => {
    if (searchParams.get('stripe_onboarding') === 'complete') {
      toast.success("Stripe Connected!", { description: "Your Stripe account has been connected successfully." });
      queryClient.invalidateQueries({ queryKey: ['affiliate-connect-status'] });
    }
    if (searchParams.get('stripe_refresh') === 'true') {
      toast.error("Session Expired", { description: "Please try connecting your Stripe account again." });
    }
  }, [searchParams, queryClient]);

  // Get affiliate application (auto-created on signup)
  const { data: application, isLoading: applicationLoading } = useQuery({
    queryKey: ['affiliate-application', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('affiliate_applications')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Get affiliate balance
  const { data: balance, isLoading: balanceLoading } = useQuery({
    queryKey: ['affiliate-balance', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('affiliate_balances')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: connectStatus, isLoading: connectStatusLoading } = useAffiliateConnectStatus(!!user?.id);

  // Get recent commissions
  const { data: commissions } = useQuery({
    queryKey: ['affiliate-commissions', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('affiliate_commissions')
        .select('*')
        .eq('affiliate_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Get pending payouts
  const { data: pendingPayouts } = useQuery({
    queryKey: ['affiliate-payouts', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('affiliate_payouts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Get user profile for referral code
  const { data: profile } = useQuery({
    queryKey: ['profile-referral', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('referral_code, display_name, paypal_email')
        .eq('user_id', user.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Sync payout settings from application data
  useEffect(() => {
    if (application) {
      setPayoutSettings({
        preferred_method: (application.preferred_payout_method as any) || 'stripe',
        paypal_email: application.paypal_email || '',
        bank_account_holder: (application as any).bank_account_holder || '',
        bank_account_number: (application as any).bank_account_number || '',
        bank_swift_bic: (application as any).bank_swift_bic || '',
        bank_name: (application as any).bank_name || '',
        bank_country: (application as any).bank_country || '',
        bank_routing_number: (application as any).bank_routing_number || '',
      });
    }
  }, [application]);

  // Connect Stripe account
  const connectStripeMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('create-affiliate-connect-account');
      if (error) throw error;
      return data as { url: string; accountId: string };
    },
    onSuccess: (data) => {
      window.location.href = data.url;
    },
    onError: (error: Error) => {
      toast.error("Error", { description: error.message });
      setIsConnectingStripe(false);
    },
  });

  // Request payout
  const requestPayoutMutation = useMutation({
    mutationFn: async (amount: number) => {
      const method = payoutSettings.preferred_method === 'stripe' && connectStatus?.canReceivePayments
        ? 'stripe'
        : payoutSettings.preferred_method === 'bank_transfer'
        ? 'bank_transfer'
        : 'paypal';
      
      const { data, error } = await supabase.functions.invoke('request-affiliate-payout', {
        body: { amount: Math.round(amount * 100), method },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(data.method === 'stripe' ? "Payout Complete!" : "Payout Requested", { description: data.message });
      setPayoutAmount('');
      queryClient.invalidateQueries({ queryKey: ['affiliate-payouts', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['affiliate-balance', user?.id] });
    },
    onError: (error: Error) => {
      toast.error("Error", { description: error.message });
    },
  });

  // Update payout settings mutation
  const updatePayoutSettingsMutation = useMutation({
    mutationFn: async (settings: typeof payoutSettings) => {
      if (!user?.id) throw new Error('Not authenticated');
      
      const { error: appError } = await supabase
        .from('affiliate_applications')
        .update({
          preferred_payout_method: settings.preferred_method,
          paypal_email: settings.paypal_email || null,
          bank_account_holder: settings.bank_account_holder || null,
          bank_account_number: settings.bank_account_number || null,
          bank_swift_bic: settings.bank_swift_bic || null,
          bank_name: settings.bank_name || null,
          bank_country: settings.bank_country || null,
          bank_routing_number: settings.bank_routing_number || null,
        } as any)
        .eq('user_id', user.id);
      
      if (appError) throw appError;
      
      if (settings.paypal_email) {
        await supabase
          .from('profiles')
          .update({ paypal_email: settings.paypal_email })
          .eq('id', user.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['affiliate-application', user?.id] });
      toast.success("Payout settings updated");
    },
    onError: (error: Error) => {
      toast.error("Error", { description: error.message });
    },
  });

  const handleRequestPayout = () => {
    const amount = parseFloat(payoutAmount);
    if (isNaN(amount) || amount < affiliateSettings.minimumPayout) {
      toast.error("Invalid Amount", { description: `Minimum payout is £${affiliateSettings.minimumPayout}` });
      return;
    }
    requestPayoutMutation.mutate(amount);
  };

  const handleConnectStripe = () => {
    setIsConnectingStripe(true);
    connectStripeMutation.mutate();
  };

  const copyReferralLink = () => {
    if (profile?.referral_code) {
      navigator.clipboard.writeText(`${window.location.origin}/auth?ref=${profile.referral_code}`);
      toast.success("Copied!", { description: "Referral link copied to clipboard" });
    }
  };

  const availableBalance = (balance?.available_balance || 0) / 100;
  const totalEarned = (balance?.total_earned || 0) / 100;
  const totalPaid = (balance?.total_paid || 0) / 100;
  const totalClicks = balance?.total_clicks || 0;
  const totalSignups = balance?.total_signups || 0;
  const conversionRate = totalClicks > 0 ? ((totalSignups / totalClicks) * 100).toFixed(1) : '0.0';
  const hasPendingPayout = pendingPayouts?.some(p => p.status === 'pending');
  const canUseStripe = connectStatus?.canReceivePayments === true;
  const needsStripeOnboarding = !connectStatus?.canReceivePayments;

  const isLoading = applicationLoading || balanceLoading || settingsLoading;

  const benefits = [
    { icon: BadgePercent, title: `${affiliateSettings.commissionRate}% Commission`, description: 'Earn on every sale from users you refer' },
    { icon: TrendingUp, title: 'Lifetime Earnings', description: 'Earn from all purchases your referrals make' },
    { icon: Wallet, title: 'Same-Day Payouts', description: 'Get paid via Stripe, PayPal, or bank transfer' },
    { icon: Users, title: 'No Limits', description: 'Refer as many people as you want' },
  ];

  // Program disabled
  if (!affiliateSettings.isEnabled) {
    return (
      <MainLayout>
        <div className="container py-8 max-w-2xl">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-6">
            <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <Construction className="h-10 w-10 text-primary" />
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-display font-bold">Coming Soon</h1>
              <p className="text-muted-foreground max-w-md mx-auto">
                Our affiliate program is currently being set up. Check back soon!
              </p>
            </div>
            <Button asChild variant="outline"><Link to="/">Return Home</Link></Button>
          </motion.div>
        </div>
      </MainLayout>
    );
  }

  // Not logged in - landing page
  if (!user) {
    return (
      <MainLayout>
        <div className="container py-8 max-w-4xl">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
            <div className="text-center space-y-4">
              <Badge className="bg-primary/20 text-primary border-primary/30">
                <Star className="h-3 w-3 mr-1" />Partner Program
              </Badge>
              <h1 className="text-4xl md:text-5xl font-display font-bold gradient-text">
                Earn With Every Referral
              </h1>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Every Eclipse account comes with a built-in affiliate link. Earn {affiliateSettings.commissionRate}% commission on every sale you refer.
              </p>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              {benefits.map((benefit, index) => (
                <motion.div key={benefit.title} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }}>
                  <Card className="bg-card/50 border-border h-full">
                    <CardContent className="pt-6">
                      <div className="flex gap-4">
                        <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <benefit.icon className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold">{benefit.title}</h3>
                          <p className="text-sm text-muted-foreground">{benefit.description}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
            <Card className="bg-muted/30 border-border">
              <CardContent className="py-8 text-center space-y-4">
                <Gift className="h-12 w-12 text-primary mx-auto" />
                <h2 className="text-2xl font-bold">Ready to Start Earning?</h2>
                <p className="text-muted-foreground">
                  Sign up or log in to access your affiliate dashboard and referral link.
                </p>
                <Button asChild size="lg" className="gradient-button">
                  <Link to="/auth">
                    Get Started
                    <ArrowUpRight className="h-4 w-4 ml-2" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </MainLayout>
    );
  }

  if (isLoading) {
    return (
      <MainLayout>
        <div className="container py-8 flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </MainLayout>
    );
  }

  // Full affiliate dashboard (auto-enrolled)
  return (
    <MainLayout>
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-display font-bold">Affiliate Dashboard</h1>
              <p className="text-muted-foreground">Track your earnings and referrals</p>
            </div>
            <Badge className="bg-green-500/20 text-green-400 border-green-500/30 w-fit">
              <CheckCircle className="h-3 w-3 mr-1" />
              Active Affiliate
            </Badge>
          </div>

          {/* Stripe Connect Onboarding Banner */}
          {needsStripeOnboarding && payoutSettings.preferred_method === 'stripe' && (
            <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
              <CardContent className="py-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="h-12 w-12 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
                      <LinkIcon className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">Connect Your Stripe Account</h3>
                      <p className="text-sm text-muted-foreground">
                        Connect your Stripe account to receive instant automatic payouts directly to your bank.
                      </p>
                    </div>
                  </div>
                  <Button 
                    onClick={handleConnectStripe}
                    disabled={isConnectingStripe || connectStripeMutation.isPending}
                    className="shrink-0 gradient-button"
                  >
                    {isConnectingStripe || connectStripeMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <ExternalLink className="h-4 w-4 mr-2" />
                    )}
                    Connect Stripe
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Cash Out Hero Card */}
          <Card className="bg-muted/30 border-border overflow-hidden relative">
            <div className="absolute top-0 right-0 w-48 h-48 bg-muted/20 rounded-full -translate-y-1/2 translate-x-1/2" />
            <CardContent className="pt-6 pb-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-5">
                  <div className="h-16 w-16 rounded-2xl bg-primary/20 flex items-center justify-center shrink-0">
                    <DollarSign className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Available Balance</p>
                    <p className="text-4xl md:text-5xl font-bold text-foreground">£{availableBalance.toFixed(2)}</p>
                  </div>
                </div>
                <div className="flex flex-col gap-3 md:items-end">
                  {hasPendingPayout ? (
                    <div className="flex items-center gap-2 px-4 py-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                      <Clock className="h-5 w-5 text-yellow-500" />
                      <span className="text-sm font-medium text-yellow-500">Payout request pending</span>
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">£</span>
                        <Input
                          type="number"
                          min={affiliateSettings.minimumPayout}
                          max={availableBalance}
                          step="0.01"
                          placeholder={affiliateSettings.minimumPayout.toString()}
                          value={payoutAmount}
                          onChange={(e) => setPayoutAmount(e.target.value)}
                          className="pl-7 w-full sm:w-32 h-12 text-lg"
                          disabled={availableBalance < affiliateSettings.minimumPayout}
                        />
                      </div>
                      <Button
                        size="lg"
                        className="gradient-button h-12 px-8 text-base font-semibold"
                        onClick={handleRequestPayout}
                        disabled={requestPayoutMutation.isPending || !payoutAmount || availableBalance < affiliateSettings.minimumPayout}
                      >
                        {requestPayoutMutation.isPending ? (
                          <Loader2 className="h-5 w-5 animate-spin mr-2" />
                        ) : (
                          <ArrowUpRight className="h-5 w-5 mr-2" />
                        )}
                        {canUseStripe ? 'Instant Payout' : 'Cash Out'}
                      </Button>
                    </div>
                  )}
                  <div className="flex flex-col gap-1 md:items-end">
                    {availableBalance < affiliateSettings.minimumPayout && !hasPendingPayout && (
                      <p className="text-xs text-muted-foreground">
                        Minimum balance for payout: £{affiliateSettings.minimumPayout}
                      </p>
                    )}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{affiliateSettings.commissionRate}% commission on all referred sales</span>
                      {canUseStripe && (
                        <Badge variant="outline" className="text-green-500 border-green-500/30">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Stripe Connected
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <Card className="bg-card border-border">
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <DollarSign className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xl font-bold">£{availableBalance.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">Available</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xl font-bold">£{totalEarned.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">Total Earned</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                    <MousePointerClick className="h-4 w-4 text-blue-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xl font-bold">{totalClicks.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">Link Clicks</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0">
                    <UserPlus className="h-4 w-4 text-green-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xl font-bold">{totalSignups.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">Signups</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0">
                    <BadgePercent className="h-4 w-4 text-purple-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xl font-bold">{conversionRate}%</p>
                    <p className="text-xs text-muted-foreground">Conversion</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Referral Link */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                Your Referral Link
              </CardTitle>
              <CardDescription>
                Share this link to earn {affiliateSettings.commissionRate}% on every sale
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={profile?.referral_code ? `${window.location.origin}/auth?ref=${profile.referral_code}` : 'Loading...'}
                  className="font-mono text-sm"
                />
                <Button variant="outline" size="icon" onClick={copyReferralLink}>
                  <Copy className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" asChild>
                  <a 
                    href={profile?.referral_code ? `${window.location.origin}/auth?ref=${profile.referral_code}` : '#'} 
                    target="_blank" 
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Payout Settings */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                Payout Settings
              </CardTitle>
              <CardDescription>
                Choose how you want to receive your earnings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <RadioGroup
                value={payoutSettings.preferred_method}
                onValueChange={(value: 'stripe' | 'paypal' | 'bank_transfer') => 
                  setPayoutSettings(prev => ({ ...prev, preferred_method: value }))
                }
                className="space-y-4"
              >
                {/* Stripe Option */}
                <div className="flex items-start space-x-3 p-4 rounded-lg border border-border hover:border-primary/50 transition-colors">
                  <RadioGroupItem value="stripe" id="payout-stripe" className="mt-1" />
                  <div className="flex-1 space-y-2">
                    <Label htmlFor="payout-stripe" className="font-medium cursor-pointer flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-primary" />
                      Stripe Connect (Instant)
                      <Badge variant="secondary" className="text-xs">Recommended</Badge>
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Automatic payouts directly to your bank account
                    </p>
                    {connectStatusLoading ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Checking status...
                      </div>
                    ) : connectStatus?.canReceivePayments ? (
                      <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/30">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Connected
                      </Badge>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleConnectStripe}
                        disabled={isConnectingStripe || connectStripeMutation.isPending}
                      >
                        {isConnectingStripe || connectStripeMutation.isPending ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <ExternalLink className="h-4 w-4 mr-2" />
                        )}
                        Connect Stripe Account
                      </Button>
                    )}
                  </div>
                </div>

                {/* PayPal Option */}
                <div className="flex items-start space-x-3 p-4 rounded-lg border border-border hover:border-primary/50 transition-colors">
                  <RadioGroupItem value="paypal" id="payout-paypal" className="mt-1" />
                  <div className="flex-1 space-y-2">
                    <Label htmlFor="payout-paypal" className="font-medium cursor-pointer flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-blue-500" />
                      PayPal (Same Day)
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Same-day payouts processed by our team
                    </p>
                    {payoutSettings.preferred_method === 'paypal' && (
                      <div className="max-w-sm">
                        <Label htmlFor="paypal-email" className="text-sm text-muted-foreground">PayPal Email</Label>
                        <Input
                          id="paypal-email"
                          type="email"
                          placeholder="your@email.com"
                          value={payoutSettings.paypal_email}
                          onChange={(e) => {
                            const email = e.target.value;
                            setPayoutSettings(prev => ({ ...prev, paypal_email: email }));
                            setPaypalEmailError(email && !validateEmail(email) ? 'Please enter a valid email address' : null);
                          }}
                          className={`mt-1 ${paypalEmailError ? 'border-destructive' : ''}`}
                        />
                        {paypalEmailError && <p className="text-xs text-destructive mt-1">{paypalEmailError}</p>}
                      </div>
                    )}
                  </div>
                </div>

                {/* Bank Transfer Option */}
                <div className="flex items-start space-x-3 p-4 rounded-lg border border-border hover:border-primary/50 transition-colors">
                  <RadioGroupItem value="bank_transfer" id="payout-bank" className="mt-1" />
                  <div className="flex-1 space-y-2">
                    <Label htmlFor="payout-bank" className="font-medium cursor-pointer flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-emerald-500" />
                      Bank Transfer
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Direct bank transfer processed by our team
                    </p>
                    {payoutSettings.preferred_method === 'bank_transfer' && (
                      <div className="grid gap-3 max-w-md pt-2">
                        <div>
                          <Label className="text-sm text-muted-foreground">Account Holder Name</Label>
                          <Input
                            placeholder="John Doe"
                            value={payoutSettings.bank_account_holder}
                            onChange={(e) => setPayoutSettings(prev => ({ ...prev, bank_account_holder: e.target.value }))}
                            className="mt-1"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-sm text-muted-foreground">Account Number</Label>
                            <Input
                              placeholder="12345678"
                              value={payoutSettings.bank_account_number}
                              onChange={(e) => setPayoutSettings(prev => ({ ...prev, bank_account_number: e.target.value }))}
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label className="text-sm text-muted-foreground">Sort Code / Routing</Label>
                            <Input
                              placeholder="12-34-56"
                              value={payoutSettings.bank_routing_number}
                              onChange={(e) => setPayoutSettings(prev => ({ ...prev, bank_routing_number: e.target.value }))}
                              className="mt-1"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-sm text-muted-foreground">Bank Name</Label>
                            <Input
                              placeholder="Barclays"
                              value={payoutSettings.bank_name}
                              onChange={(e) => setPayoutSettings(prev => ({ ...prev, bank_name: e.target.value }))}
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label className="text-sm text-muted-foreground">SWIFT/BIC</Label>
                            <Input
                              placeholder="BARCGB22"
                              value={payoutSettings.bank_swift_bic}
                              onChange={(e) => setPayoutSettings(prev => ({ ...prev, bank_swift_bic: e.target.value }))}
                              className="mt-1"
                            />
                          </div>
                        </div>
                        <div>
                          <Label className="text-sm text-muted-foreground">Country</Label>
                          <Input
                            placeholder="United Kingdom"
                            value={payoutSettings.bank_country}
                            onChange={(e) => setPayoutSettings(prev => ({ ...prev, bank_country: e.target.value }))}
                            className="mt-1"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </RadioGroup>

              <Separator />

              <div className="flex justify-end">
                <Button
                  onClick={() => {
                    if (payoutSettings.paypal_email && !validateEmail(payoutSettings.paypal_email)) {
                      setPaypalEmailError('Please enter a valid email address');
                      return;
                    }
                    updatePayoutSettingsMutation.mutate(payoutSettings);
                  }}
                  disabled={
                    updatePayoutSettingsMutation.isPending ||
                    (payoutSettings.preferred_method === 'paypal' && !payoutSettings.paypal_email) ||
                    (payoutSettings.preferred_method === 'bank_transfer' && !payoutSettings.bank_account_holder) ||
                    !!paypalEmailError
                  }
                >
                  {updatePayoutSettingsMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle className="h-4 w-4 mr-2" />
                  )}
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Recent Commissions */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-lg">Recent Commissions</CardTitle>
              </CardHeader>
              <CardContent>
                {commissions && commissions.length > 0 ? (
                  <div className="space-y-2">
                    {commissions.map((commission) => (
                      <div 
                        key={commission.id} 
                        className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                      >
                        <div>
                          <p className="font-medium">
                            £{(commission.commission_amount / 100).toFixed(2)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(commission.created_at), 'dd MMM yyyy, HH:mm')}
                          </p>
                        </div>
                        <Badge variant="outline" className={
                          commission.status === 'paid' 
                            ? 'bg-green-500/10 text-green-500 border-green-500/30'
                            : 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30'
                        }>
                          {commission.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <TrendingUp className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p>No commissions yet</p>
                    <p className="text-sm">Share your referral link to start earning!</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Payout History */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-lg">Payout History</CardTitle>
              </CardHeader>
              <CardContent>
                {pendingPayouts && pendingPayouts.length > 0 ? (
                  <div className="space-y-2">
                    {pendingPayouts.map((payout: any) => (
                      <div 
                        key={payout.id} 
                        className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                      >
                        <div>
                          <p className="font-medium flex items-center gap-2">
                            £{(payout.amount / 100).toFixed(2)}
                            <Badge variant="outline" className="text-xs">
                              {payout.payout_method === 'stripe' ? 'Stripe' : payout.payout_method === 'bank_transfer' ? 'Bank' : 'PayPal'}
                            </Badge>
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(payout.created_at), 'dd MMM yyyy')}
                          </p>
                        </div>
                        <Badge variant="outline" className={
                          payout.status === 'completed' 
                            ? 'bg-green-500/10 text-green-500 border-green-500/30'
                            : payout.status === 'pending'
                            ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30'
                            : 'bg-red-500/10 text-red-500 border-red-500/30'
                        }>
                          {payout.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <CreditCard className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p>No payouts yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </motion.div>
      </div>
    </MainLayout>
  );
}
