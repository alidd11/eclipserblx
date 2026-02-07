import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { 
  Users, TrendingUp, Loader2, CheckCircle, AlertCircle,
  Clock, Copy, ExternalLink, CreditCard, Star, Construction,
  Target, DollarSign, Building2, Gift, Zap
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { MainLayout } from '@/components/layout/MainLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useRecruiterSettings, getCommissionTier } from '@/hooks/useRecruiterSettings';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';

interface RecruiterApplication {
  id: string;
  user_id: string;
  recruiter_id: string;
  display_name: string | null;
  discord_username: string | null;
  email: string | null;
  promotion_method: string;
  expected_servers: string | null;
  paypal_email: string | null;
  notes: string | null;
  status: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  created_at: string;
}

interface RecruiterBalance {
  user_id: string;
  total_earned: number;
  total_paid: number;
  available_balance: number;
  total_referrals: number;
  qualified_referrals: number;
}

interface RecruiterCommission {
  id: string;
  store_id: string | null;
  server_name: string;
  member_count: number | null;
  commission_amount: number;
  commission_tier: string | null;
  status: string;
  qualified_at: string | null;
  paid_at: string | null;
  created_at: string;
}

export default function Recruiter() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { settings: recruiterSettings, isLoading: settingsLoading } = useRecruiterSettings();
  const [payoutAmount, setPayoutAmount] = useState('');
  
  const [applicationForm, setApplicationForm] = useState({
    discord_username: '',
    promotion_method: '',
    expected_servers: '',
    paypal_email: '',
    notes: '',
  });

  // Check if user has an application
  const { data: application, isLoading: applicationLoading } = useQuery({
    queryKey: ['recruiter-application', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('recruiter_applications')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      return data as RecruiterApplication | null;
    },
    enabled: !!user?.id,
  });

  // Get recruiter balance
  const { data: balance, isLoading: balanceLoading } = useQuery({
    queryKey: ['recruiter-balance', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('recruiter_balances')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      return data as RecruiterBalance | null;
    },
    enabled: !!user?.id && application?.status === 'approved',
  });

  // Get commissions with store progress
  const { data: commissions } = useQuery({
    queryKey: ['recruiter-commissions', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('recruiter_commissions')
        .select('*')
        .eq('recruiter_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as RecruiterCommission[];
    },
    enabled: !!user?.id && application?.status === 'approved',
  });

  // Get pending payouts
  const { data: pendingPayouts } = useQuery({
    queryKey: ['recruiter-payouts', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('recruiter_payouts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id && application?.status === 'approved',
  });

  // Get user profile
  const { data: profile } = useQuery({
    queryKey: ['profile-recruiter', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('display_name, discord_username, paypal_email')
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
      if (!profile) throw new Error('Profile not loaded. Please try again.');
      if (!profile.display_name) throw new Error('Please set a display name in your account settings before applying.');
      if (!applicationForm.promotion_method.trim()) throw new Error('Please describe how you will recruit servers.');
      if (!applicationForm.paypal_email.trim()) throw new Error('PayPal email is required for commission payments.');
      
      const { error } = await supabase
        .from('recruiter_applications')
        .insert({
          user_id: user.id,
          email: user.email,
          display_name: profile.display_name,
          discord_username: applicationForm.discord_username.trim() || profile.discord_username || null,
          promotion_method: applicationForm.promotion_method.trim(),
          expected_servers: applicationForm.expected_servers.trim() || null,
          paypal_email: applicationForm.paypal_email.trim(),
          notes: applicationForm.notes.trim() || null,
          status: 'pending',
        });

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Application Submitted!",
        description: "We'll review your application and get back to you soon.",
      });
      queryClient.invalidateQueries({ queryKey: ['recruiter-application', user?.id] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Request payout
  const requestPayoutMutation = useMutation({
    mutationFn: async (amount: number) => {
      if (!user?.id) throw new Error('Not authenticated');
      
      const { error } = await supabase
        .from('recruiter_payouts')
        .insert({
          user_id: user.id,
          amount,
          payment_method: 'paypal',
          payment_details: application?.paypal_email,
          status: 'pending',
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Payout Requested",
        description: "Your payout request has been submitted for processing.",
      });
      setPayoutAmount('');
      queryClient.invalidateQueries({ queryKey: ['recruiter-payouts', user?.id] });
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
    if (isNaN(amount) || amount < recruiterSettings.minimumPayout) {
      toast({
        title: "Invalid Amount",
        description: `Minimum payout is £${recruiterSettings.minimumPayout}`,
        variant: "destructive",
      });
      return;
    }
    if (amount > (balance?.available_balance || 0)) {
      toast({
        title: "Insufficient Balance",
        description: "You don't have enough available balance.",
        variant: "destructive",
      });
      return;
    }
    requestPayoutMutation.mutate(amount);
  };

  const copyReferralLink = () => {
    if (application?.recruiter_id) {
      navigator.clipboard.writeText(`${window.location.origin}/sell?ref=${application.recruiter_id}`);
      toast({ title: "Copied!", description: "Referral link copied to clipboard" });
    }
  };

  const availableBalance = balance?.available_balance || 0;
  const totalEarned = balance?.total_earned || 0;
  const totalPaid = balance?.total_paid || 0;
  const totalReferrals = balance?.total_referrals || 0;
  const qualifiedReferrals = balance?.qualified_referrals || 0;
  const hasPendingPayout = pendingPayouts?.some(p => p.status === 'pending');

  const isLoading = applicationLoading || balanceLoading || settingsLoading;

  const benefits = [
    {
      icon: DollarSign,
      title: '£5 - £80 Per Signup',
      description: 'Earn based on server size - bigger servers = bigger rewards',
    },
    {
      icon: Target,
      title: 'Simple Requirements',
      description: 'Store must be active with 10+ products for 7 days',
    },
    {
      icon: CreditCard,
      title: 'Easy Payouts',
      description: `Withdraw earnings once you reach £${recruiterSettings.minimumPayout}`,
    },
    {
      icon: Users,
      title: 'No Limits',
      description: 'Recruit as many servers as you want',
    },
  ];

  const commissionTiers = [
    { tier: 'Basic', members: '<500', amount: '£5' },
    { tier: 'Standard', members: '500-2,000', amount: '£15' },
    { tier: 'Premium', members: '2,000-10,000', amount: '£35' },
    { tier: 'Elite', members: '10,000+', amount: '£80' },
  ];

  // Not logged in
  if (!user) {
    return (
      <MainLayout>
        <div className="container py-8 max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            <div className="text-center space-y-4">
              <Badge className="bg-primary/20 text-primary border-primary/30">
                <Star className="h-3 w-3 mr-1" />
                Recruiter Program
              </Badge>
              <h1 className="text-4xl md:text-5xl font-display font-bold gradient-text">
                Become a Seller Recruiter
              </h1>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Earn £5-£80 for every Discord server you recruit to sell on Eclipse. 
                Help us grow the marketplace while earning great commissions.
              </p>
            </div>

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

            <Card>
              <CardHeader className="text-center">
                <CardTitle>Commission Tiers</CardTitle>
                <CardDescription>Earn more for recruiting larger servers</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {commissionTiers.map((tier) => (
                    <div key={tier.tier} className="text-center p-4 rounded-lg bg-muted/50">
                      <div className="text-2xl font-bold text-primary">{tier.amount}</div>
                      <div className="font-medium">{tier.tier}</div>
                      <div className="text-sm text-muted-foreground">{tier.members} members</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="text-center">
              <Button asChild size="lg">
                <Link to="/auth?redirect=/recruiter">
                  Sign In to Apply
                </Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </MainLayout>
    );
  }

  if (isLoading) {
    return (
      <MainLayout>
        <div className="container py-8 flex items-center justify-center min-h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </MainLayout>
    );
  }

  // Pending application
  if (application?.status === 'pending') {
    return (
      <MainLayout>
        <div className="container py-8 max-w-2xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-6"
          >
            <div className="h-20 w-20 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto">
              <Clock className="h-10 w-10 text-amber-500" />
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-display font-bold">Application Under Review</h1>
              <p className="text-muted-foreground max-w-md mx-auto">
                Your recruiter application is being reviewed by our team. 
                We'll notify you once a decision has been made.
              </p>
            </div>
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Application ID</span>
                    <span className="font-mono">{application.recruiter_id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Submitted</span>
                    <span>{format(new Date(application.created_at), 'MMM d, yyyy')}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </MainLayout>
    );
  }

  // Rejected application
  if (application?.status === 'rejected') {
    return (
      <MainLayout>
        <div className="container py-8 max-w-2xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-6"
          >
            <div className="h-20 w-20 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
              <AlertCircle className="h-10 w-10 text-destructive" />
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-display font-bold">Application Not Approved</h1>
              <p className="text-muted-foreground max-w-md mx-auto">
                Unfortunately, your recruiter application was not approved at this time.
              </p>
            </div>
            {application.rejection_reason && (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">{application.rejection_reason}</p>
                </CardContent>
              </Card>
            )}
          </motion.div>
        </div>
      </MainLayout>
    );
  }

  // No application - show application form
  if (!application) {
    return (
      <MainLayout>
        <div className="container py-8 max-w-2xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="text-center space-y-2">
              <Badge className="bg-primary/20 text-primary border-primary/30">
                <Star className="h-3 w-3 mr-1" />
                Recruiter Program
              </Badge>
              <h1 className="text-3xl font-display font-bold">Apply to Become a Recruiter</h1>
              <p className="text-muted-foreground">
                Help us grow the Eclipse marketplace and earn £5-£80 per recruited store.
              </p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Commission Structure</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {commissionTiers.map((tier) => (
                    <div key={tier.tier} className="text-center p-3 rounded-lg bg-muted/50">
                      <div className="text-xl font-bold text-primary">{tier.amount}</div>
                      <div className="text-sm font-medium">{tier.tier}</div>
                      <div className="text-xs text-muted-foreground">{tier.members}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Application Form</CardTitle>
                <CardDescription>Tell us about yourself and how you plan to recruit sellers</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="discord">Discord Username *</Label>
                  <Input
                    id="discord"
                    placeholder="username"
                    value={applicationForm.discord_username}
                    onChange={(e) => setApplicationForm(prev => ({ ...prev, discord_username: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="method">How will you recruit sellers? *</Label>
                  <Textarea
                    id="method"
                    placeholder="Describe your recruitment strategy - e.g., Discord connections, social media, communities you're part of..."
                    value={applicationForm.promotion_method}
                    onChange={(e) => setApplicationForm(prev => ({ ...prev, promotion_method: e.target.value }))}
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="expected">Expected servers per month</Label>
                  <Input
                    id="expected"
                    placeholder="e.g., 5-10 servers"
                    value={applicationForm.expected_servers}
                    onChange={(e) => setApplicationForm(prev => ({ ...prev, expected_servers: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="paypal">PayPal Email *</Label>
                  <Input
                    id="paypal"
                    type="email"
                    placeholder="your@email.com"
                    value={applicationForm.paypal_email}
                    onChange={(e) => setApplicationForm(prev => ({ ...prev, paypal_email: e.target.value }))}
                  />
                  <p className="text-xs text-muted-foreground">Used for commission payments</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Additional Notes</Label>
                  <Textarea
                    id="notes"
                    placeholder="Any other information you'd like to share..."
                    value={applicationForm.notes}
                    onChange={(e) => setApplicationForm(prev => ({ ...prev, notes: e.target.value }))}
                    rows={3}
                  />
                </div>

                <Button 
                  onClick={() => submitApplicationMutation.mutate()}
                  disabled={submitApplicationMutation.isPending}
                  className="w-full"
                >
                  {submitApplicationMutation.isPending ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Submitting...</>
                  ) : (
                    'Submit Application'
                  )}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </MainLayout>
    );
  }

  // Approved - show dashboard
  return (
    <MainLayout>
      <div className="container py-8 max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-display font-bold">Recruiter Dashboard</h1>
              <p className="text-muted-foreground">
                Your recruiter ID: <span className="font-mono">{application.recruiter_id}</span>
              </p>
            </div>
            <Badge variant="outline" className="text-green-500 border-green-500">
              <CheckCircle className="h-3 w-3 mr-1" />
              Active Recruiter
            </Badge>
          </div>

          {/* Stats Grid */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Available Balance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">£{availableBalance.toFixed(2)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Earned</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">£{totalEarned.toFixed(2)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Referrals</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalReferrals}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Qualified</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-500">{qualifiedReferrals}</div>
              </CardContent>
            </Card>
          </div>

          {/* Referral Link */}
          <Card>
            <CardHeader>
              <CardTitle>Your Referral Link</CardTitle>
              <CardDescription>Share this link with Discord servers you want to recruit</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Input 
                  readOnly 
                  value={`${window.location.origin}/sell?ref=${application.recruiter_id}`}
                  className="font-mono text-sm"
                />
                <Button variant="outline" onClick={copyReferralLink}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Commissions List */}
            <Card>
              <CardHeader>
                <CardTitle>Your Referrals</CardTitle>
                <CardDescription>Track progress toward payment eligibility</CardDescription>
              </CardHeader>
              <CardContent>
                {commissions && commissions.length > 0 ? (
                  <div className="space-y-4">
                    {commissions.map((commission) => (
                      <div key={commission.id} className="p-4 rounded-lg border bg-card">
                        <div className="flex items-center justify-between mb-2">
                          <div className="font-medium">{commission.server_name}</div>
                          <Badge variant={
                            commission.status === 'qualified' || commission.status === 'paid' 
                              ? 'default' 
                              : 'secondary'
                          }>
                            {commission.status === 'paid' ? 'Paid' : 
                             commission.status === 'qualified' ? 'Qualified' : 'Pending'}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground mb-2">
                          Commission: £{commission.commission_amount} ({commission.commission_tier})
                        </div>
                        {commission.status === 'pending' && (
                          <p className="text-xs text-muted-foreground">
                            Store must be active with 10+ products for 7 days
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Building2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No referrals yet</p>
                    <p className="text-sm">Share your link to start earning!</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Payout Request */}
            <Card>
              <CardHeader>
                <CardTitle>Request Payout</CardTitle>
                <CardDescription>Minimum payout: £{recruiterSettings.minimumPayout}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Amount (GBP)</Label>
                  <Input
                    type="number"
                    placeholder={`Min £${recruiterSettings.minimumPayout}`}
                    value={payoutAmount}
                    onChange={(e) => setPayoutAmount(e.target.value)}
                    min={recruiterSettings.minimumPayout}
                    max={availableBalance}
                  />
                </div>
                <div className="text-sm text-muted-foreground">
                  PayPal: {application.paypal_email || 'Not set'}
                </div>
                <Button 
                  onClick={handleRequestPayout}
                  disabled={
                    requestPayoutMutation.isPending || 
                    availableBalance < recruiterSettings.minimumPayout ||
                    hasPendingPayout
                  }
                  className="w-full"
                >
                  {requestPayoutMutation.isPending ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Processing...</>
                  ) : hasPendingPayout ? (
                    'Payout Pending'
                  ) : (
                    'Request Payout'
                  )}
                </Button>

                {pendingPayouts && pendingPayouts.length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">Recent Payouts</h4>
                      {pendingPayouts.slice(0, 5).map((payout) => (
                        <div key={payout.id} className="flex justify-between text-sm">
                          <span>£{payout.amount.toFixed(2)}</span>
                          <Badge variant={payout.status === 'completed' ? 'default' : 'secondary'}>
                            {payout.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Terms */}
          <Card>
            <CardHeader>
              <CardTitle>Payment Eligibility</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm dark:prose-invert max-w-none">
              <p className="text-muted-foreground">
                For a referral to become payment-eligible, the recruited store must meet ALL requirements:
              </p>
              <ul className="text-muted-foreground space-y-1">
                <li>✓ Store application approved by Eclipse</li>
                <li>✓ Store is active (not suspended)</li>
                <li>✓ Minimum <strong>10 approved products</strong> listed</li>
                <li>✓ Store running for at least <strong>7 days</strong></li>
                <li>✓ Not a self-referral</li>
              </ul>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </MainLayout>
  );
}
