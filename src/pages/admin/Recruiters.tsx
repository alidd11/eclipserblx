import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users, DollarSign, CheckCircle, Clock, XCircle, 
  Search, Eye, ChevronRight, TrendingUp, Building2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

interface RecruiterApplication {
  id: string;
  user_id: string;
  recruiter_id: string;
  display_name: string | null;
  discord_username: string | null;
  email: string | null;
  promotion_method: string;
  expected_servers: string | null;
  paypal_email: string | null;
  status: string;
  created_at: string;
}

interface RecruiterStats {
  total_recruiters: number;
  pending_applications: number;
  total_commissions: number;
  pending_payouts: number;
}

export default function Recruiters() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('approved');

  // Fetch stats
  const { data: stats } = useQuery({
    queryKey: ['recruiter-stats'],
    queryFn: async () => {
      const [recruiters, pending, commissions, payouts] = await Promise.all([
        supabase.from('recruiter_applications').select('id', { count: 'exact' }).eq('status', 'approved'),
        supabase.from('recruiter_applications').select('id', { count: 'exact' }).eq('status', 'pending'),
        supabase.from('recruiter_commissions').select('commission_amount').eq('status', 'qualified'),
        supabase.from('recruiter_payouts').select('amount').eq('status', 'pending'),
      ]);

      return {
        total_recruiters: recruiters.count || 0,
        pending_applications: pending.count || 0,
        total_commissions: commissions.data?.reduce((sum, c) => sum + (c.commission_amount || 0), 0) || 0,
        pending_payouts: payouts.data?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0,
      } as RecruiterStats;
    },
  });

  // Fetch applications by status
  const { data: applications, isLoading } = useQuery({
    queryKey: ['recruiter-applications', activeTab],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recruiter_applications')
        .select('*')
        .eq('status', activeTab)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  // Filter by search
  const filteredApplications = applications?.filter(app => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      app.display_name?.toLowerCase().includes(query) ||
      app.recruiter_id?.toLowerCase().includes(query) ||
      app.discord_username?.toLowerCase().includes(query) ||
      app.email?.toLowerCase().includes(query)
    );
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-500/10 text-green-500 border-green-500/30">Approved</Badge>;
      case 'pending':
        return <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/30">Pending</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500/10 text-red-500 border-red-500/30">Rejected</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <AdminLayout requiredPermissions={['view_recruiters']}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Recruiter Program</h1>
          <p className="text-muted-foreground">
            Manage seller recruiters and their commissions
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Users className="h-4 w-4" />
                Active Recruiters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.total_recruiters || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Pending Applications
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-500">{stats?.pending_applications || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Qualified Commissions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">£{(stats?.total_commissions || 0).toFixed(2)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Pending Payouts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">£{(stats?.pending_payouts || 0).toFixed(2)}</div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/admin/recruiter-applications')}>
            Review Applications
          </Button>
          <Button variant="outline" onClick={() => navigate('/admin/recruiter-payouts')}>
            Process Payouts
          </Button>
          <Button variant="outline" onClick={() => navigate('/admin/recruiter-commissions')}>
            View Commissions
          </Button>
        </div>

        {/* Recruiters List */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recruiters</CardTitle>
                <CardDescription>All recruiter applications and status</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search recruiters..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 w-[250px]"
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="approved" className="gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Approved
                </TabsTrigger>
                <TabsTrigger value="pending" className="gap-2">
                  <Clock className="h-4 w-4" />
                  Pending
                </TabsTrigger>
                <TabsTrigger value="rejected" className="gap-2">
                  <XCircle className="h-4 w-4" />
                  Rejected
                </TabsTrigger>
              </TabsList>

              <TabsContent value={activeTab} className="mt-4">
                {isLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading...</div>
                ) : filteredApplications && filteredApplications.length > 0 ? (
                  <div className="space-y-3">
                    {filteredApplications.map((app) => (
                      <div
                        key={app.id}
                        onClick={() => navigate(`/admin/recruiters/${app.user_id}`)}
                        className={cn(
                          "flex items-center justify-between p-4 rounded-lg border bg-card cursor-pointer",
                          "transition-all duration-150 hover:bg-muted/50 hover:border-primary/30"
                        )}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold">{app.display_name || 'Unknown'}</span>
                            <span className="text-sm font-mono text-muted-foreground">{app.recruiter_id}</span>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {app.discord_username && <span>@{app.discord_username}</span>}
                            {app.email && <span className="ml-2">{app.email}</span>}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            Applied: {format(new Date(app.created_at), 'MMM d, yyyy')}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {getStatusBadge(app.status)}
                          <ChevronRight className="h-5 w-5 text-muted-foreground" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Building2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No {activeTab} applications found</p>
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
