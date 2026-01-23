import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  DollarSign, 
  TrendingUp, 
  Loader2, 
  CheckCircle, 
  AlertCircle,
  ArrowUpRight,
  Clock,
  Send,
  FileText,
  CreditCard,
  ExternalLink,
  Link as LinkIcon
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useAffiliateSettings } from '@/hooks/useAffiliateSettings';
import { format } from 'date-fns';

export function AffiliateCard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { settings } = useAffiliateSettings();
  const [payoutAmount, setPayoutAmount] = useState('');
  const [isConnectingStripe, setIsConnectingStripe] = useState(false);
  
  const COMMISSION_RATE = settings.commissionRate;
  const MINIMUM_PAYOUT = settings.minimumPayout;
  
  // Application form state
  const [applicationForm, setApplicationForm] = useState({
    paypal_email: '',
    discord_username: '',
    promotion_method: '',
    audience_size: '',
    notes: '',
    preferred_payout_method: 'stripe' as 'stripe' | 'paypal',
  });

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

  // Get affiliate balance (only for approved affiliates)
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
  const { data: connectStatus } = useQuery({
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
        .limit(5);
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
        .limit(5);
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
    enabled: !!user?.id && application?.status === 'approved',
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
    if (isNaN(amount) || amount < MINIMUM_PAYOUT) {
      toast({
        title: "Invalid Amount",
        description: `Minimum payout is £${MINIMUM_PAYOUT}`,
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

  const availableBalance = (balance?.available_balance || 0) / 100;
  const totalEarned = (balance?.total_earned || 0) / 100;
  const totalPaid = (balance?.total_paid || 0) / 100;
  const hasPendingPayout = pendingPayouts?.some(p => p.status === 'pending');

  // Determine if user can use Stripe payouts
  const canUseStripe = application?.preferred_payout_method === 'stripe' && connectStatus?.canReceivePayments;
  const needsStripeOnboarding = application?.preferred_payout_method === 'stripe' && !connectStatus?.canReceivePayments;

  if (applicationLoading || balanceLoading) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="py-8 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  // No application yet - show application form
  if (!application) {
    return (
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Join Our Affiliate Program
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
            <p className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-primary" />
              Earn {COMMISSION_RATE}% commission on every sale you refer!
            </p>
          </div>

          <div className="space-y-4">
            {/* Payout Method Selection */}
            <div className="space-y-3">
              <Label>Preferred Payout Method *</Label>
              <RadioGroup
                value={applicationForm.preferred_payout_method}
                onValueChange={(value: 'stripe' | 'paypal') => 
                  setApplicationForm(prev => ({ ...prev, preferred_payout_method: value }))
                }
                className="grid gap-2"
              >
                <div className="flex items-center space-x-3 p-3 rounded-lg border border-border hover:border-primary/50 transition-colors cursor-pointer">
                  <RadioGroupItem value="stripe" id="stripe-card" />
                  <Label htmlFor="stripe-card" className="flex items-center gap-2 cursor-pointer text-sm">
                    <CreditCard className="h-4 w-4 text-primary" />
                    Stripe Connect (Instant)
                  </Label>
                </div>
                <div className="flex items-center space-x-3 p-3 rounded-lg border border-border hover:border-primary/50 transition-colors cursor-pointer">
                  <RadioGroupItem value="paypal" id="paypal-card" />
                  <Label htmlFor="paypal-card" className="flex items-center gap-2 cursor-pointer text-sm">
                    <DollarSign className="h-4 w-4 text-blue-500" />
                    PayPal (Manual)
                  </Label>
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
              className="w-full"
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
          </div>
        </CardContent>
      </Card>
    );
  }

  // Application pending
  if (application.status === 'pending') {
    return (
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Affiliate Program
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-yellow-500">Application Under Review</p>
                <p className="text-sm text-muted-foreground mt-1">
                  We're reviewing your application. You'll be notified once it's approved!
                </p>
              </div>
            </div>
          </div>
          <div className="text-xs text-muted-foreground">
            Submitted: {format(new Date(application.created_at), 'PPp')}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Application rejected
  if (application.status === 'rejected') {
    return (
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Affiliate Program
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-red-500">Application Not Approved</p>
                {application.rejection_reason && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Reason: {application.rejection_reason}
                  </p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Approved affiliate - show earnings dashboard
  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Affiliate Earnings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Stripe Connect Onboarding */}
        {needsStripeOnboarding && (
          <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <div className="flex items-start gap-3">
              <LinkIcon className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-blue-400">Connect Stripe for Instant Payouts</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Connect your Stripe account to receive automatic payouts.
                </p>
                <Button
                  size="sm"
                  className="mt-3"
                  onClick={handleConnectStripe}
                  disabled={isConnectingStripe || connectStripeMutation.isPending}
                >
                  {isConnectingStripe || connectStripeMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <ExternalLink className="h-4 w-4 mr-2" />
                  )}
                  Connect Stripe
                </Button>
              </div>
            </div>
          </div>
        )}

        {canUseStripe && (
          <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span className="text-sm text-green-400">Stripe Connected - Instant payouts enabled</span>
          </div>
        )}

        {/* Balance Overview */}
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-3 rounded-lg bg-primary/10 border border-primary/20">
            <p className="text-2xl font-bold text-primary">£{availableBalance.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">Available</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <p className="text-2xl font-bold">£{totalEarned.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">Total Earned</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <p className="text-2xl font-bold">£{totalPaid.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">Paid Out</p>
          </div>
        </div>

        {/* Your referral link */}
        {profile?.referral_code && (
          <div className="p-4 bg-muted/50 rounded-lg space-y-2">
            <p className="text-sm font-medium">Your Referral Link</p>
            <div className="flex gap-2">
              <Input
                readOnly
                value={`${window.location.origin}?ref=${profile.referral_code}`}
                className="text-xs"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}?ref=${profile.referral_code}`);
                  toast({ title: "Copied!", description: "Referral link copied to clipboard" });
                }}
              >
                Copy
              </Button>
            </div>
          </div>
        )}

        {/* Commission Rate Info */}
        <div className="p-4 bg-muted/50 rounded-lg">
          <p className="text-sm font-medium flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-primary" />
            You earn {COMMISSION_RATE}% commission on all referred sales
          </p>
        </div>

        {/* Request Payout */}
        {availableBalance >= MINIMUM_PAYOUT && !hasPendingPayout && (
          <div className="space-y-3">
            <Label>Request Payout</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">£</span>
                <Input
                  type="number"
                  min={MINIMUM_PAYOUT}
                  max={availableBalance}
                  step="0.01"
                  placeholder={MINIMUM_PAYOUT.toString()}
                  value={payoutAmount}
                  onChange={(e) => setPayoutAmount(e.target.value)}
                  className="pl-7"
                />
              </div>
              <Button
                onClick={handleRequestPayout}
                disabled={requestPayoutMutation.isPending || !payoutAmount}
              >
                {requestPayoutMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowUpRight className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Minimum payout: £{MINIMUM_PAYOUT}. {canUseStripe ? 'Instant via Stripe.' : 'Via Stripe (instant) or PayPal (1-3 days).'}
            </p>
          </div>
        )}

        {hasPendingPayout && (
          <div className="flex items-center gap-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
            <Clock className="h-5 w-5 text-yellow-500" />
            <span className="text-sm text-yellow-500">You have a pending payout request</span>
          </div>
        )}

        {/* Recent Commissions */}
        {commissions && commissions.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Recent Commissions</p>
            <div className="space-y-2">
              {commissions.map((commission) => (
                <div 
                  key={commission.id} 
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div>
                    <p className="text-sm font-medium">
                      £{(commission.commission_amount / 100).toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(commission.created_at), 'dd MMM yyyy')}
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
          </div>
        )}

        {/* Recent Payouts */}
        {pendingPayouts && pendingPayouts.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Payout History</p>
            <div className="space-y-2">
              {pendingPayouts.map((payout: any) => (
                <div 
                  key={payout.id} 
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div>
                    <p className="text-sm font-medium flex items-center gap-2">
                      £{(payout.amount / 100).toFixed(2)}
                      {payout.payout_method && (
                        <Badge variant="outline" className="text-xs capitalize">
                          {payout.payout_method}
                        </Badge>
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
          </div>
        )}
      </CardContent>
    </Card>
  );
}
