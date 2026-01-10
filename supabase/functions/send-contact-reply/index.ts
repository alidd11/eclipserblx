import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ReplyRequest {
  messageId: string;
  recipientEmail: string;
  recipientName: string;
  originalSubject: string;
  replyContent: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    // Verify user is staff
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    // Check if user has staff role
    const { data: roles, error: rolesError } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    if (rolesError || !roles || roles.length === 0) {
      throw new Error("Unauthorized - not a staff member");
    }

    const { messageId, recipientEmail, recipientName, originalSubject, replyContent }: ReplyRequest = await req.json();

    if (!messageId || !recipientEmail || !replyContent) {
      throw new Error("Missing required fields");
    }

    console.log(`Sending reply to ${recipientEmail} for message ${messageId}`);

    // First, check if there's an existing thread ID for this message
    const { data: existingMessage } = await supabaseClient
      .from("contact_messages")
      .select("email_thread_id")
      .eq("id", messageId)
      .single();

    // Get the last reply's message ID for threading
    const { data: lastReply } = await supabaseClient
      .from("contact_message_replies")
      .select("email_message_id")
      .eq("contact_message_id", messageId)
      .not("email_message_id", "is", null)
      .order("sent_at", { ascending: false })
      .limit(1)
      .single();

    // Build threading headers
    const headers: Record<string, string> = {};
    const threadId = existingMessage?.email_thread_id;
    const lastMessageId = lastReply?.email_message_id;

    if (lastMessageId) {
      headers["In-Reply-To"] = lastMessageId;
      headers["References"] = threadId ? `${threadId} ${lastMessageId}` : lastMessageId;
    } else if (threadId) {
      headers["In-Reply-To"] = threadId;
      headers["References"] = threadId;
    }

    // Send the email with threading headers
    const emailResponse = await resend.emails.send({
      from: "Eclipse Support <support@eclipserblx.com>",
      to: [recipientEmail],
      reply_to: "support@eclipserblx.com",
      subject: `Re: ${originalSubject}`,
      headers: Object.keys(headers).length > 0 ? headers : undefined,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a; padding: 40px 20px;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #141414; border-radius: 12px; overflow: hidden; border: 1px solid #262626;">
                  <!-- Header -->
                  <tr>
                    <td style="background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); padding: 32px; text-align: center;">
                      <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">Eclipse Support</h1>
                    </td>
                  </tr>
                  
                  <!-- Content -->
                  <tr>
                    <td style="padding: 32px;">
                      <p style="color: #a1a1aa; font-size: 14px; margin: 0 0 8px 0;">Hello ${recipientName || 'there'},</p>
                      <p style="color: #a1a1aa; font-size: 14px; margin: 0 0 24px 0;">Thank you for contacting us. Here is our response to your inquiry:</p>
                      
                      <div style="background-color: #1a1a1a; border-radius: 8px; padding: 20px; border-left: 4px solid #7c3aed;">
                        <p style="color: #e4e4e7; font-size: 15px; line-height: 1.6; margin: 0; white-space: pre-wrap;">${replyContent}</p>
                      </div>
                      
                      <p style="color: #a1a1aa; font-size: 14px; margin: 24px 0 0 0;">If you have any further questions, feel free to reply directly to this email.</p>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #0f0f0f; padding: 24px 32px; border-top: 1px solid #262626;">
                      <p style="color: #71717a; font-size: 12px; margin: 0; text-align: center;">
                        Eclipse - Premium Digital Products<br>
                        <a href="https://eclipserblx.com" style="color: #7c3aed; text-decoration: none;">eclipserblx.com</a>
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    // Update the message status and save the reply using service role
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Save the reply to the threading table with message ID for threading
    const sentMessageId = emailResponse?.data?.id ? `<${emailResponse.data.id}@resend.dev>` : null;
    
    const { error: replyError } = await supabaseAdmin
      .from("contact_message_replies")
      .insert({
        contact_message_id: messageId,
        reply_content: replyContent,
        sent_by: user.id,
        sender_type: "staff",
        email_message_id: sentMessageId,
        sent_at: new Date().toISOString(),
      });

    if (replyError) {
      console.error("Failed to save reply:", replyError);
    }

    // Update the email_thread_id if this is the first reply
    if (sentMessageId && !existingMessage?.email_thread_id) {
      await supabaseAdmin
        .from("contact_messages")
        .update({ email_thread_id: sentMessageId })
        .eq("id", messageId);
    }

    // Update message status
    const { error: updateError } = await supabaseAdmin
      .from("contact_messages")
      .update({
        status: "responded",
        responded_at: new Date().toISOString(),
        responded_by: user.id,
      })
      .eq("id", messageId);

    if (updateError) {
      console.error("Failed to update message status:", updateError);
    }

    // Send push notification to customer if they have an account
    try {
      // Find the customer's user_id by their email
      const { data: customerProfile } = await supabaseAdmin
        .from("profiles")
        .select("user_id")
        .eq("email", recipientEmail)
        .single();

      if (customerProfile?.user_id) {
        // Create in-app notification (always)
        await supabaseAdmin.from("notifications").insert({
          user_id: customerProfile.user_id,
          title: "Support Reply",
          message: `Staff has replied to your message: "${originalSubject}"`,
          type: "support",
          link: "/account",
        });

        // Check if user has opted in to support reply push notifications
        const { data: emailSub } = await supabaseAdmin
          .from("email_subscriptions")
          .select("subscribed_to_support_replies")
          .eq("user_id", customerProfile.user_id)
          .single();

        // Default to true if no subscription record exists
        const wantsPushNotifications = emailSub?.subscribed_to_support_replies !== false;

        if (wantsPushNotifications) {
          // Send push notification using the correct format
          await supabaseAdmin.functions.invoke("send-push-notification", {
            body: {
              user_ids: [customerProfile.user_id],
              payload: {
                title: "Support Reply",
                body: `Staff has replied to: "${originalSubject}"`,
                url: "/account",
                tag: `contact-reply-${messageId}`,
              },
            },
          });

          console.log("Push notification sent to customer:", recipientEmail);
        } else {
          console.log("Customer opted out of support reply push notifications:", recipientEmail);
        }
      }
    } catch (pushError) {
      console.error("Failed to send push notification:", pushError);
      // Don't fail the request if push notification fails
    }

    return new Response(JSON.stringify({ success: true, data: emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-contact-reply function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: error.message.includes("Unauthorized") ? 401 : 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);