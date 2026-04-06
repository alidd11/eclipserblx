import { useState } from 'react';
import { useAffiliateConnectStatus } from '@/hooks/useAffiliateConnectStatus';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
 DollarSign, 
 TrendingUp, 
 Loader2, 
 CheckCircle, 
 ArrowUpRight,
 Clock,
 CreditCard,
 ExternalLink,
 Link as LinkIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { useAffiliateSettings } from '@/hooks/useAffiliateSettings';
import { format } from '@/lib/dateUtils';

export function AffiliateCard() {
 const { user } = useAuth();
 const queryClient = useQueryClient();
 const { settings } = useAffiliateSettings();
 const [payoutAmount, setPayoutAmount] = useState('');
 const [isConnectingStripe, setIsConnectingStripe] = useState(false);
 
 const COMMISSION_RATE = settings.commissionRate;
 const MINIMUM_PAYOUT = settings.minimumPayout;

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

 // Get profile for referral code
 const { data: profile } = useQuery({
  queryKey: ['profile-referral', user?.id],
  queryFn: async () => {
   if (!user?.id) return null;
   const { data, error } = await supabase
    .from('profiles')
    .select('referral_code, display_name')
    .eq('user_id', user.id)
    .single();
   if (error) throw error;
   return data;
  },
  enabled: !!user?.id,
 });

 // Get payment details from dedicated table
 const { data: paymentDetails } = useQuery({
  queryKey: ['user-payment-details', user?.id],
  queryFn: async () => {
   if (!user?.id) return null;
   const { data, error } = await supabase
    .from('user_payment_details')
    .select('preferred_payout_method, stripe_account_id')
    .eq('user_id', user.id)
    .maybeSingle();
   if (error) throw error;
   return data;
  },
  enabled: !!user?.id,
 });

 const { data: connectStatus } = useAffiliateConnectStatus(
  !!user?.id && paymentDetails?.preferred_payout_method === 'stripe'
 );

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
  enabled: !!user?.id,
 });

 // Get pending payouts
 const { data: pendingPayouts } = useQuery({
  queryKey: ['affiliate-payouts', user?.id],
  queryFn: async () => {
   if (!user?.id) return [];
    const { data, error } = await supabase
     .from('affiliate_payouts_safe' as any)
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(5);
   if (error) throw error;
   return data || [];
  },
  enabled: !!user?.id,
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
   toast.error("Error", { description: error.message });
   setIsConnectingStripe(false);
  },
 });

 // Request payout
 const requestPayoutMutation = useMutation({
  mutationFn: async (amount: number) => {
   const method = paymentDetails?.preferred_payout_method === 'stripe' && connectStatus?.canReceivePayments
    ? 'stripe'
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

 const handleRequestPayout = () => {
  const amount = parseFloat(payoutAmount);
  if (isNaN(amount) || amount < MINIMUM_PAYOUT) {
   toast.error("Invalid Amount", { description: `Minimum payout is £${MINIMUM_PAYOUT}` });
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

 const canUseStripe = paymentDetails?.preferred_payout_method === 'stripe' && connectStatus?.canReceivePayments;
 const needsStripeOnboarding = paymentDetails?.preferred_payout_method === 'stripe' && !connectStatus?.canReceivePayments;

 if (balanceLoading) {
  return (
   <div className="border border-border rounded-xl overflow-hidden bg-card">
    <div className="p-4 py-8 flex items-center justify-center">
     <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
   </div>
  );
 }

 // Show earnings dashboard (all users are auto-enrolled)
 return (
  <div className="border border-border rounded-xl overflow-hidden bg-card">
   <div className="px-4 py-3 border-b border-border bg-muted/30">
    <h3 className="font-semibold text-sm flex items-center gap-2">
     <TrendingUp className="h-5 w-5 text-primary" />
     Affiliate Earnings
    </h3>
   </div>
   <div className="p-4 space-y-6">
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
         toast.success("Copied!", { description: "Referral link copied to clipboard" });
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
       {pendingPayouts.map((payout) => (
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
   </div>
  </div>
 );
}
