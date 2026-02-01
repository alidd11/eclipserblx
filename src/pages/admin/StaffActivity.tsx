import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { Activity, LogIn, LogOut, MessageCircle, Ticket, Clock, Filter, X } from 'lucide-react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminStatCard } from '@/components/admin/AdminStatCard';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { format, formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface StaffActivityRecord {
  id: string;
  user_id: string;
  activity_type: string;
  resource_id: string | null;
  resource_type: string | null;
  details: Record<string, any> | null;
  created_at: string;
  profile?: {
    display_name: string | null;
    email: string;
  };
}

const ACTIVITY_ICONS: Record<string, any> = {
  login: LogIn,
  logout: LogOut,
  chat_claimed: MessageCircle,
  chat_completed: MessageCircle,
  ticket_claimed: Ticket,
  ticket_completed: Ticket,
};

const ACTIVITY_COLORS: Record<string, string> = {
  login: 'bg-green-500/20 text-green-400 border-green-500/30',
  logout: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  chat_claimed: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  chat_completed: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  ticket_claimed: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  ticket_completed: 'bg-teal-500/20 text-teal-400 border-teal-500/30',
};

const ACTIVITY_LABELS: Record<string, string> = {
  login: 'Logged In',
  logout: 'Logged Out',
  chat_claimed: 'Claimed Chat',
  chat_completed: 'Completed Chat',
  ticket_claimed: 'Claimed Ticket',
  ticket_completed: 'Completed Ticket',
};

export default function StaffActivityPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filterType, setFilterType] = useState<string>(searchParams.get('type') || 'all');
  const [filterStaff, setFilterStaff] = useState<string>(searchParams.get('staff') || 'all');

  // Sync URL params with state
  useEffect(() => {
    const params = new URLSearchParams();
    if (filterType !== 'all') params.set('type', filterType);
    if (filterStaff !== 'all') params.set('staff', filterStaff);
    setSearchParams(params, { replace: true });
  }, [filterType, filterStaff, setSearchParams]);

  // Fetch admin user IDs to exclude them from activity logs
  const { data: adminUserIds = [] } = useQuery({
    queryKey: ['admin-user-ids'],
    queryFn: async () => {
      const { data } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin');
      return data?.map(r => r.user_id) ?? [];
    },
  });

  // Fetch staff activity with profiles (excluding admins)
  const { data: activities, isLoading, refetch } = useQuery({
    queryKey: ['staff-activity', filterType, filterStaff, adminUserIds],
    queryFn: async () => {
      let query = supabase
        .from('staff_activity')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

      if (filterType !== 'all') {
        query = query.eq('activity_type', filterType);
      }
      if (filterStaff !== 'all') {
        query = query.eq('user_id', filterStaff);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Filter out admin activities
      const filteredData = (data ?? []).filter(a => !adminUserIds.includes(a.user_id));

      // Fetch profiles for all unique user_ids
      const userIds = [...new Set(filteredData.map(a => a.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name, email')
        .in('user_id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) ?? []);

      return filteredData.map(activity => ({
        ...activity,
        profile: profileMap.get(activity.user_id),
      })) as StaffActivityRecord[];
    },
    enabled: adminUserIds.length > 0 || adminUserIds !== undefined,
  });

  // Fetch staff list for filter (excluding admins)
  const { data: staffList } = useQuery({
    queryKey: ['staff-list-for-filter', adminUserIds],
    queryFn: async () => {
      const { data: roles } = await supabase
        .from('user_roles')
        .select('user_id, role');
      
      // Get non-admin user IDs
      const nonAdminUserIds = [...new Set(
        roles?.filter(r => r.role !== 'admin').map(r => r.user_id) ?? []
      )].filter(id => !adminUserIds.includes(id));
      
      if (nonAdminUserIds.length === 0) return [];
      
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name, email')
        .in('user_id', nonAdminUserIds);

      return profiles ?? [];
    },
    enabled: adminUserIds.length > 0 || adminUserIds !== undefined,
  });

  // Stats for today
  const { data: todayStats } = useQuery({
    queryKey: ['staff-activity-today-stats'],
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from('staff_activity')
        .select('activity_type')
        .gte('created_at', today.toISOString());

      if (error) throw error;

      const counts = {
        logins: 0,
        chats_claimed: 0,
        chats_completed: 0,
        tickets_claimed: 0,
        tickets_completed: 0,
      };

      (data ?? []).forEach(a => {
        if (a.activity_type === 'login') counts.logins++;
        if (a.activity_type === 'chat_claimed') counts.chats_claimed++;
        if (a.activity_type === 'chat_completed') counts.chats_completed++;
        if (a.activity_type === 'ticket_claimed') counts.tickets_claimed++;
        if (a.activity_type === 'ticket_completed') counts.tickets_completed++;
      });

      return counts;
    },
  });

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('staff-activity-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'staff_activity',
        },
        () => {
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetch]);

  const getActivityIcon = (type: string) => {
    const Icon = ACTIVITY_ICONS[type] || Activity;
    return <Icon className="h-4 w-4" />;
  };

  return (
    <AdminLayout requiredPermissions={['view_staff_activity']}>
      <div className="space-y-6">
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-2xl sm:text-3xl font-display flex items-center gap-2">
              <Activity className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
              Staff Activity
            </CardTitle>
            <CardDescription>Track staff logins, ticket claims, and chat activity</CardDescription>
          </CardHeader>
        </Card>

        {/* Today's Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <AdminStatCard label="Logins Today" value={todayStats?.logins ?? 0} valueColor="green" />
          <AdminStatCard label="Chats Claimed" value={todayStats?.chats_claimed ?? 0} valueColor="blue" />
          <AdminStatCard label="Chats Completed" value={todayStats?.chats_completed ?? 0} valueColor="primary" />
          <AdminStatCard label="Tickets Claimed" value={todayStats?.tickets_claimed ?? 0} valueColor="orange" />
          <AdminStatCard label="Tickets Completed" value={todayStats?.tickets_completed ?? 0} valueColor="green" />
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Activity Log
            </CardTitle>
            <CardDescription>View detailed staff activity history</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-4 mb-6">
              <div className="w-48">
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Activities</SelectItem>
                    <SelectItem value="login">Logins</SelectItem>
                    <SelectItem value="logout">Logouts</SelectItem>
                    <SelectItem value="chat_claimed">Chat Claimed</SelectItem>
                    <SelectItem value="chat_completed">Chat Completed</SelectItem>
                    <SelectItem value="ticket_claimed">Ticket Claimed</SelectItem>
                    <SelectItem value="ticket_completed">Ticket Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="w-64">
                <Select value={filterStaff} onValueChange={setFilterStaff}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by staff member" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Staff</SelectItem>
                    {staffList?.map(staff => (
                      <SelectItem key={staff.user_id} value={staff.user_id}>
                        {staff.display_name || staff.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {(filterType !== 'all' || filterStaff !== 'all') && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setFilterType('all');
                    setFilterStaff('all');
                  }}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4 mr-1" />
                  Clear Filters
                </Button>
              )}
            </div>

            <ScrollArea className="h-[500px]">
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading activity...</div>
              ) : activities?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No activity found</div>
              ) : (
                <div className="space-y-3">
                  {activities?.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex items-start gap-4 p-4 rounded-lg bg-muted/50 border border-border"
                    >
                      <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center border",
                        ACTIVITY_COLORS[activity.activity_type] || 'bg-muted'
                      )}>
                        {getActivityIcon(activity.activity_type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">
                            {activity.profile?.display_name || activity.profile?.email || 'Unknown User'}
                          </span>
                          <Badge variant="outline" className={cn(
                            "text-xs",
                            ACTIVITY_COLORS[activity.activity_type]
                          )}>
                            {ACTIVITY_LABELS[activity.activity_type] || activity.activity_type}
                          </Badge>
                        </div>
                        {activity.details && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {activity.details.customer_name && (
                              <span>Customer: {activity.details.customer_name}</span>
                            )}
                            {activity.details.subject && (
                              <span>Subject: {activity.details.subject}</span>
                            )}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>{format(new Date(activity.created_at), 'MMM d, yyyy h:mm a')}</span>
                          <span className="text-muted-foreground/50">
                            ({formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })})
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
