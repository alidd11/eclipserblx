import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNotificationSound } from './useNotificationSound';
import { usePushNotifications } from './usePushNotifications';

interface TicketUpdate {
  id: string;
  ticket_number: string;
  subject: string;
  priority: string;
  status: string;
  escalated_at: string | null;
  user_id: string;
}

export function useSellerTicketNotifications() {
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

  // Subscribe to new seller support tickets
  useEffect(() => {
    const channel = supabase
      .channel('seller-ticket-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'seller_support_tickets',
        },
        async (payload) => {
          const newTicket = payload.new as TicketUpdate;
          
          // Play notification sound
          playSound();
          
          // Send foreground push notification
          const priorityLabel = newTicket.priority 
            ? newTicket.priority.charAt(0).toUpperCase() + newTicket.priority.slice(1)
            : 'Normal';
          
          sendNotification('New Seller Ticket', {
            body: `[${priorityLabel}] ${newTicket.subject}`,
            tag: `seller-ticket-${newTicket.id}`,
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'seller_support_tickets',
          filter: 'escalated_at=neq.null',
        },
        async (payload) => {
          const ticket = payload.new as TicketUpdate;
          const oldTicket = payload.old as TicketUpdate;
          
          // Only notify if this is a new escalation
          if (ticket.escalated_at && !oldTicket.escalated_at) {
            playSound();
            
            sendNotification('🔥 Ticket Escalated', {
              body: `${ticket.ticket_number}: ${ticket.subject} needs attention!`,
              tag: `seller-ticket-escalated-${ticket.id}`,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [playSound, sendNotification]);
}
