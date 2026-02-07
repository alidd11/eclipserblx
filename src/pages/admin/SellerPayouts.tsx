import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Check, X, Banknote, Loader2 } from "lucide-react";
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
import { format } from "date-fns";

export default function SellerPayouts() {
  const queryClient = useQueryClient();
  const [selectedPayout, setSelectedPayout] = useState<any>(null);
  const [notes, setNotes] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("pending");

  const { data: payouts, isLoading } = useQuery({
    queryKey: ["seller-payouts", filterStatus],
    queryFn: async () => {
      let query = supabase
        .from("seller_payouts")
        .select(`
          *,
          stores (name, store_id, payout_method, paypal_email),
          profiles!seller_payouts_seller_id_fkey (display_name, email)
        `)
        .order("created_at", { ascending: false });

      if (filterStatus !== "all") {
        query = query.eq("status", filterStatus);
      }

      const { data, error } = await query;
      if (error) throw error;
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
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["seller-payouts"] });
      toast.success(`Payout ${variables.status === "completed" ? "completed" : "rejected"}`);
      setSelectedPayout(null);
      setNotes("");
    },
    onError: () => {
      toast.error("Failed to process payout");
    },
  });

  // Wise payout mutation for bank transfers
  const wisePayoutMutation = useMutation({
    mutationFn: async ({ payoutId }: { payoutId: string }) => {
      const { data, error } = await supabase.functions.invoke("wise-payout", {
        body: { action: "process-seller-payout", payoutId },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || "Failed to process Wise payout");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["seller-payouts"] });
      toast.success("Bank transfer initiated via Wise");
      setSelectedPayout(null);
      setNotes("");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to process Wise payout");
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Completed</Badge>;
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>;
      case "processing":
        return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">Processing</Badge>;
      default:
        return <Badge variant="secondary">Pending</Badge>;
    }
  };

  const getPayoutMethodBadge = (payout: any) => {
    const method = payout.stores?.payout_method;
    if (method === 'bank') {
      return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Bank (Wise)</Badge>;
    }
    if (method === 'paypal') {
      return <Badge variant="secondary">PayPal</Badge>;
    }
    return <Badge variant="default">Stripe</Badge>;
  };

  const pendingTotal = payouts?.filter((p: any) => p.status === "pending")
    .reduce((sum: number, p: any) => sum + (p.amount || 0), 0) || 0;

  return (
    <AdminLayout requiredPermissions={['view_seller_payouts']}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Seller Payouts</h1>
            <p className="text-muted-foreground">Process seller payout requests</p>
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="all">All Payouts</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-2">
          <Card>
            <CardHeader className="p-3 pb-1 md:p-6 md:pb-2">
              <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">
                Pending Payouts
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
              <div className="text-lg md:text-2xl font-bold">
                £{pendingTotal.toFixed(2)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="p-3 pb-1 md:p-6 md:pb-2">
              <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">
                Pending Requests
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
              <div className="text-lg md:text-2xl font-bold">
                {payouts?.filter((p: any) => p.status === "pending").length || 0}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="p-0">
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
                        {payout.stores?.payout_method === 'paypal' 
                          ? payout.stores?.paypal_email || "Not set"
                          : payout.stores?.payout_method === 'bank' 
                            ? "Bank Transfer"
                            : payout.stores?.payout_method === 'stripe' 
                              ? "Automatic via Stripe"
                              : "Not configured"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {format(new Date(payout.created_at), "dd MMM yyyy")}
                      </TableCell>
                      <TableCell>{getStatusBadge(payout.status)}</TableCell>
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
          </CardContent>
        </Card>

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
                {selectedPayout?.stores?.payout_method === 'paypal' && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">PayPal Email:</span>
                    <span className="font-medium">
                      {selectedPayout?.stores?.paypal_email || "Not set"}
                    </span>
                  </div>
                )}
                {selectedPayout?.stores?.payout_method === 'bank' && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Transfer via:</span>
                    <span className="font-medium text-blue-400">Wise International Transfer</span>
                  </div>
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
              
              {selectedPayout?.stores?.payout_method === 'bank' ? (
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
