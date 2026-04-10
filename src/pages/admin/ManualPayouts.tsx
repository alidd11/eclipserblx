import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { 
  TrendingUp, Clock, CheckCircle, XCircle, AlertCircle, 
  DollarSign, User, Calendar, FileText, ExternalLink 
} from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, 
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle 
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useIsInsideHub } from '@/components/admin/AdminHubContext';
import { formatGBP } from '@/lib/formatters';

interface PayoutRequest {
  id: string;
  amount: number;
  status: string;
  created_at: string;
  processed_at: string | null;
  processed_by: string | null;
  notes: string | null;
  paypal_email: string | null;
  stripe_account_id: string | null;
  user_id: string;
  profile?: {
    display_name: string | null;
    email: string;
    customer_id: string | null;
  };
}

const statusConfig = {
  pending: { label: "Pending", color: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20", icon: Clock },
  completed: { label: "Completed", color: "bg-green-500/10 text-green-500 border-green-500/20", icon: CheckCircle },
  rejected: { label: "Rejected", color: "bg-red-500/10 text-red-500 border-red-500/20", icon: XCircle },
};

const safeFormatDate = (value: string | null | undefined, pattern: string) => {
  if (!value) return '—';
  try {
    return format(new Date(value), pattern);
  } catch {
    return '—';
  }
};

export default function ManualPayouts() {
  const isInsideHub = useIsInsideHub();
  const queryClient = useQueryClient();
  const [selectedRequest, setSelectedRequest] = useState<PayoutRequest | null>(null);
  const [actionType, setActionType] = useState<"approve" | "reject" | null>(null);
  const [notes, setNotes] = useState("");
  const [manualTab, setManualTab] = useState("pending");

  const { data: requests, isLoading } = useQuery({
    queryKey: ["manual-payout-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("affiliate_payouts")
        .select(`
          *,
          profile:profiles!affiliate_payouts_user_id_fkey(display_name, email, customer_id)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as PayoutRequest[];
    },
  });

  const processMutation = useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: string; notes: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from("affiliate_payouts")
        .update({
          status,
          notes,
          processed_at: new Date().toISOString(),
          processed_by: user?.id,
        })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["manual-payout-requests"] });
      toast.success(actionType === "approve" ? "Payout approved" : "Payout rejected");
      setSelectedRequest(null);
      setActionType(null);
      setNotes("");
    },
    onError: (error) => {
      toast.error("Failed to process payout: " + error.message);
    },
  });

  const handleAction = (request: PayoutRequest, type: "approve" | "reject") => {
    setSelectedRequest(request);
    setActionType(type);
    setNotes("");
  };

  const confirmAction = () => {
    if (!selectedRequest || !actionType) return;
    processMutation.mutate({
      id: selectedRequest.id,
      status: actionType === "approve" ? "completed" : "rejected",
      notes,
    });
  };

  const pendingRequests = requests?.filter(r => r.status === "pending") || [];
  const processedRequests = requests?.filter(r => r.status !== "pending") || [];

  const totalPending = pendingRequests.reduce((sum, r) => sum + r.amount, 0);

  return (
    <AdminLayout requiredPermissions={['manage_affiliates']}>
      <div className="space-y-4">
        {!isInsideHub && (
          <>
            <div>
              <h1 className="text-2xl font-display font-bold">Manual Payouts</h1>
              <p className="text-sm text-muted-foreground">
                Review and process manual payout requests from affiliates
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 md:gap-3">
              <div className="border border-border rounded-xl overflow-hidden bg-card">
                <div className="p-4 p-3 text-center">
                  <Clock className="h-4 w-4 text-muted-foreground mx-auto mb-1" />
                  <div className="text-xl md:text-2xl font-bold">{pendingRequests.length}</div>
                  <p className="text-xs md:text-sm text-muted-foreground">Pending</p>
                </div>
              </div>
              <div className="border border-border rounded-xl overflow-hidden bg-card">
                <div className="p-4 p-3 text-center">
                  <DollarSign className="h-4 w-4 text-muted-foreground mx-auto mb-1" />
                  <div className="text-xl md:text-2xl font-bold">£{totalPending.toFixed(2)}</div>
                  <p className="text-xs md:text-sm text-muted-foreground">Pending Amount</p>
                </div>
              </div>
              <div className="border border-border rounded-xl overflow-hidden bg-card">
                <div className="p-4 p-3 text-center">
                  <CheckCircle className="h-4 w-4 text-muted-foreground mx-auto mb-1" />
                  <div className="text-xl md:text-2xl font-bold">{processedRequests.length}</div>
                  <p className="text-xs md:text-sm text-muted-foreground">Processed</p>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Tabs */}
        <Tabs value={manualTab} onValueChange={setManualTab} className="space-y-4">
          <TabsList className="hidden sm:inline-flex">
            <TabsTrigger value="pending" className="gap-2">
              <Clock className="h-4 w-4" />
              Pending ({pendingRequests.length})
            </TabsTrigger>
            <TabsTrigger value="processed" className="gap-2">
              <CheckCircle className="h-4 w-4" />
              Processed ({processedRequests.length})
            </TabsTrigger>
          </TabsList>
          <div className="sm:hidden">
            <Select value={manualTab} onValueChange={setManualTab}>
              <SelectTrigger className="w-auto min-w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending ({pendingRequests.length})</SelectItem>
                <SelectItem value="processed">Processed ({processedRequests.length})</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <TabsContent value="pending" className="space-y-4">
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i}>
                    <div className="p-4 p-6">
                      <Skeleton className="h-20 w-full" />
                    </div>
                  </div>
                ))}
              </div>
            ) : pendingRequests.length === 0 ? (
              <div className="border border-border rounded-xl overflow-hidden border-dashed">
                <div className="p-4 flex flex-col items-center justify-center py-12 text-center">
                  <TrendingUp className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-semibold">No pending requests</h3>
                  <p className="text-muted-foreground text-sm mt-1">
                    All payout requests have been processed.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingRequests.map((request) => (
                  <div key={request.id}>
                    <div className="p-4 p-6">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">
                              {request.profile?.display_name || "Unknown User"}
                            </span>
                            {request.profile?.customer_id && (
                              <Badge variant="outline" className="text-xs">
                                {request.profile.customer_id}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3.5 w-3.5" />
                              {safeFormatDate(request.created_at, "PPp")}
                            </span>
                            {request.paypal_email && (
                              <span>PayPal: {request.paypal_email}</span>
                            )}
                            {request.stripe_account_id && (
                              <span>Stripe: {request.stripe_account_id}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="text-2xl font-bold">£{request.amount.toFixed(2)}</div>
                            <Badge variant="outline" className={statusConfig.pending.color}>
                              {statusConfig.pending.label}
                            </Badge>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleAction(request, "approve")}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleAction(request, "reject")}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="processed" className="space-y-4">
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i}>
                    <div className="p-4 p-6">
                      <Skeleton className="h-20 w-full" />
                    </div>
                  </div>
                ))}
              </div>
            ) : processedRequests.length === 0 ? (
              <div className="border border-border rounded-xl overflow-hidden border-dashed">
                <div className="p-4 flex flex-col items-center justify-center py-12 text-center">
                  <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-semibold">No processed requests</h3>
                  <p className="text-muted-foreground text-sm mt-1">
                    Processed payout requests will appear here.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {processedRequests.map((request) => {
                  const config = statusConfig[request.status as keyof typeof statusConfig] || statusConfig.pending;
                  const StatusIcon = config.icon;
                  
                  return (
                    <div key={request.id}>
                      <div className="p-4 p-6">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">
                                {request.profile?.display_name || "Unknown User"}
                              </span>
                              {request.profile?.customer_id && (
                                <Badge variant="outline" className="text-xs">
                                  {request.profile.customer_id}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3.5 w-3.5" />
                                {safeFormatDate(request.created_at, "PPp")}
                              </span>
                              {request.processed_at && (
                                <span>
                                  Processed: {safeFormatDate(request.processed_at, "PPp")}
                                </span>
                              )}
                            </div>
                            {request.notes && (
                              <p className="text-sm text-muted-foreground italic">
                                Notes: {request.notes}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <div className="text-2xl font-bold">£{request.amount.toFixed(2)}</div>
                              <Badge variant="outline" className={config.color}>
                                <StatusIcon className="h-3 w-3 mr-1" />
                                {config.label}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={!!selectedRequest && !!actionType} onOpenChange={() => {
        setSelectedRequest(null);
        setActionType(null);
        setNotes("");
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {actionType === "approve" ? "Approve Payout" : "Reject Payout"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {actionType === "approve" 
                ? `You are about to approve a payout of {formatGBP(selectedRequest?.amount)} to ${selectedRequest?.profile?.display_name || "this user"}.`
                : `You are about to reject the payout request of {formatGBP(selectedRequest?.amount)} from ${selectedRequest?.profile?.display_name || "this user"}.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              placeholder={actionType === "approve" 
                ? "e.g., Transferred via PayPal on..." 
                : "e.g., Reason for rejection..."
              }
              value={notes}
              onChange={(e) => {
                if (e.target.value.length <= 1000) setNotes(e.target.value);
              }}
              maxLength={1000}
            />
            <p className="text-xs text-muted-foreground text-right">{notes.length}/1000</p>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmAction}
              className={actionType === "reject" ? "bg-destructive hover:bg-destructive/90" : ""}
              disabled={processMutation.isPending}
            >
              {processMutation.isPending ? "Processing..." : actionType === "approve" ? "Approve" : "Reject"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
