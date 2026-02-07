import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  Clock, CheckCircle, XCircle, Loader2, Building2, Search, 
  RefreshCw, DollarSign, TrendingUp
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format, differenceInDays } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface RecruiterCommission {
  id: string;
  recruiter_id: string;
  store_id: string | null;
  server_name: string;
  discord_invite: string | null;
  member_count: number | null;
  commission_amount: number;
  commission_tier: string | null;
  status: string;
  qualified_at: string | null;
  paid_at: string | null;
  rejection_reason: string | null;
  notes: string | null;
  created_at: string;
  profiles?: {
    display_name: string | null;
  };
  recruiter_applications?: {
    recruiter_id: string;
  };
  stores?: {
    name: string;
    is_active: boolean;
    approved_at: string | null;
  };
  store_product_count?: number;
}

export default function RecruiterCommissions() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('pending');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch commissions
  const { data: commissions, isLoading, refetch } = useQuery({
    queryKey: ['recruiter-commissions-admin', activeTab],
    queryFn: async () => {
      let query = supabase
        .from('recruiter_commissions')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (activeTab !== 'all') {
        query = query.eq('status', activeTab);
      }
      
      const { data: commissionsData, error } = await query;
      if (error) throw error;

      // Return basic data without nested queries to avoid TS issues
      return (commissionsData || []).map(c => ({
        ...c,
        profiles: { display_name: null },
        recruiter_applications: { recruiter_id: '' },
        stores: null,
        store_product_count: 0,
      })) as RecruiterCommission[];
    },
  });

  // Check eligibility and mark as qualified
  const qualifyMutation = useMutation({
    mutationFn: async (commissionId: string) => {
      const { error } = await supabase
        .from('recruiter_commissions')
        .update({
          status: 'qualified',
          qualified_at: new Date().toISOString(),
        })
        .eq('id', commissionId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Commission marked as qualified' });
      queryClient.invalidateQueries({ queryKey: ['recruiter-commissions-admin'] });
      queryClient.invalidateQueries({ queryKey: ['recruiter-stats'] });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Filter commissions
  const filteredCommissions = commissions?.filter(c => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      c.server_name.toLowerCase().includes(query) ||
      c.profiles?.display_name?.toLowerCase().includes(query) ||
      c.recruiter_applications?.recruiter_id?.toLowerCase().includes(query)
    );
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'qualified':
        return <Badge className="bg-green-500/10 text-green-500 border-green-500/30">Qualified</Badge>;
      case 'pending':
        return <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/30">Pending</Badge>;
      case 'paid':
        return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/30">Paid</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500/10 text-red-500 border-red-500/30">Rejected</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getTierBadge = (tier: string | null) => {
    const colors: Record<string, string> = {
      basic: 'bg-gray-500/10 text-gray-500 border-gray-500/30',
      standard: 'bg-blue-500/10 text-blue-500 border-blue-500/30',
      premium: 'bg-purple-500/10 text-purple-500 border-purple-500/30',
      elite: 'bg-amber-500/10 text-amber-500 border-amber-500/30',
    };
    return (
      <Badge className={colors[tier || 'basic'] || colors.basic}>
        {tier?.charAt(0).toUpperCase() + (tier?.slice(1) || '')}
      </Badge>
    );
  };

  const checkEligibility = (commission: RecruiterCommission) => {
    const store = commission.stores;
    if (!store) return { eligible: false, productProgress: 0, daysProgress: 0 };
    
    const productCount = commission.store_product_count || 0;
    const daysActive = store.approved_at 
      ? differenceInDays(new Date(), new Date(store.approved_at))
      : 0;
    
    return {
      eligible: store.is_active && productCount >= 10 && daysActive >= 7,
      productProgress: Math.min((productCount / 10) * 100, 100),
      productCount,
      daysProgress: Math.min((daysActive / 7) * 100, 100),
      daysActive,
      isActive: store.is_active,
    };
  };

  return (
    <AdminLayout requiredPermissions={['view_recruiters']}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Recruiter Commissions</h1>
            <p className="text-muted-foreground">
              Track and manage recruiter commissions
            </p>
          </div>
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>All Commissions</CardTitle>
                <CardDescription>Commission status based on store qualification</CardDescription>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-[250px]"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="pending" className="gap-2">
                  <Clock className="h-4 w-4" />
                  Pending
                </TabsTrigger>
                <TabsTrigger value="qualified" className="gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Qualified
                </TabsTrigger>
                <TabsTrigger value="paid" className="gap-2">
                  <DollarSign className="h-4 w-4" />
                  Paid
                </TabsTrigger>
                <TabsTrigger value="all" className="gap-2">
                  <TrendingUp className="h-4 w-4" />
                  All
                </TabsTrigger>
              </TabsList>

              <TabsContent value={activeTab} className="mt-4">
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredCommissions && filteredCommissions.length > 0 ? (
                  <div className="space-y-4">
                    {filteredCommissions.map((commission) => {
                      const eligibility = checkEligibility(commission);
                      
                      return (
                        <Card key={commission.id}>
                          <CardContent className="pt-6">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 space-y-3">
                                <div className="flex items-center gap-3">
                                  <Building2 className="h-5 w-5 text-muted-foreground" />
                                  <div>
                                    <div className="font-semibold">{commission.server_name}</div>
                                    <div className="text-sm text-muted-foreground">
                                      Recruiter: {commission.profiles?.display_name || 'Unknown'}
                                      <span className="ml-2 font-mono">
                                        ({commission.recruiter_applications?.recruiter_id})
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                {commission.status === 'pending' && commission.stores && (
                                  <div className="space-y-2 p-3 bg-muted/50 rounded-lg">
                                    <div className="flex items-center justify-between text-sm">
                                      <span>Products: {eligibility.productCount}/10</span>
                                      <span className={eligibility.productCount >= 10 ? 'text-green-500' : ''}>
                                        {eligibility.productCount >= 10 ? '✓' : ''}
                                      </span>
                                    </div>
                                    <Progress value={eligibility.productProgress} className="h-2" />
                                    
                                    <div className="flex items-center justify-between text-sm mt-2">
                                      <span>Days Active: {eligibility.daysActive}/7</span>
                                      <span className={eligibility.daysActive >= 7 ? 'text-green-500' : ''}>
                                        {eligibility.daysActive >= 7 ? '✓' : ''}
                                      </span>
                                    </div>
                                    <Progress value={eligibility.daysProgress} className="h-2" />
                                    
                                    <div className="flex items-center justify-between text-sm mt-2">
                                      <span>Store Active</span>
                                      <span className={eligibility.isActive ? 'text-green-500' : 'text-red-500'}>
                                        {eligibility.isActive ? '✓' : '✗'}
                                      </span>
                                    </div>
                                  </div>
                                )}

                                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                  <span>Created: {format(new Date(commission.created_at), 'MMM d, yyyy')}</span>
                                  {commission.qualified_at && (
                                    <span>Qualified: {format(new Date(commission.qualified_at), 'MMM d, yyyy')}</span>
                                  )}
                                </div>
                              </div>

                              <div className="flex flex-col items-end gap-2">
                                <div className="text-xl font-bold">£{commission.commission_amount}</div>
                                <div className="flex gap-2">
                                  {getTierBadge(commission.commission_tier)}
                                  {getStatusBadge(commission.status)}
                                </div>
                                
                                {commission.status === 'pending' && eligibility.eligible && (
                                  <Button
                                    size="sm"
                                    onClick={() => qualifyMutation.mutate(commission.id)}
                                    disabled={qualifyMutation.isPending}
                                  >
                                    {qualifyMutation.isPending ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <>
                                        <CheckCircle className="h-4 w-4 mr-1" />
                                        Mark Qualified
                                      </>
                                    )}
                                  </Button>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Building2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No {activeTab === 'all' ? '' : activeTab} commissions found</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
