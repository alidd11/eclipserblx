import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Lock, Shield, Users, Package, MessageCircle, BarChart3, FileText, Star, Crown, Zap, Eye } from 'lucide-react';
import { useState } from 'react';
import { CreateRoleDialog } from './CreateRoleDialog';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  'shield': Shield,
  'users': Users,
  'package': Package,
  'message-circle': MessageCircle,
  'bar-chart-3': BarChart3,
  'file-text': FileText,
  'star': Star,
  'crown': Crown,
  'zap': Zap,
  'eye': Eye,
};

interface CustomRole {
  id: string;
  name: string;
  display_name: string;
  color: string;
  icon: string;
  hierarchy_level: number;
  description: string | null;
  is_system: boolean;
  created_at: string;
}

export function RoleManagementCard() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { isAdmin } = useAdminAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editRole, setEditRole] = useState<CustomRole | null>(null);

  // Fetch current user's hierarchy level
  const { data: currentUserHierarchy = 0 } = useQuery({
    queryKey: ['current-user-hierarchy', user?.id],
    queryFn: async () => {
      if (!user?.id) return 0;
      const { data, error } = await supabase
        .rpc('get_user_max_hierarchy', { _user_id: user.id });
      if (error) throw error;
      return data ?? 0;
    },
    enabled: !!user?.id,
  });

  const { data: roles, isLoading } = useQuery({
    queryKey: ['custom-roles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('custom_roles')
        .select('*')
        .order('hierarchy_level', { ascending: false });
      
      if (error) throw error;
      return data as CustomRole[];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (roleId: string) => {
      const { error } = await supabase
        .from('custom_roles')
        .delete()
        .eq('id', roleId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-roles'] });
      toast.success('Role deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete role: ' + error.message);
    },
  });

  // Check if current user can manage a specific role
  const canManageRole = (role: CustomRole) => {
    // Can only manage roles at or below your hierarchy level
    return currentUserHierarchy >= role.hierarchy_level;
  };

  const handleEdit = (role: CustomRole) => {
    if (!canManageRole(role)) {
      toast.error(`You cannot edit roles with hierarchy level ${role.hierarchy_level} or higher`);
      return;
    }
    setEditRole(role);
    setDialogOpen(true);
  };

  // Check if current user can delete a role (admin only + hierarchy check)
  const canDeleteRole = (role: CustomRole) => {
    return isAdmin && !role.is_system && canManageRole(role);
  };

  const handleDelete = (role: CustomRole) => {
    if (!isAdmin) {
      toast.error('Only administrators can delete roles');
      return;
    }
    if (role.is_system) {
      toast.error('System roles cannot be deleted');
      return;
    }
    if (!canManageRole(role)) {
      toast.error(`You cannot delete roles with hierarchy level ${role.hierarchy_level} or higher`);
      return;
    }
    if (confirm(`Are you sure you want to delete the "${role.display_name}" role?`)) {
      deleteMutation.mutate(role.id);
    }
  };

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setEditRole(null);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Role Management
              </CardTitle>
              <CardDescription>
                Create and manage custom roles
              </CardDescription>
            </div>
            <Button onClick={() => setDialogOpen(true)} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              New Role
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {roles?.map(role => {
                const IconComponent = ICON_MAP[role.icon] || Shield;
                return (
                  <div
                    key={role.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className={`p-1.5 rounded-md ${role.color} text-white shrink-0`}>
                        <IconComponent className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm">{role.display_name}</span>
                          {role.is_system && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 shrink-0">
                              <Lock className="h-2.5 w-2.5 mr-1" />
                              System
                            </Badge>
                          )}
                          <Badge className="text-[10px] px-1.5 py-0 h-5 bg-cyan-500 hover:bg-cyan-600 shrink-0">
                            Level {role.hierarchy_level}
                          </Badge>
                        </div>
                        {role.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">
                            {role.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleEdit(role)}
                              disabled={!canManageRole(role)}
                            >
                              <Pencil className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          </TooltipTrigger>
                          {!canManageRole(role) && (
                            <TooltipContent>
                              <p>Your hierarchy level ({currentUserHierarchy}) is too low to edit this role</p>
                            </TooltipContent>
                          )}
                        </Tooltip>
                      </TooltipProvider>
                      {!role.is_system && isAdmin && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleDelete(role)}
                                disabled={deleteMutation.isPending || !canDeleteRole(role)}
                              >
                                <Trash2 className="h-4 w-4 text-muted-foreground" />
                              </Button>
                            </TooltipTrigger>
                            {!canDeleteRole(role) && (
                              <TooltipContent>
                                <p>
                                  {!isAdmin 
                                    ? 'Only administrators can delete roles'
                                    : `Your hierarchy level (${currentUserHierarchy}) is too low to delete this role`
                                  }
                                </p>
                              </TooltipContent>
                            )}
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                  </div>
                );
              })}
              {roles?.length === 0 && (
                <p className="text-center text-muted-foreground py-4">
                  No roles defined yet. Create your first role.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <CreateRoleDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        editRole={editRole}
        currentUserHierarchy={currentUserHierarchy}
      />
    </>
  );
}
