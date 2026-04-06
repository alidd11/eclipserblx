import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { BotDashboardLayout } from '@/components/bot-dashboard/BotDashboardLayout';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Gavel, Ban, Clock, UserX, Search, ShieldAlert } from 'lucide-react';
import { format } from '@/lib/dateUtils';

const ACTION_ICONS: Record<string, typeof Ban> = {
 ban: Ban,
 kick: UserX,
 timeout: Clock,
 unban: ShieldAlert,
};

const ACTION_COLORS: Record<string, string> = {
 ban: 'text-red-400',
 kick: 'text-orange-400',
 timeout: 'text-yellow-400',
 unban: 'text-green-400',
};

export default function BotModeration() {
 const [search, setSearch] = useState('');
 const [filterAction, setFilterAction] = useState<string>('all');

 const { data: modActions = [], isLoading } = useQuery({
 queryKey: ['bot-mod-actions', filterAction],
 queryFn: async () => {
 let query = (supabase as any)
 .from('bot_mod_actions')
 .select('*')
 .order('created_at', { ascending: false })
 .limit(100);

 if (filterAction !== 'all') {
 query = query.eq('action_type', filterAction);
 }

 const { data, error } = await query;
 if (error) throw error;
 return data || [];
 },
 });

 const filtered = modActions.filter((a: any) =>
 !search ||
 a.target_username?.toLowerCase().includes(search.toLowerCase()) ||
 a.moderator_username?.toLowerCase().includes(search.toLowerCase()) ||
 a.reason?.toLowerCase().includes(search.toLowerCase())
 );

 return (
 <BotDashboardLayout>
 <div className="space-y-6">
 <div>
 <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
 <Gavel className="h-6 w-6 text-[hsl(258,90%,66%)]" />
 Moderation
 </h1>
 <p className="text-foreground/50 text-sm mt-1">
 Local server moderation actions — bans, kicks, timeouts via bot commands.
 </p>
 </div>

 {/* Info card */}
 <div className="border border-border rounded-xl overflow-hidden bg-[hsl(258,90%,66%)]/10 border-[hsl(258,90%,66%)]/20">
 <div className="p-4 p-4">
 <p className="text-sm text-foreground/70">
 These are <strong>local server</strong> moderation actions executed via <code>/ban</code>, <code>/kick</code>, <code>/timeout</code>, and <code>/unban</code> commands.
 For cross-server bans, use <strong>Global Guard</strong>.
 </p>
 </div>
 </div>

 {/* Filters */}
 <div className="flex flex-col sm:flex-row gap-3">
 <div className="relative flex-1">
 <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/30" />
 <Input
 placeholder="Search by user, moderator, or reason..."
 value={search}
 onChange={(e) => setSearch(e.target.value)}
 className="pl-10 bg-background/5 border-white/10 text-foreground placeholder:text-foreground/30"
 />
 </div>
 <Select value={filterAction} onValueChange={setFilterAction}>
 <SelectTrigger className="w-full sm:w-40 bg-background/5 border-white/10 text-foreground">
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="all">All Actions</SelectItem>
 <SelectItem value="ban">Bans</SelectItem>
 <SelectItem value="kick">Kicks</SelectItem>
 <SelectItem value="timeout">Timeouts</SelectItem>
 <SelectItem value="unban">Unbans</SelectItem>
 </SelectContent>
 </Select>
 </div>

 {/* Actions list */}
 <div className="border border-border rounded-xl overflow-hidden bg-background/[0.03] border-white/10">
 <div className="px-4 py-3 border-b border-border bg-muted/30">
 <h3 className="font-semibold text-sm text-foreground text-base">Recent Actions</h3>
 <p className="text-sm text-muted-foreground text-foreground/40">
 {filtered.length} action{filtered.length !== 1 ? 's' : ''} recorded
 </p>
 </div>
 <div className="p-4 p-0">
 {isLoading ? (
 <div className="p-8 text-center text-foreground/40">Loading...</div>
 ) : filtered.length === 0 ? (
 <div className="p-8 text-center text-foreground/40">
 No moderation actions recorded yet. Use <code>/ban</code>, <code>/kick</code>, <code>/timeout</code> in Discord.
 </div>
 ) : (
 <div className="divide-y divide-white/5">
 {filtered.map((action: any) => {
 const Icon = ACTION_ICONS[action.action_type] || Gavel;
 const color = ACTION_COLORS[action.action_type] || 'text-foreground/60';
 return (
 <div key={action.id} className="px-4 py-3 flex items-start gap-3 hover:bg-background/[0.02]">
 <Icon className={`h-5 w-5 mt-0.5 shrink-0 ${color}`} />
 <div className="flex-1 min-w-0">
 <div className="flex items-center gap-2 flex-wrap">
 <span className="text-sm font-medium text-foreground">
 {action.target_username || action.target_user_id}
 </span>
 <Badge variant="outline" className="text-[10px] border-white/20 text-foreground/60 uppercase">
 {action.action_type}
 </Badge>
 {action.duration && (
 <Badge variant="outline" className="text-[10px] border-white/20 text-foreground/40">
 {action.duration}
 </Badge>
 )}
 </div>
 {action.reason && (
 <p className="text-xs text-foreground/40 mt-0.5 truncate">{action.reason}</p>
 )}
 <p className="text-[11px] text-foreground/30 mt-0.5">
 by {action.moderator_username || action.moderator_id} · {format(new Date(action.created_at), 'dd MMM yyyy HH:mm')}
 </p>
 </div>
 </div>
 );
 })}
 </div>
 )}
 </div>
 </div>
 </div>
 </BotDashboardLayout>
 );
}
