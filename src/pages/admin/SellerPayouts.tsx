import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Check, X, Banknote, Loader2, Clock, AlertCircle, RefreshCw } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format, formatDistanceToNow } from "date-fns";
import { useIsInsideHub } from '@/components/admin/AdminHubContext';

const safeFmt = (dateStr: string | null | undefined, fmt_str: string) => {
  if (!dateStr) return '—';
  try { return format(new Date(dateStr), fmt_str); } catch { return '—'; }
};

export default function SellerPayouts() {
  const isInsideHub = useIsInsideHub();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [selectedPayout, setSelectedPayout] = useState<any>(null);
  const [notes, setNotes] = useState("");
  const [localFilterStatus, setLocalFilterStatus] = useState<string>("pending");
  const filterStatus = isInsideHub ? (searchParams.get("sellerStatus") || "pending") : localFilterStatus;

  const { data: payouts, isLoading, isError, error: queryError, refetch } = useQuery({
    queryKey: ["seller-payouts", filterStatus],
    queryFn: async () => {
      let query = supabase
        .from("seller_payouts")
        .select(`
          *,
          stores!seller_payouts_store_id_fkey (name, store_id, payout_method, store_payment_details (paypal_email, bank_name, bank_account_holder, bank_account_number, bank_swift_bic, bank_country, bank_routing_number)),
          profiles!seller_payouts_seller_id_fkey (display_name, email)
        `)
        .order("created_at", { ascending: false });

      if (filterStatus !== "all") {
        query = query.eq("status", filterStatus);
      }

      const { data, error } = await query;
      if (error) {
        console.error("[SellerPayouts] Query error:", error);
        throw error;
      }
      return data;
    },
  });

  const processMutation = useMutation({
    mutationFn: async ({ payoutId, status, notes }: { payoutId: string; status: string; notes: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const payout = payouts?.find((p: any) => p.id === payoutId);
      
      const { error } = await supabase
        .from("seller_payouts")
        .update({
          status,
          notes,
          processed_at: new Date().toISOString(),
          processed_by: user?.id,
        })
        .eq("id", payoutId);

      if (error) throw error;

      // If completed, update seller balance
      if (status === "completed" && payout) {
        const { data: currentBalance } = await supabase
          .from("seller_balances")
          .select("available_balance, total_paid")
          .eq("user_id", payout.seller_id)
          .single();
        
        if (currentBalance) {
          await supabase
            .from("seller_balances")
            .update({
              available_balance: Math.max(0, (currentBalance.available_balance || 0) - payout.amount),
              total_paid: (currentBalance.total_paid || 0) + payout.amount,
            })
            .eq("user_id", payout.seller_id);
        }
      }

      // If rejected, restore funds to seller's available balance
      if (status === "rejected" && payout) {
        const { data: currentBalance } = await supabase
          .from("seller_balances")
          .select("available_balance")
          .eq("user_id", payout.seller_id)
          .single();
        
        if (currentBalance) {
          await supabase
            .from("seller_balances")
            .update({
              available_balance: (currentBalance.available_balance || 0) + payout.amount,
            })
            .eq("user_id", payout.seller_id);
        }
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["seller-payouts"] });
      toast.success(`Payout ${variables.status === "completed" ? "completed" : "rejected"}`);
      setSelectedPayout(null);
      setNotes("");
    },
    onError: (error: any) => {
      console.error("[SellerPayouts] Process error:", error);
      toast.error(error?.message || "Failed to process payout");
    },
  });

  // Wise payout mutation for bank transfers
  const wisePayoutMutation = useMutation({
    mutationFn: async ({ payoutId }: { payoutId: string }) => {
      const { data, error } = await supabase.functions.invoke("wise-payout", {
        body: { action: "process-seller-payout", payoutId },
      });

      if (error) throw error;
      if (!data.success && !data.awaiting_funds) throw new Error(data.error || "Failed to process Wise payout");
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["seller-payouts"] });
      
      if (data.awaiting_funds) {
        toast.info(data.message || "Wise balance low - Stripe funding initiated. Payout will complete in 1-2 business days.");
      } else {
        toast.success("Bank transfer initiated via Wise");
      }
      
      setSelectedPayout(null);
      setNotes("");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to process Wise payout");
    },
  });

  const getStatusBadge = (status: string, payout?: any) => {
    const autoTag = payout?.auto_processed ? (
      <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-[10px] ml-1">Auto</Badge>
    ) : null;

    switch (status) {
      case "completed":
        return <span className="flex items-center gap-1"><Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Completed</Badge>{autoTag}</span>;
      case "rejected":
        return <span className="flex items-center gap-1"><Badge variant="destructive">Rejected</Badge>{autoTag}</span>;
      case "processing":
        return <span className="flex items-center gap-1"><Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Processing</Badge>{autoTag}</span>;
      case "awaiting_funds":
        return (
          <span className="flex items-center gap-1">
            <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Awaiting Funds
            </Badge>
            {autoTag}
          </span>
        );
      default:
        return <Badge variant="secondary">Pending</Badge>;
    }
  };

  const getPayoutMethodBadge = (payout: any) => {
    const method = payout.payout_method || payout.stores?.payout_method;
    if (method === 'bank' || method === 'bank_transfer') {
      return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Bank Transfer</Badge>;
    }
    if (method === 'paypal') {
      return <Badge variant="secondary">PayPal</Badge>;
    }
    return <Badge variant="default">Stripe</Badge>;
  };

  const getPayoutMethod = (payout: any) => payout?.payout_method || payout?.stores?.payout_method;
  const isBankMethod = (method: string | undefined) => method === 'bank' || method === 'bank_transfer';

  /** Safely access store_payment_details regardless of PostgREST returning object or array */
  const getPaymentDetails = (payout: any) => {
    const spd = payout?.stores?.store_payment_details;
    if (!spd) return null;
    return Array.isArray(spd) ? spd[0] : spd;
  };

  const getEstimatedArrival = (payout: any) => {
    try {
      if (payout.funding_requested_at) {
        const requestedAt = new Date(payout.funding_requested_at);
        const estimatedArrival = new Date(requestedAt);
        estimatedArrival.setDate(estimatedArrival.getDate() + 2);
        return format(estimatedArrival, "dd MMM yyyy");
      }
    } catch { /* fall through */ }
    return "1-2 business days";
  };

  const pendingTotal = payouts?.filter((p: any) => p.status === "pending")
    .reduce((sum: number, p: any) => sum + (p.amount || 0), 0) || 0;

  return (
    <AdminLayout requiredPermissions={['view_seller_payouts']}>
      <div className="space-y-6">
        {!isInsideHub && (
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-display font-bold">Seller Payouts</h1>
              <p className="text-sm text-muted-foreground">Process seller payout requests</p>
            </div>
          </div>
        )}

        {!isInsideHub && (
          <div className="flex items-center justify-end">
            <Select value={filterStatus} onValueChange={setLocalFilterStatus}>
              <SelectTrigger className="w-auto min-w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="awaiting_funds">Awaiting Funds</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="all">All Payouts</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {!isInsideHub && (
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 md:grid md:grid-cols-2 md:overflow-visible">
            <div className="border border-border rounded-xl overflow-hidden min-w-[160px] flex-shrink-0 md:min-w-0">
              <div className="px-4 py-3 border-b border-border bg-muted/30 p-3 pb-1 md:p-6 md:pb-2">
                <h3 className="font-semibold text-sm text-xs md:text-sm font-medium text-muted-foreground">
                  Pending Payouts
                </h3>
              </div>
              <div className="p-4 p-3 pt-0 md:p-6 md:pt-0">
                <div className="text-lg md:text-2xl font-bold">
                  £{pendingTotal.toFixed(2)}
                </div>
              </div>
            </div>
            <div className="border border-border rounded-xl overflow-hidden min-w-[160px] flex-shrink-0 md:min-w-0">
              <div className="px-4 py-3 border-b border-border bg-muted/30 p-3 pb-1 md:p-6 md:pb-2">
                <h3 className="font-semibold text-sm text-xs md:text-sm font-medium text-muted-foreground">
                  Pending Requests
                </h3>
              </div>
              <div className="p-4 p-3 pt-0 md:p-6 md:pt-0">
                <div className="text-lg md:text-2xl font-bold">
                  {payouts?.filter((p: any) => p.status === "pending").length || 0}
                </div>
              </div>
            </div>
          </div>
        )}

        {isError && (
          <div className="border border-border rounded-xl overflow-hidden border-destructive/30 bg-destructive/5">
            <div className="p-4 pt-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
                <div className="flex-1">
                  <p className="font-medium text-destructive">Failed to load payouts</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {(queryError as any)?.message || 'Something went wrong while fetching payout data.'}
                  </p>
                  <Button variant="outline" size="sm" onClick={() => refetch()} className="mt-3 gap-2">
                    <RefreshCw className="h-3.5 w-3.5" />
                    Retry
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="border border-border rounded-xl overflow-hidden">
          <div className="p-4 p-0">
            {/* Desktop table */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Seller</TableHead>
                    <TableHead>Store</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Payout Method</TableHead>
                    <TableHead>Payout Details</TableHead>
                    <TableHead>Requested</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8">
                        Loading...
                      </TableCell>
                    </TableRow>
                  ) : payouts?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        No payout requests found
                      </TableCell>
                    </TableRow>
                  ) : (
                    payouts?.map((payout: any) => (
                      <TableRow key={payout.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{payout.profiles?.display_name}</p>
                            <p className="text-sm text-muted-foreground">{payout.profiles?.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>{payout.stores?.name}</TableCell>
                        <TableCell className="font-medium">£{payout.amount?.toFixed(2)}</TableCell>
                        <TableCell>
                          {getPayoutMethodBadge(payout)}
                        </TableCell>
                        <TableCell className="text-sm">
                          {(() => {
                            const method = getPayoutMethod(payout);
                            if (method === 'paypal')
                              return payout.paypal_email || getPaymentDetails(payout)?.paypal_email || "Not set";
                            if (isBankMethod(method))
                              return "Bank Transfer";
                            if (method === 'stripe')
                              return "Automatic via Stripe";
                            return "Not configured";
                          })()}
                        </TableCell>
                        <TableCell className="text-sm">
                          {safeFmt(payout.created_at, "dd MMM yyyy")}
                        </TableCell>
                        <TableCell>{getStatusBadge(payout.status, payout)}</TableCell>
                        <TableCell>
                          {payout.status === "pending" && (
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => setSelectedPayout(payout)}
                            >
                              <Check className="h-4 w-4 mr-1" />
                              Process
                            </Button>
                          )}
                          {payout.status === "awaiting_funds" && (
                            <div className="flex flex-col gap-1">
                              <span className="text-xs text-amber-400 flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                Stripe → Wise funding in progress
                              </span>
                              <span className="text-xs text-muted-foreground">
                                Est. arrival: {getEstimatedArrival(payout)}
                              </span>
                              {payout.failure_reason && (
                                <span className="text-xs text-destructive flex items-center gap-1">
                                  <AlertCircle className="h-3 w-3" />
                                  {payout.failure_reason}
                                </span>
                              )}
                            </div>
                          )}
                          {payout.status === "processing" && (
                            <span className="text-sm text-muted-foreground flex items-center gap-1">
                              <Loader2 className="h-3 w-3 animate-spin" />
                              Wise transfer in progress
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Mobile card layout */}
            <div className="md:hidden">
              {isLoading ? (
                <div className="p-8 text-center text-muted-foreground">Loading...</div>
              ) : payouts?.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">No payout requests found</div>
              ) : (
                <div className="divide-y divide-border">
                  {payouts?.map((payout: any) => (
                    <div key={payout.id} className="p-4 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-medium truncate">{payout.profiles?.display_name}</p>
                          <p className="text-xs text-muted-foreground truncate">{payout.stores?.name}</p>
                        </div>
                        <span className="text-lg font-bold flex-shrink-0">£{payout.amount?.toFixed(2)}</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {getStatusBadge(payout.status, payout)}
                        {getPayoutMethodBadge(payout)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        <span>{safeFmt(payout.created_at, "dd MMM yyyy")}</span>
                        {getPayoutMethod(payout) === 'paypal' && (
                          <span className="ml-2">
                            PayPal: {payout.paypal_email || getPaymentDetails(payout)?.paypal_email || "Not set"}
                          </span>
                        )}
                        {isBankMethod(getPayoutMethod(payout)) && (
                          <span className="ml-2">
                            Bank: {getPaymentDetails(payout)?.bank_name || 'Transfer'}
                          </span>
                        )}
                      </div>
                      {payout.status === "pending" && (
                        <Button
                          size="sm"
                          variant="default"
                          className="w-full"
                          onClick={() => setSelectedPayout(payout)}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Process
                        </Button>
                      )}
                      {payout.status === "awaiting_funds" && (
                        <div className="text-xs space-y-0.5">
                          <span className="text-amber-400 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Funding in progress · Est: {getEstimatedArrival(payout)}
                          </span>
                          {payout.failure_reason && (
                            <span className="text-destructive flex items-center gap-1">
                              <AlertCircle className="h-3 w-3" />
                              {payout.failure_reason}
                            </span>
                          )}
                        </div>
                      )}
                      {payout.status === "processing" && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Wise transfer in progress
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <Dialog open={!!selectedPayout} onOpenChange={() => setSelectedPayout(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Process Payout</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Seller:</span>
                  <span className="font-medium">{selectedPayout?.profiles?.display_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount:</span>
                  <span className="font-medium text-lg">£{selectedPayout?.amount?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Payout Method:</span>
                  {selectedPayout && getPayoutMethodBadge(selectedPayout)}
                </div>
                {getPayoutMethod(selectedPayout) === 'paypal' && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">PayPal Email:</span>
                    <span className="font-medium">
                      {selectedPayout?.paypal_email || getPaymentDetails(selectedPayout)?.paypal_email || "Not set"}
                    </span>
                  </div>
                )}
                {isBankMethod(getPayoutMethod(selectedPayout)) && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Bank:</span>
                      <span className="font-medium">{getPaymentDetails(selectedPayout)?.bank_name || 'N/A'} ({getPaymentDetails(selectedPayout)?.bank_country || 'N/A'})</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Account Holder:</span>
                      <span className="font-medium">{getPaymentDetails(selectedPayout)?.bank_account_holder || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">IBAN:</span>
                      <span className="font-medium font-mono text-xs">{getPaymentDetails(selectedPayout)?.bank_account_number || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">SWIFT/BIC:</span>
                      <span className="font-medium font-mono text-xs">{getPaymentDetails(selectedPayout)?.bank_swift_bic || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Transfer via:</span>
                      <span className="font-medium text-blue-400">Wise International Transfer</span>
                    </div>
                    <div className="p-2 bg-blue-500/10 border border-blue-500/20 rounded text-xs text-blue-400">
                      💡 If Wise balance is insufficient, funds will automatically be pulled from Stripe (1-2 business days).
                    </div>
                  </>
                )}
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Notes</label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add processing notes..."
                  className="mt-1"
                />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setSelectedPayout(null)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                disabled={processMutation.isPending || wisePayoutMutation.isPending}
                onClick={() => processMutation.mutate({
                  payoutId: selectedPayout.id,
                  status: "rejected",
                  notes,
                })}
              >
                {processMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4 mr-1" />}
                Reject
              </Button>
              
              {isBankMethod(getPayoutMethod(selectedPayout)) ? (
                <Button
                  variant="default"
                  disabled={wisePayoutMutation.isPending || processMutation.isPending}
                  onClick={() => wisePayoutMutation.mutate({ payoutId: selectedPayout.id })}
                >
                  {wisePayoutMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  ) : (
                    <Banknote className="h-4 w-4 mr-1" />
                  )}
                  Send via Wise
                </Button>
              ) : (
                <Button
                  variant="default"
                  disabled={processMutation.isPending}
                  onClick={() => processMutation.mutate({
                    payoutId: selectedPayout.id,
                    status: "completed",
                    notes,
                  })}
                >
                  {processMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 mr-1" />}
                  Mark as Paid
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
