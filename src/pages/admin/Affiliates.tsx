import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { 
  Users, Gift, CheckCircle, Clock, Search, TrendingUp, 
  DollarSign, CreditCard, AlertCircle, ExternalLink, Loader2
} from 'lucide-react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminStatCard } from '@/components/admin/AdminStatCard';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAffiliateSettings } from '@/hooks/useAffiliateSettings';

export default function AdminAffiliates() {
  const [search, setSearch] = useState('');
  const [payoutStatusFilter, setPayoutStatusFilter] = useState<string>('all');
  const queryClient = useQueryClient();
  const { settings: affiliateSettings, isLoading: affiliateSettingsLoading } = useAffiliateSettings();

  // Stats query
  const { data: stats } = useQuery({
    queryKey: ['admin-affiliate-stats'],
    queryFn: async () => {
      const [commissionsRes, payoutsRes, balancesRes] = await Promise.all([
        supabase.from('affiliate_commissions').select('commission_amount, status'),
        supabase.from('affiliate_payouts').select('amount, status'),
        supabase.from('affiliate_balances').select('available_balance, total_earned'),
      ]);

      const commissions = commissionsRes.data || [];
      const payouts = payoutsRes.data || [];
      const balances = balancesRes.data || [];

      const totalCommissions = commissions.reduce((sum, c) => sum + c.commission_amount, 0);
      const pendingCommissions = commissions.filter(c => c.status === 'pending').reduce((sum, c) => sum + c.commission_amount, 0);
      const pendingPayouts = payouts.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.amount, 0);
      const totalPaidOut = payouts.filter(p => p.status === 'completed').reduce((sum, p) => sum + p.amount, 0);
      const totalAffiliates = balances.length;

      return {
        totalCommissions,
        pendingCommissions,
        pendingPayouts,
        totalPaidOut,
        totalAffiliates,
        pendingPayoutCount: payouts.filter(p => p.status === 'pending').length,
      };
    },
  });

  // Commissions query
  const { data: commissions, isLoading: commissionsLoading } = useQuery({
    queryKey: ['admin-affiliate-commissions', search],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('affiliate_commissions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      // Get user profiles
      const userIds = [...new Set([
        ...data.map(c => c.affiliate_id),
        ...data.map(c => c.referred_user_id),
      ])];

      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name, email')
        .in('user_id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      let enrichedData = data.map(c => ({
        ...c,
        affiliate: profileMap.get(c.affiliate_id),
        referred: profileMap.get(c.referred_user_id),
      }));

      if (search) {
        const searchLower = search.toLowerCase();
        enrichedData = enrichedData.filter((c: any) =>
          c.affiliate?.display_name?.toLowerCase().includes(searchLower) ||
          c.affiliate?.email?.toLowerCase().includes(searchLower) ||
          c.referred?.display_name?.toLowerCase().includes(searchLower) ||
          c.referred?.email?.toLowerCase().includes(searchLower)
        );
      }

      return enrichedData;
    },
  });

  // Payouts query
  const { data: payouts, isLoading: payoutsLoading } = useQuery({
    queryKey: ['admin-affiliate-payouts', payoutStatusFilter],
    queryFn: async () => {
      let query = supabase
        .from('affiliate_payouts')
        .select('*')
        .order('created_at', { ascending: false });

      if (payoutStatusFilter !== 'all') {
        query = query.eq('status', payoutStatusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Get user profiles
      const userIds = [...new Set(data.map(p => p.user_id))];

      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name, email, stripe_account_id')
        .in('user_id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      return data.map(p => ({
        ...p,
        user: profileMap.get(p.user_id),
      }));
    },
  });

  // Process payout mutation
  const processPayoutMutation = useMutation({
    mutationFn: async (payoutId: string) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await supabase.functions.invoke('process-affiliate-payout', {
        body: { payoutId },
      });

      if (response.error) throw new Error(response.error.message);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Payout processed successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-affiliate-payouts'] });
      queryClient.invalidateQueries({ queryKey: ['admin-affiliate-stats'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to process payout');
    },
  });

  // Reject payout mutation
  const rejectPayoutMutation = useMutation({
    mutationFn: async ({ payoutId, reason }: { payoutId: string; reason: string }) => {
      // Get payout details first
      const { data: payout } = await supabase
        .from('affiliate_payouts')
        .select('user_id, amount')
        .eq('id', payoutId)
        .single();

      if (!payout) throw new Error('Payout not found');

      // Update payout status
      const { error } = await supabase
        .from('affiliate_payouts')
        .update({ 
          status: 'rejected', 
          notes: reason,
          processed_at: new Date().toISOString(),
        })
        .eq('id', payoutId);

      if (error) throw error;

      // Refund the balance by incrementing available_balance
      const { data: currentBalance } = await supabase
        .from('affiliate_balances')
        .select('available_balance')
        .eq('user_id', payout.user_id)
        .single();

      if (currentBalance) {
        await supabase
          .from('affiliate_balances')
          .update({ 
            available_balance: currentBalance.available_balance + payout.amount,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', payout.user_id);
      }
    },
    onSuccess: () => {
      toast.success('Payout rejected and balance refunded');
      queryClient.invalidateQueries({ queryKey: ['admin-affiliate-payouts'] });
      queryClient.invalidateQueries({ queryKey: ['admin-affiliate-stats'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to reject payout');
    },
  });

  const formatAmount = (pence: number) => `£${(pence / 100).toFixed(2)}`;

  const getCommissionStatusBadge = (status: string) => {
    const configs: Record<string, { color: string; icon: any }> = {
      pending: { color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30', icon: Clock },
      paid: { color: 'bg-green-500/10 text-green-500 border-green-500/30', icon: CheckCircle },
    };
    const config = configs[status] || configs.pending;
    const Icon = config.icon;

    return (
      <Badge variant="outline" className={config.color}>
        <Icon className="h-3 w-3 mr-1" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getPayoutStatusBadge = (status: string) => {
    const configs: Record<string, { color: string; icon: any }> = {
      pending: { color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30', icon: Clock },
      completed: { color: 'bg-green-500/10 text-green-500 border-green-500/30', icon: CheckCircle },
      rejected: { color: 'bg-red-500/10 text-red-500 border-red-500/30', icon: AlertCircle },
    };
    const config = configs[status] || configs.pending;
    const Icon = config.icon;

    return (
      <Badge variant="outline" className={config.color}>
        <Icon className="h-3 w-3 mr-1" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  return (
    <AdminLayout requiredPermissions={['manage_affiliates']}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-display font-bold">Affiliate Program</h1>
          <p className="text-muted-foreground">Manage commissions, payouts, and affiliate settings</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <AdminStatCard label="Affiliates" value={stats?.totalAffiliates || 0} valueColor="primary" />
          <AdminStatCard label="Total Commissions" value={formatAmount(stats?.totalCommissions || 0)} valueColor="green" />
          <AdminStatCard label="Pending" value={formatAmount(stats?.pendingCommissions || 0)} valueColor="yellow" />
          <AdminStatCard label="Payout Requests" value={stats?.pendingPayoutCount || 0} valueColor="orange" />
          <AdminStatCard label="Total Paid Out" value={formatAmount(stats?.totalPaidOut || 0)} valueColor="blue" />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="payouts" className="space-y-4">
          <TabsList>
            <TabsTrigger value="payouts" className="gap-2">
              <CreditCard className="h-4 w-4" />
              Payout Requests
              {stats?.pendingPayoutCount ? (
                <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 text-xs flex items-center justify-center">
                  {stats.pendingPayoutCount}
                </Badge>
              ) : null}
            </TabsTrigger>
            <TabsTrigger value="commissions" className="gap-2">
              <TrendingUp className="h-4 w-4" />
              Commissions
            </TabsTrigger>
          </TabsList>

          {/* Payout Requests Tab */}
          <TabsContent value="payouts" className="space-y-4">
            <Card className="bg-card border-border">
              <CardHeader>
                <div className="flex flex-col sm:flex-row gap-4 justify-between">
                  <div>
                    <CardTitle>Payout Requests</CardTitle>
                    <CardDescription>Review and process affiliate payout requests</CardDescription>
                  </div>
                  <Select value={payoutStatusFilter} onValueChange={setPayoutStatusFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                {payoutsLoading ? (
                  <div className="py-8 text-center text-muted-foreground">Loading...</div>
                ) : payouts && payouts.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Affiliate</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Payout Method</TableHead>
                          <TableHead>Destination</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {payouts.map((payout: any) => (
                          <TableRow key={payout.id}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{payout.user?.display_name || 'Unknown'}</p>
                                <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">{payout.user?.customer_id || 'N/A'}</code>
                              </div>
                            </TableCell>
                            <TableCell className="font-mono font-medium">
                              {formatAmount(payout.amount)}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={
                                payout.payout_method === 'stripe' 
                                  ? 'bg-purple-500/10 text-purple-400 border-purple-500/30'
                                  : 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                              }>
                                {payout.payout_method === 'stripe' ? 'Stripe' : 'PayPal'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {payout.payout_method === 'stripe' && payout.stripe_account_id ? (
                                <code className="text-xs bg-muted px-2 py-1 rounded">
                                  {payout.stripe_account_id.slice(0, 12)}...
                                </code>
                              ) : payout.paypal_email ? (
                                <span className="text-sm">{payout.paypal_email}</span>
                              ) : (
                                <span className="text-muted-foreground text-sm">N/A</span>
                              )}
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {format(new Date(payout.created_at), 'MMM d, yyyy HH:mm')}
                            </TableCell>
                            <TableCell className="text-right">
                              {payout.status === 'pending' && (
                                <div className="flex gap-2 justify-end">
                                  <Button
                                    size="sm"
                                    onClick={() => processPayoutMutation.mutate(payout.id)}
                                    disabled={processPayoutMutation.isPending || !payout.user?.stripe_account_id}
                                  >
                                    {processPayoutMutation.isPending ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <>
                                        <CheckCircle className="h-4 w-4 mr-1" />
                                        Process
                                      </>
                                    )}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      const reason = prompt('Reason for rejection:');
                                      if (reason) {
                                        rejectPayoutMutation.mutate({ payoutId: payout.id, reason });
                                      }
                                    }}
                                    disabled={rejectPayoutMutation.isPending}
                                  >
                                    Reject
                                  </Button>
                                </div>
                              )}
                              {payout.status === 'completed' && payout.stripe_transfer_id && (
                                <a
                                  href={`https://dashboard.stripe.com/transfers/${payout.stripe_transfer_id}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-primary hover:underline text-sm inline-flex items-center gap-1"
                                >
                                  View Transfer <ExternalLink className="h-3 w-3" />
                                </a>
                              )}
                              {payout.status === 'rejected' && payout.notes && (
                                <span className="text-xs text-muted-foreground">{payout.notes}</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="py-8 text-center text-muted-foreground">
                    <CreditCard className="h-12 w-12 mx-auto mb-3 opacity-20" />
                    <p>No payout requests found</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Commissions Tab */}
          <TabsContent value="commissions" className="space-y-4">
            <Card className="bg-card border-border">
              <CardHeader>
                <div className="flex flex-col sm:flex-row gap-4 justify-between">
                  <div>
                    <CardTitle>Commission History</CardTitle>
                    <CardDescription>View all affiliate commissions earned</CardDescription>
                  </div>
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search affiliates..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {commissionsLoading ? (
                  <div className="py-8 text-center text-muted-foreground">Loading...</div>
                ) : commissions && commissions.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Affiliate</TableHead>
                          <TableHead>Referred User</TableHead>
                          <TableHead>Order Total</TableHead>
                          <TableHead>Commission</TableHead>
                          <TableHead>Rate</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {commissions.map((commission: any) => (
                          <TableRow key={commission.id}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{commission.affiliate?.display_name || 'Unknown'}</p>
                                <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">{commission.affiliate?.customer_id || 'N/A'}</code>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium">{commission.referred?.display_name || 'Unknown'}</p>
                                <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">{commission.referred?.customer_id || 'N/A'}</code>
                              </div>
                            </TableCell>
                            <TableCell className="font-mono">
                              {formatAmount(commission.order_total)}
                            </TableCell>
                            <TableCell className="font-mono font-medium text-green-500">
                              +{formatAmount(commission.commission_amount)}
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary">{(commission.commission_rate * 100).toFixed(0)}%</Badge>
                            </TableCell>
                            <TableCell>{getCommissionStatusBadge(commission.status)}</TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {format(new Date(commission.created_at), 'MMM d, yyyy')}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="py-8 text-center text-muted-foreground">
                    <Gift className="h-12 w-12 mx-auto mb-3 opacity-20" />
                    <p>No commissions recorded yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Program Settings Info */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5" />
              Program Settings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground">Commission Rate</p>
                <p className="text-2xl font-bold">{affiliateSettings.commissionRate}%</p>
                <p className="text-xs text-muted-foreground mt-1">On all referred purchases</p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground">Minimum Payout</p>
                <p className="text-2xl font-bold">£{affiliateSettings.minimumPayout.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground mt-1">Via Stripe or PayPal</p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground">Commission Duration</p>
                <p className="text-2xl font-bold">Lifetime</p>
                <p className="text-xs text-muted-foreground mt-1">On all future purchases</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
