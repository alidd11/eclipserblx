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
    body: `[${priorityLabel}] ${ticket.subject}`,
    tag: `support-ticket-${ticket.id}-${Date.now()}`,
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
 * Send push notification for a new live chat conversation
 */
export async function notifyNewLiveChat(
  conversation: { id: string; customer_name: string; issue_category?: string }
): Promise<{ success: boolean; sent?: number; error?: string }> {
  try {
    // Get all support agents with push subscriptions
    const { data: supportAgents } = await supabase
      .from('user_roles')
      .select('user_id')
      .in('role', ['admin', 'support_agent']);

    if (!supportAgents || supportAgents.length === 0) {
      return { success: true, sent: 0 };
    }

    const staffUserIds = supportAgents.map(a => a.user_id);
    const categoryLabel = conversation.issue_category 
      ? conversation.issue_category.charAt(0).toUpperCase() + conversation.issue_category.slice(1)
      : 'General';

    return await sendPushNotification(staffUserIds, {
      title: 'New Live Chat',
      body: `${conversation.customer_name} needs help with: ${categoryLabel}`,
      tag: `live-chat-${conversation.id}-${Date.now()}`,
      url: '/admin/live-chat',
      requireInteraction: true,
    });
  } catch (error) {
    console.error('Error notifying new live chat:', error);
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Send push notification for a new live chat message from customer
 */
export async function notifyNewChatMessage(
  conversationId: string,
  customerName: string,
  messagePreview: string,
  messageId?: string
): Promise<{ success: boolean; sent?: number; error?: string }> {
  try {
    // Get all support agents with push subscriptions
    const { data: supportAgents } = await supabase
      .from('user_roles')
      .select('user_id')
      .in('role', ['admin', 'support_agent']);

    if (!supportAgents || supportAgents.length === 0) {
      return { success: true, sent: 0 };
    }

    const staffUserIds = supportAgents.map((a) => a.user_id);

    // Important: use a unique tag per message so iOS/Android don't collapse notifications
    const tag = messageId
      ? `chat-${conversationId}-${messageId}`
      : `chat-${conversationId}-${Date.now()}`;

    return await sendPushNotification(staffUserIds, {
      title: `Message from ${customerName}`,
      body: messagePreview.substring(0, 100) + (messagePreview.length > 100 ? '...' : ''),
      tag,
      url: '/admin/live-chat',
    });
  } catch (error) {
    console.error('Error notifying new chat message:', error);
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Send push notification when a customer replies to a closed/resolved ticket
 */
export async function notifyTicketReply(
  ticket: { id: string; subject: string; customer_email?: string }
): Promise<{ success: boolean; sent?: number; error?: string }> {
  try {
    // Get all support agents with push subscriptions
    const { data: supportAgents } = await supabase
      .from('user_roles')
      .select('user_id')
      .in('role', ['admin', 'support_agent']);

    if (!supportAgents || supportAgents.length === 0) {
      return { success: true, sent: 0 };
    }

    const staffUserIds = supportAgents.map(a => a.user_id);

    return await sendPushNotification(staffUserIds, {
      title: 'Ticket Re-opened',
      body: `Customer replied to: ${ticket.subject}`,
      tag: `ticket-reply-${ticket.id}-${Date.now()}`,
      url: '/admin/support',
      requireInteraction: true,
    });
  } catch (error) {
    console.error('Error notifying ticket reply:', error);
    return { success: false, error: (error as Error).message };
  }
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
    tag: `job-application-${application.id}-${Date.now()}`,
    url: '/admin/applications',
  });
}
