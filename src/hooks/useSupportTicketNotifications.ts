import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNotificationSound } from './useNotificationSound';
import { usePushNotifications } from './usePushNotifications';
import { notifyNewSupportTicket } from '@/lib/pushNotifications';

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
        async (payload) => {
          const newTicket = payload.new as NewTicket;
          
          // Play notification sound
          playSound();
          
          // Send foreground push notification (when app is open)
          const priorityLabel = newTicket.priority 
            ? newTicket.priority.charAt(0).toUpperCase() + newTicket.priority.slice(1)
            : 'Medium';
          
          sendNotification('New Support Ticket', {
            body: `[${priorityLabel}] ${newTicket.subject}`,
            tag: `support-ticket-${newTicket.id}`,
          });

          // Send background push notifications to all staff with push subscriptions
          try {
            // Fetch all staff user IDs who have push subscriptions
            const { data: subscriptions } = await supabase
              .from('push_subscriptions')
              .select('user_id');
            
            if (subscriptions && subscriptions.length > 0) {
              const staffUserIds = [...new Set(subscriptions.map(s => s.user_id))];
              await notifyNewSupportTicket(staffUserIds, {
                id: newTicket.id,
                subject: newTicket.subject,
                customer_email: newTicket.customer_email,
                priority: newTicket.priority || undefined,
              });
            }
          } catch (error) {
            console.error('Failed to send background push for support ticket:', error);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [playSound, sendNotification]);
}
