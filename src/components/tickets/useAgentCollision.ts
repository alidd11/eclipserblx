import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface ViewingAgent {
  user_id: string;
  name: string;
}

export function useAgentCollision(ticketId: string | undefined, agentName: string | undefined) {
  const { user } = useAuth();
  const [viewingAgents, setViewingAgents] = useState<ViewingAgent[]>([]);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!ticketId || !user?.id || !agentName) return;

    const channel = supabase.channel(`ticket-presence-${ticketId}`);
    channelRef.current = channel;

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const agents: ViewingAgent[] = [];
        Object.values(state).forEach(presences => {
          presences.forEach(p => {
            const presence = p as Record<string, unknown>;
            if (presence.user_id !== user.id) {
              agents.push({ user_id: presence.user_id as string, name: presence.name as string });
            }
          });
        });
        setViewingAgents(agents);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ user_id: user.id, name: agentName });
        }
      });

    return () => {
      channelRef.current = null;
      supabase.removeChannel(channel);
    };
  }, [ticketId, user?.id, agentName]);

  return viewingAgents;
}
