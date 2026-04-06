import { useState, useEffect, useMemo } from 'react';
import { sanitizeSearch } from '@/lib/searchUtils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDebounce } from '@/hooks/useDebounce';
import { useAuth } from '@/hooks/useAuth';
import { useCurrentIp } from '@/hooks/useCurrentIp';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CustomRole {
  name: string;
  display_name: string;
  color: string;
  icon: string;
  hierarchy_level: number;
}

const CUSTOMERS_PER_PAGE = 10;
const IP_REGEX = /^(\d{1,3}\.){3}\d{1,3}$/;

// Roles that don't make someone "staff"
const nonStaffRoles = ['eclipse_plus_member', 'seller', 'customer'];

export function useAdminUsers() {
  const [activeView, setActiveView] = useState<'customers' | 'staff' | 'all'>('customers');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [newRole, setNewRole] = useState<string>('');
  const [ipBanDialogUser, setIpBanDialogUser] = useState<any>(null);
  const [ipAddress, setIpAddress] = useState('');
  const [banReason, setBanReason] = useState('');
  const [deleteConfirmUser, setDeleteConfirmUser] = useState<any>(null);
  const [selfBanConfirmOpen, setSelfBanConfirmOpen] = useState(false);
  const [selfBanCooldown, setSelfBanCooldown] = useState(0);
  const [viewProfileUser, setViewProfileUser] = useState<any>(null);

  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { ip: currentAdminIp } = useCurrentIp();
  const { isAdmin: isPrimaryAdmin } = useAdminAuth();

  // Cooldown timer for self-ban confirmation
  useEffect(() => {
    if (selfBanCooldown > 0) {
      const timer = setTimeout(() => setSelfBanCooldown(selfBanCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [selfBanCooldown]);

  const isSelfBan = ipAddress.trim() === currentAdminIp;

  // Fetch custom roles from database
  const { data: customRoles = [] } = useQuery<CustomRole[]>({
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
      const { data, error } = await supabase.rpc('get_user_max_hierarchy', { _user_id: user.id });
      if (error) throw error;
      return data ?? 0;
    },
    enabled: !!user?.id,
  });

  const { data: profiles, isLoading } = useQuery({
    queryKey: ['admin-profiles', debouncedSearch],
    queryFn: async () => {
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
      const { data, error } = await supabase.from('user_roles').select('user_id, role');
      if (error) throw error;
      return data;
    },
    staleTime: 2 * 60_000,
  });

  const isAdmin = userRoles?.some(r => r.user_id === user?.id && r.role === 'admin') ?? false;

  const addRoleMutation = useMutation({
    mutationFn: async ({ userId, role, targetEmail, displayName }: { userId: string; role: string; targetEmail: string; displayName?: string }) => {
      const { error } = await supabase.from('user_roles').insert({ user_id: userId, role });
      if (error) throw error;
      
      if (role === 'seller') {
        const { data: existingStore } = await supabase.from('stores').select('id').eq('owner_id', userId).maybeSingle();
        const { data: subscription } = await supabase.from('subscriptions').select('status').eq('user_id', userId).eq('status', 'active').maybeSingle();
        const hasEclipsePlus = !!subscription;
        const commissionRate = hasEclipsePlus ? 10 : 15;
        
        if (!existingStore) {
          const baseName = displayName || targetEmail.split('@')[0];
          const slug = baseName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
          const uniqueSlug = `${slug}-${Date.now().toString(36)}`;
          
          const { data: newStore, error: storeError } = await supabase.from('stores').insert({
            owner_id: userId, name: displayName || targetEmail.split('@')[0], slug: uniqueSlug,
            store_id: `STR-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
            status: 'approved', is_active: true, commission_rate: commissionRate,
          }).select('id').single();
          
          if (storeError) console.error('Failed to create store:', storeError);
          else if (newStore) {
            const { error: balanceError } = await supabase.from('seller_balances').insert({ user_id: userId, store_id: newStore.id });
            if (balanceError) console.error('Failed to create seller balance:', balanceError);
          }
        } else {
          await supabase.from('stores').update({ status: 'approved', is_active: true, commission_rate: commissionRate }).eq('id', existingStore.id);
        }
      }
      
      await supabase.from('audit_logs').insert({ user_id: user?.id, action: 'role_added', resource: 'user_roles', details: { target_user_id: userId, target_email: targetEmail, role } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-user-roles'] });
      queryClient.invalidateQueries({ queryKey: ['admin-profiles'] });
      queryClient.invalidateQueries({ queryKey: ['seller-commissions'] });
      setNewRole('');
      toast.success('Role added');
    },
    onError: (error: Error) => {
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
      await supabase.from('audit_logs').insert({ user_id: user?.id, action: 'role_removed', resource: 'user_roles', details: { target_user_id: userId, target_email: targetEmail, role } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-user-roles'] });
      queryClient.invalidateQueries({ queryKey: ['admin-profiles'] });
      toast.success('Role removed');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const ipBanMutation = useMutation({
    mutationFn: async ({ ipAddress: ip, reason, userId }: { ipAddress: string; reason?: string; userId?: string }) => {
      const { error } = await supabase.from('ip_bans').insert({ ip_address: ip, reason: reason || null, banned_by: user?.id, user_id: userId || null });
      if (error) throw error;
      await supabase.from('audit_logs').insert({ user_id: user?.id, action: 'ip_banned', resource: 'ip_bans', details: { ip_address: ip, reason, target_user_id: userId } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ip-bans'] });
      toast.success('IP address banned successfully');
      setIpBanDialogUser(null);
      setIpAddress('');
      setBanReason('');
    },
    onError: (error: Error) => {
      if (error.message.includes('duplicate')) toast.error('This IP address is already banned');
      else toast.error(error.message);
    },
  });

  const deleteAccountMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await supabase.functions.invoke('delete-user-account', { body: { userId } });
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
    onError: (error: Error) => toast.error(error.message || 'Failed to delete account'),
  });

  const getUserRoles = (userId: string) => userRoles?.filter(r => r.user_id === userId) || [];

  const availableRoles = (userId: string) => {
    const existing = getUserRoles(userId).map(r => r.role);
    return customRoles.filter(r => {
      if (existing.includes(r.name)) return false;
      if ((currentUserHierarchy ?? 0) < r.hierarchy_level) return false;
      if (r.name === 'admin' && !isPrimaryAdmin) return false;
      return true;
    });
  };

  const canRemoveRole = (role: string) => {
    if (isPrimaryAdmin) return true;
    if (role === 'admin') return false;
    const targetLevel = customRoles.find(r => r.name === role)?.hierarchy_level ?? 999;
    return (currentUserHierarchy ?? 0) >= targetLevel;
  };

  const canDeleteUser = (profile: Record<string, unknown>) => {
    if (!isPrimaryAdmin) return false;
    if (profile.user_id === user?.id) return false;
    return true;
  };

  const { customerProfiles, staffProfiles } = useMemo(() => {
    const customers: Record<string, unknown>[] = [];
    const staff: Record<string, unknown>[] = [];
    profiles?.forEach(profile => {
      const roles = getUserRoles(profile.user_id);
      const hasStaffRole = roles.some(r => !nonStaffRoles.includes(r.role));
      if (hasStaffRole) staff.push(profile);
      else customers.push(profile);
    });
    return { customerProfiles: customers, staffProfiles: staff };
  }, [profiles, userRoles]);

  const filteredProfiles = useMemo(() => {
    if (activeView === 'staff') return staffProfiles;
    if (activeView === 'all') return profiles || [];
    return customerProfiles;
  }, [activeView, customerProfiles, staffProfiles, profiles]);

  const searchFilteredProfiles = useMemo(() => {
    if (!search.trim()) return filteredProfiles;
    const query = search.toLowerCase();
    return filteredProfiles.filter(profile =>
      (profile.customer_id as string)?.toLowerCase().includes(query) ||
      (profile.display_name as string)?.toLowerCase().includes(query) ||
      (profile.username as string)?.toLowerCase().includes(query)
    );
  }, [filteredProfiles, search]);

  const totalCustomers = searchFilteredProfiles.length;
  const totalPages = Math.ceil(totalCustomers / CUSTOMERS_PER_PAGE);
  const startIndex = (currentPage - 1) * CUSTOMERS_PER_PAGE;
  const endIndex = startIndex + CUSTOMERS_PER_PAGE;
  const paginatedProfiles = searchFilteredProfiles.slice(startIndex, endIndex);

  useEffect(() => { setCurrentPage(1); }, [search]);

  const stats = useMemo(() => ({
    total: customerProfiles.length,
    staff: staffProfiles.length,
    eclipsePlus: customerProfiles.filter(p => getUserRoles(p.user_id as string).some(r => r.role === 'eclipse_plus_member')).length,
  }), [customerProfiles, staffProfiles, userRoles]);

  const handleBanClick = () => {
    if (isSelfBan) {
      setSelfBanConfirmOpen(true);
      setSelfBanCooldown(5);
    } else {
      ipBanMutation.mutate({ ipAddress: ipAddress.trim(), reason: banReason.trim() || undefined, userId: ipBanDialogUser?.user_id });
    }
  };

  const handleConfirmSelfBan = () => {
    ipBanMutation.mutate({ ipAddress: ipAddress.trim(), reason: banReason.trim() || undefined, userId: ipBanDialogUser?.user_id });
    setSelfBanConfirmOpen(false);
  };

  return {
    // State
    activeView, setActiveView,
    search, setSearch,
    currentPage, setCurrentPage,
    selectedUser, setSelectedUser,
    newRole, setNewRole,
    ipBanDialogUser, setIpBanDialogUser,
    ipAddress, setIpAddress,
    banReason, setBanReason,
    deleteConfirmUser, setDeleteConfirmUser,
    selfBanConfirmOpen, setSelfBanConfirmOpen,
    selfBanCooldown,
    viewProfileUser, setViewProfileUser,
    // Data
    profiles, isLoading, customRoles, paginatedProfiles,
    stats, totalPages, startIndex, endIndex, totalCustomers,
    isAdmin, isPrimaryAdmin, currentAdminIp, isSelfBan,
    IP_REGEX,
    // Functions
    getUserRoles, availableRoles, canRemoveRole, canDeleteUser,
    handleBanClick, handleConfirmSelfBan,
    // Mutations
    addRoleMutation, removeRoleMutation, ipBanMutation, deleteAccountMutation,
  };
}
