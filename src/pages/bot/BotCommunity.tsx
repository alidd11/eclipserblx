import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { BotDashboardLayout } from '@/components/bot-dashboard/BotDashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
 Gift, Star, Lightbulb, ShieldCheck, UserCheck, Clock, UserPlus, LogOut,
 Save, Plus, Trash2, Users
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from '@/lib/dateUtils';

export default function BotCommunity() {
 const queryClient = useQueryClient();

 // Giveaways
 const { data: giveaways = [] } = useQuery({
 queryKey: ['bot-giveaways'],
 queryFn: async () => {
 const { data } = await (supabase as any).from('bot_giveaways').select('*').order('created_at', { ascending: false }).limit(50);
 return data || [];
 },
 });

 // Starboard config
 const { data: starboard } = useQuery({
 queryKey: ['bot-starboard-config'],
 queryFn: async () => {
 const { data } = await (supabase as any).from('bot_starboard_config').select('*').maybeSingle();
 return data;
 },
 });

 // Suggestions config
 const { data: suggestionsConfig } = useQuery({
 queryKey: ['bot-suggestions-config'],
 queryFn: async () => {
 const { data } = await (supabase as any).from('bot_suggestions_config').select('*').maybeSingle();
 return data;
 },
 });

 const { data: suggestions = [] } = useQuery({
 queryKey: ['bot-suggestions'],
 queryFn: async () => {
 const { data } = await (supabase as any).from('bot_suggestions').select('*').order('created_at', { ascending: false }).limit(50);
 return data || [];
 },
 });

 // Verification config
 const { data: verificationConfig } = useQuery({
 queryKey: ['bot-verification-config'],
 queryFn: async () => {
 const { data } = await (supabase as any).from('bot_verification_config').select('*').maybeSingle();
 return data;
 },
 });

 // Join gate config
 const { data: joinGateConfig } = useQuery({
 queryKey: ['bot-join-gate-config'],
 queryFn: async () => {
 const { data } = await (supabase as any).from('bot_join_gate_config').select('*').maybeSingle();
 return data;
 },
 });

 // Scheduled messages
 const { data: scheduledMsgs = [] } = useQuery({
 queryKey: ['bot-scheduled-messages'],
 queryFn: async () => {
 const { data } = await (supabase as any).from('bot_scheduled_messages').select('*').order('created_at', { ascending: false });
 return data || [];
 },
 });

 // Auto roles
 const { data: autoRoles = [] } = useQuery({
 queryKey: ['bot-auto-roles'],
 queryFn: async () => {
 const { data } = await (supabase as any).from('bot_auto_roles').select('*').order('created_at', { ascending: false });
 return data || [];
 },
 });

 // Join/Leave config
 const { data: joinLeaveConfig } = useQuery({
 queryKey: ['bot-join-leave-config'],
 queryFn: async () => {
 const { data } = await (supabase as any).from('bot_join_leave_config').select('*').maybeSingle();
 return data;
 },
 });

 // Mod log config
 const { data: modLogConfig } = useQuery({
 queryKey: ['bot-mod-log-config'],
 queryFn: async () => {
 const { data } = await (supabase as any).from('bot_mod_log_config').select('*').maybeSingle();
 return data;
 },
 });

 // Generic upsert mutation
 const upsertMutation = useMutation({
 mutationFn: async ({ table, data, key }: { table: string; data: Record<string, unknown>; key?: string }) => {
 const { error } = await (supabase as any).from(table).upsert(data, key ? { onConflict: key } : undefined);
 if (error) throw error;
 },
 onSuccess: (_, vars) => {
 queryClient.invalidateQueries({ queryKey: [`bot-${vars.table.replace('bot_', '').replace(/_/g, '-')}`] });
 toast.success('Settings saved!');
 },
 onError: () => toast.error('Failed to save'),
 });

 // State for forms
 const [giveawayForm, setGiveawayForm] = useState({ title: '', prize: '', channel_id: '', winners_count: 1, ends_at: '' });

 const createGiveaway = () => {
 if (!giveawayForm.title || !giveawayForm.prize || !giveawayForm.ends_at) return toast.error('Fill all fields');
 upsertMutation.mutate({
 table: 'bot_giveaways',
 data: { ...giveawayForm, guild_id: 'global', created_by: 'dashboard' },
 });
 setGiveawayForm({ title: '', prize: '', channel_id: '', winners_count: 1, ends_at: '' });
 };

 // Starboard state
 const [sbEnabled, setSbEnabled] = useState(starboard?.enabled || false);
 const [sbChannel, setSbChannel] = useState(starboard?.channel_id || '');
 const [sbThreshold, setSbThreshold] = useState(starboard?.threshold || 3);
 const [sbEmoji, setSbEmoji] = useState(starboard?.emoji || '⭐');

 // Verification state
 const [vEnabled, setVEnabled] = useState(verificationConfig?.enabled || false);
 const [vChannel, setVChannel] = useState(verificationConfig?.channel_id || '');
 const [vRole, setVRole] = useState(verificationConfig?.verified_role_id || '');

 // Join gate state
 const [jgEnabled, setJgEnabled] = useState(joinGateConfig?.enabled || false);
 const [jgMinAge, setJgMinAge] = useState(joinGateConfig?.min_account_age_days || 7);
 const [jgAvatar, setJgAvatar] = useState(joinGateConfig?.require_avatar || false);

 // Auto role state
 const [newAutoRole, setNewAutoRole] = useState({ role_id: '', role_name: '' });

 // Join/leave state
 const [jlJoinEnabled, setJlJoinEnabled] = useState(joinLeaveConfig?.join_enabled || false);
 const [jlJoinChannel, setJlJoinChannel] = useState(joinLeaveConfig?.join_channel_id || '');
 const [jlJoinMsg, setJlJoinMsg] = useState(joinLeaveConfig?.join_message || '{user} just joined {server}! Welcome!');
 const [jlLeaveEnabled, setJlLeaveEnabled] = useState(joinLeaveConfig?.leave_enabled || false);
 const [jlLeaveChannel, setJlLeaveChannel] = useState(joinLeaveConfig?.leave_channel_id || '');
 const [jlLeaveMsg, setJlLeaveMsg] = useState(joinLeaveConfig?.leave_message || '{user} has left the server.');

 // Mod log state
 const [mlEnabled, setMlEnabled] = useState(modLogConfig?.enabled || false);
 const [mlChannel, setMlChannel] = useState(modLogConfig?.channel_id || '');

 return (
 <BotDashboardLayout>
 <div className="space-y-6">
 <div>
 <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
 <Users className="h-6 w-6 text-[hsl(258,90%,66%)]" />
 Community Features
 </h1>
 <p className="text-foreground/50 text-sm mt-1">Giveaways, starboard, suggestions, verification, and more.</p>
 </div>

 <Tabs defaultValue="giveaways" className="space-y-4">
 <TabsList className="bg-background/5 border border-white/10 flex-wrap h-auto gap-1 p-1">
 <TabsTrigger value="giveaways" className="text-xs data-[state=active]:bg-[hsl(258,90%,66%)]/20"><Gift className="h-3.5 w-3.5 mr-1" />Giveaways</TabsTrigger>
 <TabsTrigger value="starboard" className="text-xs data-[state=active]:bg-[hsl(258,90%,66%)]/20"><Star className="h-3.5 w-3.5 mr-1" />Starboard</TabsTrigger>
 <TabsTrigger value="suggestions" className="text-xs data-[state=active]:bg-[hsl(258,90%,66%)]/20"><Lightbulb className="h-3.5 w-3.5 mr-1" />Suggestions</TabsTrigger>
 <TabsTrigger value="verification" className="text-xs data-[state=active]:bg-[hsl(258,90%,66%)]/20"><ShieldCheck className="h-3.5 w-3.5 mr-1" />Verification</TabsTrigger>
 <TabsTrigger value="joingate" className="text-xs data-[state=active]:bg-[hsl(258,90%,66%)]/20"><UserCheck className="h-3.5 w-3.5 mr-1" />Join Gate</TabsTrigger>
 <TabsTrigger value="scheduled" className="text-xs data-[state=active]:bg-[hsl(258,90%,66%)]/20"><Clock className="h-3.5 w-3.5 mr-1" />Scheduled</TabsTrigger>
 <TabsTrigger value="autorole" className="text-xs data-[state=active]:bg-[hsl(258,90%,66%)]/20"><UserPlus className="h-3.5 w-3.5 mr-1" />Auto-Role</TabsTrigger>
 <TabsTrigger value="joinleave" className="text-xs data-[state=active]:bg-[hsl(258,90%,66%)]/20"><LogOut className="h-3.5 w-3.5 mr-1" />Join/Leave</TabsTrigger>
 <TabsTrigger value="modlog" className="text-xs data-[state=active]:bg-[hsl(258,90%,66%)]/20"><ShieldCheck className="h-3.5 w-3.5 mr-1" />Mod Log</TabsTrigger>
 </TabsList>

 {/* Giveaways */}
 <TabsContent value="giveaways" className="space-y-4">
 <div className="border border-border rounded-xl overflow-hidden bg-background/[0.03] border-white/10">
 <div className="px-4 py-3 border-b border-border bg-muted/30"><h3 className="font-semibold text-sm text-foreground text-base">Create Giveaway</h3></div>
 <div className="p-4 space-y-3">
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <div><Label className="text-foreground/60 text-xs">Title</Label><Input value={giveawayForm.title} onChange={e => setGiveawayForm({ ...giveawayForm, title: e.target.value })} className="bg-background/5 border-white/10 text-foreground" /></div>
 <div><Label className="text-foreground/60 text-xs">Prize</Label><Input value={giveawayForm.prize} onChange={e => setGiveawayForm({ ...giveawayForm, prize: e.target.value })} className="bg-background/5 border-white/10 text-foreground" /></div>
 <div><Label className="text-foreground/60 text-xs">Channel ID</Label><Input value={giveawayForm.channel_id} onChange={e => setGiveawayForm({ ...giveawayForm, channel_id: e.target.value })} className="bg-background/5 border-white/10 text-foreground" /></div>
 <div><Label className="text-foreground/60 text-xs">Winners</Label><Input type="number" min={1} value={giveawayForm.winners_count} onChange={e => setGiveawayForm({ ...giveawayForm, winners_count: parseInt(e.target.value) || 1 })} className="bg-background/5 border-white/10 text-foreground" /></div>
 <div><Label className="text-foreground/60 text-xs">Ends At</Label><Input type="datetime-local" value={giveawayForm.ends_at} onChange={e => setGiveawayForm({ ...giveawayForm, ends_at: e.target.value })} className="bg-background/5 border-white/10 text-foreground" /></div>
 </div>
 <Button onClick={createGiveaway} className="bg-[hsl(258,90%,66%)]"><Plus className="h-4 w-4 mr-2" /> Create</Button>
 </div>
 </div>
 <div className="border border-border rounded-xl overflow-hidden bg-background/[0.03] border-white/10">
 <div className="px-4 py-3 border-b border-border bg-muted/30"><h3 className="font-semibold text-sm text-foreground text-sm">Active Giveaways</h3></div>
 <div className="p-4 p-0">
 {giveaways.length === 0 ? (
 <div className="p-6 text-center text-foreground/40 text-sm">No giveaways yet.</div>
 ) : (
 <div className="divide-y divide-white/5">
 {giveaways.map((g) => (
 <div key={g.id} className="px-4 py-3 flex items-center gap-3">
 <Gift className="h-4 w-4 text-[hsl(258,90%,66%)] shrink-0" />
 <div className="flex-1">
 <span className="text-sm text-foreground font-medium">{g.title}</span>
 <p className="text-xs text-foreground/40">Prize: {g.prize} · {g.winners_count} winner(s) · Ends {format(new Date(g.ends_at), 'dd MMM HH:mm')}</p>
 </div>
 <Badge variant="outline" className={`text-[10px] ${g.ended ? 'text-red-400 border-red-500/30' : 'text-green-400 border-green-500/30'}`}>
 {g.ended ? 'Ended' : 'Active'}
 </Badge>
 </div>
 ))}
 </div>
 )}
 </div>
 </div>
 </TabsContent>

 {/* Starboard */}
 <TabsContent value="starboard">
 <div className="border border-border rounded-xl overflow-hidden bg-background/[0.03] border-white/10">
 <div className="px-4 py-3 border-b border-border bg-muted/30">
 <div className="flex items-center justify-between">
 <h3 className="font-semibold text-sm text-foreground text-base">Starboard</h3>
 <Switch checked={sbEnabled} onCheckedChange={setSbEnabled} />
 </div>
 </div>
 <div className="p-4 space-y-3">
 <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
 <div><Label className="text-foreground/60 text-xs">Channel ID</Label><Input value={sbChannel} onChange={e => setSbChannel(e.target.value)} className="bg-background/5 border-white/10 text-foreground" /></div>
 <div><Label className="text-foreground/60 text-xs">Emoji</Label><Input value={sbEmoji} onChange={e => setSbEmoji(e.target.value)} className="bg-background/5 border-white/10 text-foreground" /></div>
 <div><Label className="text-foreground/60 text-xs">Threshold</Label><Input type="number" min={1} value={sbThreshold} onChange={e => setSbThreshold(parseInt(e.target.value) || 3)} className="bg-background/5 border-white/10 text-foreground" /></div>
 </div>
 <Button onClick={() => upsertMutation.mutate({ table: 'bot_starboard_config', data: { guild_id: 'global', enabled: sbEnabled, channel_id: sbChannel, emoji: sbEmoji, threshold: sbThreshold }, key: 'guild_id' })} className="bg-[hsl(258,90%,66%)]">
 <Save className="h-4 w-4 mr-2" /> Save
 </Button>
 </div>
 </div>
 </TabsContent>

 {/* Suggestions */}
 <TabsContent value="suggestions" className="space-y-4">
 <div className="border border-border rounded-xl overflow-hidden bg-background/[0.03] border-white/10">
 <div className="px-4 py-3 border-b border-border bg-muted/30"><h3 className="font-semibold text-sm text-foreground text-base">Suggestion Settings</h3></div>
 <div className="p-4 space-y-3">
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <div><Label className="text-foreground/60 text-xs">Suggestions Channel ID</Label><Input defaultValue={suggestionsConfig?.channel_id || ''} id="sug-channel" className="bg-background/5 border-white/10 text-foreground" /></div>
 <div><Label className="text-foreground/60 text-xs">Review Channel ID</Label><Input defaultValue={suggestionsConfig?.review_channel_id || ''} id="sug-review" className="bg-background/5 border-white/10 text-foreground" /></div>
 </div>
 <Button onClick={() => {
 const ch = (document.getElementById('sug-channel') as HTMLInputElement)?.value;
 const rev = (document.getElementById('sug-review') as HTMLInputElement)?.value;
 upsertMutation.mutate({ table: 'bot_suggestions_config', data: { guild_id: 'global', enabled: true, channel_id: ch, review_channel_id: rev }, key: 'guild_id' });
 }} className="bg-[hsl(258,90%,66%)]"><Save className="h-4 w-4 mr-2" /> Save</Button>
 </div>
 </div>
 <div className="border border-border rounded-xl overflow-hidden bg-background/[0.03] border-white/10">
 <div className="px-4 py-3 border-b border-border bg-muted/30"><h3 className="font-semibold text-sm text-foreground text-sm">Recent Suggestions</h3><p className="text-sm text-muted-foreground text-foreground/40">{suggestions.length} total</p></div>
 <div className="p-4 p-0">
 {suggestions.length === 0 ? (
 <div className="p-6 text-center text-foreground/40 text-sm">No suggestions yet. Members use <code>/suggest</code>.</div>
 ) : (
 <div className="divide-y divide-white/5">
 {suggestions.map((s: any) => (
 <div key={s.id} className="px-4 py-3">
 <div className="flex items-center gap-2">
 <span className="text-sm text-foreground">{s.content}</span>
 <Badge variant="outline" className={`text-[10px] ${s.status === 'approved' ? 'text-green-400 border-green-500/30' : s.status === 'denied' ? 'text-red-400 border-red-500/30' : 'text-yellow-400 border-yellow-500/30'}`}>{s.status}</Badge>
 </div>
 <p className="text-xs text-foreground/40 mt-0.5">by {s.author_username || s.author_id} · 👍 {s.upvotes} 👎 {s.downvotes}</p>
 </div>
 ))}
 </div>
 )}
 </div>
 </div>
 </TabsContent>

 {/* Verification */}
 <TabsContent value="verification">
 <div className="border border-border rounded-xl overflow-hidden bg-background/[0.03] border-white/10">
 <div className="px-4 py-3 border-b border-border bg-muted/30">
 <div className="flex items-center justify-between">
 <h3 className="font-semibold text-sm text-foreground text-base">Verification Gate</h3>
 <Switch checked={vEnabled} onCheckedChange={setVEnabled} />
 </div>
 <p className="text-sm text-muted-foreground text-foreground/40">Require users to verify before accessing the server.</p>
 </div>
 <div className="p-4 space-y-3">
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <div><Label className="text-foreground/60 text-xs">Verification Channel ID</Label><Input value={vChannel} onChange={e => setVChannel(e.target.value)} className="bg-background/5 border-white/10 text-foreground" /></div>
 <div><Label className="text-foreground/60 text-xs">Verified Role ID</Label><Input value={vRole} onChange={e => setVRole(e.target.value)} className="bg-background/5 border-white/10 text-foreground" /></div>
 </div>
 <Button onClick={() => upsertMutation.mutate({ table: 'bot_verification_config', data: { guild_id: 'global', enabled: vEnabled, channel_id: vChannel, verified_role_id: vRole, type: 'button' }, key: 'guild_id' })} className="bg-[hsl(258,90%,66%)]">
 <Save className="h-4 w-4 mr-2" /> Save
 </Button>
 </div>
 </div>
 </TabsContent>

 {/* Join Gate */}
 <TabsContent value="joingate">
 <div className="border border-border rounded-xl overflow-hidden bg-background/[0.03] border-white/10">
 <div className="px-4 py-3 border-b border-border bg-muted/30">
 <div className="flex items-center justify-between">
 <h3 className="font-semibold text-sm text-foreground text-base">Join Gate Filters</h3>
 <Switch checked={jgEnabled} onCheckedChange={setJgEnabled} />
 </div>
 <p className="text-sm text-muted-foreground text-foreground/40">Filter new joins by account age, avatar, etc.</p>
 </div>
 <div className="p-4 space-y-3">
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <div><Label className="text-foreground/60 text-xs">Min Account Age (days)</Label><Input type="number" min={0} value={jgMinAge} onChange={e => setJgMinAge(parseInt(e.target.value) || 0)} className="bg-background/5 border-white/10 text-foreground" /></div>
 <div className="flex items-center gap-3 pt-5">
 <Switch checked={jgAvatar} onCheckedChange={setJgAvatar} />
 <Label className="text-foreground/60 text-xs">Require Avatar</Label>
 </div>
 </div>
 <Button onClick={() => upsertMutation.mutate({ table: 'bot_join_gate_config', data: { guild_id: 'global', enabled: jgEnabled, min_account_age_days: jgMinAge, require_avatar: jgAvatar, action: 'kick' }, key: 'guild_id' })} className="bg-[hsl(258,90%,66%)]">
 <Save className="h-4 w-4 mr-2" /> Save
 </Button>
 </div>
 </div>
 </TabsContent>

 {/* Scheduled Messages */}
 <TabsContent value="scheduled">
 <div className="border border-border rounded-xl overflow-hidden bg-background/[0.03] border-white/10">
 <div className="px-4 py-3 border-b border-border bg-muted/30"><h3 className="font-semibold text-sm text-foreground text-base">Scheduled Messages</h3></div>
 <div className="p-4 p-0">
 {scheduledMsgs.length === 0 ? (
 <div className="p-6 text-center text-foreground/40 text-sm">No scheduled messages. Create one from the bot commands.</div>
 ) : (
 <div className="divide-y divide-white/5">
 {scheduledMsgs.map((m: any) => (
 <div key={m.id} className="px-4 py-3">
 <p className="text-sm text-foreground truncate">{m.content || 'Embed message'}</p>
 <p className="text-xs text-foreground/40">Channel: {m.channel_id} · {m.repeat ? 'Repeating' : 'One-time'} · {m.enabled ? 'Active' : 'Disabled'}</p>
 </div>
 ))}
 </div>
 )}
 </div>
 </div>
 </TabsContent>

 {/* Auto-Role */}
 <TabsContent value="autorole">
 <div className="border border-border rounded-xl overflow-hidden bg-background/[0.03] border-white/10">
 <div className="px-4 py-3 border-b border-border bg-muted/30"><h3 className="font-semibold text-sm text-foreground text-base">Auto-Role on Join</h3></div>
 <div className="p-4 space-y-3">
 <div className="flex gap-2">
 <Input value={newAutoRole.role_id} onChange={e => setNewAutoRole({ ...newAutoRole, role_id: e.target.value })} placeholder="Role ID" className="bg-background/5 border-white/10 text-foreground flex-1" />
 <Input value={newAutoRole.role_name} onChange={e => setNewAutoRole({ ...newAutoRole, role_name: e.target.value })} placeholder="Role name" className="bg-background/5 border-white/10 text-foreground flex-1" />
 <Button onClick={() => {
 if (!newAutoRole.role_id) return;
 upsertMutation.mutate({ table: 'bot_auto_roles', data: { guild_id: 'global', ...newAutoRole } });
 setNewAutoRole({ role_id: '', role_name: '' });
 }} className="bg-[hsl(258,90%,66%)]"><Plus className="h-4 w-4" /></Button>
 </div>
 {autoRoles.length > 0 && (
 <div className="space-y-1">
 {autoRoles.map((r: any) => (
 <div key={r.id} className="flex items-center justify-between bg-background/5 rounded px-3 py-2">
 <span className="text-sm text-foreground">{r.role_name || r.role_id}</span>
 <Switch checked={r.enabled} onCheckedChange={() => upsertMutation.mutate({ table: 'bot_auto_roles', data: { ...r, enabled: !r.enabled } })} />
 </div>
 ))}
 </div>
 )}
 </div>
 </div>
 </TabsContent>

 {/* Join/Leave */}
 <TabsContent value="joinleave">
 <div className="border border-border rounded-xl overflow-hidden bg-background/[0.03] border-white/10">
 <div className="px-4 py-3 border-b border-border bg-muted/30"><h3 className="font-semibold text-sm text-foreground text-base">Join/Leave Announcements</h3></div>
 <div className="p-4 space-y-4">
 <div className="space-y-3">
 <div className="flex items-center gap-3"><Switch checked={jlJoinEnabled} onCheckedChange={setJlJoinEnabled} /><Label className="text-foreground/60 text-sm">Enable Join Messages</Label></div>
 {jlJoinEnabled && (
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-6">
 <div><Label className="text-foreground/60 text-xs">Channel ID</Label><Input value={jlJoinChannel} onChange={e => setJlJoinChannel(e.target.value)} className="bg-background/5 border-white/10 text-foreground" /></div>
 <div><Label className="text-foreground/60 text-xs">Message</Label><Input value={jlJoinMsg} onChange={e => setJlJoinMsg(e.target.value)} className="bg-background/5 border-white/10 text-foreground" /></div>
 </div>
 )}
 </div>
 <div className="space-y-3">
 <div className="flex items-center gap-3"><Switch checked={jlLeaveEnabled} onCheckedChange={setJlLeaveEnabled} /><Label className="text-foreground/60 text-sm">Enable Leave Messages</Label></div>
 {jlLeaveEnabled && (
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-6">
 <div><Label className="text-foreground/60 text-xs">Channel ID</Label><Input value={jlLeaveChannel} onChange={e => setJlLeaveChannel(e.target.value)} className="bg-background/5 border-white/10 text-foreground" /></div>
 <div><Label className="text-foreground/60 text-xs">Message</Label><Input value={jlLeaveMsg} onChange={e => setJlLeaveMsg(e.target.value)} className="bg-background/5 border-white/10 text-foreground" /></div>
 </div>
 )}
 </div>
 <Button onClick={() => upsertMutation.mutate({ table: 'bot_join_leave_config', data: { guild_id: 'global', join_enabled: jlJoinEnabled, join_channel_id: jlJoinChannel, join_message: jlJoinMsg, leave_enabled: jlLeaveEnabled, leave_channel_id: jlLeaveChannel, leave_message: jlLeaveMsg }, key: 'guild_id' })} className="bg-[hsl(258,90%,66%)]">
 <Save className="h-4 w-4 mr-2" /> Save
 </Button>
 </div>
 </div>
 </TabsContent>

 {/* Mod Log */}
 <TabsContent value="modlog">
 <div className="border border-border rounded-xl overflow-hidden bg-background/[0.03] border-white/10">
 <div className="px-4 py-3 border-b border-border bg-muted/30">
 <div className="flex items-center justify-between">
 <h3 className="font-semibold text-sm text-foreground text-base">Mod Log Channel</h3>
 <Switch checked={mlEnabled} onCheckedChange={setMlEnabled} />
 </div>
 <p className="text-sm text-muted-foreground text-foreground/40">Log moderation actions to a Discord channel.</p>
 </div>
 <div className="p-4 space-y-3">
 <div><Label className="text-foreground/60 text-xs">Log Channel ID</Label><Input value={mlChannel} onChange={e => setMlChannel(e.target.value)} className="bg-background/5 border-white/10 text-foreground" /></div>
 <Button onClick={() => upsertMutation.mutate({ table: 'bot_mod_log_config', data: { guild_id: 'global', enabled: mlEnabled, channel_id: mlChannel }, key: 'guild_id' })} className="bg-[hsl(258,90%,66%)]">
 <Save className="h-4 w-4 mr-2" /> Save
 </Button>
 </div>
 </div>
 </TabsContent>
 </Tabs>
 </div>
 </BotDashboardLayout>
 );
}
