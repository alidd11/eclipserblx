import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { 
  TrendingUp, Clock, CheckCircle, XCircle, AlertCircle, 
  DollarSign, User, Calendar, FileText, ExternalLink 
} from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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

export default function ManualPayouts() {
  const queryClient = useQueryClient();
  const [selectedRequest, setSelectedRequest] = useState<PayoutRequest | null>(null);
  const [actionType, setActionType] = useState<"approve" | "reject" | null>(null);
  const [notes, setNotes] = useState("");

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
    <AdminLayout requiredRoles={["admin"]}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">Manual Payouts</h1>
          <p className="text-muted-foreground">
            Review and process manual payout requests from affiliates
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingRequests.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Pending Amount</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">£{totalPending.toFixed(2)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Processed</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{processedRequests.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="pending" className="space-y-4">
          <TabsList>
            <TabsTrigger value="pending" className="gap-2">
              <Clock className="h-4 w-4" />
              Pending ({pendingRequests.length})
            </TabsTrigger>
            <TabsTrigger value="processed" className="gap-2">
              <CheckCircle className="h-4 w-4" />
              Processed ({processedRequests.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-4">
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Card key={i}>
                    <CardContent className="p-6">
                      <Skeleton className="h-20 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : pendingRequests.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <TrendingUp className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-semibold">No pending requests</h3>
                  <p className="text-muted-foreground text-sm mt-1">
                    All payout requests have been processed.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {pendingRequests.map((request) => (
                  <Card key={request.id}>
                    <CardContent className="p-6">
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
                              {format(new Date(request.created_at), "PPp")}
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
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="processed" className="space-y-4">
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Card key={i}>
                    <CardContent className="p-6">
                      <Skeleton className="h-20 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : processedRequests.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-semibold">No processed requests</h3>
                  <p className="text-muted-foreground text-sm mt-1">
                    Processed payout requests will appear here.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {processedRequests.map((request) => {
                  const config = statusConfig[request.status as keyof typeof statusConfig] || statusConfig.pending;
                  const StatusIcon = config.icon;
                  
                  return (
                    <Card key={request.id}>
                      <CardContent className="p-6">
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
                                {format(new Date(request.created_at), "PPp")}
                              </span>
                              {request.processed_at && (
                                <span>
                                  Processed: {format(new Date(request.processed_at), "PPp")}
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
                      </CardContent>
                    </Card>
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
                ? `You are about to approve a payout of £${selectedRequest?.amount.toFixed(2)} to ${selectedRequest?.profile?.display_name || "this user"}.`
                : `You are about to reject the payout request of £${selectedRequest?.amount.toFixed(2)} from ${selectedRequest?.profile?.display_name || "this user"}.`
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
              onChange={(e) => setNotes(e.target.value)}
            />
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
