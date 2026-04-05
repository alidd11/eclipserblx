import { useQuery } from '@tanstack/react-query';
import { Timer, Users, Calendar, Clock } from 'lucide-react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { useMemo, useState } from 'react';

export default function DutyLogs() {
  const { user } = useAuth();
  const { isAdmin } = useAdminAuth();
  const [tab, setTab] = useState('my-logs');

  // My duty logs
  const { data: myDutyLogs } = useQuery({
    queryKey: ['my-duty-logs', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('staff_duty_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('clock_in', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // All staff duty logs (admin only)
  const { data: allDutyLogs } = useQuery({
    queryKey: ['all-duty-logs'],
    queryFn: async () => {
      const { data: logs, error } = await supabase
        .from('staff_duty_logs')
        .select('*')
        .order('clock_in', { ascending: false })
        .limit(100);
      if (error) throw error;

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
    enabled: isAdmin && tab === 'all-staff',
  });

  // Stats
  const { weeklyMinutes, monthlyMinutes, totalSessions } = useMemo(() => {
    if (!myDutyLogs) return { weeklyMinutes: 0, monthlyMinutes: 0, totalSessions: 0 };
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    let weekly = 0, monthly = 0;

    myDutyLogs.forEach(log => {
      if (!log.clock_out || !log.duration_minutes) return;
      const logDate = new Date(log.clock_in);
      if (isWithinInterval(logDate, { start: weekStart, end: weekEnd })) weekly += log.duration_minutes;
      if (isWithinInterval(logDate, { start: monthStart, end: monthEnd })) monthly += log.duration_minutes;
    });

    return { weeklyMinutes: weekly, monthlyMinutes: monthly, totalSessions: myDutyLogs.filter(l => l.clock_out).length };
  }, [myDutyLogs]);

  const formatHM = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${m}m`;
  };

  const formatDuration = (minutes: number | null) => {
    if (minutes === null || minutes === undefined) return '-';
    if (minutes === 0) return '<1m';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  return (
    <AdminLayout>
      <div className="space-y-5">
        {/* Header */}
        <div>
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <Timer className="h-5 w-5 sm:h-6 sm:w-6" />
            Duty Logs
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Track and review staff duty hours</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-3">
          <div className="border border-border rounded-xl overflow-hidden bg-card border-border">
            <div className="p-4 p-3 sm:p-4 text-center">
              <p className="text-[10px] sm:text-xs text-muted-foreground">This Week</p>
              <p className="text-lg sm:text-xl font-bold font-mono mt-1">{formatHM(weeklyMinutes)}</p>
            </div>
          </div>
          <div className="border border-border rounded-xl overflow-hidden bg-card border-border">
            <div className="p-4 p-3 sm:p-4 text-center">
              <p className="text-[10px] sm:text-xs text-muted-foreground">This Month</p>
              <p className="text-lg sm:text-xl font-bold font-mono mt-1">{formatHM(monthlyMinutes)}</p>
            </div>
          </div>
          <div className="border border-border rounded-xl overflow-hidden bg-card border-border">
            <div className="p-4 p-3 sm:p-4 text-center">
              <p className="text-[10px] sm:text-xs text-muted-foreground">Sessions</p>
              <p className="text-lg sm:text-xl font-bold font-mono mt-1">{totalSessions}</p>
            </div>
          </div>
        </div>

        {/* Tabs: mobile dropdown, desktop tabs */}
        <div className="sm:hidden">
          <Select value={tab} onValueChange={setTab}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="my-logs">My Duty Logs</SelectItem>
              {isAdmin && <SelectItem value="all-staff">All Staff Logs</SelectItem>}
            </SelectContent>
          </Select>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="hidden sm:inline-flex">
            <TabsTrigger value="my-logs" className="gap-1.5">
              <Calendar className="h-4 w-4" />
              My Duty Logs
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="all-staff" className="gap-1.5">
                <Users className="h-4 w-4" />
                All Staff Logs
              </TabsTrigger>
            )}
          </TabsList>

          {/* My Logs */}
          <TabsContent value="my-logs" className="mt-4">
            {myDutyLogs?.filter(l => l.clock_out).length === 0 ? (
              <div className="border border-border rounded-xl overflow-hidden">
                <div className="p-4 py-12 text-center text-muted-foreground">
                  <Clock className="h-10 w-10 mx-auto mb-3 opacity-40" />
                  <p>No duty logs yet. Clock in from the dashboard to start logging hours.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {myDutyLogs?.filter(l => l.clock_out).map((log) => (
                  <div key={log.id} className="border border-border rounded-xl bg-card">
                    <div className="p-3 sm:p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">
                            {format(new Date(log.clock_in), 'EEE, MMM d yyyy')}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {format(new Date(log.clock_in), 'HH:mm')} – {format(new Date(log.clock_out!), 'HH:mm')}
                          </p>
                          {log.notes && (
                            <p className="text-xs text-muted-foreground mt-1.5 italic line-clamp-2">"{log.notes}"</p>
                          )}
                        </div>
                        <Badge variant="secondary" className="shrink-0 font-mono">
                          {formatDuration(log.duration_minutes)}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* All Staff */}
          <TabsContent value="all-staff" className="mt-4">
            {allDutyLogs?.length === 0 ? (
              <div className="border border-border rounded-xl overflow-hidden">
                <div className="p-4 py-12 text-center text-muted-foreground">
                  <Users className="h-10 w-10 mx-auto mb-3 opacity-40" />
                  <p>No staff duty logs recorded yet.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {allDutyLogs?.map((log) => (
                  <div key={log.id} className="bg-card border-border">
                    <div className="p-4 p-3 sm:p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {log.profile?.display_name || log.profile?.email || 'Unknown'}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {format(new Date(log.clock_in), 'EEE, MMM d · HH:mm')}
                            {log.clock_out && ` – ${format(new Date(log.clock_out), 'HH:mm')}`}
                          </p>
                          {log.notes && (
                            <p className="text-xs text-muted-foreground mt-1.5 italic truncate">"{log.notes}"</p>
                          )}
                        </div>
                        {log.clock_out ? (
                          <Badge variant="secondary" className="shrink-0 font-mono">
                            {formatDuration(log.duration_minutes)}
                          </Badge>
                        ) : (
                          <Badge className="shrink-0 bg-green-500 text-white">On Duty</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
