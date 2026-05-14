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
  const profileNameRef = useRef<string>('Staff Member');

  // Fetch current user profile for presence display name
  const { data: currentUserProfile } = useQuery({
    queryKey: ['current-user-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, display_name, email')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) return null;
      return data as StaffProfile | null;
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5,
  });

  // Keep a ref of the latest name so the channel effect doesn't need to
  // tear down/re-subscribe every time the profile query refetches.
  useEffect(() => {
    profileNameRef.current = currentUserProfile?.display_name || 'Staff Member';
  }, [currentUserProfile?.display_name]);

  const getCurrentUserName = useCallback(() => profileNameRef.current, []);

  // Initialize presence channel ONCE per user (no display-name dependency)
  useEffect(() => {
    if (!user?.id) return;

    const presenceChannel = supabase.channel('staff-chat-presence', {
      config: { presence: { key: user.id } },
    });

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        // Sync event — presence state updated
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.track({
            typing: false,
            user_id: user.id,
            name: profileNameRef.current,
          });
        }
      });

    presenceChannelRef.current = presenceChannel;

    return () => {
      supabase.removeChannel(presenceChannel);
      presenceChannelRef.current = null;
    };
  }, [user?.id]);

  // Keep last_seen fresh on its own cadence — independent of channel lifecycle
  useEffect(() => {
    if (!user?.id) return;
    const update = () => {
      void supabase
        .from('profiles')
        .update({ last_seen: new Date().toISOString() })
        .eq('user_id', user.id)
        .then(() => undefined, () => undefined);
    };
    update();
    const interval = setInterval(update, 60_000);
    return () => clearInterval(interval);
  }, [user?.id]);

  return {
    presenceChannelRef,
    getCurrentUserName,
  };
}
