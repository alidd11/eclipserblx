import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { 
  Shield, 
  Users, 
  Package, 
  MessageCircle, 
  BarChart3, 
  Settings,
  Store,
  Gift,
  LayoutDashboard,
  ChevronDown,
  ChevronUp,
  Lock
} from 'lucide-react';
import { RoleManagementCard } from '@/components/admin/RoleManagementCard';
import { RoleSelector } from '@/components/admin/RoleSelector';
import { PermissionCategory } from '@/components/admin/PermissionCategory';

type AppRole = 'admin' | 'lead_administrator' | 'order_manager' | 'support_agent' | 'analyst' | 'recruiter';

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

// Define permission categories with icons and labels
const PERMISSION_CATEGORIES = {
  dashboard: {
    label: 'Dashboard & Analytics',
    icon: <LayoutDashboard className="h-5 w-5" />,
    order: 1,
  },
  store: {
    label: 'Store Management',
    icon: <Package className="h-5 w-5" />,
    order: 2,
  },
  users: {
    label: 'User Management',
    icon: <Users className="h-5 w-5" />,
    order: 3,
  },
  marketplace: {
    label: 'Marketplace & Sellers',
    icon: <Store className="h-5 w-5" />,
    order: 4,
  },
  communications: {
    label: 'Communications',
    icon: <MessageCircle className="h-5 w-5" />,
    order: 5,
  },
  team: {
    label: 'Team & Recruitment',
    icon: <Shield className="h-5 w-5" />,
    order: 6,
  },
  affiliates: {
    label: 'Affiliates & Referrals',
    icon: <Gift className="h-5 w-5" />,
    order: 7,
  },
  system: {
    label: 'System & Settings',
    icon: <Settings className="h-5 w-5" />,
    order: 8,
  },
  // Fallback for uncategorized
  actions: {
    label: 'Other Actions',
    icon: <BarChart3 className="h-5 w-5" />,
    order: 9,
  },
  pages: {
    label: 'Other Pages',
    icon: <LayoutDashboard className="h-5 w-5" />,
    order: 10,
  },
};

export default function RolePermissions() {
  const queryClient = useQueryClient();
  const [selectedRole, setSelectedRole] = useState<string>('admin');
  const [activeTab, setActiveTab] = useState<'assign' | 'manage'>('assign');
  const [allExpanded, setAllExpanded] = useState(true);

  // Fetch custom roles
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
      // Also invalidate all user-permissions caches so staff see changes immediately
      queryClient.invalidateQueries({ queryKey: ['user-permissions'] });
      toast.success('Permission updated');
    },
    onError: (error) => {
      toast.error('Failed to update: ' + error.message);
    },
  });

  // Create a set of enabled permissions for the selected role
  const enabledPermissions = useMemo(() => {
    const set = new Set<string>();
    rolePermissions?.forEach(rp => {
      if (rp.role === selectedRole) {
        set.add(rp.permission_id);
      }
    });
    return set;
  }, [rolePermissions, selectedRole]);

  // Group permissions by category
  const permissionsByCategory = useMemo(() => {
    const grouped: Record<string, Permission[]> = {};
    permissions?.forEach(perm => {
      const category = perm.category || 'actions';
      if (!grouped[category]) grouped[category] = [];
      grouped[category].push(perm);
    });
    return grouped;
  }, [permissions]);

  // Sort categories by defined order
  const sortedCategories = useMemo(() => {
    return Object.keys(permissionsByCategory).sort((a, b) => {
      const orderA = PERMISSION_CATEGORIES[a as keyof typeof PERMISSION_CATEGORIES]?.order ?? 99;
      const orderB = PERMISSION_CATEGORIES[b as keyof typeof PERMISSION_CATEGORIES]?.order ?? 99;
      return orderA - orderB;
    });
  }, [permissionsByCategory]);

  const handleToggle = (permissionId: string, enabled: boolean) => {
    if (selectedRole === 'admin') {
      toast.error('Admin permissions cannot be modified');
      return;
    }
    togglePermissionMutation.mutate({ role: selectedRole, permissionId, enabled });
  };

  const getPermissionCount = (role: string) => {
    return rolePermissions?.filter(rp => rp.role === role).length ?? 0;
  };

  const isLoading = permissionsLoading || rolePermissionsLoading || rolesLoading;
  const isAdmin = selectedRole === 'admin';

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
          {/* Dropdown for all devices */}
          <Select value={activeTab} onValueChange={(v) => setActiveTab(v as 'assign' | 'manage')}>
            <SelectTrigger className="w-full bg-card border-2 border-primary/20 hover:border-primary/40 transition-colors">
              <SelectValue placeholder="Select section" />
            </SelectTrigger>
            <SelectContent className="bg-card border-border z-[100]">
              <SelectItem value="assign">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Assign Permissions
                </div>
              </SelectItem>
              <SelectItem value="manage">
                <div className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Manage Roles
                </div>
              </SelectItem>
            </SelectContent>
          </Select>

          <TabsContent value="manage" className="space-y-6 mt-6">
            <RoleManagementCard />
          </TabsContent>

          <TabsContent value="assign" className="space-y-6 mt-6">
            {/* Role Selection */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Shield className="h-5 w-5" />
                  Select Role
                </CardTitle>
                <CardDescription>
                  Choose a role to view and modify its permissions
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                {rolesLoading ? (
                  <Skeleton className="h-12 w-full" />
                ) : customRoles ? (
                  <RoleSelector
                    roles={customRoles}
                    selectedRole={selectedRole}
                    onSelectRole={setSelectedRole}
                  />
                ) : null}
              </CardContent>
            </Card>

            {/* Permissions Header with Expand/Collapse */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Badge 
                  variant="secondary" 
                  className="text-sm px-3 py-1.5 font-medium"
                >
                  {enabledPermissions.size} / {permissions?.length ?? 0} enabled
                </Badge>
                {isAdmin && (
                  <Badge variant="outline" className="text-xs">
                    <Lock className="h-3 w-3 mr-1" />
                    Read-only
                  </Badge>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setAllExpanded(!allExpanded)}
                className="text-muted-foreground hover:text-foreground"
              >
                {allExpanded ? (
                  <>
                    <ChevronUp className="h-4 w-4 mr-1" />
                    Collapse All
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4 mr-1" />
                    Expand All
                  </>
                )}
              </Button>
            </div>

            {/* Permission Categories */}
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4].map(i => (
                  <Skeleton key={i} className="h-20" />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {sortedCategories.map(categoryKey => {
                  const categoryConfig = PERMISSION_CATEGORIES[categoryKey as keyof typeof PERMISSION_CATEGORIES];
                  const categoryPermissions = permissionsByCategory[categoryKey] || [];
                  
                  if (categoryPermissions.length === 0) return null;
                  
                  return (
                    <PermissionCategory
                      key={categoryKey}
                      categoryKey={categoryKey}
                      label={categoryConfig?.label ?? categoryKey}
                      icon={categoryConfig?.icon ?? <BarChart3 className="h-5 w-5" />}
                      permissions={categoryPermissions}
                      enabledPermissions={enabledPermissions}
                      onToggle={handleToggle}
                      isAdmin={isAdmin}
                      isLoading={togglePermissionMutation.isPending}
                      defaultOpen={allExpanded}
                    />
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
