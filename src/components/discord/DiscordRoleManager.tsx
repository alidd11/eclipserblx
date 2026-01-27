import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Plus,
  Edit2,
  Trash2,
  Shield,
  Users,
  Crown,
  ShoppingCart,
  Star,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

interface DiscordRoleConfig {
  id: string;
  store_id: string | null;
  is_global: boolean;
  role_id: string;
  role_name: string;
  description: string | null;
  auto_assign_on_purchase: boolean;
  min_order_amount: number | null;
  min_order_count: number | null;
  requires_subscription: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

interface DiscordRoleManagerProps {
  storeId?: string;
  isGlobal?: boolean;
}

interface RoleFormData {
  role_id: string;
  role_name: string;
  description: string;
  auto_assign_on_purchase: boolean;
  min_order_amount: string;
  min_order_count: string;
  requires_subscription: boolean;
}

const defaultFormData: RoleFormData = {
  role_id: '',
  role_name: '',
  description: '',
  auto_assign_on_purchase: true,
  min_order_amount: '',
  min_order_count: '',
  requires_subscription: false,
};

export function DiscordRoleManager({ storeId, isGlobal = false }: DiscordRoleManagerProps) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<DiscordRoleConfig | null>(null);
  const [deleteRole, setDeleteRole] = useState<DiscordRoleConfig | null>(null);
  const [formData, setFormData] = useState<RoleFormData>(defaultFormData);

  const queryKey = isGlobal 
    ? ['discord-role-configs', 'global'] 
    : ['discord-role-configs', storeId];

  const { data: roles = [], isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      let query = supabase
        .from('discord_role_configs')
        .select('*')
        .order('created_at', { ascending: true });

      if (isGlobal) {
        query = query.eq('is_global', true);
      } else if (storeId) {
        query = query.eq('store_id', storeId);
      } else {
        return [];
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as DiscordRoleConfig[];
    },
    enabled: isGlobal || !!storeId,
  });

  const createMutation = useMutation({
    mutationFn: async (data: RoleFormData) => {
      const { error } = await supabase
        .from('discord_role_configs')
        .insert({
          role_id: data.role_id,
          role_name: data.role_name,
          description: data.description || null,
          auto_assign_on_purchase: data.auto_assign_on_purchase,
          min_order_amount: data.min_order_amount ? parseFloat(data.min_order_amount) : null,
          min_order_count: data.min_order_count ? parseInt(data.min_order_count) : null,
          requires_subscription: data.requires_subscription,
          created_by: user?.id,
          is_global: isGlobal,
          store_id: isGlobal ? null : storeId,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success('Role configuration created');
      handleCloseDialog();
    },
    onError: (error) => {
      toast.error('Failed to create role: ' + error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: RoleFormData }) => {
      const { error } = await supabase
        .from('discord_role_configs')
        .update({
          role_id: data.role_id,
          role_name: data.role_name,
          description: data.description || null,
          auto_assign_on_purchase: data.auto_assign_on_purchase,
          min_order_amount: data.min_order_amount ? parseFloat(data.min_order_amount) : null,
          min_order_count: data.min_order_count ? parseInt(data.min_order_count) : null,
          requires_subscription: data.requires_subscription,
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success('Role configuration updated');
      handleCloseDialog();
    },
    onError: (error) => {
      toast.error('Failed to update role: ' + error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('discord_role_configs')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success('Role configuration deleted');
      setDeleteRole(null);
    },
    onError: (error) => {
      toast.error('Failed to delete role: ' + error.message);
    },
  });

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingRole(null);
    setFormData(defaultFormData);
  };

  const handleOpenCreate = () => {
    setEditingRole(null);
    setFormData(defaultFormData);
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (role: DiscordRoleConfig) => {
    setEditingRole(role);
    setFormData({
      role_id: role.role_id,
      role_name: role.role_name,
      description: role.description || '',
      auto_assign_on_purchase: role.auto_assign_on_purchase,
      min_order_amount: role.min_order_amount?.toString() || '',
      min_order_count: role.min_order_count?.toString() || '',
      requires_subscription: role.requires_subscription,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.role_id || !formData.role_name) {
      toast.error('Role ID and name are required');
      return;
    }

    if (editingRole) {
      updateMutation.mutate({ id: editingRole.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const getRoleIcon = (role: DiscordRoleConfig) => {
    if (role.requires_subscription) return Crown;
    if (role.min_order_count) return Star;
    if (role.min_order_amount) return ShoppingCart;
    return Users;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Additional Role Assignments</h3>
          <p className="text-sm text-muted-foreground">
            Create custom roles that can be assigned based on specific conditions
          </p>
        </div>
        <Button onClick={handleOpenCreate} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Role
        </Button>
      </div>

      {roles.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-8 text-center">
            <Shield className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-sm text-muted-foreground">
              No additional roles configured yet
            </p>
            <p className="text-xs text-muted-foreground mb-4">
              Create roles to automatically assign them to customers based on conditions
            </p>
            <Button variant="outline" size="sm" onClick={handleOpenCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Role
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {roles.map((role) => {
            const Icon = getRoleIcon(role);
            return (
              <Card key={role.id}>
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-[#5865F2]/10 rounded-lg">
                      <Icon className="h-5 w-5 text-[#5865F2]" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{role.role_name}</span>
                        {role.auto_assign_on_purchase && (
                          <Badge variant="secondary" className="text-xs">
                            Auto-assign
                          </Badge>
                        )}
                        {role.requires_subscription && (
                          <Badge variant="outline" className="text-xs">
                            Subscribers only
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2 mt-1">
                        <span className="text-xs text-muted-foreground">
                          ID: {role.role_id}
                        </span>
                        {role.min_order_amount && (
                          <span className="text-xs text-muted-foreground">
                            • Min spend: £{role.min_order_amount}
                          </span>
                        )}
                        {role.min_order_count && (
                          <span className="text-xs text-muted-foreground">
                            • Min orders: {role.min_order_count}
                          </span>
                        )}
                      </div>
                      {role.description && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {role.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpenEdit(role)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setDeleteRole(role)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingRole ? 'Edit Role Configuration' : 'Add Role Configuration'}
            </DialogTitle>
            <DialogDescription>
              Configure a Discord role to be assigned to customers
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="role_name">Role Name</Label>
                <Input
                  id="role_name"
                  value={formData.role_name}
                  onChange={(e) => setFormData({ ...formData, role_name: e.target.value })}
                  placeholder="e.g., VIP Customer"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role_id">Role ID</Label>
                <Input
                  id="role_id"
                  value={formData.role_id}
                  onChange={(e) => setFormData({ ...formData, role_id: e.target.value })}
                  placeholder="123456789012345678"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="e.g., Assigned to customers who spend over £100"
              />
            </div>

            <Separator />

            <div className="space-y-4">
              <h4 className="text-sm font-medium">Assignment Conditions</h4>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="auto_assign">Auto-assign on purchase</Label>
                  <p className="text-xs text-muted-foreground">
                    Automatically assign this role when conditions are met
                  </p>
                </div>
                <Switch
                  id="auto_assign"
                  checked={formData.auto_assign_on_purchase}
                  onCheckedChange={(checked) => 
                    setFormData({ ...formData, auto_assign_on_purchase: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="requires_subscription">Requires subscription</Label>
                  <p className="text-xs text-muted-foreground">
                    Only assign to active subscribers
                  </p>
                </div>
                <Switch
                  id="requires_subscription"
                  checked={formData.requires_subscription}
                  onCheckedChange={(checked) => 
                    setFormData({ ...formData, requires_subscription: checked })
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="min_order_amount">Minimum Spend (£)</Label>
                  <Input
                    id="min_order_amount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.min_order_amount}
                    onChange={(e) => setFormData({ ...formData, min_order_amount: e.target.value })}
                    placeholder="e.g., 100"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="min_order_count">Minimum Orders</Label>
                  <Input
                    id="min_order_count"
                    type="number"
                    min="0"
                    value={formData.min_order_count}
                    onChange={(e) => setFormData({ ...formData, min_order_count: e.target.value })}
                    placeholder="e.g., 5"
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {(createMutation.isPending || updateMutation.isPending) && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                {editingRole ? 'Save Changes' : 'Create Role'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteRole} onOpenChange={() => setDeleteRole(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Role Configuration</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteRole?.role_name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteRole && deleteMutation.mutate(deleteRole.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
