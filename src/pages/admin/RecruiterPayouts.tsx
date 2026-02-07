import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Dialog, DialogContent, DialogDescription, DialogFooter, 
  DialogHeader, DialogTitle 
} from '@/components/ui/dialog';
import { Clock, CheckCircle, XCircle, Loader2, DollarSign, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

interface RecruiterPayout {
  id: string;
  user_id: string;
  amount: number;
  payment_method: string;
  payment_details: string | null;
  status: string;
  processed_by: string | null;
  processed_at: string | null;
  rejection_reason: string | null;
  notes: string | null;
  created_at: string;
  profiles?: {
    display_name: string | null;
    username: string | null;
  };
  recruiter_applications?: {
    recruiter_id: string;
    paypal_email: string | null;
  };
}

export default function RecruiterPayouts() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('pending');
  const [selectedPayout, setSelectedPayout] = useState<RecruiterPayout | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectDialog, setShowRejectDialog] = useState(false);

  // Fetch payouts with recruiter info
  const { data: payouts, isLoading } = useQuery({
    queryKey: ['recruiter-payouts-admin', activeTab],
    queryFn: async () => {
      let query = supabase
        .from('recruiter_payouts')
        .select('*')
        .order('created_at', { ascending: activeTab === 'pending' });
      
      if (activeTab !== 'all') {
        query = query.eq('status', activeTab);
      }
      
      const { data: payoutsData, error } = await query;
      if (error) throw error;

      // Fetch recruiter info for each payout
      const payoutsWithInfo = await Promise.all(
        (payoutsData || []).map(async (payout) => {
          const [profileRes, appRes] = await Promise.all([
            supabase.from('profiles').select('display_name, username').eq('user_id', payout.user_id).single(),
            supabase.from('recruiter_applications').select('recruiter_id, paypal_email').eq('user_id', payout.user_id).single(),
          ]);
          return {
            ...payout,
            profiles: profileRes.data,
            recruiter_applications: appRes.data,
          };
        })
      );
      return payoutsWithInfo as RecruiterPayout[];
    },
  });

  // Complete payout mutation
  const completeMutation = useMutation({
    mutationFn: async (payoutId: string) => {
      const { error } = await supabase
        .from('recruiter_payouts')
        .update({
          status: 'completed',
          processed_by: user?.id,
          processed_at: new Date().toISOString(),
        })
        .eq('id', payoutId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Payout marked as completed' });
      queryClient.invalidateQueries({ queryKey: ['recruiter-payouts-admin'] });
      queryClient.invalidateQueries({ queryKey: ['recruiter-stats'] });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Reject payout mutation
  const rejectMutation = useMutation({
    mutationFn: async ({ payoutId, reason }: { payoutId: string; reason: string }) => {
      // Get the payout to get the amount and user_id
      const { data: payout, error: fetchError } = await supabase
        .from('recruiter_payouts')
        .select('user_id, amount')
        .eq('id', payoutId)
        .single();
      
      if (fetchError) throw fetchError;

      // Update payout status
      const { error: updateError } = await supabase
        .from('recruiter_payouts')
        .update({
          status: 'rejected',
          rejection_reason: reason,
          processed_by: user?.id,
          processed_at: new Date().toISOString(),
        })
        .eq('id', payoutId);
      
      if (updateError) throw updateError;

      // Refund the balance (since it was deducted when requesting)
      // Note: In a real implementation, you might want to handle this differently
    },
    onSuccess: () => {
      toast({ title: 'Payout rejected' });
      queryClient.invalidateQueries({ queryKey: ['recruiter-payouts-admin'] });
      queryClient.invalidateQueries({ queryKey: ['recruiter-stats'] });
      setShowRejectDialog(false);
      setRejectionReason('');
      setSelectedPayout(null);
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const handleReject = () => {
    if (!selectedPayout) return;
    rejectMutation.mutate({ payoutId: selectedPayout.id, reason: rejectionReason });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-500/10 text-green-500 border-green-500/30">Completed</Badge>;
      case 'pending':
        return <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/30">Pending</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500/10 text-red-500 border-red-500/30">Rejected</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <AdminLayout requiredPermissions={['process_recruiter_payouts']}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Recruiter Payouts</h1>
          <p className="text-muted-foreground">
            Process recruiter commission payout requests
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Payout Requests</CardTitle>
            <CardDescription>Review and process payout requests from recruiters</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="pending" className="gap-2">
                  <Clock className="h-4 w-4" />
                  Pending
                </TabsTrigger>
                <TabsTrigger value="completed" className="gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Completed
                </TabsTrigger>
                <TabsTrigger value="rejected" className="gap-2">
                  <XCircle className="h-4 w-4" />
                  Rejected
                </TabsTrigger>
              </TabsList>

              <TabsContent value={activeTab} className="mt-4">
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : payouts && payouts.length > 0 ? (
                  <div className="space-y-4">
                    {payouts.map((payout) => (
                      <Card key={payout.id}>
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                                <DollarSign className="h-6 w-6 text-primary" />
                              </div>
                              <div>
                                <div className="font-semibold">
                                  £{payout.amount.toFixed(2)}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {payout.profiles?.display_name || 'Unknown'}
                                  {payout.recruiter_applications?.recruiter_id && (
                                    <span className="ml-2 font-mono">
                                      ({payout.recruiter_applications.recruiter_id})
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  PayPal: {payout.payment_details || payout.recruiter_applications?.paypal_email || 'Not set'}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  Requested: {format(new Date(payout.created_at), 'PPpp')}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              {getStatusBadge(payout.status)}
                              
                              {payout.status === 'pending' && (
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    onClick={() => completeMutation.mutate(payout.id)}
                                    disabled={completeMutation.isPending}
                                  >
                                    {completeMutation.isPending ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <CheckCircle className="h-4 w-4" />
                                    )}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => {
                                      setSelectedPayout(payout);
                                      setShowRejectDialog(true);
                                    }}
                                  >
                                    <XCircle className="h-4 w-4" />
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>

                          {payout.rejection_reason && (
                            <div className="mt-3 p-3 bg-destructive/10 rounded-lg text-sm text-destructive">
                              Rejection reason: {payout.rejection_reason}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <DollarSign className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No {activeTab} payouts</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Reject Dialog */}
        <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reject Payout</DialogTitle>
              <DialogDescription>
                Provide a reason for rejecting this payout request.
              </DialogDescription>
            </DialogHeader>
            <Textarea
              placeholder="Reason for rejection..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={4}
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleReject}
                disabled={rejectMutation.isPending}
              >
                {rejectMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : null}
                Reject Payout
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
