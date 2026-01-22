import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { 
  Shield, 
  Users, 
  Package, 
  MessageCircle, 
  Store, 
  BarChart3, 
  Settings, 
  FileText,
  Eye,
  Pencil,
  Lock
} from 'lucide-react';

type AppRole = 'admin' | 'product_manager' | 'order_manager' | 'support_agent' | 'analyst' | 'recruiter';

interface Permission {
  id: string;
  name: string;
  description: string | null;
  category: string;
}

interface RolePermission {
  id: string;
  role: AppRole;
  permission_id: string;
}

const ROLES: { value: AppRole; label: string; color: string; icon: React.ReactNode }[] = [
  { value: 'admin', label: 'Admin', color: 'bg-red-500', icon: <Shield className="h-4 w-4" /> },
  { value: 'product_manager', label: 'Product Manager', color: 'bg-blue-500', icon: <Package className="h-4 w-4" /> },
  { value: 'order_manager', label: 'Order Manager', color: 'bg-green-500', icon: <FileText className="h-4 w-4" /> },
  { value: 'support_agent', label: 'Support Agent', color: 'bg-purple-500', icon: <MessageCircle className="h-4 w-4" /> },
  { value: 'analyst', label: 'Analyst', color: 'bg-amber-500', icon: <BarChart3 className="h-4 w-4" /> },
  { value: 'recruiter', label: 'Recruiter', color: 'bg-cyan-500', icon: <Users className="h-4 w-4" /> },
];

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  pages: <Eye className="h-4 w-4" />,
  actions: <Pencil className="h-4 w-4" />,
};

const CATEGORY_LABELS: Record<string, string> = {
  pages: 'Page Access',
  actions: 'Actions',
};

export default function RolePermissions() {
  const queryClient = useQueryClient();
  const [selectedRole, setSelectedRole] = useState<AppRole>('admin');

  // Fetch all permissions
  const { data: permissions, isLoading: permissionsLoading } = useQuery({
    queryKey: ['permissions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('permissions')
        .select('*')
        .order('category')
        .order('name');
      
      if (error) throw error;
      return data as Permission[];
    },
  });

  // Fetch role permissions
  const { data: rolePermissions, isLoading: rolePermissionsLoading } = useQuery({
    queryKey: ['role-permissions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('role_permissions')
        .select('*');
      
      if (error) throw error;
      return data as RolePermission[];
    },
  });

  // Toggle permission mutation
  const togglePermissionMutation = useMutation({
    mutationFn: async ({ role, permissionId, enabled }: { role: AppRole; permissionId: string; enabled: boolean }) => {
      if (enabled) {
        const { error } = await supabase
          .from('role_permissions')
          .insert({ role, permission_id: permissionId });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('role_permissions')
          .delete()
          .eq('role', role)
          .eq('permission_id', permissionId);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['role-permissions'] });
      toast.success('Permission updated');
    },
    onError: (error) => {
      toast.error('Failed to update: ' + error.message);
    },
  });

  const hasPermission = (role: AppRole, permissionId: string) => {
    return rolePermissions?.some(rp => rp.role === role && rp.permission_id === permissionId) ?? false;
  };

  const handleToggle = (permissionId: string, enabled: boolean) => {
    if (selectedRole === 'admin') {
      toast.error('Admin permissions cannot be modified');
      return;
    }
    togglePermissionMutation.mutate({ role: selectedRole, permissionId, enabled });
  };

  // Group permissions by category
  const permissionsByCategory = permissions?.reduce((acc, perm) => {
    if (!acc[perm.category]) acc[perm.category] = [];
    acc[perm.category].push(perm);
    return acc;
  }, {} as Record<string, Permission[]>) ?? {};

  const isLoading = permissionsLoading || rolePermissionsLoading;

  const selectedRoleInfo = ROLES.find(r => r.value === selectedRole);

  // Count permissions per role
  const getPermissionCount = (role: AppRole) => {
    return rolePermissions?.filter(rp => rp.role === role).length ?? 0;
  };

  return (
    <AdminLayout requiredRoles={['admin']}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Role Permissions</h1>
          <p className="text-muted-foreground">
            Manage what each role can access and do in the admin dashboard.
          </p>
        </div>

        {/* Role Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Select Role
            </CardTitle>
            <CardDescription>
              Choose a role to view and modify its permissions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {ROLES.map(role => (
                <button
                  key={role.value}
                  onClick={() => setSelectedRole(role.value)}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${
                    selectedRole === role.value
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`p-1.5 rounded ${role.color} text-white`}>
                      {role.icon}
                    </div>
                    {role.value === 'admin' && <Lock className="h-3 w-3 text-muted-foreground" />}
                  </div>
                  <p className="font-medium text-sm">{role.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {getPermissionCount(role.value)} permissions
                  </p>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Permissions Grid */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  {selectedRoleInfo?.icon}
                  {selectedRoleInfo?.label} Permissions
                </CardTitle>
                <CardDescription>
                  {selectedRole === 'admin' 
                    ? 'Admin role has all permissions and cannot be modified'
                    : 'Toggle permissions on or off for this role'}
                </CardDescription>
              </div>
              <Badge className={`${selectedRoleInfo?.color} text-white`}>
                {getPermissionCount(selectedRole)} / {permissions?.length ?? 0}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-32" />
                ))}
              </div>
            ) : (
              <Tabs defaultValue="pages" className="w-full">
                <TabsList className="mb-4">
                  {Object.keys(permissionsByCategory).map(category => (
                    <TabsTrigger key={category} value={category} className="flex items-center gap-2">
                      {CATEGORY_ICONS[category]}
                      {CATEGORY_LABELS[category] || category}
                      <Badge variant="secondary" className="ml-1 text-xs">
                        {permissionsByCategory[category]?.filter(p => hasPermission(selectedRole, p.id)).length}
                      </Badge>
                    </TabsTrigger>
                  ))}
                </TabsList>

                {Object.entries(permissionsByCategory).map(([category, perms]) => (
                  <TabsContent key={category} value={category} className="mt-0">
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {perms.map(permission => {
                        const isEnabled = hasPermission(selectedRole, permission.id);
                        const isAdmin = selectedRole === 'admin';
                        
                        return (
                          <div
                            key={permission.id}
                            className={`p-4 rounded-lg border transition-all ${
                              isEnabled 
                                ? 'border-primary/50 bg-primary/5' 
                                : 'border-border bg-card'
                            } ${isAdmin ? 'opacity-75' : ''}`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm truncate">
                                  {permission.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {permission.description}
                                </p>
                              </div>
                              <Switch
                                checked={isEnabled}
                                onCheckedChange={(checked) => handleToggle(permission.id, checked)}
                                disabled={isAdmin || togglePermissionMutation.isPending}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            )}
          </CardContent>
        </Card>

        {/* Role Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              All Roles Overview
            </CardTitle>
            <CardDescription>
              Quick comparison of permissions across all roles
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2 font-medium">Permission</th>
                    {ROLES.map(role => (
                      <th key={role.value} className="text-center py-3 px-2">
                        <div className={`inline-flex items-center gap-1 px-2 py-1 rounded text-white text-xs ${role.color}`}>
                          {role.icon}
                          <span className="hidden sm:inline">{role.label}</span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {permissions?.map(permission => (
                    <tr key={permission.id} className="border-b border-border/50 hover:bg-muted/50">
                      <td className="py-2 px-2">
                        <div className="flex items-center gap-2">
                          {CATEGORY_ICONS[permission.category]}
                          <span className="truncate max-w-[200px]">
                            {permission.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </span>
                        </div>
                      </td>
                      {ROLES.map(role => (
                        <td key={role.value} className="text-center py-2 px-2">
                          {hasPermission(role.value, permission.id) ? (
                            <Badge variant="default" className="bg-green-500 text-white">✓</Badge>
                          ) : (
                            <Badge variant="secondary" className="opacity-30">—</Badge>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
