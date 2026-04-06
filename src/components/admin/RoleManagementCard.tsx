import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Lock, Shield, Users, Package, MessageCircle, BarChart3, FileText, Star, Crown, Zap, Eye } from 'lucide-react';
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
 is_status_role: boolean;
 created_at: string;
 is_default: boolean;
}

export function RoleManagementCard() {
 const queryClient = useQueryClient();
 const { user } = useAuth();
 const { isAdmin } = useAdminAuth();
 const [dialogOpen, setDialogOpen] = useState(false);
 const [editRole, setEditRole] = useState<CustomRole | null>(null);
 const [userEmail, setUserEmail] = useState<string | undefined>();

 // Fetch user email from profile
 const { data: profileData } = useQuery({
 queryKey: ['user-profile-email', user?.id],
 queryFn: async () => {
 if (!user?.id) return null;
 const { data, error } = await supabase
 .from('profiles')
 .select('email')
 .eq('user_id', user.id)
 .single();
 if (error) throw error;
 return data;
 },
 enabled: !!user?.id,
 });

 useEffect(() => {
 if (profileData?.email) {
 setUserEmail(profileData.email);
 }
 }, [profileData]);

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

 // Fetch only permission-based roles (exclude status roles)
 const { data: roles, isLoading } = useQuery({
 queryKey: ['custom-roles-management'],
 queryFn: async () => {
 const { data, error } = await supabase
 .from('custom_roles')
 .select('*')
 .eq('is_status_role', false)
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

 const toggleDefaultMutation = useMutation({
 mutationFn: async ({ roleId, isDefault }: { roleId: string; isDefault: boolean }) => {
 const { error } = await supabase
 .from('custom_roles')
 .update({ is_default: isDefault })
 .eq('id', roleId);
 if (error) throw error;
 },
 onSuccess: () => {
 queryClient.invalidateQueries({ queryKey: ['custom-roles'] });
 toast.success('Default role setting updated');
 },
 onError: (error) => {
 toast.error('Failed to update: ' + error.message);
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
 <div className="border border-border rounded-xl overflow-hidden">
 <div className="px-4 py-3 border-b border-border bg-muted/30">
 <div className="flex items-center justify-between">
 <div>
 <h3 className="font-semibold text-sm flex items-center gap-2">
 <Users className="h-5 w-5" />
 Role Management
 </h3>
 <p className="text-sm text-muted-foreground">
 Create and manage custom roles
 </p>
 </div>
 <Button onClick={() => setDialogOpen(true)} size="sm">
 <Plus className="h-4 w-4 mr-2" />
 New Role
 </Button>
 </div>
 </div>
 <div className="p-4">
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
 <span className="font-medium text-sm">{role.display_name}</span>
 <div className="flex items-center gap-2 mt-1">
 {role.is_system && (
 <Badge variant="outline" className="text-[11px] px-2 py-0.5 h-auto font-normal border-muted-foreground/30 text-muted-foreground">
 <Lock className="h-3 w-3 mr-1" />
 System
 </Badge>
 )}
 <Badge className="text-[11px] px-2.5 py-0.5 h-auto font-medium bg-cyan-500 hover:bg-cyan-500 text-white rounded-full">
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
 {/* Default role toggle */}
 {isAdmin && (
 <TooltipProvider>
 <Tooltip>
 <TooltipTrigger asChild>
 <div className="flex items-center gap-1.5 mr-2">
 <span className="text-[10px] text-muted-foreground">Default</span>
 <Switch
 checked={role.is_default}
 onCheckedChange={(checked) => 
 toggleDefaultMutation.mutate({ roleId: role.id, isDefault: checked })
 }
 disabled={toggleDefaultMutation.isPending}
 className="scale-75"
 />
 </div>
 </TooltipTrigger>
 <TooltipContent>
 <p>{role.is_default ? 'This role is auto-assigned to new users' : 'Toggle to auto-assign to new users'}</p>
 </TooltipContent>
 </Tooltip>
 </TooltipProvider>
 )}
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
 </div>
 </div>

 <CreateRoleDialog
 open={dialogOpen}
 onOpenChange={handleDialogClose}
 editRole={editRole}
 currentUserHierarchy={currentUserHierarchy}
 userEmail={userEmail}
 />
 </>
 );
}
