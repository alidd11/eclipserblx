import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSellerStatus } from '@/hooks/useSellerStatus';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
 AlertTriangle,
 Save,
 Loader2,
 Shield,
 Code,
 Users,
 RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';

// Commands available in seller servers
const SELLER_COMMANDS = [
 { name: 'retrieve', description: 'Download purchased products' },
 { name: 'purchases', description: 'View recent purchases' },
 { name: 'store', description: 'View store information' },
 { name: 'newdrops', description: 'View latest product drops' },
 { name: 'profile', description: 'View Eclipse profile' },
 { name: 'link', description: 'Check Discord link status' },
 { name: 'verify', description: 'Link Discord account' },
 { name: 'getrole', description: 'Sync Discord roles' },
 { name: 'showcase', description: 'Showcase a product/store' },
 { name: 'help', description: 'View bot commands' },
 { name: 'daily', description: 'Claim daily XP reward' },
 { name: 'leaderboard', description: 'View XP leaderboard' },
 { name: 'balance', description: 'View credits and XP' },
];

interface DiscordRole {
 id: string;
 name: string;
 color: number;
 position: number;
}

interface PermissionEntry {
 command_name: string;
 allowed_role_ids: string[];
}

export function CommandPermissionsTab() {
 const { store } = useSellerStatus();
 const queryClient = useQueryClient();
 const guildId = store?.credentials?.discord_guild_id as string | undefined;
 const hasBotConnected = !!guildId;

 // Local state for permission edits
 const [permissions, setPermissions] = useState<Record<string, string[]>>({});
 const [dirty, setDirty] = useState(false);

 // Fetch Discord roles from the server
 const { data: roles = [], isLoading: loadingRoles, refetch: refetchRoles } = useQuery({
 queryKey: ['guild-roles', guildId],
 queryFn: async () => {
 const { data, error } = await supabase.functions.invoke('bot-control', {
 body: { action: 'guild-roles', guild_id: guildId },
 });
 if (error) throw error;
 return (data?.roles || []) as DiscordRole[];
 },
 enabled: !!guildId,
 });

 // Fetch existing permissions
 const { data: savedPermissions = [], isLoading: loadingPerms } = useQuery({
 queryKey: ['guild-command-permissions', store?.id],
 queryFn: async () => {
 const { data, error } = await supabase
 .from('guild_command_permissions')
 .select('command_name, allowed_role_ids')
 .eq('store_id', store!.id);
 if (error) throw error;
 return data as PermissionEntry[];
 },
 enabled: !!store?.id,
 });

 // Sync saved permissions to local state
 useEffect(() => {
 const map: Record<string, string[]> = {};
 savedPermissions.forEach((p) => {
 map[p.command_name] = p.allowed_role_ids;
 });
 setPermissions(map);
 setDirty(false);
 }, [savedPermissions]);

 const toggleRole = (command: string, roleId: string) => {
 setPermissions((prev) => {
 const current = prev[command] || [];
 const updated = current.includes(roleId)
 ? current.filter((id) => id !== roleId)
 : [...current, roleId];
 return { ...prev, [command]: updated };
 });
 setDirty(true);
 };

 const clearCommandPermissions = (command: string) => {
 setPermissions((prev) => ({ ...prev, [command]: [] }));
 setDirty(true);
 };

 const savePermissions = useMutation({
 mutationFn: async () => {
 if (!store?.id || !guildId) throw new Error('Store not configured');

 // Upsert each command's permissions
 const upserts = Object.entries(permissions)
 .filter(([_, roleIds]) => roleIds.length > 0)
 .map(([command_name, allowed_role_ids]) => ({
 guild_id: guildId,
 command_name,
 allowed_role_ids,
 store_id: store.id,
 updated_at: new Date().toISOString(),
 }));

 // Delete commands with no roles (unrestricted)
 const toDelete = Object.entries(permissions)
 .filter(([_, roleIds]) => roleIds.length === 0)
 .map(([cmd]) => cmd);

 if (toDelete.length > 0) {
 await supabase
 .from('guild_command_permissions')
 .delete()
 .eq('store_id', store.id)
 .in('command_name', toDelete);
 }

 if (upserts.length > 0) {
 const { error } = await supabase
 .from('guild_command_permissions')
 .upsert(upserts, { onConflict: 'guild_id,command_name' });
 if (error) throw error;
 }
 },
 onSuccess: () => {
 toast.success('Command permissions saved');
 queryClient.invalidateQueries({ queryKey: ['guild-command-permissions', store?.id] });
 setDirty(false);
 },
 onError: (e: Error) => toast.error(e.message),
 });

 const getRoleColor = (color: number) => {
 if (color === 0) return undefined;
 return `#${color.toString(16).padStart(6, '0')}`;
 };

 const restrictedCount = Object.values(permissions).filter((r) => r.length > 0).length;

 if (!hasBotConnected) {
 return (
 <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-start gap-3">
 <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
 <div className="text-sm text-amber-600 dark:text-amber-400">
 <p className="font-medium">Bot not connected</p>
 <p className="text-xs mt-0.5">
 Add the Eclipse Portal Bot to your server first to configure command permissions.
 </p>
 </div>
 </div>
 );
 }

 return (
 <div className="space-y-4">
 {/* Info */}
 <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg flex items-start gap-3">
 <Shield className="h-4 w-4 text-primary shrink-0 mt-0.5" />
 <div className="text-sm">
 <p className="font-medium">Control who can use bot commands</p>
 <p className="text-xs text-muted-foreground mt-0.5">
 Restrict commands to specific Discord roles in your server. Commands with no roles selected are available to everyone.
 </p>
 </div>
 </div>

 {/* Status */}
 <div className="flex items-center justify-between">
 <Badge variant="outline" className="text-xs">
 {restrictedCount}/{SELLER_COMMANDS.length} commands restricted
 </Badge>
 <Button
 variant="ghost"
 size="sm"
 onClick={() => refetchRoles()}
 disabled={loadingRoles}
 >
 <RefreshCw className={`h-3.5 w-3.5 mr-1 ${loadingRoles ? 'animate-spin' : ''}`} />
 Refresh Roles
 </Button>
 </div>

 {loadingRoles || loadingPerms ? (
 <p className="text-sm text-muted-foreground">Loading...</p>
 ) : (
 <div className="space-y-3">
 {SELLER_COMMANDS.map((cmd) => {
 const cmdRoles = permissions[cmd.name] || [];
 const isRestricted = cmdRoles.length > 0;

 return (
 <div className="border border-border rounded-xl overflow-hidden" key={cmd.name} className="border-border/50">
 <div className="p-4 p-4 space-y-3">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-2">
 <Code className="h-4 w-4 text-muted-foreground" />
 <span className="text-sm font-mono font-medium">/{cmd.name}</span>
 {isRestricted && (
 <Badge variant="secondary" className="text-[10px] px-1.5">
 {cmdRoles.length} role{cmdRoles.length !== 1 ? 's' : ''}
 </Badge>
 )}
 </div>
 {isRestricted && (
 <Button
 variant="ghost"
 size="sm"
 className="text-xs h-6 px-2 text-muted-foreground"
 onClick={() => clearCommandPermissions(cmd.name)}
 >
 Clear
 </Button>
 )}
 </div>
 <p className="text-xs text-muted-foreground">{cmd.description}</p>

 {/* Role toggles */}
 <div className="flex flex-wrap gap-1.5">
 {roles.map((role) => {
 const isActive = cmdRoles.includes(role.id);
 const roleColor = getRoleColor(role.color);

 return (
 <button
 key={role.id}
 onClick={() => toggleRole(cmd.name, role.id)}
 className={`
 inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium
 transition-all border cursor-pointer
 ${isActive
 ? 'bg-primary/10 border-primary/40 text-primary'
 : 'bg-muted/30 border-border/50 text-muted-foreground hover:bg-muted/60'
 }
 `}
 >
 {roleColor && (
 <span
 className="w-2 h-2 rounded-full shrink-0"
 style={{ backgroundColor: roleColor }}
 />
 )}
 {role.name}
 </button>
 );
 })}
 </div>

 {!isRestricted && (
 <p className="text-[11px] text-muted-foreground/60 flex items-center gap-1">
 <Users className="h-3 w-3" /> Available to everyone
 </p>
 )}
 </div>
 </div>
 );
 })}
 </div>
 )}

 {/* Save */}
 {dirty && (
 <Button
 onClick={() => savePermissions.mutate()}
 disabled={savePermissions.isPending}
 className="w-full"
 >
 {savePermissions.isPending ? (
 <Loader2 className="h-4 w-4 mr-2 animate-spin" />
 ) : (
 <Save className="h-4 w-4 mr-2" />
 )}
 Save Command Permissions
 </Button>
 )}
 </div>
 );
}
