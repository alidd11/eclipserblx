import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Package, ShoppingCart, Users, MessageCircle, FileText, BarChart3, Clock, Play, Square, Timer, Megaphone, Plus, Trash2, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { toast } from 'sonner';
import { format, differenceInMinutes, formatDistanceToNow } from 'date-fns';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  created_by: string;
  created_at: string;
  expires_at: string | null;
  is_active: boolean;
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const { isAdmin } = useAdminAuth();
  const queryClient = useQueryClient();
  const [clockOutNotes, setClockOutNotes] = useState('');
  const [elapsedTime, setElapsedTime] = useState<string>('00:00:00');
  const [showNewAnnouncement, setShowNewAnnouncement] = useState(false);
  const [newAnnouncementTitle, setNewAnnouncementTitle] = useState('');
  const [newAnnouncementContent, setNewAnnouncementContent] = useState('');
  const [newAnnouncementPriority, setNewAnnouncementPriority] = useState<'low' | 'normal' | 'high' | 'urgent'>('normal');

  // Fetch user profile for display name
  const { data: profile } = useQuery({
    queryKey: ['user-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('user_id', user.id)
        .single();
      if (error) return null;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch active announcements
  const { data: announcements } = useQuery({
    queryKey: ['staff-announcements'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('staff_announcements')
        .select('*')
        .eq('is_active', true)
        .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString())
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Announcement[];
    },
  });

  // Create announcement mutation
  const createAnnouncementMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Not authenticated');
      
      // Create the announcement
      const { error } = await supabase
        .from('staff_announcements')
        .insert({
          title: newAnnouncementTitle,
          content: newAnnouncementContent,
          priority: newAnnouncementPriority,
          created_by: user.id,
        });
      if (error) throw error;

      // Send push notification for urgent/high priority announcements
      if (newAnnouncementPriority === 'urgent' || newAnnouncementPriority === 'high') {
        // Get all staff user IDs
        const { data: staffRoles } = await supabase
          .from('user_roles')
          .select('user_id');
        
        if (staffRoles && staffRoles.length > 0) {
          const staffUserIds = staffRoles
            .map(r => r.user_id)
            .filter(id => id !== user.id); // Don't notify the sender
          
          if (staffUserIds.length > 0) {
            // Send push notification via edge function
            const priorityEmoji = newAnnouncementPriority === 'urgent' ? '🚨' : '⚠️';
            await supabase.functions.invoke('send-push-notification', {
              body: {
                user_ids: staffUserIds,
                payload: {
                  title: `${priorityEmoji} ${newAnnouncementPriority.toUpperCase()}: ${newAnnouncementTitle}`,
                  body: newAnnouncementContent.substring(0, 150),
                  tag: 'staff-announcement',
                  requireInteraction: newAnnouncementPriority === 'urgent',
                },
              },
            });
          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-announcements'] });
      setNewAnnouncementTitle('');
      setNewAnnouncementContent('');
      setNewAnnouncementPriority('normal');
      setShowNewAnnouncement(false);
      toast.success('Announcement created');
    },
    onError: (error) => {
      toast.error('Failed to create announcement: ' + error.message);
    },
  });

  // Delete announcement mutation
  const deleteAnnouncementMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('staff_announcements')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-announcements'] });
      toast.success('Announcement deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete announcement: ' + error.message);
    },
  });

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

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent': return <AlertCircle className="h-4 w-4 text-destructive" />;
      case 'high': return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case 'normal': return <Info className="h-4 w-4 text-primary" />;
      default: return <Info className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getPriorityStyles = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'border-destructive/50 bg-destructive/5';
      case 'high': return 'border-orange-500/50 bg-orange-500/5';
      case 'normal': return 'border-primary/50 bg-primary/5';
      default: return 'border-muted bg-muted/50';
    }
  };

  const getTimeBasedGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <AdminLayout>
      <div className="space-y-4">
        <div className="pb-1">
          <h1 className="text-xl sm:text-2xl font-display font-bold">
            {getTimeBasedGreeting()}{profile?.display_name ? `, ${profile.display_name}` : ''}!
          </h1>
          <p className="text-muted-foreground text-sm">Manage your duties and quick actions.</p>
        </div>

        {/* Staff Announcements */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Megaphone className="h-5 w-5" />
                Announcements
              </div>
              {isAdmin && (
                <Dialog open={showNewAnnouncement} onOpenChange={setShowNewAnnouncement}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline">
                      <Plus className="h-4 w-4 mr-1" />
                      New
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create Announcement</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Input
                          placeholder="Announcement title..."
                          value={newAnnouncementTitle}
                          onChange={(e) => setNewAnnouncementTitle(e.target.value)}
                        />
                      </div>
                      <div>
                        <Textarea
                          placeholder="Announcement content..."
                          value={newAnnouncementContent}
                          onChange={(e) => setNewAnnouncementContent(e.target.value)}
                          rows={3}
                        />
                      </div>
                      <div>
                        <Select 
                          value={newAnnouncementPriority} 
                          onValueChange={(v) => setNewAnnouncementPriority(v as 'low' | 'normal' | 'high' | 'urgent')}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Priority" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="normal">Normal</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="urgent">Urgent</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        onClick={() => createAnnouncementMutation.mutate()}
                        disabled={!newAnnouncementTitle.trim() || !newAnnouncementContent.trim() || createAnnouncementMutation.isPending}
                        className="w-full"
                      >
                        {createAnnouncementMutation.isPending ? 'Creating...' : 'Create Announcement'}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!announcements?.length ? (
              <p className="text-muted-foreground text-center py-4">No active announcements</p>
            ) : (
              <div className="space-y-3">
                {announcements.map((announcement) => (
                  <div
                    key={announcement.id}
                    className={cn(
                      "p-3 rounded-lg border",
                      getPriorityStyles(announcement.priority)
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {getPriorityIcon(announcement.priority)}
                        <span className="font-medium text-sm">{announcement.title}</span>
                      </div>
                      {isAdmin && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                          onClick={() => deleteAnnouncementMutation.mutate(announcement.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">{announcement.content}</p>
                    <p className="text-xs text-muted-foreground/70 mt-2">
                      {formatDistanceToNow(new Date(announcement.created_at), { addSuffix: true })}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
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
