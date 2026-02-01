import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Users, Gift, CheckCircle, Clock, Search, TrendingUp } from 'lucide-react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';

export default function AdminReferrals() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { data: stats } = useQuery({
    queryKey: ['admin-referral-stats'],
    queryFn: async () => {
      const { data: referrals, error } = await supabase
        .from('referrals')
        .select('status, created_at');
      
      if (error) throw error;
      
      const total = referrals?.length || 0;
      const completed = referrals?.filter(r => r.status === 'completed').length || 0;
      const pending = referrals?.filter(r => r.status === 'pending').length || 0;
      const conversionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
      
      return { total, completed, pending, conversionRate };
    },
  });

  const { data: referrals, isLoading } = useQuery({
    queryKey: ['admin-referrals', search, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('referrals')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      
      // Fetch profiles for referrers and referred users
      const userIds = [...new Set([
        ...data.map(r => r.referrer_id),
        ...data.filter(r => r.referred_id).map(r => r.referred_id)
      ])];
      
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name, email')
        .in('user_id', userIds);
      
      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
      
      const enrichedData = data.map(r => ({
        ...r,
        referrer: profileMap.get(r.referrer_id),
        referred: r.referred_id ? profileMap.get(r.referred_id) : null,
      }));
      
      // Filter by search
      if (search) {
        const searchLower = search.toLowerCase();
        return enrichedData.filter((r: any) => 
          r.referral_code?.toLowerCase().includes(searchLower) ||
          r.referrer?.display_name?.toLowerCase().includes(searchLower) ||
          r.referrer?.email?.toLowerCase().includes(searchLower) ||
          r.referred?.display_name?.toLowerCase().includes(searchLower) ||
          r.referred?.email?.toLowerCase().includes(searchLower)
        );
      }
      
      return enrichedData;
    },
  });

  const { data: rewards } = useQuery({
    queryKey: ['admin-referral-rewards'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('referral_rewards')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      
      // Fetch profiles and discount codes
      const userIds = [...new Set(data.map(r => r.user_id))];
      const discountIds = [...new Set(data.filter(r => r.discount_code_id).map(r => r.discount_code_id))];
      
      const [profilesRes, discountsRes] = await Promise.all([
        supabase.from('profiles').select('user_id, display_name, email').in('user_id', userIds),
        discountIds.length > 0 
          ? supabase.from('discount_codes').select('id, code, discount_value, discount_type').in('id', discountIds)
          : { data: [] }
      ]);
      
      const profileMap = new Map<string, any>(profilesRes.data?.map(p => [p.user_id, p] as [string, any]) || []);
      const discountMap = new Map<string, any>(discountsRes.data?.map((d: any) => [d.id, d] as [string, any]) || []);
      
      return data.map(r => ({
        ...r,
        user: profileMap.get(r.user_id),
        discount_code: r.discount_code_id ? discountMap.get(r.discount_code_id) : null,
      }));
    },
  });

  const getStatusBadge = (status: string) => {
    const configs: Record<string, { color: string; icon: any }> = {
      pending: { color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30', icon: Clock },
      completed: { color: 'bg-green-500/10 text-green-500 border-green-500/30', icon: CheckCircle },
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
    <AdminLayout requiredPermissions={['view_affiliate_analytics']}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-display font-bold">Referrals</h1>
          <p className="text-muted-foreground">Track and manage user referrals</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Card className="bg-card border-border">
            <CardContent className="p-3 md:pt-6 md:p-6">
              <div className="flex items-center gap-2 md:gap-3">
                <div className="p-1.5 md:p-2 rounded-lg bg-primary/10">
                  <Users className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                </div>
                <div>
                  <p className="text-lg md:text-2xl font-bold">{stats?.total || 0}</p>
                  <p className="text-xs text-muted-foreground">Total</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-card border-border">
            <CardContent className="p-3 md:pt-6 md:p-6">
              <div className="flex items-center gap-2 md:gap-3">
                <div className="p-1.5 md:p-2 rounded-lg bg-green-500/10">
                  <CheckCircle className="h-4 w-4 md:h-5 md:w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-lg md:text-2xl font-bold">{stats?.completed || 0}</p>
                  <p className="text-xs text-muted-foreground">Completed</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-card border-border">
            <CardContent className="p-3 md:pt-6 md:p-6">
              <div className="flex items-center gap-2 md:gap-3">
                <div className="p-1.5 md:p-2 rounded-lg bg-yellow-500/10">
                  <Clock className="h-4 w-4 md:h-5 md:w-5 text-yellow-500" />
                </div>
                <div>
                  <p className="text-lg md:text-2xl font-bold">{stats?.pending || 0}</p>
                  <p className="text-xs text-muted-foreground">Pending</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-card border-border">
            <CardContent className="p-3 md:pt-6 md:p-6">
              <div className="flex items-center gap-2 md:gap-3">
                <div className="p-1.5 md:p-2 rounded-lg bg-blue-500/10">
                  <TrendingUp className="h-4 w-4 md:h-5 md:w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-lg md:text-2xl font-bold">{stats?.conversionRate || 0}%</p>
                  <p className="text-xs text-muted-foreground">Conversion</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Referrals Table */}
        <Card className="bg-card border-border">
          <CardHeader>
            <div className="flex flex-col sm:flex-row gap-4 justify-between">
              <CardTitle>All Referrals</CardTitle>
              <div className="flex gap-2">
                <div className="relative flex-1 sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search referrals..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="py-8 text-center text-muted-foreground">Loading...</div>
            ) : referrals && referrals.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Referrer</TableHead>
                      <TableHead>Referred</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {referrals.map((referral: any) => (
                      <TableRow key={referral.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{referral.referrer?.display_name || 'Unknown'}</p>
                            <p className="text-xs text-muted-foreground">{referral.referrer?.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {referral.referred ? (
                            <div>
                              <p className="font-medium">{referral.referred.display_name || 'Unknown'}</p>
                              <p className="text-xs text-muted-foreground">{referral.referred.email}</p>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">Not signed up yet</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <code className="text-xs bg-muted px-2 py-1 rounded">{referral.referral_code}</code>
                        </TableCell>
                        <TableCell>{getStatusBadge(referral.status)}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {format(new Date(referral.created_at), 'MMM d, yyyy')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p>No referrals found</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Rewards */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5" />
              Recent Rewards Issued
            </CardTitle>
          </CardHeader>
          <CardContent>
            {rewards && rewards.length > 0 ? (
              <div className="space-y-3">
                {rewards.map((reward: any) => (
                  <div 
                    key={reward.id} 
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-full bg-primary/10">
                        <Gift className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{reward.user?.display_name || reward.user?.email}</p>
                        <p className="text-xs text-muted-foreground">
                          Code: <code className="bg-muted px-1 rounded">{reward.discount_code?.code}</code>
                          {' • '}
                          {reward.discount_code?.discount_type === 'percentage' 
                            ? `${reward.discount_code?.discount_value}% off` 
                            : `£${reward.discount_code?.discount_value} off`}
                        </p>
                      </div>
                    </div>
                    <Badge variant={reward.is_used ? 'secondary' : 'outline'}>
                      {reward.is_used ? 'Used' : 'Available'}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                <Gift className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p>No rewards issued yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
