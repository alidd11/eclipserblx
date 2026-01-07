import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNotificationSound } from './useNotificationSound';
import { usePushNotifications } from './usePushNotifications';

interface NewTicket {
  id: string;
  subject: string;
  customer_email: string;
  priority: string | null;
}

export function useSupportTicketNotifications() {
  const { playSound } = useNotificationSound();
  const { sendNotification, requestPermission, permission } = usePushNotifications();
  const hasRequestedPermission = useRef(false);

  // Request notification permission once
  useEffect(() => {
    if (permission === 'default' && !hasRequestedPermission.current) {
      hasRequestedPermission.current = true;
      requestPermission();
    }
  }, [permission, requestPermission]);

  // Subscribe to new support tickets
  useEffect(() => {
    const channel = supabase
      .channel('support-ticket-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'support_tickets',
        },
        (payload) => {
          const newTicket = payload.new as NewTicket;
          
          // Play notification sound
          playSound();
          
          // Send push notification
          const priorityLabel = newTicket.priority 
            ? newTicket.priority.charAt(0).toUpperCase() + newTicket.priority.slice(1)
            : 'Medium';
          
          sendNotification('New Support Ticket', {
            body: `[${priorityLabel}] ${newTicket.subject}\nFrom: ${newTicket.customer_email}`,
            tag: `support-ticket-${newTicket.id}`,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [playSound, sendNotification]);
}
