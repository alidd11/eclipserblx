import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useSellerStatus } from '@/hooks/useSellerStatus';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SellerLayout } from '@/components/seller/SellerLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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

export default function SellerBalance() {
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
        .select('*')
        .eq('store_id', store.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!store?.id,
  });

  // Request payout mutation
  const requestPayout = useMutation({
    mutationFn: async () => {
      if (!store?.id || !user?.id) throw new Error('Missing store or user');
      
      const { error } = await supabase
        .from('seller_payouts')
        .insert({
          store_id: store.id,
          seller_id: user.id,
          amount: balance?.available_balance || 0,
          status: 'pending',
        });

      if (error) throw error;

      // Update balance
      await supabase
        .from('seller_balances')
        .update({
          available_balance: 0,
          pending_balance: (balance?.pending_balance || 0) + (balance?.available_balance || 0),
        })
        .eq('user_id', user.id);
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

  const minPayout = 25;
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
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold">Balance & Payouts</h1>
            <p className="text-muted-foreground">
              Track your net earnings and request payouts
            </p>
          </div>

          {/* Balance Cards - Renamed for clarity */}
          <div className="flex gap-3 overflow-x-auto pb-2 mb-6 -mx-4 px-4 md:mx-0 md:px-0 md:grid md:grid-cols-3 md:overflow-visible">
            <Card className="min-w-[160px] flex-shrink-0 md:min-w-0">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="flex items-center gap-1.5">
                  <CardTitle className="text-sm font-medium">Ready to Withdraw</CardTitle>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-3.5 w-3.5 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[220px]">
                      <p className="text-xs">Your net earnings after all fees and commissions have been deducted. This is the amount you can withdraw right now.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Wallet className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">
                  {balanceLoading ? '...' : formatCurrency(balance?.available_balance || 0)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">After fees & commission</p>
              </CardContent>
            </Card>

            <Card className="min-w-[160px] flex-shrink-0 md:min-w-0">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="flex items-center gap-1.5">
                  <CardTitle className="text-sm font-medium">Clearing</CardTitle>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-3.5 w-3.5 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[220px]">
                      <p className="text-xs">Earnings from recent sales that are still being processed. These will move to your withdrawable balance within 7–14 days.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-yellow-600">
                  {balanceLoading ? '...' : formatCurrency(balance?.pending_balance || 0)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Available in 7–14 days</p>
              </CardContent>
            </Card>

            <Card className="min-w-[160px] flex-shrink-0 md:min-w-0">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="flex items-center gap-1.5">
                  <CardTitle className="text-sm font-medium">Lifetime Net Earnings</CardTitle>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-3.5 w-3.5 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[220px]">
                      <p className="text-xs">The total amount you've earned across all sales, after fees and commissions. Includes withdrawn and pending amounts.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {balanceLoading ? '...' : formatCurrency(balance?.total_earned || 0)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Total after all deductions</p>
              </CardContent>
            </Card>
          </div>

          {/* How Your Earnings Work - Breakdown Card */}
          <Card className="mb-6 border-blue-500/30 bg-blue-500/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Info className="h-4 w-4 text-blue-500" />
                How Your Earnings Are Calculated
              </CardTitle>
              <CardDescription>
                Here's what happens when a customer buys your product
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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
            </CardContent>
          </Card>

          {/* Payout Section */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ArrowDownToLine className="h-5 w-5" />
                Request Payout
              </CardTitle>
              <CardDescription>
                Minimum payout amount is {formatCurrency(minPayout)}
              </CardDescription>
            </CardHeader>
            <CardContent>
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
            </CardContent>
          </Card>

          {/* Payout History */}
          <Card>
            <CardHeader>
              <CardTitle>Payout History</CardTitle>
              <CardDescription>
                Your past payout requests and their status
              </CardDescription>
            </CardHeader>
            <CardContent>
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
                      {payouts.map((payout: any) => (
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
            </CardContent>
          </Card>

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
                    <span>Stripe Connect</span>
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
