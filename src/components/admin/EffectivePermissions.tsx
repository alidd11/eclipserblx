import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ShieldCheck, Layers } from 'lucide-react';
import { useMemo } from 'react';

interface EffectivePermissionsProps {
 userId: string;
}

export function EffectivePermissions({ userId }: EffectivePermissionsProps) {
 // Fetch user's roles
 const { data: userRoles = [] } = useQuery({
 queryKey: ['user-roles-for-perms', userId],
 queryFn: async () => {
 const { data, error } = await supabase
 .from('user_roles')
 .select('role')
 .eq('user_id', userId);
 if (error) throw error;
 return data.map(r => r.role);
 },
 enabled: !!userId,
 });

 // Fetch all role_permissions for those roles
 const { data: rolePerms = [], isLoading: permsLoading } = useQuery({
 queryKey: ['effective-role-perms', userRoles],
 queryFn: async () => {
 if (!userRoles.length) return [];
 const { data, error } = await supabase
 .from('role_permissions')
 .select('role, permission_id')
 .in('role', userRoles);
 if (error) throw error;
 return data;
 },
 enabled: userRoles.length > 0,
 });

 // Fetch all permissions for display
 const { data: allPermissions = [] } = useQuery({
 queryKey: ['all-permissions-list'],
 queryFn: async () => {
 const { data, error } = await supabase
 .from('permissions')
 .select('id, name, description, category')
 .order('category')
 .order('name');
 if (error) throw error;
 return data;
 },
 });

 // Build effective permissions (union of all roles)
 const effectivePerms = useMemo(() => {
 const permIdToRoles = new Map<string, string[]>();
 rolePerms.forEach(rp => {
 const existing = permIdToRoles.get(rp.permission_id) || [];
 existing.push(rp.role);
 permIdToRoles.set(rp.permission_id, existing);
 });

 return allPermissions
 .filter(p => permIdToRoles.has(p.id))
 .map(p => ({
 ...p,
 grantedBy: permIdToRoles.get(p.id) || [],
 }));
 }, [rolePerms, allPermissions]);

 // Group by category
 const grouped = useMemo(() => {
 const map: Record<string, typeof effectivePerms> = {};
 effectivePerms.forEach(p => {
 const cat = p.category || 'other';
 if (!map[cat]) map[cat] = [];
 map[cat].push(p);
 });
 return map;
 }, [effectivePerms]);

 const formatName = (name: string) =>
 name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

 if (permsLoading) {
 return (
 <div className="border border-border rounded-xl overflow-hidden">
 <div className="px-4 py-3 border-b border-border bg-muted/30">
 <h3 className="font-semibold text-sm text-lg flex items-center gap-2">
 <ShieldCheck className="h-5 w-5" />
 Effective Permissions
 </h3>
 </div>
 <div className="p-4">
 <Skeleton className="h-20 w-full" />
 </div>
 </div>
 );
 }

 return (
 <div className="border border-border rounded-xl overflow-hidden">
 <div className="px-4 py-3 border-b border-border bg-muted/30">
 <h3 className="font-semibold text-sm text-lg flex items-center gap-2">
 <ShieldCheck className="h-5 w-5" />
 Effective Permissions
 <Badge variant="secondary" className="ml-auto text-xs">
 {effectivePerms.length} total
 </Badge>
 </h3>
 <p className="text-xs text-muted-foreground flex items-center gap-1">
 <Layers className="h-3 w-3" />
 Merged from {userRoles.length} role{userRoles.length !== 1 ? 's' : ''}: {userRoles.join(', ')}
 </p>
 </div>
 <div className="p-4">
 {effectivePerms.length === 0 ? (
 <p className="text-sm text-muted-foreground text-center py-4">
 No permissions granted
 </p>
 ) : (
 <div className="space-y-4">
 {Object.entries(grouped)
 .sort(([a], [b]) => a.localeCompare(b))
 .map(([category, perms]) => (
 <div key={category}>
 <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
 {formatName(category)}
 </h4>
 <div className="flex flex-wrap gap-1.5">
 {perms.map(p => (
 <Badge
 key={p.id}
 variant="outline"
 className="text-xs font-normal"
 title={`Granted by: ${p.grantedBy.join(', ')}${p.description ? `\n${p.description}` : ''}`}
 >
 {formatName(p.name)}
 {p.grantedBy.length > 1 && (
 <span className="ml-1 text-muted-foreground">×{p.grantedBy.length}</span>
 )}
 </Badge>
 ))}
 </div>
 </div>
 ))}
 </div>
 )}
 </div>
 </div>
 );
}
