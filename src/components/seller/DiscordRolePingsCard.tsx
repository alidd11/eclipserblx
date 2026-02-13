import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSellerStatus } from '@/hooks/useSellerStatus';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { AtSign, Loader2, Save, Info, Plus, Trash2, ShieldCheck, ShoppingCart, Crown } from 'lucide-react';
import { toast } from 'sonner';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface RoleConfig {
  id: string;
  role_id: string;
  role_name: string;
  description: string | null;
  auto_assign_on_purchase: boolean;
  min_order_count: number | null;
  min_order_amount: number | null;
  requires_subscription: boolean;
}

interface NewRoleForm {
  role_id: string;
  role_name: string;
  description: string;
  auto_assign_on_purchase: boolean;
  min_order_count: string;
  min_order_amount: string;
  requires_subscription: boolean;
}

const EMPTY_FORM: NewRoleForm = {
  role_id: '',
  role_name: '',
  description: '',
  auto_assign_on_purchase: false,
  min_order_count: '',
  min_order_amount: '',
  requires_subscription: false,
};

export function DiscordRolePingsCard() {
  const { store } = useSellerStatus();
  const queryClient = useQueryClient();

  // --- Ping role IDs (legacy fields) ---
  const [productDropsRoleId, setProductDropsRoleId] = useState('');
  const [earlyProductDropsRoleId, setEarlyProductDropsRoleId] = useState('');

  useEffect(() => {
    if (store?.credentials) {
      setProductDropsRoleId(store.credentials.product_drops_role_id || '');
      setEarlyProductDropsRoleId(store.credentials.early_product_drops_role_id || '');
    }
  }, [store?.credentials]);

  const updateRolePings = useMutation({
    mutationFn: async () => {
      if (!store?.id) throw new Error('Store not found');
      const { error } = await supabase
        .from('store_credentials')
        .update({
          product_drops_role_id: productDropsRoleId.trim() || null,
          early_product_drops_role_id: earlyProductDropsRoleId.trim() || null,
        })
        .eq('store_id', store.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Ping roles updated');
      queryClient.invalidateQueries({ queryKey: ['seller-store'] });
    },
    onError: (error) => toast.error(error.message || 'Failed to update'),
  });

  const pingHasChanges =
    productDropsRoleId !== (store?.credentials?.product_drops_role_id || '') ||
    earlyProductDropsRoleId !== (store?.credentials?.early_product_drops_role_id || '');

  // --- Custom Roles (discord_role_configs) ---
  const { data: customRoles = [], isLoading: rolesLoading } = useQuery({
    queryKey: ['discord-role-configs', store?.id],
    queryFn: async () => {
      if (!store?.id) return [];
      const { data, error } = await supabase
        .from('discord_role_configs')
        .select('*')
        .eq('store_id', store.id)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as RoleConfig[];
    },
    enabled: !!store?.id,
  });

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newRole, setNewRole] = useState<NewRoleForm>(EMPTY_FORM);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const addRole = useMutation({
    mutationFn: async () => {
      if (!store?.id) throw new Error('Store not found');
      const { error } = await supabase.from('discord_role_configs').insert({
        store_id: store.id,
        role_id: newRole.role_id.trim(),
        role_name: newRole.role_name.trim(),
        description: newRole.description.trim() || null,
        auto_assign_on_purchase: newRole.auto_assign_on_purchase,
        min_order_count: newRole.min_order_count ? parseInt(newRole.min_order_count) : null,
        min_order_amount: newRole.min_order_amount ? parseFloat(newRole.min_order_amount) : null,
        requires_subscription: newRole.requires_subscription,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Role added');
      queryClient.invalidateQueries({ queryKey: ['discord-role-configs'] });
      setShowAddDialog(false);
      setNewRole(EMPTY_FORM);
    },
    onError: (error) => toast.error(error.message || 'Failed to add role'),
  });

  const deleteRole = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('discord_role_configs').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Role removed');
      queryClient.invalidateQueries({ queryKey: ['discord-role-configs'] });
      setDeletingId(null);
    },
    onError: (error) => toast.error(error.message || 'Failed to remove role'),
  });

  const canAddRole = newRole.role_id.trim() && newRole.role_name.trim();

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle className="flex items-center gap-2">
            <AtSign className="h-5 w-5" />
            Discord Roles
          </CardTitle>
          <CardDescription>
            Manage ping roles and create custom roles for your customers
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Announcement Ping Roles */}
        <div className="space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Announcement Ping Roles</p>
          <div className="p-3 bg-muted/30 rounded-lg text-xs text-muted-foreground">
            These roles get pinged when you send announcements. Right-click a role in Discord → Copy ID.
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="productDropsRoleId" className="text-xs flex items-center gap-1.5">
                Product Drops
                <Tooltip>
                  <TooltipTrigger><Info className="h-3 w-3 text-muted-foreground" /></TooltipTrigger>
                  <TooltipContent><p>Pinged for all product releases</p></TooltipContent>
                </Tooltip>
              </Label>
              <Input
                id="productDropsRoleId"
                value={productDropsRoleId}
                onChange={(e) => setProductDropsRoleId(e.target.value)}
                placeholder="Role ID..."
                className="font-mono text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="earlyProductDropsRoleId" className="text-xs flex items-center gap-1.5">
                Early Access
                <Tooltip>
                  <TooltipTrigger><Info className="h-3 w-3 text-muted-foreground" /></TooltipTrigger>
                  <TooltipContent><p>Pinged for early access drops</p></TooltipContent>
                </Tooltip>
              </Label>
              <Input
                id="earlyProductDropsRoleId"
                value={earlyProductDropsRoleId}
                onChange={(e) => setEarlyProductDropsRoleId(e.target.value)}
                placeholder="Role ID..."
                className="font-mono text-xs"
              />
            </div>
          </div>
          <Button
            onClick={() => setShowAddDialog(true)}
            size="sm"
            className="w-full"
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Add Role
          </Button>
          <Button
            onClick={() => updateRolePings.mutate()}
            disabled={!pingHasChanges || updateRolePings.isPending}
            size="sm"
            variant="outline"
            className="w-full"
          >
            {updateRolePings.isPending ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
            Save Ping Roles
          </Button>
        </div>

        {/* Divider */}
        <div className="h-px bg-border" />

        {/* Custom Roles */}
        <div className="space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Customer Roles</p>
          <div className="p-3 bg-muted/30 rounded-lg text-xs text-muted-foreground">
            Create roles that are automatically assigned to customers based on purchase activity. Customers can claim these via the <Badge variant="secondary" className="font-mono text-[10px] mx-0.5 px-1">/getrole</Badge> command.
          </div>

          {rolesLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : customRoles.length === 0 ? (
            <div className="text-center py-6 text-sm text-muted-foreground">
              No custom roles configured yet. Click "Add Role" to create one.
            </div>
          ) : (
            <div className="space-y-2">
              {customRoles.map((role) => (
                <div
                  key={role.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-lg border border-border/50 bg-card"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
                      <span className="text-sm font-medium">{role.role_name}</span>
                      <Badge variant="outline" className="font-mono text-[10px]">{role.role_id}</Badge>
                    </div>
                    {role.description && (
                      <p className="text-xs text-muted-foreground pl-6">{role.description}</p>
                    )}
                    <div className="flex items-center gap-2 flex-wrap pl-6">
                      {role.auto_assign_on_purchase && (
                        <Badge variant="secondary" className="text-[10px]">
                          <ShoppingCart className="h-3 w-3 mr-0.5" /> Auto-assign
                        </Badge>
                      )}
                      {role.min_order_count && (
                        <Badge variant="secondary" className="text-[10px]">
                          {role.min_order_count}+ orders
                        </Badge>
                      )}
                      {role.min_order_amount && (
                        <Badge variant="secondary" className="text-[10px]">
                          £{role.min_order_amount}+ spent
                        </Badge>
                      )}
                      {role.requires_subscription && (
                        <Badge variant="secondary" className="text-[10px]">
                          <Crown className="h-3 w-3 mr-0.5" /> Subscriber only
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteRole.mutate(role.id)}
                    disabled={deleteRole.isPending}
                    className="text-destructive hover:text-destructive shrink-0 self-start sm:self-auto"
                  >
                    {deleteRole.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>

      {/* Add Role Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Customer Role</DialogTitle>
            <DialogDescription>
              Configure a Discord role that customers can earn based on their activity with your store.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Role Name *</Label>
                <Input
                  value={newRole.role_name}
                  onChange={(e) => setNewRole({ ...newRole, role_name: e.target.value })}
                  placeholder="e.g. VIP Customer"
                  className="text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Discord Role ID *</Label>
                <Input
                  value={newRole.role_id}
                  onChange={(e) => setNewRole({ ...newRole, role_id: e.target.value })}
                  placeholder="e.g. 1234567890"
                  className="font-mono text-xs"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Description (optional)</Label>
              <Input
                value={newRole.description}
                onChange={(e) => setNewRole({ ...newRole, description: e.target.value })}
                placeholder="What this role is for..."
                className="text-xs"
              />
            </div>

            <div className="h-px bg-border" />

            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Assignment Rules</p>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-xs">Auto-assign on purchase</Label>
                <p className="text-[11px] text-muted-foreground">Automatically give this role after any purchase</p>
              </div>
              <Switch
                checked={newRole.auto_assign_on_purchase}
                onCheckedChange={(v) => setNewRole({ ...newRole, auto_assign_on_purchase: v })}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Min. Orders</Label>
                <Input
                  type="number"
                  min="0"
                  value={newRole.min_order_count}
                  onChange={(e) => setNewRole({ ...newRole, min_order_count: e.target.value })}
                  placeholder="e.g. 5"
                  className="text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Min. Spend (£)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={newRole.min_order_amount}
                  onChange={(e) => setNewRole({ ...newRole, min_order_amount: e.target.value })}
                  placeholder="e.g. 50"
                  className="text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-xs">Requires subscription</Label>
                <p className="text-[11px] text-muted-foreground">Only for Eclipse+ subscribers</p>
              </div>
              <Switch
                checked={newRole.requires_subscription}
                onCheckedChange={(v) => setNewRole({ ...newRole, requires_subscription: v })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowAddDialog(false)}>Cancel</Button>
            <Button
              size="sm"
              onClick={() => addRole.mutate()}
              disabled={!canAddRole || addRole.isPending}
            >
              {addRole.isPending ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Plus className="h-3.5 w-3.5 mr-1" />}
              Add Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
