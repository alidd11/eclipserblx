import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  DollarSign, 
  TrendingUp, 
  Wallet, 
  ExternalLink, 
  Loader2, 
  CheckCircle, 
  AlertCircle,
  ArrowUpRight,
  Clock
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

const COMMISSION_RATE = 10; // 10% commission
const MINIMUM_PAYOUT = 10; // £10 minimum

export function AffiliateCard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [payoutAmount, setPayoutAmount] = useState('');

  // Check Stripe Connect status
  const { data: connectStatus, isLoading: statusLoading, refetch: refetchStatus } = useQuery({
    queryKey: ['connect-status', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('check-connect-status');
      if (error) throw error;
      return data as {
        hasAccount: boolean;
        isOnboarded: boolean;
        canReceivePayments: boolean;
        accountId?: string;
      };
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
        .from('affiliate_payouts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Create Connect account
  const createAccountMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('create-connect-account');
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data.url) {
        window.open(data.url, '_blank');
      }
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
      const { data, error } = await supabase.functions.invoke('request-affiliate-payout', {
        body: { amount: Math.round(amount * 100) }, // Convert to pence
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Payout Requested",
        description: "Your payout request has been submitted for review.",
      });
      setPayoutAmount('');
      queryClient.invalidateQueries({ queryKey: ['affiliate-payouts', user?.id] });
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

  const availableBalance = (balance?.available_balance || 0) / 100;
  const totalEarned = (balance?.total_earned || 0) / 100;
  const totalPaid = (balance?.total_paid || 0) / 100;
  const hasPendingPayout = pendingPayouts?.some(p => p.status === 'pending');

  if (statusLoading || balanceLoading) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="py-8 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Affiliate Earnings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
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

        {/* Commission Rate Info */}
        <div className="p-4 bg-muted/50 rounded-lg">
          <p className="text-sm font-medium flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-primary" />
            You earn {COMMISSION_RATE}% commission on all referred sales
          </p>
        </div>

        {/* Payout Account Setup */}
        {!connectStatus?.isOnboarded ? (
          <div className="p-4 rounded-lg border border-dashed border-muted-foreground/30 space-y-3">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Set up your payout account</p>
                <p className="text-sm text-muted-foreground">
                  Connect your bank account via Stripe to receive your earnings.
                </p>
              </div>
            </div>
            <Button 
              onClick={() => createAccountMutation.mutate()}
              disabled={createAccountMutation.isPending}
              className="w-full"
            >
              {createAccountMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <ExternalLink className="h-4 w-4 mr-2" />
              )}
              {connectStatus?.hasAccount ? 'Complete Setup' : 'Set Up Payouts'}
            </Button>
          </div>
        ) : (
          <>
            {/* Payout Account Status */}
            <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span className="text-sm font-medium text-green-500">Payout account connected</span>
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
                  Minimum payout: £{MINIMUM_PAYOUT}. Max: £{availableBalance.toFixed(2)}
                </p>
              </div>
            )}

            {hasPendingPayout && (
              <div className="flex items-center gap-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <Clock className="h-5 w-5 text-yellow-500" />
                <span className="text-sm text-yellow-500">You have a pending payout request</span>
              </div>
            )}
          </>
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
                    <p className="text-sm font-medium">
                      £{(payout.amount / 100).toFixed(2)}
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
