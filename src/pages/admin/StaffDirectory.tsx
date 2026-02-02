import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, Users, Clock, Shield, IdCard, ChevronRight, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { Navigate, Link } from 'react-router-dom';

// Note: Roles are now dynamic, fetched from custom_roles table

interface StaffMember {
  user_id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  staff_id: string | null;
  customer_id: string | null;
  roles: string[];
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

interface CustomRole {
  name: string;
  display_name: string;
  color: string;
  icon: string;
  hierarchy_level: number;
}

export default function StaffDirectory() {
  const { hasRole, loading: authLoading } = useAdminAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('directory');

  // Check if user is admin
  const isAdmin = hasRole('admin');

  // Fetch custom roles from database for consistent sorting
  const { data: customRoles = [] } = useQuery<CustomRole[]>({
    queryKey: ['custom-roles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('custom_roles')
        .select('name, display_name, color, icon, hierarchy_level')
        .order('hierarchy_level', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: isAdmin,
  });

  // Fetch staff members with their roles
  // Note: No longer depends on customRoles.length to avoid blocking initial load
  const { data: staffMembers = [], isLoading: staffLoading } = useQuery({
    // Include a version key so changes to exclusion rules immediately refetch (avoids sticky cache during HMR)
    queryKey: ['staff-directory', customRoles.length, 'exclude-eclipse-plus-v1'],
    queryFn: async () => {
      // Get all user roles (we need ALL roles to check which users have staff roles)
      const { data: allRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      // Filter to only include users who have at least one non-subscription role
      // (e.g., admin, support_agent, etc. - not just eclipse_plus_member)
      const subscriptionOnlyRoles = ['eclipse_plus_member'];
      
      // Group roles by user
      const userRolesMap = new Map<string, string[]>();
      (allRoles ?? []).forEach(r => {
        const existing = userRolesMap.get(r.user_id) || [];
        existing.push(r.role);
        userRolesMap.set(r.user_id, existing);
      });
      
      // Only include users who have at least one staff role (not just subscription roles)
      const staffUserIds = Array.from(userRolesMap.entries())
        .filter(([_, roles]) => roles.some(role => !subscriptionOnlyRoles.includes(role)))
        .map(([userId]) => userId);

      if (staffUserIds.length === 0) return [];
      
      // Filter roles to only staff roles for display
      const roles = (allRoles ?? []).filter(r => 
        staffUserIds.includes(r.user_id) && !subscriptionOnlyRoles.includes(r.role)
      );

      // Get profiles for these users - exclude email for privacy
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, display_name, username, avatar_url, staff_id, customer_id, created_at')
        .in('user_id', staffUserIds);

      if (profilesError) throw profilesError;

      // Build dynamic hierarchy map from custom_roles
      const ROLE_HIERARCHY: Record<string, number> = {};
      if (customRoles.length > 0) {
        customRoles.forEach(r => {
          // Convert hierarchy_level to rank (higher level = lower rank number for sorting)
          ROLE_HIERARCHY[r.name] = 100 - r.hierarchy_level;
        });
      }

      // Combine data
      const staffMap = new Map<string, StaffMember>();

      profiles?.forEach(profile => {
        const userRoles = roles?.filter(r => r.user_id === profile.user_id).map(r => r.role) || [];
        staffMap.set(profile.user_id, {
          user_id: profile.user_id,
          display_name: profile.display_name,
          username: profile.username,
          avatar_url: profile.avatar_url,
          staff_id: profile.staff_id,
          customer_id: profile.customer_id,
          roles: userRoles,
          created_at: profile.created_at,
        });
      });

      const getHighestRoleRank = (roles: string[]): number => {
        if (roles.length === 0) return 999;
        return Math.min(...roles.map(role => ROLE_HIERARCHY[role] ?? 999));
      };

      return Array.from(staffMap.values()).sort((a, b) => {
        const rankA = getHighestRoleRank(a.roles);
        const rankB = getHighestRoleRank(b.roles);
        // Sort by rank first, then alphabetically by name
        if (rankA !== rankB) return rankA - rankB;
        return (a.display_name || 'Unknown').localeCompare(b.display_name || 'Unknown');
      });
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
      <AdminLayout requiredPermissions={['view_staff_directory']}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </AdminLayout>
    );
  }
  return (
    <AdminLayout requiredPermissions={['view_staff_directory']}>
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

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          {/* Dropdown for all devices */}
          <Select value={activeTab} onValueChange={setActiveTab}>
            <SelectTrigger className="w-full max-w-md bg-card">
              <SelectValue placeholder="Select section" />
            </SelectTrigger>
            <SelectContent className="bg-card border-border z-[100]">
              <SelectItem value="directory">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Directory
                </div>
              </SelectItem>
              <SelectItem value="logs">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  ID Logs
                </div>
              </SelectItem>
            </SelectContent>
          </Select>

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
                            {member.username && (
                              <p className="text-xs text-muted-foreground truncate">
                                @{member.username}
                              </p>
                            )}
                            
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
                              {member.roles.map(role => {
                                const roleInfo = customRoles.find(r => r.name === role);
                                return (
                                  <Badge
                                    key={role}
                                    variant="outline"
                                    className={`text-[10px] px-1.5 py-0 ${roleInfo?.color || 'bg-gray-500'} text-white border-transparent`}
                                  >
                                    {roleInfo?.display_name || role}
                                  </Badge>
                                );
                              })}
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