import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { 
  DollarSign, TrendingUp, Loader2, CheckCircle, AlertCircle,
  ArrowUpRight, Clock, Send, Users, Gift, Zap, Copy, ExternalLink,
  CreditCard, BadgePercent, Star, Construction, MousePointerClick, UserPlus,
  Link as LinkIcon
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { MainLayout } from '@/components/layout/MainLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useAffiliateSettings } from '@/hooks/useAffiliateSettings';
import { format } from 'date-fns';
import { Link, useSearchParams } from 'react-router-dom';

export default function Affiliate() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const { settings: affiliateSettings, isLoading: settingsLoading } = useAffiliateSettings();
  const [payoutAmount, setPayoutAmount] = useState('');
  const [isConnectingStripe, setIsConnectingStripe] = useState(false);
  
  // Application form state
  const [applicationForm, setApplicationForm] = useState({
    paypal_email: '',
    discord_username: '',
    promotion_method: '',
    audience_size: '',
    notes: '',
    preferred_payout_method: 'stripe' as 'stripe' | 'paypal',
  });

  // Handle Stripe onboarding return
  useEffect(() => {
    if (searchParams.get('stripe_onboarding') === 'complete') {
      toast({
        title: "Stripe Connected!",
        description: "Your Stripe account has been connected successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['affiliate-connect-status'] });
    }
    if (searchParams.get('stripe_refresh') === 'true') {
      toast({
        title: "Session Expired",
        description: "Please try connecting your Stripe account again.",
        variant: "destructive",
      });
    }
  }, [searchParams, toast, queryClient]);

  // Check if user has an application
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
    enabled: !!user?.id && application?.status === 'approved',
  });

  // Check Stripe Connect status
  const { data: connectStatus, isLoading: connectStatusLoading } = useQuery({
    queryKey: ['affiliate-connect-status', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('check-affiliate-connect-status');
      if (error) throw error;
      return data as { hasAccount: boolean; isOnboarded: boolean; canReceivePayments: boolean; accountId: string | null };
    },
    enabled: !!user?.id && application?.status === 'approved' && application?.preferred_payout_method === 'stripe',
  });

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
    enabled: !!user?.id && application?.status === 'approved',
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
    enabled: !!user?.id && application?.status === 'approved',
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

  // Submit application
  const submitApplicationMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id || !user?.email) throw new Error('Not authenticated');
      
      // Insert application with auto-approved status
      const { data: application, error } = await supabase
        .from('affiliate_applications')
        .insert({
          user_id: user.id,
          email: user.email,
          display_name: profile?.display_name || null,
          paypal_email: applicationForm.paypal_email || null,
          discord_username: applicationForm.discord_username || null,
          promotion_method: applicationForm.promotion_method,
          audience_size: applicationForm.audience_size || null,
          notes: applicationForm.notes || null,
          preferred_payout_method: applicationForm.preferred_payout_method,
          status: 'approved',
          reviewed_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      // Create affiliate balance record
      const { error: balanceError } = await supabase
        .from('affiliate_balances')
        .upsert({
          user_id: user.id,
          balance: 0,
          total_earned: 0,
          total_withdrawn: 0,
        }, { onConflict: 'user_id' });

      if (balanceError) throw balanceError;

      // Update profile with PayPal email if provided
      if (applicationForm.paypal_email) {
        await supabase
          .from('profiles')
          .update({ paypal_email: applicationForm.paypal_email })
          .eq('id', user.id);
      }
    },
    onSuccess: () => {
      toast({
        title: "Welcome to the Affiliate Program!",
        description: "Your account is now active. Start earning by sharing your referral link!",
      });
      queryClient.invalidateQueries({ queryKey: ['affiliate-application', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['affiliate-balance', user?.id] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

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
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      setIsConnectingStripe(false);
    },
  });

  // Request payout
  const requestPayoutMutation = useMutation({
    mutationFn: async (amount: number) => {
      const method = application?.preferred_payout_method === 'stripe' && connectStatus?.canReceivePayments
        ? 'stripe'
        : 'paypal';
      
      const { data, error } = await supabase.functions.invoke('request-affiliate-payout', {
        body: { amount: Math.round(amount * 100), method },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast({
        title: data.method === 'stripe' ? "Payout Complete!" : "Payout Requested",
        description: data.message,
      });
      setPayoutAmount('');
      queryClient.invalidateQueries({ queryKey: ['affiliate-payouts', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['affiliate-balance', user?.id] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleRequestPayout = () => {
    const amount = parseFloat(payoutAmount);
    if (isNaN(amount) || amount < affiliateSettings.minimumPayout) {
      toast({
        title: "Invalid Amount",
        description: `Minimum payout is £${affiliateSettings.minimumPayout}`,
        variant: "destructive",
      });
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
      toast({ title: "Copied!", description: "Referral link copied to clipboard" });
    }
  };

  const availableBalance = (balance?.available_balance || 0) / 100;
  const totalEarned = (balance?.total_earned || 0) / 100;
  const totalPaid = (balance?.total_paid || 0) / 100;
  const totalClicks = balance?.total_clicks || 0;
  const totalSignups = balance?.total_signups || 0;
  const conversionRate = totalClicks > 0 ? ((totalSignups / totalClicks) * 100).toFixed(1) : '0.0';
  const hasPendingPayout = pendingPayouts?.some(p => p.status === 'pending');

  const isLoading = applicationLoading || balanceLoading || settingsLoading;

  // Determine if user can use Stripe payouts
  const canUseStripe = application?.preferred_payout_method === 'stripe' && connectStatus?.canReceivePayments;
  const needsStripeOnboarding = application?.preferred_payout_method === 'stripe' && !connectStatus?.canReceivePayments;

  // Benefits for the landing page
  const benefits = [
    {
      icon: BadgePercent,
      title: `${affiliateSettings.commissionRate}% Commission`,
      description: 'Earn on every sale from users you refer',
    },
    {
      icon: TrendingUp,
      title: 'Lifetime Earnings',
      description: 'Earn from all purchases your referrals make',
    },
    {
      icon: CreditCard,
      title: 'Easy Payouts',
      description: `Withdraw earnings once you reach £${affiliateSettings.minimumPayout}`,
    },
    {
      icon: Users,
      title: 'No Limits',
      description: 'Refer as many people as you want',
    },
  ];

  // Program disabled - show coming soon
  if (!affiliateSettings.isEnabled) {
    return (
      <MainLayout>
        <div className="container py-8 max-w-2xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-6"
          >
            <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <Construction className="h-10 w-10 text-primary" />
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-display font-bold">Coming Soon</h1>
              <p className="text-muted-foreground max-w-md mx-auto">
                Our affiliate program is currently being set up. Check back soon for the opportunity to earn commissions by referring customers!
              </p>
            </div>
            <Button asChild variant="outline">
              <Link to="/">
                Return Home
              </Link>
            </Button>
          </motion.div>
        </div>
      </MainLayout>
    );
  }

  // Not logged in - show landing with sign in prompt
  if (!user) {
    return (
      <MainLayout>
        <div className="container py-8 max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            {/* Hero Section */}
            <div className="text-center space-y-4">
              <Badge className="bg-primary/20 text-primary border-primary/30">
                <Star className="h-3 w-3 mr-1" />
                Partner Program
              </Badge>
              <h1 className="text-4xl md:text-5xl font-display font-bold gradient-text">
                Join Our Affiliate Program
              </h1>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Earn {affiliateSettings.commissionRate}% commission on every sale you refer. 
                Share your unique link and start earning today.
              </p>
            </div>

            {/* Benefits Grid */}
            <div className="grid md:grid-cols-2 gap-4">
              {benefits.map((benefit, index) => (
                <motion.div
                  key={benefit.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
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

            {/* CTA */}
            <Card className="bg-gradient-to-br from-primary/20 via-primary/10 to-transparent border-primary/30">
              <CardContent className="py-8 text-center space-y-4">
                <Gift className="h-12 w-12 text-primary mx-auto" />
                <h2 className="text-2xl font-bold">Ready to Start Earning?</h2>
                <p className="text-muted-foreground">
                  Sign in to apply for our affiliate program and get your unique referral link.
                </p>
                <Button asChild size="lg" className="gradient-button">
                  <Link to="/auth">
                    Sign In to Apply
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

  // No application yet - show application form
  if (!application) {
    return (
      <MainLayout>
        <div className="container py-8 max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            {/* Hero */}
            <div className="text-center space-y-4">
              <Badge className="bg-primary/20 text-primary border-primary/30">
                <Star className="h-3 w-3 mr-1" />
                Partner Program
              </Badge>
              <h1 className="text-3xl md:text-4xl font-display font-bold">
                Apply to Become an Affiliate
              </h1>
              <p className="text-muted-foreground max-w-xl mx-auto">
                Earn {affiliateSettings.commissionRate}% lifetime commission on all sales from users you refer.
              </p>
            </div>

            {/* Benefits */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {benefits.map((benefit) => (
                <Card key={benefit.title} className="bg-card/50 border-border text-center">
                  <CardContent className="pt-6">
                    <benefit.icon className="h-8 w-8 text-primary mx-auto mb-2" />
                    <h3 className="font-semibold text-sm">{benefit.title}</h3>
                    <p className="text-xs text-muted-foreground mt-1">{benefit.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Application Form */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Send className="h-5 w-5 text-primary" />
                  Application Form
                </CardTitle>
                <CardDescription>
                  Tell us about yourself and how you plan to promote our products.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Payout Method Selection */}
                <div className="space-y-3">
                  <Label>Preferred Payout Method *</Label>
                  <RadioGroup
                    value={applicationForm.preferred_payout_method}
                    onValueChange={(value: 'stripe' | 'paypal') => 
                      setApplicationForm(prev => ({ ...prev, preferred_payout_method: value }))
                    }
                    className="grid gap-3"
                  >
                    <div className="flex items-start space-x-3 p-4 rounded-lg border border-border hover:border-primary/50 transition-colors cursor-pointer">
                      <RadioGroupItem value="stripe" id="stripe" className="mt-1" />
                      <div className="flex-1">
                        <Label htmlFor="stripe" className="flex items-center gap-2 cursor-pointer font-medium">
                          <CreditCard className="h-4 w-4 text-primary" />
                          Stripe Connect
                          <Badge variant="secondary" className="text-xs">Recommended</Badge>
                        </Label>
                        <p className="text-sm text-muted-foreground mt-1">
                          Automatic instant payouts directly to your bank account. You'll connect your Stripe account after approval.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3 p-4 rounded-lg border border-border hover:border-primary/50 transition-colors cursor-pointer">
                      <RadioGroupItem value="paypal" id="paypal" className="mt-1" />
                      <div className="flex-1">
                        <Label htmlFor="paypal" className="flex items-center gap-2 cursor-pointer font-medium">
                          <DollarSign className="h-4 w-4 text-blue-500" />
                          PayPal
                        </Label>
                        <p className="text-sm text-muted-foreground mt-1">
                          Manual payouts processed within 1-3 business days to your PayPal email.
                        </p>
                      </div>
                    </div>
                  </RadioGroup>
                </div>

                {applicationForm.preferred_payout_method === 'paypal' && (
                  <div className="space-y-2">
                    <Label htmlFor="paypal">PayPal Email *</Label>
                    <Input
                      id="paypal"
                      type="email"
                      placeholder="your@paypal.email"
                      value={applicationForm.paypal_email}
                      onChange={(e) => setApplicationForm(prev => ({ ...prev, paypal_email: e.target.value }))}
                    />
                    <p className="text-xs text-muted-foreground">
                      Payouts will be sent to this email address.
                    </p>
                  </div>
                )}

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="discord">Discord Username (optional)</Label>
                  <Input
                    id="discord"
                    placeholder="username"
                    value={applicationForm.discord_username}
                    onChange={(e) => setApplicationForm(prev => ({ ...prev, discord_username: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="promotion">How will you promote us? *</Label>
                  <Textarea
                    id="promotion"
                    placeholder="E.g., YouTube channel, Discord server, social media, website..."
                    value={applicationForm.promotion_method}
                    onChange={(e) => setApplicationForm(prev => ({ ...prev, promotion_method: e.target.value }))}
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="audience">Audience Size (optional)</Label>
                  <Input
                    id="audience"
                    placeholder="E.g., 5k YouTube subscribers, 1k Discord members"
                    value={applicationForm.audience_size}
                    onChange={(e) => setApplicationForm(prev => ({ ...prev, audience_size: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Additional Notes (optional)</Label>
                  <Textarea
                    id="notes"
                    placeholder="Anything else you'd like us to know..."
                    value={applicationForm.notes}
                    onChange={(e) => setApplicationForm(prev => ({ ...prev, notes: e.target.value }))}
                    rows={2}
                  />
                </div>

                <Button
                  className="w-full gradient-button"
                  onClick={() => submitApplicationMutation.mutate()}
                  disabled={
                    !applicationForm.promotion_method || 
                    (applicationForm.preferred_payout_method === 'paypal' && !applicationForm.paypal_email) ||
                    submitApplicationMutation.isPending
                  }
                >
                  {submitApplicationMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  Submit Application
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </MainLayout>
    );
  }

  // Application pending
  if (application.status === 'pending') {
    return (
      <MainLayout>
        <div className="container py-8 max-w-2xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="bg-card border-border">
              <CardHeader className="text-center">
                <div className="h-16 w-16 rounded-full bg-yellow-500/10 flex items-center justify-center mx-auto mb-4">
                  <Clock className="h-8 w-8 text-yellow-500" />
                </div>
                <CardTitle className="text-2xl">Application Under Review</CardTitle>
                <CardDescription>
                  We're reviewing your affiliate application. You'll be notified once it's approved!
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                  <p className="text-sm text-center text-yellow-500">
                    Submitted on {format(new Date(application.created_at), 'PPP')}
                  </p>
                </div>
                <div className="text-center">
                  <Button variant="outline" asChild>
                    <Link to="/">
                      Return to Home
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </MainLayout>
    );
  }

  // Application rejected
  if (application.status === 'rejected') {
    return (
      <MainLayout>
        <div className="container py-8 max-w-2xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="bg-card border-border">
              <CardHeader className="text-center">
                <div className="h-16 w-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="h-8 w-8 text-red-500" />
                </div>
                <CardTitle className="text-2xl">Application Not Approved</CardTitle>
                <CardDescription>
                  Unfortunately, your affiliate application was not approved at this time.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {application.rejection_reason && (
                  <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">Reason:</span> {application.rejection_reason}
                    </p>
                  </div>
                )}
                <div className="text-center">
                  <Button variant="outline" asChild>
                    <Link to="/">
                      Return to Home
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </MainLayout>
    );
  }

  // Approved affiliate - full dashboard
  return (
    <MainLayout>
      <div className="container py-8 max-w-6xl">
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
          {needsStripeOnboarding && (
            <Card className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-blue-500/30">
              <CardContent className="py-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="h-12 w-12 rounded-lg bg-blue-500/20 flex items-center justify-center shrink-0">
                      <LinkIcon className="h-6 w-6 text-blue-400" />
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
                    className="shrink-0"
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
          <Card className="bg-gradient-to-br from-primary/30 via-primary/20 to-transparent border-primary/40 overflow-hidden relative">
            <div className="absolute top-0 right-0 w-48 h-48 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
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
                  ) : availableBalance >= affiliateSettings.minimumPayout ? (
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
                        />
                      </div>
                      <Button
                        size="lg"
                        className="gradient-button h-12 px-8 text-base font-semibold"
                        onClick={handleRequestPayout}
                        disabled={requestPayoutMutation.isPending || !payoutAmount}
                      >
                        {requestPayoutMutation.isPending ? (
                          <Loader2 className="h-5 w-5 animate-spin mr-2" />
                        ) : (
                          <ArrowUpRight className="h-5 w-5 mr-2" />
                        )}
                        {canUseStripe ? 'Instant Payout' : 'Cash Out'}
                      </Button>
                    </div>
                  ) : (
                    <div className="px-4 py-3 bg-muted/50 rounded-lg">
                      <p className="text-sm text-muted-foreground">
                        Minimum balance for payout: <span className="font-semibold text-foreground">£{affiliateSettings.minimumPayout}</span>
                      </p>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground md:text-right">
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
            </CardContent>
          </Card>

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <Card className="bg-card border-border">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <DollarSign className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-2xl font-bold">£{availableBalance.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">Available</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <TrendingUp className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-2xl font-bold">£{totalEarned.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">Total Earned</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                    <MousePointerClick className="h-5 w-5 text-blue-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-2xl font-bold">{totalClicks.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">Link Clicks</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0">
                    <UserPlus className="h-5 w-5 text-green-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-2xl font-bold">{totalSignups.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">Signups</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card border-border col-span-2 lg:col-span-1">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0">
                    <BadgePercent className="h-5 w-5 text-purple-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-2xl font-bold">{conversionRate}%</p>
                    <p className="text-xs text-muted-foreground">Conversion</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Referral Link */}
          <Card className="bg-card border-border">
            <CardHeader>
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
                            {payout.payout_method === 'stripe' && (
                              <Badge variant="outline" className="text-xs">Stripe</Badge>
                            )}
                            {payout.payout_method === 'paypal' && (
                              <Badge variant="outline" className="text-xs">PayPal</Badge>
                            )}
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
