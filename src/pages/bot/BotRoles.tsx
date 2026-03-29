import { BotDashboardLayout } from '@/components/bot-dashboard/BotDashboardLayout';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Shield, Plus, Trash2, Save, X } from 'lucide-react';
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

export default function BotRoles() {
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
    <BotDashboardLayout>
      <div className="space-y-6 max-w-4xl">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Shield className="h-5 w-5 text-[hsl(258,90%,66%)]" />
              Role Configurations
              <Badge className="bg-[hsl(258,90%,66%)]/20 text-[hsl(258,90%,76%)] border-[hsl(258,90%,66%)]/30 ml-2">{roles.length}</Badge>
            </h2>
            <p className="text-sm text-white/50 mt-1">Manage auto-assigned Discord roles</p>
          </div>
          <Button
            className="bg-[hsl(258,90%,66%)] hover:bg-[hsl(258,90%,60%)] text-white"
            size="sm"
            onClick={() => setShowAdd(!showAdd)}
          >
            {showAdd ? <X className="h-4 w-4 mr-1.5" /> : <Plus className="h-4 w-4 mr-1.5" />}
            {showAdd ? 'Cancel' : 'Add Role'}
          </Button>
        </div>

        {showAdd && (
          <div className="p-5 rounded-xl bg-white/5 border border-[hsl(258,90%,66%)]/30 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <Label className="text-xs text-white/60">Role ID</Label>
                <Input
                  placeholder="Discord Role ID"
                  value={newRole.role_id}
                  onChange={(e) => setNewRole({ ...newRole, role_id: e.target.value })}
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                />
              </div>
              <div>
                <Label className="text-xs text-white/60">Role Name</Label>
                <Input
                  placeholder="e.g. Customer"
                  value={newRole.role_name}
                  onChange={(e) => setNewRole({ ...newRole, role_name: e.target.value })}
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                />
              </div>
              <div>
                <Label className="text-xs text-white/60">Min Orders</Label>
                <Input
                  type="number"
                  min={0}
                  value={newRole.min_order_count}
                  onChange={(e) => setNewRole({ ...newRole, min_order_count: parseInt(e.target.value) || 0 })}
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => addRole.mutate()}
              disabled={!newRole.role_id || !newRole.role_name}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Save className="h-4 w-4 mr-1.5" /> Save Role
            </Button>
          </div>
        )}

        {isLoading ? (
          <p className="text-sm text-white/40">Loading...</p>
        ) : !roles.length ? (
          <div className="text-center py-12 text-white/40">
            <Shield className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>No role configs yet. Add one above.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {roles.map((role) => (
              <div key={role.id} className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/10">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white">{role.role_name}</p>
                  <p className="text-xs text-white/40 font-mono">{role.role_id}</p>
                  <p className="text-xs text-white/40">Min orders: {role.min_order_count}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-center">
                    <Switch
                      checked={role.auto_assign_on_purchase}
                      onCheckedChange={(checked) => toggleAutoAssign.mutate({ id: role.id, enabled: checked })}
                    />
                    <p className="text-[10px] text-white/30 mt-1">Auto</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-500/10"
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
    </BotDashboardLayout>
  );
}
