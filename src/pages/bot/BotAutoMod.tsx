import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { BotDashboardLayout } from '@/components/bot-dashboard/BotDashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ShieldAlert, Plus, Trash2, Save, Flame, AlertTriangle, Link2, MessageSquare, AtSign } from 'lucide-react';
import { toast } from 'sonner';

const RULE_TYPES = [
 { value: 'word_filter', label: 'Word Filter', icon: MessageSquare, desc: 'Block specific words or phrases' },
 { value: 'spam_detection', label: 'Spam Detection', icon: AlertTriangle, desc: 'Detect repeated messages & fast typing' },
 { value: 'link_filter', label: 'Link Filter', icon: Link2, desc: 'Block or whitelist URLs' },
 { value: 'mention_spam', label: 'Mention Spam', icon: AtSign, desc: 'Limit mass mentions' },
 { value: 'caps_filter', label: 'Caps Filter', icon: MessageSquare, desc: 'Block excessive caps usage' },
];

const ACTIONS = [
 { value: 'delete', label: 'Delete Message' },
 { value: 'warn', label: 'Warn User' },
 { value: 'timeout_5m', label: 'Timeout 5 min' },
 { value: 'timeout_1h', label: 'Timeout 1 hour' },
 { value: 'kick', label: 'Kick' },
 { value: 'ban', label: 'Ban' },
];

export default function BotAutoMod() {
 const queryClient = useQueryClient();
 const [showAdd, setShowAdd] = useState(false);
 const [newRule, setNewRule] = useState({
 name: '', rule_type: 'word_filter', action: 'delete', heat_points: 1, enabled: true,
 config: { words: '', threshold: 5, whitelist: '' }
 });

 const { data: rules = [], isLoading } = useQuery({
 queryKey: ['bot-automod-rules'],
 queryFn: async () => {
 const { data, error } = await (supabase as any).from('bot_automod_rules').select('*').order('created_at', { ascending: false });
 if (error) throw error;
 return data || [];
 },
 });

 const { data: heatData = [] } = useQuery({
 queryKey: ['bot-automod-heat'],
 queryFn: async () => {
 const { data, error } = await (supabase as any).from('bot_automod_heat').select('*').order('heat_points', { ascending: false }).limit(20);
 if (error) throw error;
 return data || [];
 },
 });

 const saveMutation = useMutation({
 mutationFn: async (rule: Record<string, unknown>) => {
 const { error } = await (supabase as any).from('bot_automod_rules').upsert(rule);
 if (error) throw error;
 },
 onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['bot-automod-rules'] }); toast.success('Rule saved'); },
 onError: () => toast.error('Failed to save rule'),
 });

 const deleteMutation = useMutation({
 mutationFn: async (id: string) => {
 const { error } = await (supabase as any).from('bot_automod_rules').delete().eq('id', id);
 if (error) throw error;
 },
 onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['bot-automod-rules'] }); toast.success('Rule deleted'); },
 });

 const addRule = () => {
 if (!newRule.name) return toast.error('Rule name required');
 saveMutation.mutate({
 name: newRule.name, rule_type: newRule.rule_type, action: newRule.action,
 heat_points: newRule.heat_points, enabled: newRule.enabled,
 config: newRule.config, guild_id: 'global',
 });
 setShowAdd(false);
 setNewRule({ name: '', rule_type: 'word_filter', action: 'delete', heat_points: 1, enabled: true, config: { words: '', threshold: 5, whitelist: '' } });
 };

 const toggleRule = (rule: Record<string, unknown>) => {
 saveMutation.mutate({ ...rule, enabled: !rule.enabled });
 };

 return (
 <BotDashboardLayout>
 <div className="space-y-6">
 <div className="flex items-center justify-between">
 <div>
 <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
 <ShieldAlert className="h-6 w-6 text-[hsl(258,90%,66%)]" />
 Auto-Mod
 </h1>
 <p className="text-foreground/50 text-sm mt-1">Configure automated moderation with heat-based escalation.</p>
 </div>
 <Button onClick={() => setShowAdd(!showAdd)} className="bg-[hsl(258,90%,66%)] hover:bg-[hsl(258,90%,56%)]">
 <Plus className="h-4 w-4 mr-2" /> Add Rule
 </Button>
 </div>

 <div className="border border-border rounded-xl overflow-hidden bg-[hsl(258,90%,66%)]/10 border-[hsl(258,90%,66%)]/20">
 <div className="p-4 p-4 flex items-start gap-3">
 <Flame className="h-5 w-5 text-orange-400 shrink-0 mt-0.5" />
 <div>
 <p className="text-sm text-foreground/70"><strong>Heat System:</strong> Each rule adds heat points when triggered. As heat accumulates, actions escalate automatically. Heat decays over time.</p>
 <div className="flex gap-4 mt-2 text-xs text-foreground/50">
 <span>1-3 pts: Warning</span>
 <span>4-6 pts: Timeout</span>
 <span>7-9 pts: Kick</span>
 <span>10+: Ban</span>
 </div>
 </div>
 </div>
 </div>

 {showAdd && (
 <div className="border border-border rounded-xl overflow-hidden bg-background/[0.03] border-white/10">
 <div className="px-4 py-3 border-b border-border bg-muted/30"><h3 className="font-semibold text-sm text-foreground text-base">New Rule</h3></div>
 <div className="p-4 space-y-4">
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 <div>
 <Label className="text-foreground/60 text-xs">Rule Name</Label>
 <Input value={newRule.name} onChange={e => setNewRule({ ...newRule, name: e.target.value })} placeholder="e.g. Block slurs" className="bg-background/5 border-white/10 text-foreground" />
 </div>
 <div>
 <Label className="text-foreground/60 text-xs">Type</Label>
 <Select value={newRule.rule_type} onValueChange={v => setNewRule({ ...newRule, rule_type: v })}>
 <SelectTrigger className="bg-background/5 border-white/10 text-foreground"><SelectValue /></SelectTrigger>
 <SelectContent>{RULE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
 </Select>
 </div>
 <div>
 <Label className="text-foreground/60 text-xs">Action</Label>
 <Select value={newRule.action} onValueChange={v => setNewRule({ ...newRule, action: v })}>
 <SelectTrigger className="bg-background/5 border-white/10 text-foreground"><SelectValue /></SelectTrigger>
 <SelectContent>{ACTIONS.map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}</SelectContent>
 </Select>
 </div>
 <div>
 <Label className="text-foreground/60 text-xs">Heat Points</Label>
 <Input type="number" min={1} max={10} value={newRule.heat_points} onChange={e => setNewRule({ ...newRule, heat_points: parseInt(e.target.value) || 1 })} className="bg-background/5 border-white/10 text-foreground" />
 </div>
 </div>
 {newRule.rule_type === 'word_filter' && (
 <div>
 <Label className="text-foreground/60 text-xs">Blocked Words (comma-separated)</Label>
 <Textarea value={newRule.config.words} onChange={e => setNewRule({ ...newRule, config: { ...newRule.config, words: e.target.value } })} placeholder="word1, word2, phrase..." className="bg-background/5 border-white/10 text-foreground min-h-[60px]" />
 </div>
 )}
 {newRule.rule_type === 'link_filter' && (
 <div>
 <Label className="text-foreground/60 text-xs">Whitelisted Domains (comma-separated)</Label>
 <Input value={newRule.config.whitelist} onChange={e => setNewRule({ ...newRule, config: { ...newRule.config, whitelist: e.target.value } })} placeholder="discord.com, youtube.com" className="bg-background/5 border-white/10 text-foreground" />
 </div>
 )}
 <Button onClick={addRule} disabled={saveMutation.isPending} className="bg-[hsl(258,90%,66%)]">
 <Save className="h-4 w-4 mr-2" /> Save Rule
 </Button>
 </div>
 </div>
 )}

 <div className="border border-border rounded-xl overflow-hidden bg-background/[0.03] border-white/10">
 <div className="px-4 py-3 border-b border-border bg-muted/30">
 <h3 className="font-semibold text-sm text-foreground text-base">Active Rules</h3>
 <p className="text-sm text-muted-foreground text-foreground/40">{rules.length} rule{rules.length !== 1 ? 's' : ''} configured</p>
 </div>
 <div className="p-4 p-0">
 {isLoading ? (
 <div className="p-8 text-center text-foreground/40">Loading...</div>
 ) : rules.length === 0 ? (
 <div className="p-8 text-center text-foreground/40">No auto-mod rules configured yet.</div>
 ) : (
 <div className="divide-y divide-white/5">
 {rules.map((rule) => {
 const ruleType = RULE_TYPES.find(t => t.value === rule.rule_type);
 const Icon = ruleType?.icon || ShieldAlert;
 return (
 <div key={rule.id} className="px-4 py-3 flex items-center gap-3 hover:bg-background/[0.02]">
 <Icon className="h-5 w-5 text-[hsl(258,90%,66%)] shrink-0" />
 <div className="flex-1 min-w-0">
 <div className="flex items-center gap-2">
 <span className="text-sm font-medium text-foreground">{rule.name}</span>
 <Badge variant="outline" className="text-[10px] border-white/20 text-foreground/60">{ruleType?.label}</Badge>
 <Badge variant="outline" className="text-[10px] border-orange-500/30 text-orange-400">{rule.heat_points} heat</Badge>
 </div>
 <p className="text-xs text-foreground/40 mt-0.5">Action: {ACTIONS.find(a => a.value === rule.action)?.label}</p>
 </div>
 <Switch checked={rule.enabled} onCheckedChange={() => toggleRule(rule)} />
 <Button variant="ghost" size="icon" aria-label="Delete" className="h-8 w-8 text-red-400 hover:text-red-300" onClick={() => deleteMutation.mutate(rule.id)}>
 <Trash2 className="h-4 w-4" />
 </Button>
 </div>
 );
 })}
 </div>
 )}
 </div>
 </div>

 {heatData.length > 0 && (
 <div className="border border-border rounded-xl overflow-hidden bg-background/[0.03] border-white/10">
 <div className="px-4 py-3 border-b border-border bg-muted/30">
 <h3 className="font-semibold text-sm text-foreground text-base flex items-center gap-2"><Flame className="h-4 w-4 text-orange-400" /> Heat Leaderboard</h3>
 </div>
 <div className="p-4 p-0">
 <div className="divide-y divide-white/5">
 {heatData.map((h) => (
 <div key={h.id} className="px-4 py-2 flex items-center justify-between">
 <span className="text-sm text-foreground/70">{h.user_discord_id}</span>
 <Badge className={`${h.heat_points >= 7 ? 'bg-red-500/20 text-red-400' : h.heat_points >= 4 ? 'bg-orange-500/20 text-orange-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
 {h.heat_points} pts
 </Badge>
 </div>
 ))}
 </div>
 </div>
 </div>
 )}
 </div>
 </BotDashboardLayout>
 );
}
