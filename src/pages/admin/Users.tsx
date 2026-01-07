import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Shield, Plus, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

const ROLES: { value: AppRole; label: string; color: string }[] = [
  { value: 'admin', label: 'Admin', color: 'bg-red-500/10 text-red-500 border-red-500/30' },
  { value: 'product_manager', label: 'Product Manager', color: 'bg-blue-500/10 text-blue-500 border-blue-500/30' },
  { value: 'order_manager', label: 'Order Manager', color: 'bg-green-500/10 text-green-500 border-green-500/30' },
  { value: 'support_agent', label: 'Support Agent', color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30' },
  { value: 'analyst', label: 'Analyst', color: 'bg-purple-500/10 text-purple-500 border-purple-500/30' },
  { value: 'recruiter', label: 'Recruiter', color: 'bg-violet-500/10 text-violet-500 border-violet-500/30' },
];

const PRIMARY_ADMIN_EMAIL = 'alicanimir1@gmail.com';

export default function AdminUsers() {
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [newRole, setNewRole] = useState<AppRole | ''>('');
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Check if current user is the primary admin
  const { data: currentProfile } = useQuery({
    queryKey: ['current-profile', user?.id],
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

  const isPrimaryAdmin = currentProfile?.email === PRIMARY_ADMIN_EMAIL;

  const { data: profiles, isLoading } = useQuery({
    queryKey: ['admin-profiles', search],
    queryFn: async () => {
      let query = supabase.from('profiles').select('*').order('created_at', { ascending: false });
      if (search) {
        query = query.or(`email.ilike.%${search}%,customer_id.ilike.%${search}%`);
      }
      const { data, error } = await query;
      if (error) throw error;
      
      // Filter out profiles where the auth user no longer exists
      const validProfiles = await Promise.all(
        (data || []).map(async (profile) => {
          const { data: exists } = await supabase.rpc('auth_user_exists', { _user_id: profile.user_id });
          return exists ? profile : null;
        })
      );
      
      return validProfiles.filter(Boolean);
    },
  });

  const { data: userRoles } = useQuery({
    queryKey: ['admin-user-roles'],
    queryFn: async () => {
      const { data, error } = await supabase.from('user_roles').select('*');
      if (error) throw error;
      return data;
    },
  });

  // Check if current user has admin role
  const isAdmin = userRoles?.some(r => r.user_id === user?.id && r.role === 'admin') ?? false;

  const addRoleMutation = useMutation({
    mutationFn: async ({ userId, role, targetEmail }: { userId: string; role: AppRole; targetEmail: string }) => {
      const { error } = await supabase.from('user_roles').insert({ user_id: userId, role });
      if (error) throw error;
      
      // Log the action to audit_logs
      await supabase.from('audit_logs').insert({
        user_id: user?.id,
        action: 'role_added',
        resource: 'user_roles',
        details: { target_user_id: userId, target_email: targetEmail, role }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-user-roles'] });
      setNewRole('');
      toast.success('Role added');
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });

  const removeRoleMutation = useMutation({
    mutationFn: async ({ userId, role, targetEmail }: { userId: string; role: AppRole; targetEmail: string }) => {
      const { error } = await supabase.from('user_roles').delete().eq('user_id', userId).eq('role', role);
      if (error) throw error;
      
      // Log the action to audit_logs
      await supabase.from('audit_logs').insert({
        user_id: user?.id,
        action: 'role_removed',
        resource: 'user_roles',
        details: { target_user_id: userId, target_email: targetEmail, role }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-user-roles'] });
      toast.success('Role removed');
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });

  const getUserRoles = (userId: string) => {
    return userRoles?.filter(r => r.user_id === userId) || [];
  };

  const getRoleBadge = (role: AppRole) => {
    const config = ROLES.find(r => r.value === role);
    return (
      <Badge key={role} variant="outline" className={config?.color || ''}>
        {config?.label || role}
      </Badge>
    );
  };

  const availableRoles = (userId: string) => {
    const existing = getUserRoles(userId).map(r => r.role);
    return ROLES.filter(r => {
      // Exclude roles the user already has
      if (existing.includes(r.value)) return false;
      // Only primary admin can assign admin role
      if (r.value === 'admin' && !isPrimaryAdmin) return false;
      return true;
    });
  };

  return (
    <AdminLayout requiredRoles={['admin']}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-display font-bold">Users & Roles</h1>
          <p className="text-muted-foreground">Manage user accounts and permissions</p>
        </div>

        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by email or customer ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-card"
          />
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block rounded-lg border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>User</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Roles</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : profiles?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    No users found
                  </TableCell>
                </TableRow>
              ) : (
                profiles?.filter(p => p.email !== PRIMARY_ADMIN_EMAIL).map((profile) => {
                  const roles = getUserRoles(profile.user_id);
                  return (
                    <TableRow key={profile.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{profile.display_name || 'Unnamed'}</p>
                          {isAdmin && <p className="text-xs text-muted-foreground">{profile.email}</p>}
                          {profile.customer_id && (
                            <p className="text-xs font-mono text-primary">{profile.customer_id}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{new Date(profile.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {roles.length === 0 ? (
                            <span className="text-xs text-muted-foreground">Customer</span>
                          ) : (
                            roles.map(r => getRoleBadge(r.role))
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => setSelectedUser(profile)}>
                          <Shield className="h-4 w-4 mr-2" />
                          Manage Roles
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden space-y-3">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : profiles?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No users found</div>
          ) : (
            profiles?.filter(p => p.email !== PRIMARY_ADMIN_EMAIL).map((profile) => {
              const roles = getUserRoles(profile.user_id);
              return (
                <div key={profile.id} className="rounded-lg border border-border bg-card p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{profile.display_name || 'Unnamed'}</p>
                      {isAdmin && <p className="text-xs text-muted-foreground truncate">{profile.email}</p>}
                      {profile.customer_id && (
                        <p className="text-xs font-mono text-primary">{profile.customer_id}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        Joined {new Date(profile.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setSelectedUser(profile)}
                      className="shrink-0"
                    >
                      <Shield className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {roles.length === 0 ? (
                      <Badge variant="secondary" className="text-xs">Customer</Badge>
                    ) : (
                      roles.map(r => getRoleBadge(r.role))
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Manage Roles Dialog */}
      <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
        <DialogContent className="max-w-[95vw] sm:max-w-md mx-auto">
          <DialogHeader>
            <DialogTitle className="text-lg">Manage Roles</DialogTitle>
          </DialogHeader>

          {selectedUser && (
            <div className="space-y-5">
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="font-medium text-sm">{selectedUser.display_name || 'Unnamed User'}</p>
                {isAdmin && <p className="text-xs text-muted-foreground truncate">{selectedUser.email}</p>}
                {selectedUser.customer_id && (
                  <p className="text-xs font-mono text-primary mt-1">{selectedUser.customer_id}</p>
                )}
              </div>

              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Current Roles</p>
                <div className="flex flex-wrap gap-2">
                  {getUserRoles(selectedUser.user_id).length === 0 ? (
                    <span className="text-sm text-muted-foreground">No roles assigned</span>
                  ) : (
                    getUserRoles(selectedUser.user_id).map((r) => (
                      <Badge key={r.id} variant="outline" className="gap-1 py-1.5 px-2">
                        {ROLES.find(role => role.value === r.role)?.label || r.role}
                        {/* Only show remove button if: not admin role, OR current user is primary admin */}
                        {(r.role !== 'admin' || isPrimaryAdmin) && (
                          <button
                            onClick={() => removeRoleMutation.mutate({ userId: selectedUser.user_id, role: r.role, targetEmail: selectedUser.email })}
                            className="ml-1 hover:text-destructive touch-manipulation"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </Badge>
                    ))
                  )}
                </div>
              </div>

              {availableRoles(selectedUser.user_id).length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">Add Role</p>
                  <div className="flex gap-2">
                    <Select value={newRole} onValueChange={(v) => setNewRole(v as AppRole)}>
                      <SelectTrigger className="flex-1 h-10">
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableRoles(selectedUser.user_id).map((role) => (
                          <SelectItem key={role.value} value={role.value} className="py-2.5">
                            {role.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      disabled={!newRole || addRoleMutation.isPending}
                      onClick={() => newRole && addRoleMutation.mutate({ userId: selectedUser.user_id, role: newRole, targetEmail: selectedUser.email })}
                      className="h-10 px-4"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
