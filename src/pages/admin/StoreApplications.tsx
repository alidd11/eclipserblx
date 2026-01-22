import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FileText, Check, X, Clock, ExternalLink, MessageSquare, Loader2 } from 'lucide-react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

interface StoreApplication {
  id: string;
  user_id: string;
  store_name: string;
  store_description: string | null;
  product_category: string | null;
  expected_products: string | null;
  portfolio_url: string | null;
  experience: string | null;
  discord_server_invite: string | null;
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  notes: string | null;
  created_at: string;
  profiles?: {
    display_name: string | null;
    email: string;
    customer_id: string | null;
    discord_username: string | null;
    roblox_username: string | null;
  };
}

export default function StoreApplications() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedApplication, setSelectedApplication] = useState<StoreApplication | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectDialog, setShowRejectDialog] = useState(false);

  const { data: applications, isLoading } = useQuery({
    queryKey: ['admin-store-applications'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('store_applications')
        .select(`
          *,
          profiles:user_id (
            display_name,
            email,
            customer_id,
            discord_username,
            roblox_username
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as StoreApplication[];
    },
  });

  const approveApplication = useMutation({
    mutationFn: async (application: StoreApplication) => {
      // 1. Update application status
      const { error: updateError } = await supabase
        .from('store_applications')
        .update({
          status: 'approved',
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', application.id);

      if (updateError) throw updateError;

      // 2. Create the store with discord server invite
      const slug = application.store_name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

      const { data: store, error: storeError } = await supabase
        .from('stores')
        .insert({
          owner_id: application.user_id,
          name: application.store_name,
          slug: `${slug}-${Date.now().toString(36)}`,
          description: application.store_description,
          discord_invite: application.discord_server_invite,
          status: 'approved',
          is_active: true,
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
        } as any)
        .select()
        .single();

      if (storeError) throw storeError;

      // 3. Create seller balance record
      const { error: balanceError } = await supabase
        .from('seller_balances')
        .insert({
          user_id: application.user_id,
          store_id: store.id,
        } as any);

      if (balanceError) throw balanceError;

      // 4. Lock the user's linked accounts
      const { error: lockError } = await supabase
        .from('profiles')
        .update({
          accounts_locked: true,
          accounts_locked_at: new Date().toISOString(),
        })
        .eq('user_id', application.user_id);

      if (lockError) {
        console.error('Failed to lock accounts:', lockError);
        // Don't fail the whole operation for this
      }

      return store;
    },
    onSuccess: () => {
      toast({ title: 'Application Approved', description: 'Store has been created successfully.' });
      queryClient.invalidateQueries({ queryKey: ['admin-store-applications'] });
      setSelectedApplication(null);
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const rejectApplication = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const { error } = await supabase
        .from('store_applications')
        .update({
          status: 'rejected',
          rejection_reason: reason,
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Application Rejected' });
      queryClient.invalidateQueries({ queryKey: ['admin-store-applications'] });
      setShowRejectDialog(false);
      setSelectedApplication(null);
      setRejectionReason('');
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const pendingApps = applications?.filter(a => a.status === 'pending') || [];
  const approvedApps = applications?.filter(a => a.status === 'approved') || [];
  const rejectedApps = applications?.filter(a => a.status === 'rejected') || [];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/30"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'approved':
        return <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/30"><Check className="h-3 w-3 mr-1" />Approved</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/30"><X className="h-3 w-3 mr-1" />Rejected</Badge>;
      default:
        return null;
    }
  };

  const ApplicationCard = ({ app }: { app: StoreApplication }) => (
    <Card 
      className="cursor-pointer hover:border-primary/50 transition-colors"
      onClick={() => setSelectedApplication(app)}
    >
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-semibold">{app.store_name}</h3>
            <p className="text-sm text-muted-foreground">
              by {app.profiles?.display_name || 'Unknown'} ({app.profiles?.email})
            </p>
          </div>
          {getStatusBadge(app.status)}
        </div>

        {app.store_description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {app.store_description}
          </p>
        )}

        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          {app.product_category && (
            <span className="bg-muted px-2 py-0.5 rounded">{app.product_category}</span>
          )}
          <span>{formatDistanceToNow(new Date(app.created_at), { addSuffix: true })}</span>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <AdminLayout requiredRoles={['admin']}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-display font-bold">Store Applications</h1>
          <p className="text-muted-foreground">Review and manage seller applications</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Pending</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-yellow-500">{pendingApps.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Approved</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-green-500">{approvedApps.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Rejected</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-red-500">{rejectedApps.length}</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="pending">
          <TabsList>
            <TabsTrigger value="pending">
              Pending ({pendingApps.length})
            </TabsTrigger>
            <TabsTrigger value="approved">
              Approved ({approvedApps.length})
            </TabsTrigger>
            <TabsTrigger value="rejected">
              Rejected ({rejectedApps.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="mt-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : pendingApps.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No pending applications
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {pendingApps.map(app => (
                  <ApplicationCard key={app.id} app={app} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="approved" className="mt-4">
            {approvedApps.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No approved applications
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {approvedApps.map(app => (
                  <ApplicationCard key={app.id} app={app} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="rejected" className="mt-4">
            {rejectedApps.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No rejected applications
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {rejectedApps.map(app => (
                  <ApplicationCard key={app.id} app={app} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Application Detail Dialog */}
        <Dialog open={!!selectedApplication} onOpenChange={(open) => !open && setSelectedApplication(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            {selectedApplication && (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    {selectedApplication.store_name}
                  </DialogTitle>
                  <DialogDescription>
                    Application from {selectedApplication.profiles?.display_name || 'Unknown User'}
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    {getStatusBadge(selectedApplication.status)}
                    <span className="text-sm text-muted-foreground">
                      Submitted {formatDistanceToNow(new Date(selectedApplication.created_at), { addSuffix: true })}
                    </span>
                  </div>

                  <div className="grid gap-4">
                    <div>
                      <Label className="text-muted-foreground text-xs">Applicant</Label>
                      <p className="font-medium">{selectedApplication.profiles?.display_name}</p>
                      <p className="text-sm text-muted-foreground">{selectedApplication.profiles?.email}</p>
                      {selectedApplication.profiles?.customer_id && (
                        <p className="text-xs font-mono text-muted-foreground">{selectedApplication.profiles.customer_id}</p>
                      )}
                    </div>

                    {selectedApplication.store_description && (
                      <div>
                        <Label className="text-muted-foreground text-xs">Store Description</Label>
                        <p className="text-sm">{selectedApplication.store_description}</p>
                      </div>
                    )}

                    {selectedApplication.product_category && (
                      <div>
                        <Label className="text-muted-foreground text-xs">Product Category</Label>
                        <p className="text-sm">{selectedApplication.product_category}</p>
                      </div>
                    )}

                    {selectedApplication.expected_products && (
                      <div>
                        <Label className="text-muted-foreground text-xs">Expected Products</Label>
                        <p className="text-sm">{selectedApplication.expected_products}</p>
                      </div>
                    )}

                    {selectedApplication.portfolio_url && (
                      <div>
                        <Label className="text-muted-foreground text-xs">Portfolio</Label>
                        <a 
                          href={selectedApplication.portfolio_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline flex items-center gap-1"
                        >
                          {selectedApplication.portfolio_url}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    )}

                    {selectedApplication.discord_server_invite && (
                      <div>
                        <Label className="text-muted-foreground text-xs">Discord Server Invite</Label>
                        <a 
                          href={selectedApplication.discord_server_invite} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline flex items-center gap-1"
                        >
                          {selectedApplication.discord_server_invite}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    )}

                    {selectedApplication.experience && (
                      <div>
                        <Label className="text-muted-foreground text-xs">Experience</Label>
                        <p className="text-sm">{selectedApplication.experience}</p>
                      </div>
                    )}

                    {selectedApplication.rejection_reason && (
                      <div className="p-3 bg-destructive/10 rounded-lg border border-destructive/30">
                        <Label className="text-destructive text-xs">Rejection Reason</Label>
                        <p className="text-sm">{selectedApplication.rejection_reason}</p>
                      </div>
                    )}
                  </div>
                </div>

                {selectedApplication.status === 'pending' && (
                  <DialogFooter className="gap-2 sm:gap-0">
                    <Button
                      variant="destructive"
                      onClick={() => setShowRejectDialog(true)}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Reject
                    </Button>
                    <Button
                      onClick={() => approveApplication.mutate(selectedApplication)}
                      disabled={approveApplication.isPending}
                    >
                      {approveApplication.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4 mr-2" />
                      )}
                      Approve & Create Store
                    </Button>
                  </DialogFooter>
                )}
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Reject Dialog */}
        <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reject Application</DialogTitle>
              <DialogDescription>
                Please provide a reason for rejection. This will be shown to the applicant.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2">
              <Label htmlFor="rejection-reason">Reason</Label>
              <Textarea
                id="rejection-reason"
                placeholder="Enter rejection reason..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={3}
              />
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => selectedApplication && rejectApplication.mutate({
                  id: selectedApplication.id,
                  reason: rejectionReason,
                })}
                disabled={!rejectionReason.trim() || rejectApplication.isPending}
              >
                {rejectApplication.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : null}
                Reject Application
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
