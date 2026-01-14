import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, Users, Clock, Shield, IdCard, ChevronRight, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { Navigate, Link } from 'react-router-dom';

type AppRole = 'admin' | 'product_manager' | 'order_manager' | 'support_agent' | 'analyst' | 'recruiter';

interface StaffMember {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  staff_id: string | null;
  customer_id: string | null;
  roles: AppRole[];
  created_at: string;
}

interface StaffIdLog {
  id: string;
  user_id: string;
  staff_id: string;
  assigned_at: string;
  notes: string | null;
  display_name?: string | null;
}

const ROLE_COLORS: Record<AppRole, string> = {
  admin: 'bg-red-500/20 text-red-400 border-red-500/30',
  product_manager: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  order_manager: 'bg-green-500/20 text-green-400 border-green-500/30',
  support_agent: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  analyst: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  recruiter: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
};

const ROLE_LABELS: Record<AppRole, string> = {
  admin: 'Admin',
  product_manager: 'Product Manager',
  order_manager: 'Order Manager',
  support_agent: 'Support Agent',
  analyst: 'Analyst',
  recruiter: 'Recruiter',
};

export default function StaffDirectory() {
  const { hasRole, loading: authLoading } = useAdminAuth();
  const [searchQuery, setSearchQuery] = useState('');

  // Check if user is admin
  const isAdmin = hasRole('admin');

  // Fetch staff members with their roles
  const { data: staffMembers = [], isLoading: staffLoading } = useQuery({
    queryKey: ['staff-directory'],
    queryFn: async () => {
      // Get all user roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      // Get unique user IDs
      const userIds = [...new Set(roles?.map(r => r.user_id) || [])];

      if (userIds.length === 0) return [];

      // Get profiles for these users - exclude email for privacy
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url, staff_id, customer_id, created_at')
        .in('user_id', userIds);

      if (profilesError) throw profilesError;

      // Combine data
      const staffMap = new Map<string, StaffMember>();

      profiles?.forEach(profile => {
        const userRoles = roles?.filter(r => r.user_id === profile.user_id).map(r => r.role as AppRole) || [];
        staffMap.set(profile.user_id, {
          user_id: profile.user_id,
          display_name: profile.display_name,
          avatar_url: profile.avatar_url,
          staff_id: profile.staff_id,
          customer_id: profile.customer_id,
          roles: userRoles,
          created_at: profile.created_at,
        });
      });

      return Array.from(staffMap.values()).sort((a, b) => 
        (a.display_name || 'Unknown').localeCompare(b.display_name || 'Unknown')
      );
    },
    enabled: isAdmin,
  });

  // Fetch staff ID logs
  const { data: staffIdLogs = [], isLoading: logsLoading } = useQuery({
    queryKey: ['staff-id-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('staff_id_logs')
        .select('*')
        .order('assigned_at', { ascending: false });

      if (error) throw error;

      // Get display names for the logs
      const userIds = [...new Set(data?.map(log => log.user_id) || [])];
      
      if (userIds.length === 0) return data || [];

      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name')
        .in('user_id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p.display_name]));

      return (data || []).map(log => ({
        ...log,
        display_name: profileMap.get(log.user_id),
      })) as StaffIdLog[];
    },
    enabled: isAdmin,
  });

  // Filter staff members based on search (no email search for privacy)
  const filteredStaff = staffMembers.filter(member =>
    (member.display_name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
    (member.staff_id?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
    (member.customer_id?.toLowerCase() || '').includes(searchQuery.toLowerCase())
  );

  if (authLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </AdminLayout>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/admin" replace />;
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <IdCard className="h-6 w-6 text-primary" />
              Staff Directory
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              View all staff members and their IDs
            </p>
          </div>
          <Badge variant="outline" className="w-fit">
            {staffMembers.length} Staff Members
          </Badge>
        </div>

        <Tabs defaultValue="directory" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="directory" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Directory
            </TabsTrigger>
            <TabsTrigger value="logs" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              ID Logs
            </TabsTrigger>
          </TabsList>

          <TabsContent value="directory" className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or staff ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Staff Grid */}
            {staffLoading ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-full bg-muted" />
                        <div className="space-y-2 flex-1">
                          <div className="h-4 bg-muted rounded w-3/4" />
                          <div className="h-3 bg-muted rounded w-1/2" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredStaff.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    {searchQuery ? 'No staff members match your search' : 'No staff members found'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredStaff.map(member => (
                  <Card key={member.user_id} className="hover:border-primary/50 transition-colors">
                    <CardContent className="p-4">
                      <Link to={`/admin/staff/${member.user_id}`}>
                        <div className="flex items-start gap-3">
                          <Avatar className="h-12 w-12">
                            <AvatarImage src={member.avatar_url || undefined} />
                            <AvatarFallback className="bg-primary/10 text-primary font-medium">
                              {(member.display_name || 'U').slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">
                              {member.display_name || 'Unknown User'}
                            </p>
                            
                            {/* Staff ID */}
                            {member.staff_id && (
                              <div className="mt-1 flex items-center gap-1.5">
                                <Shield className="h-3.5 w-3.5 text-primary" />
                                <span className="text-xs font-mono font-medium text-primary">
                                  {member.staff_id}
                                </span>
                              </div>
                            )}

                            {/* Roles */}
                            <div className="flex flex-wrap gap-1 mt-2">
                              {member.roles.map(role => (
                                <Badge
                                  key={role}
                                  variant="outline"
                                  className={`text-[10px] px-1.5 py-0 ${ROLE_COLORS[role]}`}
                                >
                                  {ROLE_LABELS[role]}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          <ChevronRight className="h-5 w-5 text-muted-foreground hover:text-primary transition-colors" />
                        </div>
                      </Link>
                      {/* Activity Button - Only show for non-admin staff */}
                      {!member.roles.includes('admin') && (
                        <div className="mt-3 pt-3 border-t border-border/50">
                          <Link to={`/admin/staff-activity?staff=${member.user_id}`}>
                            <Button variant="outline" size="sm" className="w-full gap-2">
                              <Activity className="h-4 w-4" />
                              View Activity
                            </Button>
                          </Link>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="logs" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Staff ID Assignment History
                </CardTitle>
              </CardHeader>
              <CardContent>
                {logsLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="animate-pulse flex items-center gap-4 p-3 rounded-lg bg-muted/50">
                        <div className="h-4 w-24 bg-muted rounded" />
                        <div className="h-4 w-32 bg-muted rounded" />
                        <div className="h-4 flex-1 bg-muted rounded" />
                      </div>
                    ))}
                  </div>
                ) : staffIdLogs.length === 0 ? (
                  <div className="text-center py-8">
                    <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No staff ID assignments logged yet</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {staffIdLogs.map(log => (
                      <div
                        key={log.id}
                        className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-3 rounded-lg bg-muted/30 border border-border/50"
                      >
                        <Badge variant="outline" className="font-mono text-xs w-fit">
                          {log.staff_id}
                        </Badge>
                        <span className="text-sm font-medium">
                          {log.display_name || 'Unknown User'}
                        </span>
                        <span className="text-xs text-muted-foreground flex-1">
                          {log.notes}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(log.assigned_at), 'MMM d, yyyy h:mm a')}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}