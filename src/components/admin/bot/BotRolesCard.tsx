import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Shield, Plus, Trash2, Save } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface RoleConfig {
 id: string;
 role_id: string;
 role_name: string;
 store_id: string | null;
 min_order_count: number;
 auto_assign_on_purchase: boolean;
 created_at: string;
}

export function BotRolesCard() {
 const queryClient = useQueryClient();
 const [newRole, setNewRole] = useState({ role_id: '', role_name: '', min_order_count: 1 });
 const [showAdd, setShowAdd] = useState(false);

 const { data: roles = [], isLoading } = useQuery({
 queryKey: ['discord-role-configs-admin'],
 queryFn: async () => {
 const { data, error } = await supabase
 .from('discord_role_configs')
 .select('*')
 .order('created_at', { ascending: true });
 if (error) throw error;
 return data as RoleConfig[];
 },
 });

 const addRole = useMutation({
 mutationFn: async () => {
 const { error } = await supabase.from('discord_role_configs').insert({
 role_id: newRole.role_id.trim(),
 role_name: newRole.role_name.trim(),
 min_order_count: newRole.min_order_count,
 auto_assign_on_purchase: true,
 });
 if (error) throw error;
 },
 onSuccess: () => {
 queryClient.invalidateQueries({ queryKey: ['discord-role-configs-admin'] });
 setNewRole({ role_id: '', role_name: '', min_order_count: 1 });
 setShowAdd(false);
 toast.success('Role config added');
 },
 onError: (e: Error) => toast.error(e.message),
 });

 const deleteRole = useMutation({
 mutationFn: async (id: string) => {
 const { error } = await supabase.from('discord_role_configs').delete().eq('id', id);
 if (error) throw error;
 },
 onSuccess: () => {
 queryClient.invalidateQueries({ queryKey: ['discord-role-configs-admin'] });
 toast.success('Role config deleted');
 },
 onError: (e: Error) => toast.error(e.message),
 });

 const toggleAutoAssign = useMutation({
 mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
 const { error } = await supabase
 .from('discord_role_configs')
 .update({ auto_assign_on_purchase: enabled })
 .eq('id', id);
 if (error) throw error;
 },
 onSuccess: () => queryClient.invalidateQueries({ queryKey: ['discord-role-configs-admin'] }),
 });

 return (
 <div className="border border-border rounded-xl overflow-hidden">
 <div className="px-4 py-3 border-b border-border bg-muted/30 flex flex-row items-center justify-between pb-3">
 <h3 className="font-semibold text-sm text-lg flex items-center gap-2">
 <Shield className="h-5 w-5" />
 Role Configurations
 <Badge variant="secondary">{roles.length}</Badge>
 </h3>
 <Button variant="outline" size="sm" onClick={() => setShowAdd(!showAdd)}>
 <Plus className="h-4 w-4 mr-1" /> Add
 </Button>
 </div>
 <div className="p-4 space-y-4">
 {showAdd && (
 <div className="p-4 rounded-lg border bg-muted/30 space-y-3">
 <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
 <div>
 <Label className="text-xs">Role ID</Label>
 <Input
 placeholder="Discord Role ID"
 value={newRole.role_id}
 onChange={(e) => setNewRole({ ...newRole, role_id: e.target.value })}
 />
 </div>
 <div>
 <Label className="text-xs">Role Name</Label>
 <Input
 placeholder="e.g. Customer"
 value={newRole.role_name}
 onChange={(e) => setNewRole({ ...newRole, role_name: e.target.value })}
 />
 </div>
 <div>
 <Label className="text-xs">Min Orders</Label>
 <Input
 type="number"
 min={0}
 value={newRole.min_order_count}
 onChange={(e) => setNewRole({ ...newRole, min_order_count: parseInt(e.target.value) || 0 })}
 />
 </div>
 </div>
 <Button size="sm" onClick={() => addRole.mutate()} disabled={!newRole.role_id || !newRole.role_name}>
 <Save className="h-4 w-4 mr-1" /> Save
 </Button>
 </div>
 )}

 {isLoading ? (
 <p className="text-sm text-muted-foreground">Loading...</p>
 ) : !roles.length ? (
 <p className="text-sm text-muted-foreground">No role configs yet</p>
 ) : (
 <div className="space-y-2">
 {roles.map((role) => (
 <div key={role.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
 <div className="flex-1 min-w-0">
 <p className="font-medium text-sm">{role.role_name}</p>
 <p className="text-xs text-muted-foreground font-mono">{role.role_id}</p>
 <p className="text-xs text-muted-foreground">Min orders: {role.min_order_count}</p>
 </div>
 <div className="flex items-center gap-2">
 <Switch
 checked={role.auto_assign_on_purchase}
 onCheckedChange={(checked) => toggleAutoAssign.mutate({ id: role.id, enabled: checked })}
 />
 <Button
 variant="ghost"
 size="icon"
 className="h-8 w-8 text-destructive"
 onClick={() => deleteRole.mutate(role.id)}
 >
 <Trash2 className="h-4 w-4" />
 </Button>
 </div>
 </div>
 ))}
 </div>
 )}
 </div>
 </div>
 );
}
