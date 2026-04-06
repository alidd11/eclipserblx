import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { BotDashboardLayout } from '@/components/bot-dashboard/BotDashboardLayout';
import { BarChart3, TrendingUp, Hash, Clock } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { format, subDays } from '@/lib/dateUtils';

export default function BotAnalytics() {
 const { data: usageData = [], isLoading } = useQuery({
 queryKey: ['bot-command-usage-analytics'],
 queryFn: async () => {
 const { data, error } = await (supabase as any)
 .from('bot_command_usage')
 .select('command_name, executed_at')
 .gte('executed_at', subDays(new Date(), 30).toISOString())
 .order('executed_at', { ascending: false })
 .limit(1000);
 if (error) throw error;
 return data || [];
 },
 });

 // Aggregate by command
 const commandCounts: Record<string, number> = {};
 usageData.forEach((u: any) => {
 commandCounts[u.command_name] = (commandCounts[u.command_name] || 0) + 1;
 });
 const topCommands = Object.entries(commandCounts)
 .sort((a, b) => b[1] - a[1])
 .slice(0, 10)
 .map(([name, count]) => ({ name: `/${name}`, count }));

 // Aggregate by day
 const dailyCounts: Record<string, number> = {};
 usageData.forEach((u: any) => {
 const day = format(new Date(u.executed_at), 'MMM dd');
 dailyCounts[day] = (dailyCounts[day] || 0) + 1;
 });
 const dailyData = Object.entries(dailyCounts)
 .slice(0, 14)
 .reverse()
 .map(([day, count]) => ({ day, count }));

 const totalCommands = usageData.length;
 const uniqueCommands = new Set(usageData.map((u: any) => u.command_name)).size;

 return (
 <BotDashboardLayout>
 <div className="space-y-6">
 <div>
 <h1 className="text-2xl font-bold text-white flex items-center gap-3">
 <BarChart3 className="h-6 w-6 text-[hsl(258,90%,66%)]" />
 Analytics
 </h1>
 <p className="text-white/50 text-sm mt-1">Command usage statistics over the last 30 days.</p>
 </div>

 {/* Summary cards */}
 <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
 <div className="border border-border rounded-xl overflow-hidden bg-white/[0.03] border-white/10">
 <div className="p-4 p-4">
 <div className="flex items-center gap-2 text-white/50 text-xs mb-1">
 <TrendingUp className="h-3.5 w-3.5" /> Total Executions
 </div>
 <p className="text-2xl font-bold text-white">{totalCommands}</p>
 </div>
 </div>
 <div className="border border-border rounded-xl overflow-hidden bg-white/[0.03] border-white/10">
 <div className="p-4 p-4">
 <div className="flex items-center gap-2 text-white/50 text-xs mb-1">
 <Hash className="h-3.5 w-3.5" /> Unique Commands
 </div>
 <p className="text-2xl font-bold text-white">{uniqueCommands}</p>
 </div>
 </div>
 <div className="border border-border rounded-xl overflow-hidden bg-white/[0.03] border-white/10">
 <div className="p-4 p-4">
 <div className="flex items-center gap-2 text-white/50 text-xs mb-1">
 <Clock className="h-3.5 w-3.5" /> Avg/Day
 </div>
 <p className="text-2xl font-bold text-white">
 {dailyData.length > 0 ? Math.round(totalCommands / Math.max(dailyData.length, 1)) : 0}
 </p>
 </div>
 </div>
 </div>

 {/* Daily usage chart */}
 <div className="border border-border rounded-xl overflow-hidden bg-white/[0.03] border-white/10">
 <div className="px-4 py-3 border-b border-border bg-muted/30">
 <h3 className="font-semibold text-sm text-white text-base">Daily Usage</h3>
 </div>
 <div className="p-4">
 {isLoading ? (
 <div className="h-64 flex items-center justify-center text-white/40">Loading...</div>
 ) : dailyData.length === 0 ? (
 <div className="h-64 flex items-center justify-center text-white/40">No data yet</div>
 ) : (
 <ResponsiveContainer width="100%" height={260}>
 <BarChart data={dailyData}>
 <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
 <XAxis dataKey="day" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} />
 <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} />
 <Tooltip
 contentStyle={{ background: 'hsl(228,15%,12%)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff' }}
 />
 <Bar dataKey="count" fill="hsl(258,90%,66%)" radius={[4, 4, 0, 0]} />
 </BarChart>
 </ResponsiveContainer>
 )}
 </div>
 </div>

 {/* Top commands */}
 <div className="border border-border rounded-xl overflow-hidden bg-white/[0.03] border-white/10">
 <div className="px-4 py-3 border-b border-border bg-muted/30">
 <h3 className="font-semibold text-sm text-white text-base">Top Commands</h3>
 </div>
 <div className="p-4 p-0">
 {topCommands.length === 0 ? (
 <div className="p-8 text-center text-white/40">No command usage data yet.</div>
 ) : (
 <div className="divide-y divide-white/5">
 {topCommands.map((cmd, i) => (
 <div key={cmd.name} className="px-4 py-3 flex items-center justify-between">
 <div className="flex items-center gap-3">
 <span className="text-xs text-white/30 w-5 text-right">#{i + 1}</span>
 <code className="text-sm text-[hsl(258,90%,76%)]">{cmd.name}</code>
 </div>
 <span className="text-sm text-white/60">{cmd.count} uses</span>
 </div>
 ))}
 </div>
 )}
 </div>
 </div>
 </div>
 </BotDashboardLayout>
 );
}
