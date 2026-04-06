import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useSellerStatus } from '@/hooks/useSellerStatus';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SellerLayout } from '@/components/seller/SellerLayout';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
  DollarSign, 
  TrendingUp,
  Wallet,
  ArrowDownToLine,
  Clock,
  CheckCircle,
  AlertCircle,
  CreditCard,
  Info,
  ArrowRight,
  Minus
} from 'lucide-react';
import { toast } from 'sonner';
import { useIsInsideHub } from '@/components/admin/AdminHubContext';

export default function SellerBalance() {
  const isInsideHub = useIsInsideHub();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { store, balance, balanceLoading } = useSellerStatus();
  const [showPayoutDialog, setShowPayoutDialog] = useState(false);

  // Fetch payout history
  const { data: payouts, isLoading: payoutsLoading } = useQuery({
    queryKey: ['seller-payouts', store?.id],
    queryFn: async () => {
      if (!store?.id) return [];
      
      const { data, error } = await supabase
        .from('seller_payouts')
        .select('id, amount, status, created_at, processed_at, notes')
        .eq('store_id', store.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data || [];
    },
    enabled: !!store?.id,
  });

  // Request payout mutation
  const requestPayout = useMutation({
    mutationFn: async () => {
      if (!store?.id || !user?.id) throw new Error('Missing store or user');
      if (!balance?.available_balance || balance.available_balance < (minPayoutSetting ?? 5)) {
        throw new Error(`Insufficient balance for payout (minimum £${minPayoutSetting ?? 5})`);
      }
      
      // Use atomic database function to prevent race conditions
      const { data, error } = await supabase.rpc('request_seller_payout', {
        p_store_id: store.id,
        p_seller_id: user.id,
        p_amount: balance.available_balance,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Payout request submitted successfully');
      queryClient.invalidateQueries({ queryKey: ['seller-payouts'] });
      queryClient.invalidateQueries({ queryKey: ['seller-balance'] });
      setShowPayoutDialog(false);
    },
    onError: (error) => {
      toast.error('Failed to request payout: ' + error.message);
    },
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    }).format(amount);
  };

  // Read minimum payout from settings (synced with DB function)
  const { data: minPayoutSetting } = useQuery({
    queryKey: ['seller-min-payout'],
    queryFn: async () => {
      const { data } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'seller_minimum_payout')
        .maybeSingle();
      return data?.value ? parseFloat(String(data.value)) : 5;
    },
    staleTime: 1000 * 60 * 30, // cache 30 min
  });
  const minPayout = minPayoutSetting ?? 5;
  const hasPayoutMethod = 
    store?.paymentDetails?.payouts_enabled || 
    (store?.paymentDetails?.payout_method === 'paypal' && !!store?.paymentDetails?.paypal_email) ||
    (store?.paymentDetails?.payout_method === 'bank_transfer' && !!store?.paymentDetails?.bank_name);
  const canRequestPayout = (balance?.available_balance || 0) >= minPayout && hasPayoutMethod;
  const payoutProgress = Math.min(((balance?.available_balance || 0) / minPayout) * 100, 100);

  const commissionRate = store?.commission_rate || 15;

  const getPayoutStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-600 gap-1"><CheckCircle className="h-3 w-3" /> Completed</Badge>;
      case 'pending':
        return <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" /> Pending</Badge>;
      case 'processing':
        return <Badge variant="default" className="gap-1"><ArrowDownToLine className="h-3 w-3" /> Processing</Badge>;
      case 'failed':
        return <Badge variant="destructive" className="gap-1"><AlertCircle className="h-3 w-3" /> Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <SellerLayout>
      <TooltipProvider>
        <div className="max-w-4xl mx-auto">
          {!isInsideHub && (
            <>
              <div className="mb-4">
                <h1 className="text-2xl font-display font-bold">Balance & Payouts</h1>
                <p className="text-sm text-muted-foreground">
                  Track your net earnings and request payouts
                </p>
              </div>

              <div className="flex items-center gap-6 text-sm mb-6 flex-wrap">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="text-muted-foreground cursor-default">
                      Withdrawable: <span className="font-semibold text-green-500">{balanceLoading ? '...' : formatCurrency(balance?.available_balance || 0)}</span>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent><p className="text-xs">Net earnings available for payout right now.</p></TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="text-muted-foreground cursor-default">
                      Clearing: <span className="font-semibold text-yellow-500">{balanceLoading ? '...' : formatCurrency(balance?.pending_balance || 0)}</span>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent><p className="text-xs">Earnings being processed (7–14 days).</p></TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="text-muted-foreground cursor-default">
                      Lifetime: <span className="font-semibold text-foreground">{balanceLoading ? '...' : formatCurrency(balance?.total_earned || 0)}</span>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent><p className="text-xs">Total net earnings across all time.</p></TooltipContent>
                </Tooltip>
              </div>
            </>
          )}

          {/* How Your Earnings Work - Breakdown Card */}
          <div className="mb-6 border border-blue-500/30 bg-blue-500/5 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-blue-500/20 bg-blue-500/5">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <Info className="h-4 w-4 text-blue-500" />
                How Your Earnings Are Calculated
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">Here's what happens when a customer buys your product</p>
            </div>
            <div className="p-4 space-y-4">
              {/* Visual flow */}
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-2 sm:gap-3">
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Customer pays</p>
                  <p className="text-lg font-bold">£10.00</p>
                  <p className="text-[11px] text-muted-foreground">Sale price</p>
                </div>
                <div className="hidden sm:flex items-center justify-center">
                  <Minus className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Fees deducted</p>
                  <p className="text-lg font-bold text-red-400">-£1.08</p>
                  <p className="text-[11px] text-muted-foreground">~£0.35 Stripe + £0.73 commission</p>
                </div>
                <div className="hidden sm:flex items-center justify-center">
                  <ArrowRight className="h-4 w-4 text-green-500" />
                </div>
                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 text-center">
                  <p className="text-xs text-muted-foreground mb-1">You receive</p>
                  <p className="text-lg font-bold text-green-500">≈£8.20</p>
                  <p className="text-[11px] text-muted-foreground">Your net earnings</p>
                </div>
              </div>

              <div className="text-xs text-muted-foreground space-y-1 pt-1 border-t border-border/50">
                <p>
                  <strong>1.</strong> Stripe charges ~1.5% + £0.20 per UK card transaction (may vary for international cards).
                </p>
                <p>
                  <strong>2.</strong> Eclipse takes a {commissionRate}% commission on the amount after Stripe fees.
                </p>
                <p>
                  <strong>3.</strong> The remaining amount is your <strong>net earnings</strong>, shown in your balance above.
                </p>
                <p className="text-muted-foreground/70 pt-1">
                  Purchases made with store credits skip Stripe fees entirely, meaning higher earnings for you.
                </p>
              </div>
            </div>
          </div>

          {/* Payout Section */}
          <div className="mb-6 border border-border rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-border bg-muted/30">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <ArrowDownToLine className="h-4 w-4" />
                Request Payout
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">Minimum payout amount is {formatCurrency(minPayout)}</p>
            </div>
            <div className="p-4">
              {!hasPayoutMethod ? (
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-yellow-500 mt-0.5" />
                  <div>
                    <p className="font-medium">Payouts Not Enabled</p>
                    <p className="text-sm text-muted-foreground">
                      Please configure a payout method (Stripe Connect, PayPal, or Bank Transfer) in Store Settings to enable payouts.
                    </p>
                  </div>
                </div>
              ) : (balance?.available_balance || 0) < minPayout ? (
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Progress to minimum payout</span>
                      <span>{formatCurrency(balance?.available_balance || 0)} / {formatCurrency(minPayout)}</span>
                    </div>
                    <Progress value={payoutProgress} className="h-3" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    You need {formatCurrency(minPayout - (balance?.available_balance || 0))} more to request a payout.
                  </p>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">You can request a payout!</p>
                    <p className="text-sm text-muted-foreground">
                      Withdrawable: {formatCurrency(balance?.available_balance || 0)}
                    </p>
                  </div>
                  <Button onClick={() => setShowPayoutDialog(true)}>
                    <CreditCard className="h-4 w-4 mr-2" />
                    Request Payout
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Payout History */}
          <div className="border border-border rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-border bg-muted/30">
              <h3 className="font-semibold text-sm">Payout History</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Your past payout requests and their status</p>
            </div>
            <div className="p-4">
              {payoutsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <Skeleton key={i} className="h-16" />
                  ))}
                </div>
              ) : payouts && payouts.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Processed</TableHead>
                        <TableHead>Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payouts.map((payout) => (
                        <TableRow key={payout.id}>
                          <TableCell>
                            {new Date(payout.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="font-medium">
                            {formatCurrency(payout.amount)}
                          </TableCell>
                          <TableCell>{getPayoutStatusBadge(payout.status)}</TableCell>
                          <TableCell>
                            {payout.processed_at 
                              ? new Date(payout.processed_at).toLocaleDateString()
                              : '-'
                            }
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {payout.notes || '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <DollarSign className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-lg font-medium mb-2">No payouts yet</h3>
                  <p className="text-muted-foreground">
                    Your payout history will appear here once you request your first payout.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Payout Confirmation Dialog */}
          <Dialog open={showPayoutDialog} onOpenChange={setShowPayoutDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Request Payout</DialogTitle>
                <DialogDescription>
                  You're requesting a payout of {formatCurrency(balance?.available_balance || 0)}.
                  This will be processed within 3-5 business days.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <div className="bg-muted/50 rounded-lg p-4">
                  <div className="flex justify-between mb-2">
                    <span>Payout Amount</span>
                    <span className="font-bold">{formatCurrency(balance?.available_balance || 0)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Method</span>
                    <span>
                      {store?.paymentDetails?.payout_method === 'paypal' ? 'PayPal' :
                       store?.paymentDetails?.payout_method === 'bank_transfer' ? 'Bank Transfer' :
                       'Stripe'}
                    </span>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowPayoutDialog(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={() => requestPayout.mutate()}
                  disabled={requestPayout.isPending}
                >
                  {requestPayout.isPending ? 'Processing...' : 'Confirm Payout'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </TooltipProvider>
    </SellerLayout>
  );
}
