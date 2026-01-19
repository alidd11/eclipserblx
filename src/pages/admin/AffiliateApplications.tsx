import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { format } from "date-fns";
import { Check, X, Clock, User, Mail, MessageSquare, ExternalLink, Search, Users, DollarSign } from "lucide-react";

interface AffiliateApplication {
  id: string;
  user_id: string;
  email: string;
  display_name: string | null;
  paypal_email: string | null;
  discord_username: string | null;
  promotion_method: string;
  audience_size: string | null;
  notes: string | null;
  status: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  rejection_reason: string | null;
  created_at: string;
}

const AffiliateApplications = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedApplication, setSelectedApplication] = useState<AffiliateApplication | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectDialog, setShowRejectDialog] = useState(false);

  const { data: applications = [], isLoading } = useQuery({
    queryKey: ["affiliate-applications"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("affiliate_applications")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as AffiliateApplication[];
    },
  });

  const { data: stats } = useQuery({
    queryKey: ["affiliate-applications-stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("affiliate_applications")
        .select("status");

      if (error) throw error;

      return {
        pending: data.filter((a) => a.status === "pending").length,
        approved: data.filter((a) => a.status === "approved").length,
        rejected: data.filter((a) => a.status === "rejected").length,
        total: data.length,
      };
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (application: AffiliateApplication) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Update application status
      const { error: appError } = await supabase
        .from("affiliate_applications")
        .update({
          status: "approved",
          reviewed_at: new Date().toISOString(),
          reviewed_by: user.id,
        })
        .eq("id", application.id);

      if (appError) throw appError;

      // Update profile with PayPal email if provided
      if (application.paypal_email) {
        await supabase
          .from("profiles")
          .update({ paypal_email: application.paypal_email })
          .eq("user_id", application.user_id);
      }

      // Create affiliate balance record if not exists
      await supabase
        .from("affiliate_balances")
        .upsert({
          user_id: application.user_id,
          available_balance: 0,
          total_earned: 0,
          total_paid: 0,
        }, { onConflict: "user_id" });
    },
    onSuccess: () => {
      toast.success("Application approved! User is now an affiliate.");
      queryClient.invalidateQueries({ queryKey: ["affiliate-applications"] });
      queryClient.invalidateQueries({ queryKey: ["affiliate-applications-stats"] });
      setSelectedApplication(null);
    },
    onError: (error) => {
      toast.error("Failed to approve: " + error.message);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ application, reason }: { application: AffiliateApplication; reason: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("affiliate_applications")
        .update({
          status: "rejected",
          reviewed_at: new Date().toISOString(),
          reviewed_by: user.id,
          rejection_reason: reason,
        })
        .eq("id", application.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Application rejected.");
      queryClient.invalidateQueries({ queryKey: ["affiliate-applications"] });
      queryClient.invalidateQueries({ queryKey: ["affiliate-applications-stats"] });
      setSelectedApplication(null);
      setShowRejectDialog(false);
      setRejectionReason("");
    },
    onError: (error) => {
      toast.error("Failed to reject: " + error.message);
    },
  });

  const filteredApplications = applications.filter(
    (app) =>
      app.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.display_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.discord_username?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/30"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case "approved":
        return <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/30"><Check className="w-3 h-3 mr-1" />Approved</Badge>;
      case "rejected":
        return <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/30"><X className="w-3 h-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const ApplicationCard = ({ application }: { application: AffiliateApplication }) => (
    <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setSelectedApplication(application)}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <User className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium truncate">{application.display_name || "Unknown"}</span>
              {getStatusBadge(application.status)}
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <Mail className="w-3 h-3" />
              <span className="truncate">{application.email}</span>
            </div>
            <p className="text-sm text-muted-foreground line-clamp-2">{application.promotion_method}</p>
          </div>
          <div className="text-xs text-muted-foreground text-right">
            {format(new Date(application.created_at), "MMM d, yyyy")}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Affiliate Applications</h1>
          <p className="text-muted-foreground">Review and manage affiliate program applications</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-yellow-500/10">
                  <Clock className="w-5 h-5 text-yellow-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats?.pending || 0}</p>
                  <p className="text-xs text-muted-foreground">Pending</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <Check className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats?.approved || 0}</p>
                  <p className="text-xs text-muted-foreground">Approved</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-500/10">
                  <X className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats?.rejected || 0}</p>
                  <p className="text-xs text-muted-foreground">Rejected</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats?.total || 0}</p>
                  <p className="text-xs text-muted-foreground">Total</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or Discord..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Applications Tabs */}
        <Tabs defaultValue="pending">
          <TabsList>
            <TabsTrigger value="pending">Pending ({stats?.pending || 0})</TabsTrigger>
            <TabsTrigger value="approved">Approved ({stats?.approved || 0})</TabsTrigger>
            <TabsTrigger value="rejected">Rejected ({stats?.rejected || 0})</TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
          </TabsList>

          {["pending", "approved", "rejected", "all"].map((tab) => (
            <TabsContent key={tab} value={tab} className="mt-4">
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : (
                <div className="grid gap-3">
                  {filteredApplications
                    .filter((app) => tab === "all" || app.status === tab)
                    .map((application) => (
                      <ApplicationCard key={application.id} application={application} />
                    ))}
                  {filteredApplications.filter((app) => tab === "all" || app.status === tab).length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">No applications found</div>
                  )}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>

        {/* Application Detail Dialog */}
        <Dialog open={!!selectedApplication && !showRejectDialog} onOpenChange={() => setSelectedApplication(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Application Details</DialogTitle>
              <DialogDescription>
                Review this affiliate application
              </DialogDescription>
            </DialogHeader>

            {selectedApplication && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status</span>
                  {getStatusBadge(selectedApplication.status)}
                </div>

                <div className="grid gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Display Name</Label>
                    <p className="font-medium">{selectedApplication.display_name || "Not set"}</p>
                  </div>

                  <div>
                    <Label className="text-xs text-muted-foreground">Email</Label>
                    <p className="font-medium">{selectedApplication.email}</p>
                  </div>

                  {selectedApplication.paypal_email && (
                    <div>
                      <Label className="text-xs text-muted-foreground">PayPal Email</Label>
                      <p className="font-medium flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-green-500" />
                        {selectedApplication.paypal_email}
                      </p>
                    </div>
                  )}

                  {selectedApplication.discord_username && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Discord</Label>
                      <p className="font-medium">{selectedApplication.discord_username}</p>
                    </div>
                  )}

                  <div>
                    <Label className="text-xs text-muted-foreground">How they'll promote</Label>
                    <p className="text-sm bg-muted/50 rounded-lg p-3">{selectedApplication.promotion_method}</p>
                  </div>

                  {selectedApplication.audience_size && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Audience Size</Label>
                      <p className="font-medium">{selectedApplication.audience_size}</p>
                    </div>
                  )}

                  {selectedApplication.notes && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Additional Notes</Label>
                      <p className="text-sm bg-muted/50 rounded-lg p-3">{selectedApplication.notes}</p>
                    </div>
                  )}

                  {selectedApplication.rejection_reason && (
                    <div>
                      <Label className="text-xs text-muted-foreground text-red-500">Rejection Reason</Label>
                      <p className="text-sm bg-red-500/10 rounded-lg p-3 text-red-500">{selectedApplication.rejection_reason}</p>
                    </div>
                  )}

                  <div className="text-xs text-muted-foreground">
                    Applied: {format(new Date(selectedApplication.created_at), "PPpp")}
                  </div>
                </div>

                {selectedApplication.status === "pending" && (
                  <DialogFooter className="gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setShowRejectDialog(true)}
                      className="text-red-500 hover:text-red-600"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Reject
                    </Button>
                    <Button
                      onClick={() => approveMutation.mutate(selectedApplication)}
                      disabled={approveMutation.isPending}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Check className="w-4 h-4 mr-2" />
                      {approveMutation.isPending ? "Approving..." : "Approve"}
                    </Button>
                  </DialogFooter>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Reject Dialog */}
        <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reject Application</DialogTitle>
              <DialogDescription>
                Provide a reason for rejecting this application (optional)
              </DialogDescription>
            </DialogHeader>

            <Textarea
              placeholder="Reason for rejection..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={3}
            />

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => selectedApplication && rejectMutation.mutate({ application: selectedApplication, reason: rejectionReason })}
                disabled={rejectMutation.isPending}
              >
                {rejectMutation.isPending ? "Rejecting..." : "Confirm Reject"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default AffiliateApplications;
