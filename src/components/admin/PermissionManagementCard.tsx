import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Pencil, Eye, Settings, Shield } from 'lucide-react';
import { useState } from 'react';
import { CreatePermissionDialog } from './CreatePermissionDialog';

interface Permission {
  id: string;
  name: string;
  description: string | null;
  category: string;
  created_at: string;
}

const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  pages: Eye,
  actions: Pencil,
  settings: Settings,
  admin: Shield,
};

const CATEGORY_COLORS: Record<string, string> = {
  pages: 'bg-blue-500/10 text-blue-500',
  actions: 'bg-green-500/10 text-green-500',
  settings: 'bg-purple-500/10 text-purple-500',
  admin: 'bg-red-500/10 text-red-500',
};

export function PermissionManagementCard() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editPermission, setEditPermission] = useState<Permission | null>(null);

  const { data: permissions, isLoading } = useQuery({
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

  const existingCategories = [...new Set(permissions?.map(p => p.category) || [])];

  // Group permissions by category
  const permissionsByCategory = permissions?.reduce((acc, perm) => {
    if (!acc[perm.category]) acc[perm.category] = [];
    acc[perm.category].push(perm);
    return acc;
  }, {} as Record<string, Permission[]>) ?? {};

  const handleEdit = (permission: Permission) => {
    setEditPermission(permission);
    setDialogOpen(true);
  };

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setEditPermission(null);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Permission Management
              </CardTitle>
              <CardDescription>
                Create and manage permissions
              </CardDescription>
            </div>
            <Button onClick={() => setDialogOpen(true)} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              New Permission
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
            <div className="space-y-6">
              {Object.entries(permissionsByCategory).map(([category, perms]) => {
                const IconComponent = CATEGORY_ICONS[category] || Settings;
                const colorClass = CATEGORY_COLORS[category] || 'bg-gray-500/10 text-gray-500';
                
                return (
                  <div key={category}>
                    <div className="flex items-center gap-2 mb-3">
                      <Badge variant="outline" className={colorClass}>
                        <IconComponent className="h-3 w-3 mr-1" />
                        {category.charAt(0).toUpperCase() + category.slice(1)}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {perms.length} permission{perms.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {perms.map(permission => (
                        <div
                          key={permission.id}
                          className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors cursor-pointer group"
                          onClick={() => handleEdit(permission)}
                        >
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm truncate">
                              {permission.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </p>
                            {permission.description && (
                              <p className="text-xs text-muted-foreground truncate mt-0.5">
                                {permission.description}
                              </p>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
              {Object.keys(permissionsByCategory).length === 0 && (
                <p className="text-center text-muted-foreground py-4">
                  No permissions defined yet. Create your first permission.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <CreatePermissionDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        editPermission={editPermission}
        existingCategories={existingCategories}
      />
    </>
  );
}
