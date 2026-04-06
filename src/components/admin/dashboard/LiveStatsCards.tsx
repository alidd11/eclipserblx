import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ShoppingCart, DollarSign, Ticket, Users, TrendingUp, TrendingDown } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { startOfDay, subDays, startOfWeek } from '@/lib/dateUtils';

interface StatItem {
 label: string;
 value: string | number;
 icon: React.ElementType;
 trend?: { value: number; label: string };
 color: string;
 iconBg: string;
}

export function LiveStatsCards() {
 const today = startOfDay(new Date()).toISOString();
 const yesterday = startOfDay(subDays(new Date(), 1)).toISOString();
 const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 }).toISOString();

 const { data, isLoading } = useQuery({
 queryKey: ['admin-live-stats'],
 queryFn: async () => {
 const [
 ordersToday,
 ordersYesterday,
 revenueToday,
 revenueYesterday,
 openTickets,
 usersThisWeek,
 usersLastWeek,
 ] = await Promise.all([
 supabase.from('orders').select('id', { count: 'exact', head: true })
 .gte('created_at', today),
 supabase.from('orders').select('id', { count: 'exact', head: true })
 .gte('created_at', yesterday).lt('created_at', today),
 supabase.from('orders').select('total')
 .gte('created_at', today).in('status', ['paid', 'completed']),
 supabase.from('orders').select('total')
 .gte('created_at', yesterday).lt('created_at', today).in('status', ['paid', 'completed']),
 supabase.from('support_tickets').select('id', { count: 'exact', head: true })
 .in('status', ['open', 'in_progress', 'awaiting_customer']),
 supabase.from('profiles').select('user_id', { count: 'exact', head: true })
 .gte('created_at', weekStart),
 supabase.from('profiles').select('user_id', { count: 'exact', head: true })
 .gte('created_at', startOfWeek(subDays(new Date(), 7), { weekStartsOn: 1 }).toISOString())
 .lt('created_at', weekStart),
 ]);

 const revToday = (revenueToday.data || []).reduce((sum, o) => sum + (o.total || 0), 0);
 const revYesterday = (revenueYesterday.data || []).reduce((sum, o) => sum + (o.total || 0), 0);

 return {
 ordersToday: ordersToday.count || 0,
 ordersYesterday: ordersYesterday.count || 0,
 revenueToday: revToday,
 revenueYesterday: revYesterday,
 openTickets: openTickets.count || 0,
 newUsersThisWeek: usersThisWeek.count || 0,
 newUsersLastWeek: usersLastWeek.count || 0,
 };
 },
 refetchInterval: 5 * 60_000, // 5 minutes (reduced from 1 min to save DB queries)
 staleTime: 2 * 60_000,
 });

 const calcTrend = (current: number, previous: number) => {
 if (previous === 0) return current > 0 ? 100 : 0;
 return Math.round(((current - previous) / previous) * 100);
 };

 if (isLoading) {
 return (
 <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
 {[...Array(4)].map((_, i) => (
 <div className="border border-border rounded-xl overflow-hidden" key={i} className="p-4">
 <Skeleton className="h-4 w-20 mb-2" />
 <Skeleton className="h-8 w-16 mb-1" />
 <Skeleton className="h-3 w-24" />
 </div>
 ))}
 </div>
 );
 }

 const stats: StatItem[] = [
 {
 label: 'Orders Today',
 value: data?.ordersToday ?? 0,
 icon: ShoppingCart,
 trend: { value: calcTrend(data?.ordersToday ?? 0, data?.ordersYesterday ?? 0), label: 'vs yesterday' },
 color: 'text-blue-500',
 iconBg: 'bg-blue-500/10',
 },
 {
 label: 'Revenue Today',
 value: `£${(data?.revenueToday ?? 0).toFixed(2)}`,
 icon: DollarSign,
 trend: { value: calcTrend(data?.revenueToday ?? 0, data?.revenueYesterday ?? 0), label: 'vs yesterday' },
 color: 'text-green-500',
 iconBg: 'bg-green-500/10',
 },
 {
 label: 'Open Tickets',
 value: data?.openTickets ?? 0,
 icon: Ticket,
 color: 'text-orange-500',
 iconBg: 'bg-orange-500/10',
 },
 {
 label: 'New Users (Week)',
 value: data?.newUsersThisWeek ?? 0,
 icon: Users,
 trend: { value: calcTrend(data?.newUsersThisWeek ?? 0, data?.newUsersLastWeek ?? 0), label: 'vs last week' },
 color: 'text-primary',
 iconBg: 'bg-primary/10',
 },
 ];

 return (
 <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
 {stats.map((stat) => (
 <div className="border border-border rounded-xl overflow-hidden" key={stat.label} className="p-4 hover:shadow-md transition-shadow">
 <div className="flex items-center justify-between mb-2">
 <span className="text-xs text-muted-foreground font-medium">{stat.label}</span>
 <div className={cn('p-1.5 rounded-lg', stat.iconBg)}>
 <stat.icon className={cn('h-4 w-4', stat.color)} />
 </div>
 </div>
 <p className="text-2xl font-bold tracking-tight">{stat.value}</p>
 {stat.trend && (
 <div className="flex items-center gap-1 mt-1">
 {stat.trend.value >= 0 ? (
 <TrendingUp className="h-3 w-3 text-green-500" />
 ) : (
 <TrendingDown className="h-3 w-3 text-destructive" />
 )}
 <span className={cn('text-xs font-medium', stat.trend.value >= 0 ? 'text-green-500' : 'text-destructive')}>
 {stat.trend.value > 0 ? '+' : ''}{stat.trend.value}%
 </span>
 <span className="text-xs text-muted-foreground">{stat.trend.label}</span>
 </div>
 )}
 </div>
 ))}
 </div>
 );
}
