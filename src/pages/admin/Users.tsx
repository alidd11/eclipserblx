import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Shield, Plus, X, Ban, Trash2, AlertTriangle, ShieldAlert, Filter, Sparkles } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useCurrentIp } from '@/hooks/useCurrentIp';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
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
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Database } from '@/integrations/supabase/types';
import { GrantEclipsePlusDialog } from '@/components/admin/GrantEclipsePlusDialog';

type AppRole = Database['public']['Enums']['app_role'];

const ROLES: { value: AppRole; label: string; color: string }[] = [
  { value: 'admin', label: 'Admin', color: 'bg-red-500/10 text-red-500 border-red-500/30' },
  { value: 'product_manager', label: 'Product Manager', color: 'bg-blue-500/10 text-blue-500 border-blue-500/30' },
  { value: 'order_manager', label: 'Order Manager', color: 'bg-green-500/10 text-green-500 border-green-500/30' },
  { value: 'support_agent', label: 'Support Agent', color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30' },
  { value: 'analyst', label: 'Analyst', color: 'bg-purple-500/10 text-purple-500 border-purple-500/30' },
  { value: 'recruiter', label: 'Recruiter', color: 'bg-violet-500/10 text-violet-500 border-violet-500/30' },
  { value: 'seller', label: 'Seller', color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30' },
];

const PRIMARY_ADMIN_EMAIL = 'alicanimir1@gmail.com';

export default function AdminUsers() {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<AppRole | 'all' | 'customer'>('all');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [newRole, setNewRole] = useState<AppRole | ''>('');
  const [ipBanDialogUser, setIpBanDialogUser] = useState<any>(null);
  const [ipAddress, setIpAddress] = useState('');
  const [banReason, setBanReason] = useState('');
  const [deleteConfirmUser, setDeleteConfirmUser] = useState<any>(null);
  const [selfBanConfirmOpen, setSelfBanConfirmOpen] = useState(false);
  const [grantEclipsePlusUser, setGrantEclipsePlusUser] = useState<any>(null);
  const [selfBanCooldown, setSelfBanCooldown] = useState(0);
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { ip: currentAdminIp } = useCurrentIp();

  // Cooldown timer for self-ban confirmation
  useEffect(() => {
    if (selfBanCooldown > 0) {
      const timer = setTimeout(() => setSelfBanCooldown(selfBanCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [selfBanCooldown]);

  const isSelfBan = ipAddress.trim() === currentAdminIp;

  const handleBanClick = () => {
    if (isSelfBan) {
      // Show self-ban confirmation with 5 second cooldown
      setSelfBanConfirmOpen(true);
      setSelfBanCooldown(5);
    } else {
      ipBanMutation.mutate({ 
        ipAddress: ipAddress.trim(), 
        reason: banReason.trim() || undefined,
        userId: ipBanDialogUser?.user_id 
      });
    }
  };

  const handleConfirmSelfBan = () => {
    ipBanMutation.mutate({ 
      ipAddress: ipAddress.trim(), 
      reason: banReason.trim() || undefined,
      userId: ipBanDialogUser?.user_id 
    });
    setSelfBanConfirmOpen(false);
  };

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
        query = query.ilike('customer_id', `%${search}%`);
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
    mutationFn: async ({ userId, role, targetEmail, displayName }: { userId: string; role: AppRole; targetEmail: string; displayName?: string }) => {
      const { error } = await supabase.from('user_roles').insert({ user_id: userId, role });
      if (error) throw error;
      
      // If assigning seller role, automatically create store and balance records
      if (role === 'seller') {
        // Check if store already exists for this user
        const { data: existingStore } = await supabase
          .from('stores')
          .select('id')
          .eq('owner_id', userId)
          .maybeSingle();
        
        if (!existingStore) {
          // Generate a unique slug from display name or email
          const baseName = displayName || targetEmail.split('@')[0];
          const slug = baseName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
          const uniqueSlug = `${slug}-${Date.now().toString(36)}`;
          
          // Create store record with explicit commission rate
          const { data: newStore, error: storeError } = await supabase
            .from('stores')
            .insert({
              owner_id: userId,
              name: displayName || targetEmail.split('@')[0],
              slug: uniqueSlug,
              store_id: `STR-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
              status: 'approved',
              is_active: true,
              commission_rate: 15, // Default 15% commission rate
            })
            .select('id')
            .single();
          
          if (storeError) {
            console.error('Failed to create store:', storeError);
          } else if (newStore) {
            // Create seller balance record
            const { error: balanceError } = await supabase
              .from('seller_balances')
              .insert({
                user_id: userId,
                store_id: newStore.id,
              });
            
            if (balanceError) {
              console.error('Failed to create seller balance:', balanceError);
            }
          }
        } else {
          // Store exists, ensure it's active and approved
          await supabase
            .from('stores')
            .update({ status: 'approved', is_active: true })
            .eq('id', existingStore.id);
        }
      }
      
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
      queryClient.invalidateQueries({ queryKey: ['seller-commissions'] });
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

  // IP Ban mutation
  const ipBanMutation = useMutation({
    mutationFn: async ({ ipAddress, reason, userId }: { ipAddress: string; reason?: string; userId?: string }) => {
      const { error } = await supabase.from('ip_bans').insert({
        ip_address: ipAddress,
        reason: reason || null,
        banned_by: user?.id,
        user_id: userId || null,
      });
      if (error) throw error;

      // Log the action
      await supabase.from('audit_logs').insert({
        user_id: user?.id,
        action: 'ip_banned',
        resource: 'ip_bans',
        details: { ip_address: ipAddress, reason, target_user_id: userId }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ip-bans'] });
      toast.success('IP address banned successfully');
      setIpBanDialogUser(null);
      setIpAddress('');
      setBanReason('');
    },
    onError: (error: any) => {
      if (error.message.includes('duplicate')) {
        toast.error('This IP address is already banned');
      } else {
        toast.error(error.message);
      }
    },
  });

  // Delete account mutation (primary admin only)
  const deleteAccountMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await supabase.functions.invoke('delete-user-account', {
        body: { userId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-profiles'] });
      queryClient.invalidateQueries({ queryKey: ['admin-user-roles'] });
      toast.success('Account deleted successfully');
      setDeleteConfirmUser(null);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete account');
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

  const canDeleteUser = (profile: any) => {
    // Only primary admin can delete accounts
    if (!isPrimaryAdmin) return false;
    // Can't delete the primary admin
    if (profile.email === PRIMARY_ADMIN_EMAIL) return false;
    return true;
  };

  // Filter profiles by role
  const filteredProfiles = profiles?.filter((profile) => {
    if (roleFilter === 'all') return true;
    
    const roles = getUserRoles(profile.user_id);
    
    if (roleFilter === 'customer') {
      return roles.length === 0;
    }
    
    return roles.some(r => r.role === roleFilter);
  });

  return (
    <AdminLayout requiredRoles={['admin']}>
      <div className="space-y-6 min-h-0">
        <div>
          <h1 className="text-3xl font-display font-bold">Users & Roles</h1>
          <p className="text-muted-foreground">Manage user accounts and permissions</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by customer ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-card"
            />
          </div>
          
          <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v as AppRole | 'all' | 'customer')}>
            <SelectTrigger className="w-[140px] sm:w-[180px] bg-card shrink-0">
              <Filter className="h-4 w-4 mr-2 text-muted-foreground shrink-0" />
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Users</SelectItem>
              <SelectItem value="customer">Customers</SelectItem>
              {ROLES.map((role) => (
                <SelectItem key={role.value} value={role.value}>
                  {role.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block rounded-lg border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>User</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : filteredProfiles?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                    {roleFilter !== 'all' ? 'No users found with this role' : 'No users found'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredProfiles?.map((profile) => {
                  const roles = getUserRoles(profile.user_id);
                  return (
                    <TableRow key={profile.id}>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium">{profile.display_name || 'No username'}</p>
                            {roles.length === 0 ? (
                              <Badge variant="secondary" className="text-xs">Customer</Badge>
                            ) : (
                              roles.map(r => getRoleBadge(r.role))
                            )}
                          </div>
                          {profile.customer_id && (
                            <p className="text-xs font-mono text-primary">Customer ID: {profile.customer_id}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{new Date(profile.created_at).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => setSelectedUser(profile)}>
                            <Shield className="h-4 w-4 mr-2" />
                            Roles
                          </Button>
                          {isAdmin && (
                            <>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => setGrantEclipsePlusUser(profile)}
                                className="text-amber-500 hover:text-amber-600 hover:bg-amber-500/10"
                                title="Grant Eclipse+"
                              >
                                <Sparkles className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => setIpBanDialogUser(profile)}
                                className="text-orange-500 hover:text-orange-600 hover:bg-orange-500/10"
                              >
                                <Ban className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          {canDeleteUser(profile) && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => setDeleteConfirmUser(profile)}
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden space-y-3 pb-4">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : filteredProfiles?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {roleFilter !== 'all' ? 'No users found with this role' : 'No users found'}
            </div>
          ) : (
            filteredProfiles?.map((profile) => {
              const roles = getUserRoles(profile.user_id);
              return (
                <div key={profile.id} className="rounded-lg border border-border bg-card p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium">{profile.display_name || 'Unnamed'}</p>
                        {roles.length === 0 ? (
                          <Badge variant="secondary" className="text-xs">Customer</Badge>
                        ) : (
                          roles.map(r => getRoleBadge(r.role))
                        )}
                      </div>
                      {profile.customer_id && (
                        <p className="text-xs font-mono text-primary">Customer ID: {profile.customer_id}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Joined {new Date(profile.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button 
                        variant="outline" 
                        size="icon"
                        className="h-10 w-10"
                        onClick={() => setSelectedUser(profile)}
                      >
                        <Shield className="h-4 w-4" />
                      </Button>
                      {isAdmin && (
                        <>
                          <Button 
                            variant="outline" 
                            size="icon"
                            className="h-10 w-10 text-amber-500 border-amber-500/50 hover:bg-amber-500/10"
                            onClick={() => setGrantEclipsePlusUser(profile)}
                            title="Grant Eclipse+"
                          >
                            <Sparkles className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="icon"
                            className="h-10 w-10 text-orange-500 border-orange-500/50 hover:bg-orange-500/10"
                            onClick={() => setIpBanDialogUser(profile)}
                          >
                            <Ban className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      {canDeleteUser(profile) && (
                        <Button 
                          variant="outline" 
                          size="icon"
                          className="h-10 w-10 text-destructive border-destructive/50 hover:bg-destructive/10"
                          onClick={() => setDeleteConfirmUser(profile)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
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
                <p className="font-medium text-sm">{selectedUser.display_name || 'No username'}</p>
                {selectedUser.customer_id && (
                  <p className="text-xs font-mono text-primary mt-1">Customer ID: {selectedUser.customer_id}</p>
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
                      onClick={() => newRole && addRoleMutation.mutate({ 
                        userId: selectedUser.user_id, 
                        role: newRole, 
                        targetEmail: selectedUser.email,
                        displayName: selectedUser.display_name 
                      })}
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

      {/* IP Ban Dialog */}
      <Dialog open={!!ipBanDialogUser} onOpenChange={() => { setIpBanDialogUser(null); setIpAddress(''); setBanReason(''); }}>
        <DialogContent className="max-w-[95vw] sm:max-w-md mx-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ban className="h-5 w-5 text-orange-500" />
              IP Ban User
            </DialogTitle>
            <DialogDescription>
              Ban an IP address to prevent access from that address.
            </DialogDescription>
          </DialogHeader>

          {ipBanDialogUser && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="font-medium text-sm">{ipBanDialogUser.display_name || 'No username'}</p>
                {ipBanDialogUser.customer_id && (
                  <p className="text-xs font-mono text-primary mt-1">Customer ID: {ipBanDialogUser.customer_id}</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">IP Address *</label>
                <Input
                  placeholder="e.g., 192.168.1.100"
                  value={ipAddress}
                  onChange={(e) => setIpAddress(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">Enter the IP address to ban</p>
                {currentAdminIp && (
                  <p className="text-xs text-muted-foreground">Your current IP: <span className="font-mono text-primary">{currentAdminIp}</span></p>
                )}
              </div>

              {/* Self-ban warning */}
              {isSelfBan && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 flex items-start gap-3">
                  <ShieldAlert className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-destructive">Warning: Self-Ban Detected</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      This is your current IP address. Banning it will lock you out of the admin dashboard.
                    </p>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium">Reason (optional)</label>
                <Textarea
                  placeholder="Why is this IP being banned?"
                  value={banReason}
                  onChange={(e) => setBanReason(e.target.value)}
                  rows={2}
                />
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => { setIpBanDialogUser(null); setIpAddress(''); setBanReason(''); }}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  disabled={!ipAddress.trim() || ipBanMutation.isPending}
                  onClick={handleBanClick}
                  className="bg-orange-500 hover:bg-orange-600"
                >
                  {ipBanMutation.isPending ? 'Banning...' : 'Ban IP'}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Self-Ban Confirmation Dialog */}
      <AlertDialog open={selfBanConfirmOpen} onOpenChange={setSelfBanConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <ShieldAlert className="h-5 w-5" />
              You Are About to Ban Your Own IP
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                <strong className="text-destructive">This will immediately lock you out</strong> of the entire site, 
                including the admin dashboard.
              </p>
              <p>
                You will need to use a VPN or different network to access the site and remove the ban.
              </p>
              <div className="p-3 rounded-lg bg-muted/50 font-mono text-sm">
                IP to be banned: <span className="text-destructive">{ipAddress}</span>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelfBanConfirmOpen(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmSelfBan}
              className="bg-destructive hover:bg-destructive/90"
              disabled={selfBanCooldown > 0 || ipBanMutation.isPending}
            >
              {selfBanCooldown > 0 ? `Wait ${selfBanCooldown}s...` : 'I Understand, Ban Myself'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Account Confirmation */}
      <AlertDialog open={!!deleteConfirmUser} onOpenChange={() => setDeleteConfirmUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Delete Account Permanently
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                You are about to permanently delete the account for{' '}
                <strong>{deleteConfirmUser?.display_name || 'this user'}</strong>.
              </p>
              <p className="text-destructive font-medium">
                This action cannot be undone. All user data, orders, and activity will be removed.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirmUser && deleteAccountMutation.mutate(deleteConfirmUser.user_id)}
              className="bg-destructive hover:bg-destructive/90"
              disabled={deleteAccountMutation.isPending}
            >
              {deleteAccountMutation.isPending ? 'Deleting...' : 'Delete Account'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Grant Eclipse+ Dialog */}
      <GrantEclipsePlusDialog
        open={!!grantEclipsePlusUser}
        onOpenChange={() => setGrantEclipsePlusUser(null)}
        targetUser={grantEclipsePlusUser}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['admin-profiles'] });
        }}
      />
    </AdminLayout>
  );
}
