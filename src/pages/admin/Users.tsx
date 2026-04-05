import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Shield, Plus, X, Ban, Trash2, AlertTriangle, ShieldAlert, Filter, Sparkles, Eye, ChevronLeft, ChevronRight, Users, IdCard } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/hooks/useAuth';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useCurrentIp } from '@/hooks/useCurrentIp';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { GrantEclipsePlusDialog } from '@/components/admin/GrantEclipsePlusDialog';
import { CustomerProfileDialog } from '@/components/admin/CustomerProfileDialog';

// Note: Roles are now text-based, fetched from custom_roles table
interface CustomRole {
  name: string;
  display_name: string;
  color: string;
  icon: string;
  hierarchy_level: number;
}

// Primary admin identified by role, not email

const CUSTOMERS_PER_PAGE = 10;

export default function AdminUsers() {
  const [activeView, setActiveView] = useState<'customers' | 'staff' | 'all'>('customers');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [newRole, setNewRole] = useState<string>('');
  const [ipBanDialogUser, setIpBanDialogUser] = useState<any>(null);
  const [ipAddress, setIpAddress] = useState('');
  const [banReason, setBanReason] = useState('');
  const IP_REGEX = /^(\d{1,3}\.){3}\d{1,3}$/;
  const [deleteConfirmUser, setDeleteConfirmUser] = useState<any>(null);
  const [selfBanConfirmOpen, setSelfBanConfirmOpen] = useState(false);
  const [grantEclipsePlusUser, setGrantEclipsePlusUser] = useState<any>(null);
  const [selfBanCooldown, setSelfBanCooldown] = useState(0);
  const [viewProfileUser, setViewProfileUser] = useState<any>(null);
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { ip: currentAdminIp } = useCurrentIp();
  const isMobile = useIsMobile();

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

  // Check if current user is admin (role-based)
  const { isAdmin: isPrimaryAdmin } = useAdminAuth();

  // Fetch custom roles from database
  const { data: customRoles = [] } = useQuery({
    queryKey: ['custom-roles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('custom_roles')
        .select('name, display_name, color, icon, hierarchy_level')
        .order('hierarchy_level', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch current user's max hierarchy level
  const { data: currentUserHierarchy } = useQuery({
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

  const { data: profiles, isLoading } = useQuery({
    queryKey: ['admin-profiles', debouncedSearch],
    queryFn: async () => {
      // Optimized: Select only needed columns
      let query = supabase.from('profiles')
        .select('user_id, display_name, username, avatar_url, email, customer_id, staff_id, discord_id, discord_username, roblox_user_id, roblox_username, created_at')
        .order('created_at', { ascending: false });
      if (debouncedSearch) {
        query = query.ilike('customer_id', `%${debouncedSearch}%`);
      }
      const { data, error } = await query;
      if (error) throw error;
      
      return data || [];
    },
    staleTime: 2 * 60_000,
  });

  const { data: userRoles } = useQuery({
    queryKey: ['admin-user-roles'],
    queryFn: async () => {
      // Optimized: Select only needed columns
      const { data, error } = await supabase.from('user_roles').select('user_id, role');
      if (error) throw error;
      return data;
    },
    staleTime: 2 * 60_000,
  });

  // Check if current user has admin role
  const isAdmin = userRoles?.some(r => r.user_id === user?.id && r.role === 'admin') ?? false;

  const addRoleMutation = useMutation({
    mutationFn: async ({ userId, role, targetEmail, displayName }: { userId: string; role: string; targetEmail: string; displayName?: string }) => {
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
        
        // Check if user has Eclipse+ membership for reduced commission rate
        const { data: subscription } = await supabase
          .from('subscriptions')
          .select('status')
          .eq('user_id', userId)
          .eq('status', 'active')
          .maybeSingle();
        
        const hasEclipsePlus = !!subscription;
        const commissionRate = hasEclipsePlus ? 10 : 15; // 10% for Eclipse+, 15% for standard
        
        if (!existingStore) {
          // Generate a unique slug from display name or email
          const baseName = displayName || targetEmail.split('@')[0];
          const slug = baseName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
          const uniqueSlug = `${slug}-${Date.now().toString(36)}`;
          
          // Create store record with appropriate commission rate
          const { data: newStore, error: storeError } = await supabase
            .from('stores')
            .insert({
              owner_id: userId,
              name: displayName || targetEmail.split('@')[0],
              slug: uniqueSlug,
              store_id: `STR-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
              status: 'approved',
              is_active: true,
              commission_rate: commissionRate,
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
          // Store exists, ensure it's active and approved, update commission if Eclipse+ member
          await supabase
            .from('stores')
            .update({ 
              status: 'approved', 
              is_active: true,
              commission_rate: commissionRate,
            })
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
      queryClient.invalidateQueries({ queryKey: ['admin-profiles'] });
      queryClient.invalidateQueries({ queryKey: ['seller-commissions'] });
      setNewRole('');
      toast.success('Role added');
    },
    onError: (error: any) => {
      // Detect hierarchy-related errors and show user-friendly message
      if (error.message?.includes('hierarchy') || error.message?.includes('privilege')) {
        toast.error("You don't have permission to assign this role");
      } else {
        toast.error(error.message);
      }
    },
  });

  const removeRoleMutation = useMutation({
    mutationFn: async ({ userId, role, targetEmail }: { userId: string; role: string; targetEmail: string }) => {
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
      queryClient.invalidateQueries({ queryKey: ['admin-profiles'] });
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

  const getRoleBadge = (role: string) => {
    const config = customRoles.find(r => r.name === role);
    return (
      <Badge key={role} variant="outline" className={`${config?.color || 'bg-gray-500'} text-white border-transparent`}>
        {config?.display_name || role}
      </Badge>
    );
  };

  const availableRoles = (userId: string) => {
    const existing = getUserRoles(userId).map(r => r.role);
    return customRoles.filter(r => {
      // Exclude roles the user already has
      if (existing.includes(r.name)) return false;
      
      // Only show roles at or below current user's hierarchy level
      if ((currentUserHierarchy ?? 0) < r.hierarchy_level) return false;
      
      // Special case: Only primary admin can assign admin role (extra protection)
      if (r.name === 'admin' && !isPrimaryAdmin) return false;
      
      return true;
    });
  };

  // Check if current user can remove a specific role
  const canRemoveRole = (role: string) => {
    // Primary admin can remove any role
    if (isPrimaryAdmin) return true;
    
    // Admin role can only be removed by primary admin
    if (role === 'admin') return false;
    
    // Get the target role's hierarchy level from custom_roles
    const targetLevel = customRoles.find(r => r.name === role)?.hierarchy_level ?? 999;
    
    // Can only remove roles at or below current user's hierarchy level
    return (currentUserHierarchy ?? 0) >= targetLevel;
  };

  const canDeleteUser = (profile: any) => {
    // Only primary admin can delete accounts
    if (!isPrimaryAdmin) return false;
    // Can't delete the primary admin
    if (profile.user_id === user?.id) return false;
    return true;
  };

  // Roles that don't make someone "staff" - includes subscription roles and customer role
  const nonStaffRoles = ['eclipse_plus_member', 'seller', 'customer'];

  // All profiles split by type
  const { customerProfiles, staffProfiles } = useMemo(() => {
    const customers: any[] = [];
    const staff: any[] = [];
    profiles?.forEach(profile => {
      const roles = getUserRoles(profile.user_id);
      const hasStaffRole = roles.some(r => !nonStaffRoles.includes(r.role));
      if (hasStaffRole) {
        staff.push(profile);
      } else {
        customers.push(profile);
      }
    });
    return { customerProfiles: customers, staffProfiles: staff };
  }, [profiles, userRoles]);

  // Active list based on view
  const filteredProfiles = useMemo(() => {
    if (activeView === 'staff') return staffProfiles;
    if (activeView === 'all') return profiles || [];
    return customerProfiles;
  }, [activeView, customerProfiles, staffProfiles, profiles]);

  // Search filtered customers
  const searchFilteredProfiles = useMemo(() => {
    if (!search.trim()) return filteredProfiles;
    const query = search.toLowerCase();
    return filteredProfiles.filter(profile => 
      profile.customer_id?.toLowerCase().includes(query) ||
      profile.display_name?.toLowerCase().includes(query) ||
      profile.username?.toLowerCase().includes(query)
    );
  }, [filteredProfiles, search]);

  // Pagination calculations
  const totalCustomers = searchFilteredProfiles.length;
  const totalPages = Math.ceil(totalCustomers / CUSTOMERS_PER_PAGE);
  const startIndex = (currentPage - 1) * CUSTOMERS_PER_PAGE;
  const endIndex = startIndex + CUSTOMERS_PER_PAGE;
  const paginatedProfiles = searchFilteredProfiles.slice(startIndex, endIndex);

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  // Stats
  const stats = useMemo(() => ({
    total: customerProfiles.length,
    staff: staffProfiles.length,
    eclipsePlus: customerProfiles.filter(p =>
      getUserRoles(p.user_id).some(r => r.role === 'eclipse_plus_member')
    ).length,
  }), [customerProfiles, staffProfiles, userRoles]);

  return (
    <AdminLayout requiredPermissions={['view_users']}>
      <div className="space-y-6 min-h-0">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold">User Management</h1>
            <p className="text-muted-foreground">Manage customers, staff, and roles</p>
          </div>
        </div>

        {/* View Toggle - Mobile: Select, Desktop: Tabs */}
        <div className="sm:hidden">
          <Select value={activeView} onValueChange={v => { setActiveView(v as any); setCurrentPage(1); }}>
            <SelectTrigger className="bg-card">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="customers">Customers ({stats.total})</SelectItem>
              <SelectItem value="staff">Staff ({stats.staff})</SelectItem>
              <SelectItem value="all">All Users ({(profiles || []).length})</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="hidden sm:flex gap-1 border-b border-border">
          {[
            { value: 'customers', label: 'Customers', count: stats.total, icon: Users },
            { value: 'staff', label: 'Staff', count: stats.staff, icon: IdCard },
            { value: 'all', label: 'All Users', count: (profiles || []).length, icon: Users },
          ].map(tab => (
            <button
              key={tab.value}
              onClick={() => { setActiveView(tab.value as any); setCurrentPage(1); }}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors touch-manipulation ${
                activeView === tab.value
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
              <Badge variant="secondary" className="text-xs h-5 px-1.5 min-w-[20px] justify-center">
                {tab.count}
              </Badge>
            </button>
          ))}
        </div>

        {/* Inline Stats */}
        <div className="flex items-center gap-4 text-sm flex-wrap">
          <span className="text-muted-foreground">
            <span className="font-semibold text-foreground">{stats.total}</span> customers
          </span>
          <span className="text-muted-foreground">
            <span className="font-semibold text-foreground">{stats.staff}</span> staff
          </span>
          <span className="text-muted-foreground">
            <span className="font-semibold text-foreground">{stats.eclipsePlus}</span> Eclipse+
          </span>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by customer ID, name or username..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-card"
          />
        </div>

        {/* Desktop Table View */}
        <div className="border border-border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center justify-between">
            <h3 className="font-semibold text-sm">
              {activeView === 'staff' ? 'Staff Members' : activeView === 'all' ? 'All Users' : 'Customer List'}
            </h3>
            <p className="text-xs text-muted-foreground">
              Showing {startIndex + 1}-{Math.min(endIndex, totalCustomers)} of {totalCustomers}
            </p>
          </div>
          <div>
            <div className="hidden md:block">
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
                    <>
                      {Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i}>
                          {Array.from({ length: 3 }).map((_, j) => (
                            <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </>
                  ) : paginatedProfiles.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                        No customers found
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedProfiles.map((profile) => {
                      const roles = getUserRoles(profile.user_id);
                      return (
                        <TableRow key={profile.user_id}>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-medium">{profile.display_name || 'No name'}</p>
                                {roles.length === 0 ? (
                                  <Badge variant="secondary" className="text-xs">Customer</Badge>
                                ) : (
                                  roles.map(r => getRoleBadge(r.role))
                                )}
                              </div>
                              {profile.username && (
                                <p className="text-xs text-muted-foreground">@{profile.username}</p>
                              )}
                              {profile.customer_id && (
                                <p className="text-xs font-mono text-primary">Customer ID: {profile.customer_id}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{new Date(profile.created_at).toLocaleDateString()}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                              {isPrimaryAdmin && (
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={() => setViewProfileUser(profile)}
                                  className="text-muted-foreground hover:text-primary"
                                  title="View Profile"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              )}
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
            <div className="md:hidden space-y-3 p-4">
              {isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="p-4 rounded-lg bg-muted/50 border border-border space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-48" />
                      <Skeleton className="h-5 w-20" />
                    </div>
                  ))}
                </div>
              ) : paginatedProfiles.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No customers found
                </div>
              ) : (
                paginatedProfiles.map((profile) => {
                  const roles = getUserRoles(profile.user_id);
                  return (
                    <div 
                      key={profile.user_id} 
                      className={`rounded-lg border border-border bg-card p-4 ${isPrimaryAdmin ? 'cursor-pointer active:bg-muted/50' : ''}`}
                      onClick={() => isPrimaryAdmin && setViewProfileUser(profile)}
                    >
                      {/* Header: Name and Badge */}
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-base truncate pr-2">
                          {profile.display_name || 'Unnamed'}
                        </h3>
                        {roles.length === 0 ? (
                          <Badge variant="secondary" className="text-xs shrink-0">Customer</Badge>
                        ) : (
                          <div className="flex gap-1.5 shrink-0">
                            {roles.map(r => getRoleBadge(r.role))}
                          </div>
                        )}
                      </div>

                      {/* Info Section */}
                      <div className="space-y-1.5 mb-4">
                        {profile.customer_id && (
                          <p className="text-xs font-mono text-primary">
                            ID: {profile.customer_id}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          Joined {new Date(profile.created_at).toLocaleDateString()}
                        </p>
                      </div>

                      {/* Actions Row */}
                      <div 
                        className="flex items-center gap-2 pt-3 border-t border-border" 
                        onClick={(e) => e.stopPropagation()}
                      >
                        {isPrimaryAdmin && (
                          <Button 
                            variant="outline" 
                            size="icon"
                            className="h-9 w-9"
                            onClick={() => setViewProfileUser(profile)}
                            title="View Profile"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        )}
                        <Button 
                          variant="outline" 
                          size="icon"
                          className="h-9 w-9"
                          onClick={() => setSelectedUser(profile)}
                          title="Manage Roles"
                        >
                          <Shield className="h-4 w-4" />
                        </Button>
                        {isAdmin && (
                          <>
                            <Button 
                              variant="outline" 
                              size="icon"
                              className="h-9 w-9 text-amber-500 border-amber-500/50 hover:bg-amber-500/10"
                              onClick={() => setGrantEclipsePlusUser(profile)}
                              title="Grant Eclipse+"
                            >
                              <Sparkles className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="outline" 
                              size="icon"
                              className="h-9 w-9 text-orange-500 border-orange-500/50 hover:bg-orange-500/10"
                              onClick={() => setIpBanDialogUser(profile)}
                              title="IP Ban"
                            >
                              <Ban className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        {canDeleteUser(profile) && (
                          <Button 
                            variant="outline" 
                            size="icon"
                            className="h-9 w-9 text-destructive border-destructive/50 hover:bg-destructive/10"
                            onClick={() => setDeleteConfirmUser(profile)}
                            title="Delete Account"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t p-4">
                <p className="text-sm text-muted-foreground hidden sm:block">
                  Page {currentPage} of {totalPages}
                </p>
                <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="gap-1"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum: number;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      return (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? "default" : "outline"}
                          size="sm"
                          className="w-8 h-8 p-0"
                          onClick={() => setCurrentPage(pageNum)}
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="gap-1"
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
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
                    getUserRoles(selectedUser.user_id).map((r) => {
                      const roleInfo = customRoles.find(role => role.name === r.role);
                      return (
                        <Badge key={`${r.user_id}-${r.role}`} variant="outline" className={`gap-1 py-1.5 px-2 ${roleInfo?.color || ''} text-white border-transparent`}>
                          {roleInfo?.display_name || r.role}
                          {/* Only show remove button if user has permission based on hierarchy */}
                          {canRemoveRole(r.role) && (
                            <button
                              onClick={() => removeRoleMutation.mutate({ userId: selectedUser.user_id, role: r.role, targetEmail: selectedUser.email })}
                              className="ml-1 hover:text-destructive touch-manipulation"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </Badge>
                      );
                    })
                  )}
                </div>
              </div>

              {availableRoles(selectedUser.user_id).length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">Add Role</p>
                  <div className="flex gap-2">
                    <Select value={newRole} onValueChange={(v) => setNewRole(v)}>
                      <SelectTrigger className="flex-1 h-10">
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableRoles(selectedUser.user_id).map((role) => (
                          <SelectItem key={role.name} value={role.name} className="py-2.5">
                            {role.display_name}
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
                  maxLength={45}
                />
                {ipAddress.trim() && !IP_REGEX.test(ipAddress.trim()) && (
                  <p className="text-xs text-destructive">Invalid IP address format</p>
                )}
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
                  onChange={(e) => {
                    if (e.target.value.length <= 500) setBanReason(e.target.value);
                  }}
                  rows={2}
                  maxLength={500}
                />
                <p className="text-xs text-muted-foreground text-right">{banReason.length}/500</p>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => { setIpBanDialogUser(null); setIpAddress(''); setBanReason(''); }}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  disabled={!ipAddress.trim() || !IP_REGEX.test(ipAddress.trim()) || ipBanMutation.isPending}
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

      {/* Customer Profile Dialog - Primary Admin Only */}
      <CustomerProfileDialog
        open={!!viewProfileUser}
        onOpenChange={() => setViewProfileUser(null)}
        profile={viewProfileUser}
      />
    </AdminLayout>
  );
}
