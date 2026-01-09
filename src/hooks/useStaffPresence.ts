import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';

interface StaffProfile {
  user_id: string;
  display_name: string | null;
  email: string;
}

/**
 * Hook to track staff presence across all admin pages.
 * Should be used in AdminLayout to persist presence state.
 */
export function useStaffPresence() {
  const { user } = useAuth();
  const presenceChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Fetch current user profile for presence display name
  const { data: currentUserProfile } = useQuery({
    queryKey: ['current-user-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, display_name, email')
        .eq('user_id', user.id)
        .single();
      
      if (error) return null;
      return data as StaffProfile;
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5,
  });

  const getCurrentUserName = useCallback(() => {
    if (currentUserProfile?.display_name) return currentUserProfile.display_name;
    if (user?.email) return user.email.split('@')[0];
    return 'Staff Member';
  }, [currentUserProfile, user?.email]);

  // Initialize presence channel when user is logged in
  useEffect(() => {
    if (!user?.id) return;

    // Create the presence channel with the same key used in StaffMessages
    const presenceChannel = supabase.channel('staff-chat-presence', {
      config: { presence: { key: user.id } },
    });

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        // Sync event received - presence state updated
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Track user as online (not typing by default)
          await presenceChannel.track({
            typing: false,
            user_id: user.id,
            name: getCurrentUserName(),
          });
        }
      });

    presenceChannelRef.current = presenceChannel;

    // Update last_seen in database periodically
    const updateLastSeen = async () => {
      await supabase
        .from('profiles')
        .update({ last_seen: new Date().toISOString() })
        .eq('user_id', user.id);
    };
    
    updateLastSeen();
    const interval = setInterval(updateLastSeen, 60000); // Update every minute

    return () => {
      clearInterval(interval);
      supabase.removeChannel(presenceChannel);
      presenceChannelRef.current = null;
    };
  }, [user?.id, getCurrentUserName]);

  return {
    presenceChannelRef,
    getCurrentUserName,
  };
}
