import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FileText, Check, X, Clock, ExternalLink, Loader2, Shield, Users, Award, Mail, ShoppingBag, UserCheck, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

interface VerificationResults {
  discord_server?: {
    valid: boolean;
    is_permanent: boolean;
    guild_name?: string;
    member_count?: number;
    error?: string;
  };
  roblox_group?: {
    in_group: boolean;
    group_name?: string;
    role?: string;
    rank?: number;
    error?: string;
  };
  roblox_badges?: {
    required: string[];
    owned: string[];
    missing: string[];
    all_owned: boolean;
  };
  account_age?: {
    days: number;
    meets_requirement: boolean;
    required_days: number;
  };
  email_verified?: boolean;
  purchase_history?: {
    count: number;
    total_spent: number;
    meets_requirement: boolean;
    required_count: number;
  };
  identity_consistency?: {
    discord_username: string;
    roblox_username: string;
    similarity_score: number;
    is_consistent: boolean;
  };
}

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
  verification_results?: VerificationResults;
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
            username,
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

  const getVerificationScore = (results?: VerificationResults) => {
    if (!results) return { passed: 0, total: 0 };
    let passed = 0;
    let total = 0;

    if (results.account_age) {
      total++;
      if (results.account_age.meets_requirement) passed++;
    }
    if (typeof results.email_verified === 'boolean') {
      total++;
      if (results.email_verified) passed++;
    }
    if (results.discord_server) {
      total++;
      if (results.discord_server.valid && results.discord_server.is_permanent) passed++;
    }
    if (results.roblox_group) {
      total++;
      if (results.roblox_group.in_group) passed++;
    }
    if (results.purchase_history) {
      total++;
      if (results.purchase_history.meets_requirement) passed++;
    }
    if (results.identity_consistency) {
      total++;
      if (results.identity_consistency.is_consistent) passed++;
    }

    return { passed, total };
  };

  const ApplicationCard = ({ app }: { app: StoreApplication }) => {
    const score = getVerificationScore(app.verification_results);
    const hasWarnings = score.total > 0 && score.passed < score.total;

    return (
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
            <div className="flex items-center gap-2">
              {hasWarnings && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Verification issues detected</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              {getStatusBadge(app.status)}
            </div>
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
            {score.total > 0 && (
              <span className={`flex items-center gap-1 ${score.passed === score.total ? 'text-green-500' : 'text-yellow-500'}`}>
                <Shield className="h-3 w-3" />
                {score.passed}/{score.total}
              </span>
            )}
            <span>{formatDistanceToNow(new Date(app.created_at), { addSuffix: true })}</span>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <AdminLayout requiredPermissions={['view_store_applications']}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-display font-bold">Store Applications</h1>
          <p className="text-muted-foreground">Review and manage seller applications</p>
        </div>

        <div className="grid grid-cols-3 gap-3 md:gap-4">
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

                  {/* Verification Results Section */}
                  {selectedApplication.verification_results && (
                    <VerificationResultsCard results={selectedApplication.verification_results} />
                  )}

                  <div className="grid gap-4">
                    <div>
                      <Label className="text-muted-foreground text-xs">Applicant</Label>
                      <p className="font-medium">{selectedApplication.profiles?.display_name}</p>
                      <p className="text-sm text-muted-foreground">{selectedApplication.profiles?.email}</p>
                      {selectedApplication.profiles?.customer_id && (
                        <p className="text-xs font-mono text-muted-foreground">{selectedApplication.profiles.customer_id}</p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-muted-foreground text-xs">Discord</Label>
                        <p className="text-sm">{selectedApplication.profiles?.discord_username || 'Not linked'}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground text-xs">Roblox</Label>
                        <p className="text-sm">{selectedApplication.profiles?.roblox_username || 'Not linked'}</p>
                      </div>
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
              <Label htmlFor="rejectionReason">Rejection Reason</Label>
              <Textarea
                id="rejectionReason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Explain why this application is being rejected..."
                rows={4}
              />
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  if (selectedApplication) {
                    rejectApplication.mutate({
                      id: selectedApplication.id,
                      reason: rejectionReason,
                    });
                  }
                }}
                disabled={!rejectionReason.trim() || rejectApplication.isPending}
              >
                {rejectApplication.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <X className="h-4 w-4 mr-2" />
                )}
                Reject Application
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}

function VerificationResultsCard({ results }: { results: VerificationResults }) {
  const items = [];

  // Account Age
  if (results.account_age) {
    items.push({
      icon: Clock,
      label: `Account Age: ${results.account_age.days} days`,
      passed: results.account_age.meets_requirement,
      detail: `Required: ${results.account_age.required_days}+ days`,
    });
  }

  // Email Verified
  if (typeof results.email_verified === 'boolean') {
    items.push({
      icon: Mail,
      label: 'Email Verified',
      passed: results.email_verified,
    });
  }

  // Discord Server
  if (results.discord_server) {
    const ds = results.discord_server;
    items.push({
      icon: ExternalLink,
      label: ds.guild_name ? `Discord: ${ds.guild_name}` : 'Discord Server',
      passed: ds.valid && ds.is_permanent,
      detail: ds.member_count ? `${ds.member_count.toLocaleString()} members` : ds.error,
    });
  }

  // Roblox Group
  if (results.roblox_group) {
    const rg = results.roblox_group;
    items.push({
      icon: Users,
      label: rg.group_name ? `Group: ${rg.group_name}` : 'Roblox Group',
      passed: rg.in_group,
      detail: rg.role ? `Role: ${rg.role}` : rg.error,
    });
  }

  // Roblox Badges
  if (results.roblox_badges) {
    const rb = results.roblox_badges;
    items.push({
      icon: Award,
      label: `Badges: ${rb.owned.length}/${rb.required.length}`,
      passed: rb.all_owned,
      detail: rb.missing.length > 0 ? `Missing: ${rb.missing.join(', ')}` : 'All owned',
    });
  }

  // Purchase History
  if (results.purchase_history) {
    const ph = results.purchase_history;
    items.push({
      icon: ShoppingBag,
      label: `Purchases: ${ph.count} (£${ph.total_spent.toFixed(2)})`,
      passed: ph.meets_requirement,
      detail: ph.required_count > 0 ? `Required: ${ph.required_count}+ orders` : undefined,
    });
  }

  // Identity Consistency
  if (results.identity_consistency) {
    const ic = results.identity_consistency;
    items.push({
      icon: UserCheck,
      label: `Identity Match: ${ic.similarity_score}%`,
      passed: ic.is_consistent,
      detail: `Discord: ${ic.discord_username} | Roblox: ${ic.roblox_username}`,
    });
  }

  if (items.length === 0) return null;

  const passedCount = items.filter(i => i.passed).length;
  const percentage = Math.round((passedCount / items.length) * 100);

  return (
    <Card className="border-muted">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Shield className="h-4 w-4" />
          Verification Report
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2">
          <Progress value={percentage} className="flex-1" />
          <span className="text-sm font-medium">{passedCount}/{items.length}</span>
        </div>

        <div className="grid gap-2 text-sm">
          {items.map((item, index) => (
            <div key={index} className="flex items-start gap-2">
              {item.passed ? (
                <CheckCircle className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
              ) : (
                <XCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              )}
              <item.icon className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <span className={item.passed ? 'text-green-600 dark:text-green-400' : 'text-destructive'}>
                  {item.label}
                </span>
                {item.detail && (
                  <p className="text-xs text-muted-foreground">{item.detail}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
