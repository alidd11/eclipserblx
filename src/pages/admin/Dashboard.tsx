import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Package, ShoppingCart, Users, MessageCircle, FileText, BarChart3, Clock, Play, Square, Timer, Shield, TrendingUp, TrendingDown, Gavel, CreditCard, Settings, UserCheck, Headphones, Store, Bot, Ticket, BookOpen, ClipboardList, ChevronRight, AlertCircle } from 'lucide-react';
import { SystemAlerts } from '@/components/admin/dashboard/SystemAlerts';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';


import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { toast } from 'sonner';
import { format, differenceInMinutes } from 'date-fns';
import { Textarea } from '@/components/ui/textarea';
import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';


export default function AdminDashboard() {
  const { user } = useAuth();
  const { isAdmin } = useAdminAuth();
  const { hasPermission, hasAnyPermission } = useUserPermissions();
  const queryClient = useQueryClient();
  const [clockOutNotes, setClockOutNotes] = useState('');
  const [elapsedTime, setElapsedTime] = useState<string>('00:00:00');
  const [showClockOutConfirm, setShowClockOutConfirm] = useState(false);

  // Fetch user profile for display name
  const { data: profile } = useQuery({
    queryKey: ['user-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('display_name, avatar_url')
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

  // Role-based quick actions — contextual shortcuts based on what the user can do
  const allRoleLinks = [
    { title: 'Revenue', href: '/admin/revenue', icon: CreditCard, description: 'Financial overview', permissions: ['view_income'] },
    { title: 'Disputes', href: '/admin/disputes', icon: Gavel, description: 'Handle disputes', permissions: ['view_orders', 'manage_orders'] },
    { title: 'Tickets', href: '/admin/customer-tickets', icon: Ticket, description: 'Customer tickets', permissions: ['view_live_chat', 'manage_live_chat'] },
    { title: 'Stores', href: '/admin/store-applications', icon: Store, description: 'Store applications', permissions: ['view_applications', 'manage_applications'] },
    { title: 'Staff Chat', href: '/admin/admin-chat', icon: Headphones, description: 'Internal chat', permissions: ['view_admin_chat'] },
    { title: 'Roles', href: '/admin/role-permissions', icon: UserCheck, description: 'Manage roles', permissions: ['manage_roles'] },
    { title: 'Settings', href: '/admin/settings', icon: Settings, description: 'System settings', permissions: ['manage_settings'] },
    { title: 'Moderation', href: '/admin/moderation', icon: Shield, description: 'Content review', permissions: ['view_products', 'manage_products'] },
    { title: 'Audit Logs', href: '/admin/audit-logs', icon: BookOpen, description: 'Activity logs', permissions: ['view_analytics'] },
    { title: 'Bot Setup', href: '/admin/bot-ghost-setup', icon: Bot, description: 'Discord bot config', permissions: ['manage_settings'] },
    { title: 'Affiliates', href: '/admin/affiliates', icon: TrendingUp, description: 'Affiliate hub', permissions: ['view_applications', 'manage_applications'] },
    { title: 'Staff Activity', href: '/admin/staff-activity', icon: Timer, description: 'Staff hours', permissions: ['view_analytics'] },
    { title: 'Duty Logs', href: '/admin/duty-logs', icon: ClipboardList, description: 'Your duty history', permissions: [] },
  ];

  const roleLinks = (isAdmin
    ? allRoleLinks
    : allRoleLinks.filter(link => hasAnyPermission(link.permissions))
  ).slice(0, 9);

  // Fetch assigned tickets
  const { data: assignedTickets } = useQuery({
    queryKey: ['my-assigned-tickets', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const [customerRes, sellerRes] = await Promise.all([
        supabase
          .from('support_tickets')
          .select('id, ticket_number, subject, status, priority, created_at')
          .eq('assigned_to', user.id)
          .in('status', ['open', 'in_progress', 'awaiting_customer'])
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('seller_support_tickets')
          .select('id, ticket_number, subject, status, priority, created_at')
          .eq('assigned_to', user.id)
          .in('status', ['open', 'in_progress', 'awaiting_seller'])
          .order('created_at', { ascending: false })
          .limit(5),
      ]);
      const customer = (customerRes.data || []).map(t => ({ ...t, type: 'customer' as const }));
      const seller = (sellerRes.data || []).map(t => ({ ...t, type: 'seller' as const }));
      return [...customer, ...seller].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 6);
    },
    enabled: !!user?.id,
  });



  // Live timezone clock component
  function TimezoneClock() {
    const [now, setNow] = useState(new Date());
    useEffect(() => {
      const id = setInterval(() => setNow(new Date()), 60_000);
      return () => clearInterval(id);
    }, []);
    const fmt = (tz: string) => now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: tz });
    return (
      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5 text-[11px] text-muted-foreground">
        <span className="whitespace-nowrap">🕐 {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}</span>
        <span className="whitespace-nowrap">🇬🇧 {fmt('Europe/London')}</span>
        <span className="whitespace-nowrap">🇺🇸 {fmt('America/New_York')}</span>
        <span className="whitespace-nowrap">🇺🇸 {fmt('America/Los_Angeles')}</span>
      </div>
    );
  }

  const getTimeBasedGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  return (
    <AdminLayout>
      <div className="space-y-5">
        {/* System Alerts */}
        <SystemAlerts />

        {/* Hero Banner */}
        <div className="flex items-center gap-3 max-w-lg">
          <Avatar className="h-12 w-12 border-2 border-border">
            <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.display_name || 'User'} className="object-cover" />
            <AvatarFallback className="bg-muted text-lg font-bold">{profile?.display_name?.charAt(0)?.toUpperCase() || 'U'}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-display font-bold leading-tight">
                {getTimeBasedGreeting()}{profile?.display_name ? `, ${profile.display_name}` : ''}!
              </h1>
              <Badge variant="default" className="gap-1 text-[10px]">
                <Shield className="h-2.5 w-2.5" />
                Admin
              </Badge>
            </div>
            <TimezoneClock />
          </div>
        </div>

        {/* Duty Clock In/Out */}
        <Card className="bg-card border-border max-w-md">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4" />
              Duty Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">

            {activeSession ? (
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 space-y-1">
                  <div className="flex items-center gap-2">
                    <Timer className="h-4 w-4 text-green-500 shrink-0" />
                    <span className="font-medium text-green-500 text-sm">Currently On Duty</span>
                  </div>
                  <p className="text-xs text-muted-foreground whitespace-nowrap">
                    Clocked in at {format(new Date(activeSession.clock_in), 'h:mm a')}
                  </p>
                  <p className="text-xl font-mono font-bold text-green-500">
                    {elapsedTime}
                  </p>
                </div>
                <Textarea
                  placeholder="Add notes for this session (optional)..."
                  value={clockOutNotes}
                  onChange={(e) => setClockOutNotes(e.target.value)}
                  rows={2}
                  className="text-sm"
                />
                <Dialog open={showClockOutConfirm} onOpenChange={setShowClockOutConfirm}>
                  <DialogTrigger asChild>
                    <Button variant="destructive" className="w-full" size="sm">
                      <Square className="h-3.5 w-3.5 mr-1.5" />
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
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-sm font-medium">Not On Duty</p>
                    <p className="text-xs text-muted-foreground whitespace-nowrap">Clock in to start logging hours</p>
                  </div>
                </div>
                <Button 
                  onClick={() => clockInMutation.mutate()} 
                  disabled={clockInMutation.isPending}
                  className="w-full"
                  size="sm"
                >
                  <Play className="h-3.5 w-3.5 mr-1.5" />
                  {clockInMutation.isPending ? 'Clocking In...' : 'Clock In'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions - right after hero like seller dashboard */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-6 gap-1.5 sm:gap-2">
              {quickLinks.map((link) => (
                <Link key={link.href} to={link.href}>
                  <div
                    className="flex flex-col items-center gap-1 sm:gap-2 p-2 sm:p-3.5 rounded-lg bg-muted/50 hover:bg-accent hover:-translate-y-0.5 active:scale-[0.97] transition-all text-center group cursor-pointer"
                  >
                    <div className="p-1.5 sm:p-2.5 rounded-xl bg-card border border-border group-hover:border-primary/30 transition-colors">
                      <link.icon className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <div>
                      <span className="text-[10px] sm:text-xs font-medium block leading-tight">{link.title}</span>
                      <span className="text-[10px] text-muted-foreground hidden sm:block">{link.description}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Role-Based Actions */}
        {roleLinks.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium">Your Tools</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-1.5 sm:gap-2">
                {roleLinks.map((link) => (
                  <Link key={link.href} to={link.href}>
                    <div
                      className="flex flex-col items-center gap-1 sm:gap-2 p-2 sm:p-3.5 rounded-lg bg-muted/50 hover:bg-accent hover:-translate-y-0.5 active:scale-[0.97] transition-all text-center group cursor-pointer"
                    >
                      <div className="p-1.5 sm:p-2.5 rounded-xl bg-card border border-border group-hover:border-primary/30 transition-colors">
                        <link.icon className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                      <div>
                        <span className="text-[10px] sm:text-xs font-medium block leading-tight">{link.title}</span>
                        <span className="text-[10px] text-muted-foreground hidden sm:block">{link.description}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Assigned Tickets */}
        {assignedTickets && assignedTickets.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-medium flex items-center gap-2">
                  <Ticket className="h-4 w-4" />
                  Your Assigned Tickets
                </CardTitle>
                <Badge variant="secondary" className="text-xs">{assignedTickets.length}</Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-0 space-y-2">
              {assignedTickets.map((ticket) => {
                const statusColors: Record<string, string> = {
                  open: 'bg-yellow-500/20 text-yellow-500',
                  in_progress: 'bg-blue-500/20 text-blue-500',
                  awaiting_customer: 'bg-purple-500/20 text-purple-500',
                  awaiting_seller: 'bg-purple-500/20 text-purple-500',
                };
                const href = ticket.type === 'customer'
                  ? `/admin/customer-tickets/${ticket.id}`
                  : `/admin/seller-tickets/${ticket.id}`;
                return (
                  <Link key={ticket.id} to={href}>
                    <div className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/50 hover:bg-accent transition-colors group">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[10px] font-mono text-muted-foreground">{ticket.ticket_number}</span>
                          <Badge className={`text-[10px] px-1.5 py-0 ${statusColors[ticket.status] || 'bg-muted text-muted-foreground'}`}>
                            {ticket.status.replace(/_/g, ' ')}
                          </Badge>
                          {ticket.priority === 'high' || ticket.priority === 'urgent' ? (
                            <AlertCircle className="h-3 w-3 text-destructive" />
                          ) : null}
                        </div>
                        <p className="text-sm font-medium truncate">{ticket.subject}</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
                    </div>
                  </Link>
                );
              })}
            </CardContent>
          </Card>
        )}



      </div>
    </AdminLayout>
  );
}
