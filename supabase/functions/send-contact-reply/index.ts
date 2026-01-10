import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

    console.log(`Saving reply for message ${messageId} (in-app only, no email)`);

    // Use service role for database operations
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Save the reply to the database (no email sent)
    const { error: replyError } = await supabaseAdmin
      .from("contact_message_replies")
      .insert({
        contact_message_id: messageId,
        reply_content: replyContent,
        sent_by: user.id,
        sender_type: "staff",
        sent_at: new Date().toISOString(),
      });

    if (replyError) {
      console.error("Failed to save reply:", replyError);
      throw new Error("Failed to save reply");
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
        // Create in-app notification
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
          // Send push notification
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

    return new Response(JSON.stringify({ success: true }), {
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
