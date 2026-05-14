import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { BotDashboardLayout } from '@/components/bot-dashboard/BotDashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { SmilePlus, Plus, Trash2, Save, Hash } from 'lucide-react';
import { toast } from 'sonner';

interface RoleMapping {
 emoji: string;
 role_id: string;
 role_name: string;
}

export default function BotReactionRoles() {
 const queryClient = useQueryClient();
 const [showAdd, setShowAdd] = useState(false);
 const [title, setTitle] = useState('Choose your roles');
 const [description, setDescription] = useState('React to get a role!');
 const [channelId, setChannelId] = useState('');
 const [color, setColor] = useState('#7C3AED');
 const [type, setType] = useState('toggle');
 const [roles, setRoles] = useState<RoleMapping[]>([{ emoji: '🎮', role_id: '', role_name: '' }]);

 const { data: panels = [], isLoading } = useQuery({
 queryKey: ['bot-reaction-roles'],
 queryFn: async () => {
 const { data, error } = await (supabase as any).from('bot_reaction_roles').select('*').order('created_at', { ascending: false });
 if (error) throw error;
 return data || [];
 },
 });

 const saveMutation = useMutation({
 mutationFn: async () => {
 if (!channelId) throw new Error('Channel ID required');
 const { error } = await (supabase as any).from('bot_reaction_roles').insert({
 guild_id: 'global', channel_id: channelId, title, description, color, type, roles,
 });
 if (error) throw error;
 },
 onSuccess: () => {
 queryClient.invalidateQueries({ queryKey: ['bot-reaction-roles'] });
 toast.success('Reaction role panel created!');
 setShowAdd(false);
 setRoles([{ emoji: '🎮', role_id: '', role_name: '' }]);
 },
 onError: (e: Error) => toast.error(e.message || 'Failed to create'),
 });

 const deleteMutation = useMutation({
 mutationFn: async (id: string) => {
 const { error } = await (supabase as any).from('bot_reaction_roles').delete().eq('id', id);
 if (error) throw error;
 },
 onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['bot-reaction-roles'] }); toast.success('Panel deleted'); },
 });

 const addRole = () => setRoles([...roles, { emoji: '', role_id: '', role_name: '' }]);
 const removeRole = (i: number) => setRoles(roles.filter((_, idx) => idx !== i));
 const updateRole = (i: number, key: keyof RoleMapping, value: string) => {
 setRoles(roles.map((r, idx) => idx === i ? { ...r, [key]: value } : r));
 };

 return (
 <BotDashboardLayout>
 <div className="space-y-6">
 <div className="flex items-center justify-between">
 <div>
 <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
 <SmilePlus className="h-6 w-6 text-[hsl(258,90%,66%)]" />
 Reaction Roles
 </h1>
 <p className="text-foreground/50 text-sm mt-1">Create self-assign role panels with emoji reactions.</p>
 </div>
 <Button onClick={() => setShowAdd(!showAdd)} className="bg-[hsl(258,90%,66%)] hover:bg-[hsl(258,90%,56%)]">
 <Plus className="h-4 w-4 mr-2" /> New Panel
 </Button>
 </div>

 {showAdd && (
 <div className="border border-border rounded-xl overflow-hidden bg-background/[0.03] border-white/10">
 <div className="px-4 py-3 border-b border-border bg-muted/30"><h3 className="font-semibold text-sm text-foreground text-base">Create Reaction Role Panel</h3></div>
 <div className="p-4 space-y-4">
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 <div>
 <Label className="text-foreground/60 text-xs">Title</Label>
 <Input value={title} onChange={e => setTitle(e.target.value)} className="bg-background/5 border-white/10 text-foreground" />
 </div>
 <div>
 <Label className="text-foreground/60 text-xs">Channel ID</Label>
 <Input value={channelId} onChange={e => setChannelId(e.target.value)} placeholder="Paste channel ID" className="bg-background/5 border-white/10 text-foreground" />
 </div>
 <div>
 <Label className="text-foreground/60 text-xs">Type</Label>
 <Select value={type} onValueChange={setType}>
 <SelectTrigger className="bg-background/5 border-white/10 text-foreground"><SelectValue /></SelectTrigger>
 <SelectContent>
 <SelectItem value="toggle">Toggle (add/remove)</SelectItem>
 <SelectItem value="unique">Unique (one role only)</SelectItem>
 <SelectItem value="sticky">Sticky (can't remove)</SelectItem>
 </SelectContent>
 </Select>
 </div>
 <div>
 <Label className="text-foreground/60 text-xs">Color</Label>
 <div className="flex gap-2">
 <input type="color" value={color} onChange={e => setColor(e.target.value)} className="h-9 w-12 rounded cursor-pointer" />
 <Input value={color} onChange={e => setColor(e.target.value)} className="bg-background/5 border-white/10 text-foreground flex-1" />
 </div>
 </div>
 </div>
 <div>
 <Label className="text-foreground/60 text-xs">Description</Label>
 <Textarea value={description} onChange={e => setDescription(e.target.value)} className="bg-background/5 border-white/10 text-foreground min-h-[60px]" />
 </div>

 <div>
 <div className="flex items-center justify-between mb-2">
 <Label className="text-foreground/60 text-xs">Role Mappings</Label>
 <Button variant="outline" size="sm" onClick={addRole} className="border-white/10 text-foreground/60 h-7 text-xs">
 <Plus className="h-3 w-3 mr-1" /> Add
 </Button>
 </div>
 <div className="space-y-2">
 {roles.map((r, i) => (
 <div key={i} className="flex gap-2 items-center">
 <Input value={r.emoji} onChange={e => updateRole(i, 'emoji', e.target.value)} placeholder="🎮" className="bg-background/5 border-white/10 text-foreground w-16 text-center" />
 <Input value={r.role_id} onChange={e => updateRole(i, 'role_id', e.target.value)} placeholder="Role ID" className="bg-background/5 border-white/10 text-foreground flex-1" />
 <Input value={r.role_name} onChange={e => updateRole(i, 'role_name', e.target.value)} placeholder="Role name" className="bg-background/5 border-white/10 text-foreground flex-1" />
 {roles.length > 1 && (
 <Button variant="ghost" size="icon" aria-label="Delete" className="h-8 w-8 text-red-400" onClick={() => removeRole(i)}>
 <Trash2 className="h-3.5 w-3.5" />
 </Button>
 )}
 </div>
 ))}
 </div>
 </div>

 <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="bg-[hsl(258,90%,66%)]">
 <Save className="h-4 w-4 mr-2" /> Create Panel
 </Button>
 </div>
 </div>
 )}

 <div className="border border-border rounded-xl overflow-hidden bg-background/[0.03] border-white/10">
 <div className="px-4 py-3 border-b border-border bg-muted/30">
 <h3 className="font-semibold text-sm text-foreground text-base">Panels</h3>
 <p className="text-sm text-muted-foreground text-foreground/40">{panels.length} panel{panels.length !== 1 ? 's' : ''}</p>
 </div>
 <div className="p-4 p-0">
 {isLoading ? (
 <div className="p-8 text-center text-foreground/40">Loading...</div>
 ) : panels.length === 0 ? (
 <div className="p-8 text-center text-foreground/40">No reaction role panels yet.</div>
 ) : (
 <div className="divide-y divide-white/5">
 {panels.map((panel: any) => {
 const panelRoles = (panel.roles as RoleMapping[]) || [];
 return (
 <div key={panel.id} className="px-4 py-3 flex items-start gap-3 hover:bg-background/[0.02]">
 <Hash className="h-5 w-5 text-[hsl(258,90%,66%)] shrink-0 mt-0.5" />
 <div className="flex-1 min-w-0">
 <div className="flex items-center gap-2 flex-wrap">
 <span className="text-sm font-medium text-foreground">{panel.title}</span>
 <Badge variant="outline" className="text-[10px] border-white/20 text-foreground/60">{panel.type}</Badge>
 <Badge variant="outline" className="text-[10px] border-white/20 text-foreground/40">{panelRoles.length} roles</Badge>
 </div>
 <div className="flex gap-1 mt-1 flex-wrap">
 {panelRoles.map((r: RoleMapping, i: number) => (
 <span key={i} className="text-xs text-foreground/40">{r.emoji} {r.role_name || r.role_id}</span>
 ))}
 </div>
 </div>
 <Button variant="ghost" size="icon" aria-label="Delete" className="h-8 w-8 text-red-400" onClick={() => deleteMutation.mutate(panel.id)}>
 <Trash2 className="h-4 w-4" />
 </Button>
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
