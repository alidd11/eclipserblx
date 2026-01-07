import { supabase } from '@/integrations/supabase/client';

interface PushPayload {
  title: string;
  body: string;
  tag?: string;
  url?: string;
  data?: Record<string, unknown>;
  requireInteraction?: boolean;
}

/**
 * Send push notifications to specific users via the edge function
 */
export async function sendPushNotification(
  userIds: string[],
  payload: PushPayload
): Promise<{ success: boolean; sent?: number; error?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke('send-push-notification', {
      body: {
        user_ids: userIds,
        payload,
      },
    });

    if (error) {
      console.error('Error sending push notification:', error);
      return { success: false, error: error.message };
    }

    return { success: true, sent: data?.sent || 0 };
  } catch (error) {
    console.error('Error sending push notification:', error);
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Send push notification for a new support ticket
 */
export async function notifyNewSupportTicket(
  staffUserIds: string[],
  ticket: { id: string; subject: string; customer_email: string; priority?: string }
): Promise<void> {
  const priorityLabel = ticket.priority 
    ? ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1)
    : 'Medium';

  await sendPushNotification(staffUserIds, {
    title: 'New Support Ticket',
    body: `[${priorityLabel}] ${ticket.subject}\nFrom: ${ticket.customer_email}`,
    tag: `support-ticket-${ticket.id}`,
    url: '/admin/support',
    requireInteraction: ticket.priority === 'urgent',
  });
}

/**
 * Send push notification for a staff mention
 */
export async function notifyStaffMention(
  mentionedUserIds: string[],
  senderName: string,
  messagePreview: string
): Promise<void> {
  await sendPushNotification(mentionedUserIds, {
    title: `${senderName} mentioned you`,
    body: messagePreview.substring(0, 100) + (messagePreview.length > 100 ? '...' : ''),
    tag: `staff-mention-${Date.now()}`,
    url: '/admin/messages',
    requireInteraction: true,
  });
}

/**
 * Send push notification for a new live chat message
 */
export async function notifyNewChatMessage(
  staffUserIds: string[],
  customerName: string,
  messagePreview: string,
  conversationId: string
): Promise<void> {
  await sendPushNotification(staffUserIds, {
    title: `New message from ${customerName}`,
    body: messagePreview.substring(0, 100) + (messagePreview.length > 100 ? '...' : ''),
    tag: `chat-${conversationId}`,
    url: '/admin/live-chat',
  });
}

/**
 * Send push notification for a new job application
 */
export async function notifyNewJobApplication(
  recruiterUserIds: string[],
  application: { id: string; applicant_name: string; position: string }
): Promise<void> {
  await sendPushNotification(recruiterUserIds, {
    title: 'New Job Application',
    body: `${application.applicant_name} applied for ${application.position}`,
    tag: `job-application-${application.id}`,
    url: '/admin/applications',
  });
}
