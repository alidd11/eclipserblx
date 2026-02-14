import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Package, ShoppingCart, Users, MessageCircle, FileText, BarChart3, Clock, Play, Square, Timer, Megaphone, Plus, Trash2, AlertCircle, AlertTriangle, Info, Shield, TrendingUp, TrendingDown } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
const ECLIPSE_BANNER = 'https://qlnbergwjfrmgkjhrbkj.supabase.co/storage/v1/object/public/store-branding/9b70ccd6-da02-4d53-8180-e884e1d18b3f/banner-1768958747633.png';
const ECLIPSE_LOGO = 'https://qlnbergwjfrmgkjhrbkj.supabase.co/storage/v1/object/public/store-branding/83b5dde6-ce72-4f1b-a9f9-ff1eb5cbc23a/eclipse-moon-logo.png';
import { motion } from 'framer-motion';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { toast } from 'sonner';
import { format, differenceInMinutes, formatDistanceToNow } from 'date-fns';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { useState, useEffect, useMemo } from 'react';
import { startOfWeek, startOfMonth, endOfWeek, endOfMonth, isWithinInterval } from 'date-fns';
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
  const { hasPermission, hasAnyPermission } = useUserPermissions();
  const queryClient = useQueryClient();
  const [clockOutNotes, setClockOutNotes] = useState('');
  const [elapsedTime, setElapsedTime] = useState<string>('00:00:00');
  const [showNewAnnouncement, setShowNewAnnouncement] = useState(false);
  const [newAnnouncementTitle, setNewAnnouncementTitle] = useState('');
  const [newAnnouncementContent, setNewAnnouncementContent] = useState('');
  const [newAnnouncementPriority, setNewAnnouncementPriority] = useState<'low' | 'normal' | 'high' | 'urgent'>('normal');
  const [showClockOutConfirm, setShowClockOutConfirm] = useState(false);

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

  // Fetch admin dashboard stats
  const { data: adminStats } = useQuery({
    queryKey: ['admin-dashboard-stats'],
    queryFn: async () => {
      const [productsRes, ordersRes, usersRes, pendingRes] = await Promise.all([
        supabase.from('products').select('id', { count: 'exact', head: true }),
        supabase.from('orders').select('id', { count: 'exact', head: true }),
        supabase.from('profiles').select('user_id', { count: 'exact', head: true }),
        supabase.from('products').select('id', { count: 'exact', head: true }).eq('moderation_status', 'pending'),
      ]);
      return {
        totalProducts: productsRes.count || 0,
        totalOrders: ordersRes.count || 0,
        totalUsers: usersRes.count || 0,
        pendingModeration: pendingRes.count || 0,
      };
    },
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
      
      // Create the announcement (return id so push tags can be unique)
      const { data: createdAnnouncement, error } = await supabase
        .from('staff_announcements')
        .insert({
          title: newAnnouncementTitle,
          content: newAnnouncementContent,
          priority: newAnnouncementPriority,
          created_by: user.id,
        })
        .select('id')
        .single();
      if (error) throw error;

      const announcementId = createdAnnouncement?.id || String(Date.now());

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
                  tag: `staff-announcement-${announcementId}`,
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
        .limit(50); // Fetch more for stats calculation
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Calculate weekly and monthly hours
  const { weeklyMinutes, monthlyMinutes } = useMemo(() => {
    if (!myDutyLogs) return { weeklyMinutes: 0, monthlyMinutes: 0 };
    
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 }); // Monday
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    
    let weekly = 0;
    let monthly = 0;
    
    myDutyLogs.forEach(log => {
      if (!log.clock_out || !log.duration_minutes) return;
      const logDate = new Date(log.clock_in);
      
      if (isWithinInterval(logDate, { start: weekStart, end: weekEnd })) {
        weekly += log.duration_minutes;
      }
      if (isWithinInterval(logDate, { start: monthStart, end: monthEnd })) {
        monthly += log.duration_minutes;
      }
    });
    
    return { weeklyMinutes: weekly, monthlyMinutes: monthly };
  }, [myDutyLogs]);

  const formatHoursMinutes = (totalMinutes: number) => {
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    return `${hours}h ${mins}m`;
  };

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

  const allQuickLinks = [
    { title: 'View Analytics', href: '/admin/analytics', icon: BarChart3, description: 'Detailed metrics & charts', permissions: ['view_analytics'] },
    { title: 'Manage Products', href: '/admin/products', icon: Package, description: 'Add or edit products', permissions: ['view_products', 'manage_products'] },
    { title: 'View Orders', href: '/admin/orders', icon: ShoppingCart, description: 'Manage orders', permissions: ['view_orders', 'manage_orders'] },
    { title: 'Live Chat', href: '/admin/live-chat', icon: MessageCircle, description: 'Support customers', permissions: ['view_live_chat', 'manage_live_chat'] },
    { title: 'Applications', href: '/admin/applications', icon: FileText, description: 'Review applications', permissions: ['view_applications', 'manage_applications'] },
    { title: 'Manage Customers', href: '/admin/users', icon: Users, description: 'Customer management', permissions: ['view_users', 'manage_users'] },
  ];

  // Filter quick links based on user permissions (admin sees all)
  const quickLinks = isAdmin 
    ? allQuickLinks 
    : allQuickLinks.filter(link => hasAnyPermission(link.permissions));

  const formatDuration = (minutes: number | null) => {
    if (minutes === null || minutes === undefined) return '-';
    if (minutes === 0) return '<1m';
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
      <div className="max-w-6xl mx-auto space-y-5">
        {/* Hero Banner */}
        <Card className="overflow-hidden border-border bg-card">
          {/* Banner area */}
          <div className="relative h-28 sm:h-32 bg-gradient-to-br from-muted via-muted/80 to-card overflow-hidden">
            <img
              src={ECLIPSE_BANNER}
              alt=""
              className="absolute inset-0 w-full h-full object-cover opacity-40"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-card to-transparent" />
          </div>

          <CardContent className="relative -mt-10 px-4 sm:px-6 pb-5">
            {/* Avatar + Name row */}
            <div className="flex items-end gap-4 mb-4">
              <Avatar className="h-16 w-16 sm:h-20 sm:w-20 border-4 border-card shadow-lg">
                <AvatarImage src={ECLIPSE_LOGO} alt="Eclipse Store" />
                <AvatarFallback className="bg-muted text-2xl font-bold">E</AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0 pb-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-display font-bold truncate">
                    {getTimeBasedGreeting()}{profile?.display_name ? `, ${profile.display_name}` : ''}!
                  </h1>
                  <Badge variant="default" className="gap-1 shrink-0">
                    <Shield className="h-3 w-3" />
                    Admin
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground truncate">
                  Here's your platform overview
                </p>
              </div>
            </div>

            {/* Stats row - matching seller layout */}
            <div className="grid grid-cols-4 gap-3">
              <div className="rounded-lg bg-muted/50 p-3 flex flex-col justify-between min-h-[68px]">
                <p className="text-xs text-muted-foreground leading-tight">Total Users</p>
                <p className="text-lg font-bold">{adminStats?.totalUsers ?? '—'}</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-3 flex flex-col justify-between min-h-[68px]">
                <p className="text-xs text-muted-foreground leading-tight">Total Orders</p>
                <p className="text-lg font-bold">{adminStats?.totalOrders ?? '—'}</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-3 flex flex-col justify-between min-h-[68px]">
                <p className="text-xs text-muted-foreground leading-tight">Products</p>
                <p className="text-lg font-bold">{adminStats?.totalProducts ?? '—'}</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-3 flex flex-col justify-between min-h-[68px]">
                <p className="text-xs text-muted-foreground leading-tight">Pending Review</p>
                <p className="text-lg font-bold text-amber-500">{adminStats?.pendingModeration ?? '—'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions - right after hero like seller dashboard */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-3 lg:grid-cols-6 gap-2">
              {quickLinks.map((link) => (
                <Link key={link.href} to={link.href}>
                  <motion.div
                    whileHover={{ y: -2, scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                    className="flex flex-col items-center gap-2 p-3.5 rounded-lg bg-muted/50 hover:bg-accent transition-colors text-center group cursor-pointer"
                  >
                    <div className="p-2.5 rounded-xl bg-card border border-border group-hover:border-primary/30 transition-colors">
                      <link.icon className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <div>
                      <span className="text-xs font-medium block">{link.title}</span>
                      <span className="text-[10px] text-muted-foreground hidden sm:block">{link.description}</span>
                    </div>
                  </motion.div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Announcements + Duty Status side by side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
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
            {/* Weekly/Monthly Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-muted/50 text-center">
                <p className="text-xs text-muted-foreground">This Week</p>
                <p className="text-lg font-bold font-mono">{formatHoursMinutes(weeklyMinutes)}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50 text-center">
                <p className="text-xs text-muted-foreground">This Month</p>
                <p className="text-lg font-bold font-mono">{formatHoursMinutes(monthlyMinutes)}</p>
              </div>
            </div>

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
                <Dialog open={showClockOutConfirm} onOpenChange={setShowClockOutConfirm}>
                  <DialogTrigger asChild>
                    <Button 
                      variant="destructive"
                      className="w-full"
                    >
                      <Square className="h-4 w-4 mr-2" />
                      Clock Out
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Confirm Clock Out</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <p className="text-muted-foreground">
                        You've been on duty for <span className="font-mono font-bold text-foreground">{elapsedTime}</span>. Are you sure you want to clock out?
                      </p>
                      <div className="flex gap-3">
                        <Button
                          variant="outline"
                          className="flex-1"
                          onClick={() => setShowClockOutConfirm(false)}
                        >
                          Cancel
                        </Button>
                        <Button
                          variant="destructive"
                          className="flex-1"
                          disabled={clockOutMutation.isPending}
                          onClick={() => {
                            clockOutMutation.mutate();
                            setShowClockOutConfirm(false);
                          }}
                        >
                          {clockOutMutation.isPending ? 'Clocking Out...' : 'Clock Out'}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
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
        </div>

        {/* Duty Logs - side by side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* My Recent Duty Logs */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Timer className="h-5 w-5" />
                My Recent Duty Logs
              </div>
              {user?.id && (
                <Link 
                  to={`/admin/staff-activity?staff=${user.id}`}
                  className="text-xs text-primary hover:underline font-normal"
                >
                  View Full History
                </Link>
              )}
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

      </div>
    </AdminLayout>
  );
}
