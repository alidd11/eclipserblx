import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Package, ShoppingCart, Users, MessageCircle, FileText, BarChart3, Clock, Play, Square, Timer } from 'lucide-react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { toast } from 'sonner';
import { format, differenceInMinutes } from 'date-fns';
import { Textarea } from '@/components/ui/textarea';
import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function AdminDashboard() {
  const { user } = useAuth();
  const { isAdmin } = useAdminAuth();
  const queryClient = useQueryClient();
  const [clockOutNotes, setClockOutNotes] = useState('');
  const [elapsedTime, setElapsedTime] = useState<string>('00:00:00');

  // Check for active duty session
  const { data: activeSession } = useQuery({
    queryKey: ['active-duty-session', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('staff_duty_logs')
        .select('*')
        .eq('user_id', user.id)
        .is('clock_out', null)
        .order('clock_in', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Update elapsed time every second when clocked in
  useEffect(() => {
    if (!activeSession?.clock_in) {
      setElapsedTime('00:00:00');
      return;
    }

    const updateElapsed = () => {
      const start = new Date(activeSession.clock_in);
      const now = new Date();
      const diffMs = now.getTime() - start.getTime();
      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
      setElapsedTime(
        `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      );
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);
    return () => clearInterval(interval);
  }, [activeSession?.clock_in]);

  // Staff's recent duty logs
  const { data: myDutyLogs } = useQuery({
    queryKey: ['my-duty-logs', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('staff_duty_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('clock_in', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Admin: All staff duty logs with profile info
  const { data: allDutyLogs } = useQuery({
    queryKey: ['all-duty-logs'],
    queryFn: async () => {
      const { data: logs, error } = await supabase
        .from('staff_duty_logs')
        .select('*')
        .order('clock_in', { ascending: false })
        .limit(50);
      if (error) throw error;
      
      // Fetch profiles for all unique user_ids
      const userIds = [...new Set(logs?.map(l => l.user_id) || [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name, email')
        .in('user_id', userIds);
      
      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
      
      return logs?.map(log => ({
        ...log,
        profile: profileMap.get(log.user_id),
      }));
    },
    enabled: isAdmin,
  });

  const clockInMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('staff_duty_logs')
        .insert({ user_id: user.id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-duty-session'] });
      queryClient.invalidateQueries({ queryKey: ['my-duty-logs'] });
      queryClient.invalidateQueries({ queryKey: ['all-duty-logs'] });
      toast.success('Clocked in successfully');
    },
    onError: (error) => {
      toast.error('Failed to clock in: ' + error.message);
    },
  });

  const clockOutMutation = useMutation({
    mutationFn: async () => {
      if (!activeSession?.id) throw new Error('No active session');
      const clockOut = new Date();
      const clockIn = new Date(activeSession.clock_in);
      const durationMinutes = differenceInMinutes(clockOut, clockIn);
      
      const { error } = await supabase
        .from('staff_duty_logs')
        .update({
          clock_out: clockOut.toISOString(),
          duration_minutes: durationMinutes,
          notes: clockOutNotes || null,
        })
        .eq('id', activeSession.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-duty-session'] });
      queryClient.invalidateQueries({ queryKey: ['my-duty-logs'] });
      queryClient.invalidateQueries({ queryKey: ['all-duty-logs'] });
      setClockOutNotes('');
      toast.success('Clocked out successfully');
    },
    onError: (error) => {
      toast.error('Failed to clock out: ' + error.message);
    },
  });

  const quickLinks = [
    { title: 'View Analytics', href: '/admin/analytics', icon: BarChart3, description: 'Detailed metrics & charts' },
    { title: 'Manage Products', href: '/admin/products', icon: Package, description: 'Add or edit products' },
    { title: 'View Orders', href: '/admin/orders', icon: ShoppingCart, description: 'Manage orders' },
    { title: 'Live Chat', href: '/admin/live-chat', icon: MessageCircle, description: 'Support customers' },
    { title: 'Applications', href: '/admin/applications', icon: FileText, description: 'Review applications' },
    { title: 'Manage Users', href: '/admin/users', icon: Users, description: 'User management' },
  ];

  const formatDuration = (minutes: number | null) => {
    if (!minutes) return '-';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  return (
    <AdminLayout>
      <div className="space-y-8">
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-2xl sm:text-3xl font-display">Dashboard</CardTitle>
            <p className="text-muted-foreground text-sm">Welcome back! Manage your duties and quick actions.</p>
          </CardHeader>
        </Card>

        {/* Duty Clock In/Out */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Duty Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {activeSession ? (
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                  <div className="flex items-center justify-center w-12 h-12 rounded-full bg-green-500/20">
                    <Timer className="h-6 w-6 text-green-500" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-green-500">Currently On Duty</p>
                    <p className="text-sm text-muted-foreground">
                      Clocked in at {format(new Date(activeSession.clock_in), 'h:mm a')}
                    </p>
                  </div>
                  <div className="text-2xl font-mono font-bold text-green-500">
                    {elapsedTime}
                  </div>
                </div>
                <Textarea
                  placeholder="Add notes for this session (optional)..."
                  value={clockOutNotes}
                  onChange={(e) => setClockOutNotes(e.target.value)}
                  rows={2}
                />
                <Button 
                  onClick={() => clockOutMutation.mutate()} 
                  disabled={clockOutMutation.isPending}
                  variant="destructive"
                  className="w-full"
                >
                  <Square className="h-4 w-4 mr-2" />
                  {clockOutMutation.isPending ? 'Clocking Out...' : 'Clock Out'}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center justify-center w-12 h-12 rounded-full bg-muted">
                    <Clock className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">Not Currently On Duty</p>
                    <p className="text-sm text-muted-foreground">Clock in to start logging your hours</p>
                  </div>
                </div>
                <Button 
                  onClick={() => clockInMutation.mutate()} 
                  disabled={clockInMutation.isPending}
                  className="w-full"
                >
                  <Play className="h-4 w-4 mr-2" />
                  {clockInMutation.isPending ? 'Clocking In...' : 'Clock In'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions - Rows of 3 */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              {quickLinks.map((link) => (
                <Link key={link.href} to={link.href}>
                  <div className="flex flex-col items-center gap-2 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer text-center">
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
                      <link.icon className="h-5 w-5 text-primary" />
                    </div>
                    <p className="font-medium text-xs">{link.title}</p>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* My Recent Duty Logs */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Timer className="h-5 w-5" />
              My Recent Duty Logs
            </CardTitle>
          </CardHeader>
          <CardContent>
            {myDutyLogs?.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No duty logs yet</p>
            ) : (
              <div className="space-y-2">
                {myDutyLogs?.filter(log => log.clock_out).slice(0, 5).map((log) => (
                  <div key={log.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        {format(new Date(log.clock_in), 'MMM d, yyyy')}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(log.clock_in), 'h:mm a')} - {format(new Date(log.clock_out!), 'h:mm a')}
                      </p>
                      {log.notes && (
                        <p className="text-xs text-muted-foreground mt-1 italic">"{log.notes}"</p>
                      )}
                    </div>
                    <Badge variant="secondary">{formatDuration(log.duration_minutes)}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Admin: All Staff Duty Logs */}
        {isAdmin && (
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                All Staff Duty Logs
              </CardTitle>
            </CardHeader>
            <CardContent>
              {allDutyLogs?.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No duty logs yet</p>
              ) : (
                <ScrollArea className="h-[300px]">
                  <div className="space-y-2">
                    {allDutyLogs?.map((log) => (
                      <div key={log.id} className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {log.profile?.display_name || log.profile?.email || 'Unknown User'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(log.clock_in), 'MMM d, yyyy · h:mm a')}
                            {log.clock_out && ` - ${format(new Date(log.clock_out), 'h:mm a')}`}
                          </p>
                          {log.notes && (
                            <p className="text-xs text-muted-foreground mt-1 italic truncate">"{log.notes}"</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {log.clock_out ? (
                            <Badge variant="secondary">{formatDuration(log.duration_minutes)}</Badge>
                          ) : (
                            <Badge variant="default" className="bg-green-500">On Duty</Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        )}

      </div>
    </AdminLayout>
  );
}
