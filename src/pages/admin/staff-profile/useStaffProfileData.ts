import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface StaffNote {
  id: string;
  staff_user_id: string;
  author_id: string;
  content: string;
  note_type: string;
  created_at: string;
  updated_at: string;
  author_name?: string;
}

export function useStaffProfileData(userId: string | undefined) {
  const { hasRole, loading: authLoading } = useAdminAuth();
  const { user } = useAuth();
  const isAdmin = hasRole('admin');
  const queryClient = useQueryClient();

  const [newRole, setNewRole] = useState('');
  const [roleToRemove, setRoleToRemove] = useState<{ role: string; displayName: string } | null>(null);

  // Fetch staff profile details
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['staff-profile', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!userId && isAdmin,
  });

  // Fetch staff roles
  const { data: roles = [] } = useQuery({
    queryKey: ['staff-roles', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as { role: string; created_at: string }[];
    },
    enabled: !!userId && isAdmin,
  });

  // Fetch staff ID assignment log
  const { data: staffIdLog } = useQuery({
    queryKey: ['staff-id-log', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('staff_id_logs')
        .select('*')
        .eq('user_id', userId)
        .order('assigned_at', { ascending: true })
        .limit(1)
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!userId && isAdmin,
  });

  // Fetch job application (hire date)
  const { data: application } = useQuery({
    queryKey: ['staff-application', profile?.email],
    queryFn: async () => {
      if (!profile?.email) return null;
      const { data, error } = await supabase
        .from('job_applications')
        .select('*')
        .eq('applicant_email', profile.email)
        .eq('status', 'accepted')
        .order('reviewed_at', { ascending: false })
        .limit(1)
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!profile?.email && isAdmin,
  });

  // Fetch staff activity count
  const { data: activityCount = 0 } = useQuery({
    queryKey: ['staff-activity-count', userId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('staff_activity')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);
      if (error) throw error;
      return count || 0;
    },
    enabled: !!userId && isAdmin,
  });

  // Fetch staff notes
  const { data: staffNotes = [], isLoading: notesLoading } = useQuery<StaffNote[]>({
    queryKey: ['staff-notes', userId],
    queryFn: async (): Promise<StaffNote[]> => {
      const { data, error } = await supabase
        .from('staff_notes')
        .select('*')
        .eq('staff_user_id', userId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      if (!data || data.length === 0) return [];

      const authorIds = [...new Set(data.map(n => n.author_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name')
        .in('user_id', authorIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p.display_name]));

      return data.map(note => ({
        id: note.id,
        staff_user_id: note.staff_user_id,
        author_id: note.author_id,
        content: note.content,
        note_type: note.note_type ?? 'general',
        created_at: note.created_at,
        updated_at: note.updated_at,
        author_name: profileMap.get(note.author_id) || 'Unknown',
      }));
    },
    enabled: !!userId && isAdmin,
  });

  // Fetch current user's scoped role management permissions
  const { data: userPermissions = [] } = useQuery({
    queryKey: ['user-manage-role-perms', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);
      if (error) throw error;
      const userRoles = data.map(r => r.role);
      if (!userRoles.length) return [];

      const { data: perms, error: permErr } = await supabase
        .from('role_permissions')
        .select('permission_id, permissions!inner(name)')
        .in('role', userRoles);
      if (permErr) throw permErr;
      return (perms || []).map((rp) => rp.permissions?.name).filter(Boolean);
    },
    enabled: !!user?.id,
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

  // Fetch custom roles from database
  const { data: customRoles = [] } = useQuery({
    queryKey: ['custom-roles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('custom_roles')
        .select('*')
        .order('hierarchy_level', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const isPrimaryAdmin = isAdmin;

  const availableRoles = () => {
    const existing = roles.map(r => r.role as string);
    return customRoles.filter(r => {
      if (existing.includes(r.name)) return false;
      if ((currentUserHierarchy ?? 0) < r.hierarchy_level) return false;
      if (isPrimaryAdmin) return true;
      return userPermissions.includes(`manage_role:${r.name}`);
    });
  };

  const getRoleInfo = (roleName: string) => {
    const customRole = customRoles.find(r => r.name === roleName);
    if (customRole) {
      return { displayName: customRole.display_name, color: customRole.color, icon: customRole.icon };
    }
    return {
      displayName: roleName.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      color: 'bg-gray-500',
      icon: 'shield',
    };
  };

  const canRemoveRole = (role: string) => {
    if (isPrimaryAdmin) return true;
    const targetLevel = customRoles.find(r => r.name === role)?.hierarchy_level ?? 999;
    if ((currentUserHierarchy ?? 0) < targetLevel) return false;
    return userPermissions.includes(`manage_role:${role}`);
  };

  // Mutations
  const addRoleMutation = useMutation({
    mutationFn: async ({ role, targetUserId }: { role: string; targetUserId: string }) => {
      const { error } = await supabase.from('user_roles').insert({ user_id: targetUserId, role });
      if (error) throw error;
      await supabase.from('audit_logs').insert({
        user_id: user?.id,
        action: 'role_added',
        resource: 'user_roles',
        details: { target_user_id: targetUserId, target_email: profile?.email, role },
      });
      return { targetUserId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['staff-roles', data.targetUserId] });
      queryClient.invalidateQueries({ queryKey: ['staff-directory'] });
      queryClient.invalidateQueries({ queryKey: ['admin-user-roles'] });
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
    mutationFn: async ({ role, targetUserId }: { role: string; targetUserId: string }) => {
      const { error } = await supabase.from('user_roles').delete().eq('user_id', targetUserId).eq('role', role);
      if (error) throw error;
      await supabase.from('audit_logs').insert({
        user_id: user?.id,
        action: 'role_removed',
        resource: 'user_roles',
        details: { target_user_id: targetUserId, target_email: profile?.email, role },
      });
      return { targetUserId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['staff-roles', data.targetUserId] });
      queryClient.invalidateQueries({ queryKey: ['staff-directory'] });
      queryClient.invalidateQueries({ queryKey: ['admin-user-roles'] });
      setRoleToRemove(null);
      toast.success('Role removed');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const addNoteMutation = useMutation({
    mutationFn: async ({ content, noteType }: { content: string; noteType: string }) => {
      const { error } = await supabase
        .from('staff_notes')
        .insert({ staff_user_id: userId, author_id: user?.id, content, note_type: noteType });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-notes', userId] });
      toast.success('Note added successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to add note: ' + error.message);
    },
  });

  const deleteNoteMutation = useMutation({
    mutationFn: async (noteId: string) => {
      const { error } = await supabase.from('staff_notes').delete().eq('id', noteId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-notes', userId] });
      toast.success('Note deleted');
    },
    onError: (error: Error) => {
      toast.error('Failed to delete note: ' + error.message);
    },
  });

  const hireDate = application?.reviewed_at || staffIdLog?.assigned_at || roles[0]?.created_at;

  return {
    user,
    profile,
    profileLoading,
    authLoading,
    isAdmin,
    isPrimaryAdmin,
    roles,
    staffNotes,
    notesLoading,
    activityCount,
    application,
    hireDate,
    customRoles,
    newRole,
    setNewRole,
    roleToRemove,
    setRoleToRemove,
    availableRoles,
    getRoleInfo,
    canRemoveRole,
    addRoleMutation,
    removeRoleMutation,
    addNoteMutation,
    deleteNoteMutation,
  };
}
