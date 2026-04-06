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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Terminal, Plus, Trash2, Save, MessageSquare, Zap } from 'lucide-react';
import { toast } from 'sonner';

export default function BotCustomCommands() {
 const queryClient = useQueryClient();
 const [showAdd, setShowAdd] = useState(false);
 const [form, setForm] = useState({
 trigger: '', trigger_type: 'command', response: '', cooldown_seconds: 0, enabled: true,
 });

 const { data: commands = [], isLoading } = useQuery({
 queryKey: ['bot-custom-commands'],
 queryFn: async () => {
 const { data, error } = await (supabase as any).from('bot_custom_commands').select('*').order('created_at', { ascending: false });
 if (error) throw error;
 return data || [];
 },
 });

 const saveMutation = useMutation({
 mutationFn: async () => {
 if (!form.trigger || !form.response) throw new Error('Trigger and response required');
 const { error } = await (supabase as any).from('bot_custom_commands').insert({ ...form, guild_id: 'global' });
 if (error) throw error;
 },
 onSuccess: () => {
 queryClient.invalidateQueries({ queryKey: ['bot-custom-commands'] });
 toast.success('Command created!');
 setShowAdd(false);
 setForm({ trigger: '', trigger_type: 'command', response: '', cooldown_seconds: 0, enabled: true });
 },
 onError: (e: any) => toast.error(e.message || 'Failed'),
 });

 const toggleMutation = useMutation({
 mutationFn: async (cmd: any) => {
 const { error } = await (supabase as any).from('bot_custom_commands').update({ enabled: !cmd.enabled }).eq('id', cmd.id);
 if (error) throw error;
 },
 onSuccess: () => queryClient.invalidateQueries({ queryKey: ['bot-custom-commands'] }),
 });

 const deleteMutation = useMutation({
 mutationFn: async (id: string) => {
 const { error } = await (supabase as any).from('bot_custom_commands').delete().eq('id', id);
 if (error) throw error;
 },
 onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['bot-custom-commands'] }); toast.success('Deleted'); },
 });

 return (
 <BotDashboardLayout>
 <div className="space-y-6">
 <div className="flex items-center justify-between">
 <div>
 <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
 <Terminal className="h-6 w-6 text-[hsl(258,90%,66%)]" />
 Custom Commands
 </h1>
 <p className="text-foreground/50 text-sm mt-1">Create custom commands and auto-responses.</p>
 </div>
 <Button onClick={() => setShowAdd(!showAdd)} className="bg-[hsl(258,90%,66%)] hover:bg-[hsl(258,90%,56%)]">
 <Plus className="h-4 w-4 mr-2" /> New Command
 </Button>
 </div>

 {showAdd && (
 <div className="border border-border rounded-xl overflow-hidden bg-background/[0.03] border-white/10">
 <div className="px-4 py-3 border-b border-border bg-muted/30"><h3 className="font-semibold text-sm text-foreground text-base">New Command</h3></div>
 <div className="p-4 space-y-4">
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 <div>
 <Label className="text-foreground/60 text-xs">Type</Label>
 <Select value={form.trigger_type} onValueChange={v => setForm({ ...form, trigger_type: v })}>
 <SelectTrigger className="bg-background/5 border-white/10 text-foreground"><SelectValue /></SelectTrigger>
 <SelectContent>
 <SelectItem value="command">Slash Command (!trigger)</SelectItem>
 <SelectItem value="contains">Contains (auto-respond)</SelectItem>
 <SelectItem value="exact">Exact Match</SelectItem>
 <SelectItem value="startswith">Starts With</SelectItem>
 </SelectContent>
 </Select>
 </div>
 <div>
 <Label className="text-foreground/60 text-xs">Trigger</Label>
 <Input value={form.trigger} onChange={e => setForm({ ...form, trigger: e.target.value })} placeholder={form.trigger_type === 'command' ? '!hello' : 'keyword'} className="bg-background/5 border-white/10 text-foreground" />
 </div>
 </div>
 <div>
 <Label className="text-foreground/60 text-xs">Response</Label>
 <Textarea value={form.response} onChange={e => setForm({ ...form, response: e.target.value })} placeholder="Bot response text... Use {user} for mention, {server} for server name" className="bg-background/5 border-white/10 text-foreground min-h-[80px]" />
 </div>
 <div className="w-32">
 <Label className="text-foreground/60 text-xs">Cooldown (seconds)</Label>
 <Input type="number" min={0} value={form.cooldown_seconds} onChange={e => setForm({ ...form, cooldown_seconds: parseInt(e.target.value) || 0 })} className="bg-background/5 border-white/10 text-foreground" />
 </div>
 <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="bg-[hsl(258,90%,66%)]">
 <Save className="h-4 w-4 mr-2" /> Create
 </Button>
 </div>
 </div>
 )}

 <div className="border border-border rounded-xl overflow-hidden bg-background/[0.03] border-white/10">
 <div className="px-4 py-3 border-b border-border bg-muted/30">
 <h3 className="font-semibold text-sm text-foreground text-base">Commands</h3>
 <p className="text-sm text-muted-foreground text-foreground/40">{commands.length} command{commands.length !== 1 ? 's' : ''}</p>
 </div>
 <div className="p-4 p-0">
 {isLoading ? (
 <div className="p-8 text-center text-foreground/40">Loading...</div>
 ) : commands.length === 0 ? (
 <div className="p-8 text-center text-foreground/40">No custom commands yet.</div>
 ) : (
 <div className="divide-y divide-white/5">
 {commands.map((cmd: any) => (
 <div key={cmd.id} className="px-4 py-3 flex items-center gap-3 hover:bg-background/[0.02]">
 {cmd.trigger_type === 'command' ? <Terminal className="h-4 w-4 text-[hsl(258,90%,66%)] shrink-0" /> : <MessageSquare className="h-4 w-4 text-blue-400 shrink-0" />}
 <div className="flex-1 min-w-0">
 <div className="flex items-center gap-2 flex-wrap">
 <code className="text-sm font-mono text-foreground">{cmd.trigger}</code>
 <Badge variant="outline" className="text-[10px] border-white/20 text-foreground/60">{cmd.trigger_type}</Badge>
 {cmd.cooldown_seconds > 0 && <Badge variant="outline" className="text-[10px] border-white/20 text-foreground/40">{cmd.cooldown_seconds}s cd</Badge>}
 {cmd.usage_count > 0 && <Badge variant="outline" className="text-[10px] border-green-500/30 text-green-400">{cmd.usage_count} uses</Badge>}
 </div>
 <p className="text-xs text-foreground/40 mt-0.5 truncate">{cmd.response}</p>
 </div>
 <Switch checked={cmd.enabled} onCheckedChange={() => toggleMutation.mutate(cmd)} />
 <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400" onClick={() => deleteMutation.mutate(cmd.id)}>
 <Trash2 className="h-4 w-4" />
 </Button>
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
