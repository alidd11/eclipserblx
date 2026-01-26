import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { 
  Shield, 
  Users, 
  Package, 
  MessageCircle, 
  BarChart3, 
  FileText,
  Eye,
  Pencil,
  Lock,
  Settings,
  Star,
  Crown,
  Zap
} from 'lucide-react';
import { RoleManagementCard } from '@/components/admin/RoleManagementCard';


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

interface CustomRole {
  id: string;
  name: string;
  display_name: string;
  color: string;
  icon: string;
  hierarchy_level: number;
  is_system: boolean;
}

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
  'settings': Settings,
};

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  pages: <Eye className="h-4 w-4" />,
  actions: <Pencil className="h-4 w-4" />,
  settings: <Settings className="h-4 w-4" />,
  admin: <Shield className="h-4 w-4" />,
};

const CATEGORY_LABELS: Record<string, string> = {
  pages: 'Page Access',
  actions: 'Actions',
  settings: 'Settings',
  admin: 'Admin',
};

export default function RolePermissions() {
  const queryClient = useQueryClient();
  const [selectedRole, setSelectedRole] = useState<string>('admin');
  const [activeTab, setActiveTab] = useState<'assign' | 'manage'>('assign');

  // Fetch custom roles from the new table
  const { data: customRoles, isLoading: rolesLoading } = useQuery({
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
    mutationFn: async ({ role, permissionId, enabled }: { role: string; permissionId: string; enabled: boolean }) => {
      if (enabled) {
        const { error } = await supabase
          .from('role_permissions')
          .insert({ role: role as AppRole, permission_id: permissionId });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('role_permissions')
          .delete()
          .eq('role', role as AppRole)
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

  const hasPermission = (role: string, permissionId: string) => {
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

  const isLoading = permissionsLoading || rolePermissionsLoading || rolesLoading;

  const selectedRoleInfo = customRoles?.find(r => r.name === selectedRole);
  const SelectedRoleIcon = selectedRoleInfo ? ICON_MAP[selectedRoleInfo.icon] || Shield : Shield;

  // Count permissions per role
  const getPermissionCount = (role: string) => {
    return rolePermissions?.filter(rp => rp.role === role).length ?? 0;
  };

  return (
    <AdminLayout requiredRoles={['admin']}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Role Permissions</h1>
          <p className="text-muted-foreground">
            Manage roles, permissions, and access control.
          </p>
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'assign' | 'manage')}>
          {/* Mobile dropdown */}
          <div className="sm:hidden mb-4">
            <Select value={activeTab} onValueChange={(v) => setActiveTab(v as 'assign' | 'manage')}>
              <SelectTrigger className="w-full bg-background">
                <SelectValue placeholder="Select section" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border z-50">
                <SelectItem value="assign">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Assign Permissions
                  </div>
                </SelectItem>
                <SelectItem value="manage">
                  <div className="flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Manage Roles & Permissions
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Desktop tabs */}
          <TabsList className="hidden sm:inline-flex">
            <TabsTrigger value="assign">Assign Permissions</TabsTrigger>
            <TabsTrigger value="manage">Manage Roles & Permissions</TabsTrigger>
          </TabsList>

          <TabsContent value="manage" className="space-y-6 mt-6">
            <RoleManagementCard />
          </TabsContent>

          <TabsContent value="assign" className="space-y-6 mt-6">
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
                  {customRoles?.map(role => {
                    const IconComponent = ICON_MAP[role.icon] || Shield;
                    return (
                      <button
                        key={role.id}
                        onClick={() => setSelectedRole(role.name)}
                        className={`p-4 rounded-lg border-2 transition-all text-left ${
                          selectedRole === role.name
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <div className={`p-1.5 rounded ${role.color} text-white`}>
                            <IconComponent className="h-4 w-4" />
                          </div>
                          {role.name === 'admin' && <Lock className="h-3 w-3 text-muted-foreground" />}
                        </div>
                        <p className="font-medium text-sm">{role.display_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {getPermissionCount(role.name)} permissions
                        </p>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Permissions Grid */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <SelectedRoleIcon className="h-5 w-5" />
                      {selectedRoleInfo?.display_name} Permissions
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
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs md:text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-2 font-medium">Permission</th>
                        {customRoles?.map(role => {
                          const IconComponent = ICON_MAP[role.icon] || Shield;
                          return (
                            <th key={role.id} className="text-center py-2 px-1">
                              <div className={`inline-flex items-center justify-center gap-0.5 px-1 py-0.5 rounded text-white text-[10px] md:text-xs ${role.color}`}>
                                <IconComponent className="h-3 w-3" />
                                <span className="hidden lg:inline">{role.display_name}</span>
                              </div>
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {permissions?.map(permission => (
                        <tr key={permission.id} className="border-b border-border/50 hover:bg-muted/50">
                          <td className="py-1.5 px-2">
                            <div className="flex items-center gap-1">
                              <span className="hidden md:inline">{CATEGORY_ICONS[permission.category]}</span>
                              <span className="truncate max-w-[120px] md:max-w-[200px] text-xs">
                                {permission.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                              </span>
                            </div>
                          </td>
                          {customRoles?.map(role => (
                            <td key={role.id} className="text-center py-1.5 px-1">
                              {hasPermission(role.name, permission.id) ? (
                                <span className="text-green-500 text-xs">✓</span>
                              ) : (
                                <span className="text-muted-foreground/30 text-xs">—</span>
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
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
