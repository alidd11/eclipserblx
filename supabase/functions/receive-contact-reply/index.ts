import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InboundEmailEvent {
  type: string;
  created_at: string;
  data: {
    email_id: string;
    from: string;
    to: string[];
    subject: string;
    message_id: string;
  };
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  console.log("Received inbound email webhook");

  try {
    const event: InboundEmailEvent = await req.json();
    console.log("Webhook event:", JSON.stringify(event, null, 2));

    // Only process email.received events
    if (event.type !== "email.received") {
      console.log("Ignoring non-email.received event:", event.type);
      return new Response(JSON.stringify({ success: true, message: "Event ignored" }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { email_id, from, subject } = event.data;

    // Initialize Resend to fetch full email content
    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

    // Fetch the full email content using Resend API
    console.log("Fetching email content for:", email_id);
    const emailResponse = await fetch(`https://api.resend.com/emails/${email_id}`, {
      headers: {
        "Authorization": `Bearer ${Deno.env.get("RESEND_API_KEY")}`,
      },
    });

    if (!emailResponse.ok) {
      console.error("Failed to fetch email content:", emailResponse.status, await emailResponse.text());
      throw new Error("Failed to fetch email content");
    }

    const emailData = await emailResponse.json();
    console.log("Email data:", JSON.stringify(emailData, null, 2));

    // Extract the plain text or HTML content
    const emailContent = emailData.text || emailData.html || "";
    const senderEmail = extractEmail(from);

    console.log("Sender email:", senderEmail);
    console.log("Subject:", subject);

    // Initialize Supabase with service role
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Try to find the original contact message by email and subject pattern
    // Subject will typically be "Re: Original Subject"
    const originalSubject = subject.replace(/^Re:\s*/i, "").trim();
    
    console.log("Looking for contact message with email:", senderEmail, "and subject:", originalSubject);

    // First try exact subject match
    let { data: contactMessage, error: fetchError } = await supabaseAdmin
      .from("contact_messages")
      .select("*")
      .eq("email", senderEmail)
      .ilike("subject", originalSubject)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    // If not found, try by email thread ID
    if (!contactMessage && emailData.in_reply_to) {
      console.log("Trying to find by thread ID:", emailData.in_reply_to);
      const { data: threadMessage } = await supabaseAdmin
        .from("contact_messages")
        .select("*")
        .eq("email_thread_id", emailData.in_reply_to)
        .single();
      
      if (threadMessage) {
        contactMessage = threadMessage;
      }
    }

    // If still not found, try by email only (most recent message)
    if (!contactMessage) {
      console.log("Trying to find by email only");
      const { data: emailMessage } = await supabaseAdmin
        .from("contact_messages")
        .select("*")
        .eq("email", senderEmail)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      
      if (emailMessage) {
        contactMessage = emailMessage;
      }
    }

    if (!contactMessage) {
      console.error("Could not find matching contact message for:", senderEmail);
      // Still return 200 to acknowledge the webhook
      return new Response(JSON.stringify({ 
        success: true, 
        message: "No matching contact message found" 
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log("Found contact message:", contactMessage.id);

    // Clean up the email content (remove quoted replies, signatures, etc.)
    const cleanedContent = cleanEmailContent(emailContent);

    // Insert the customer reply
    const { error: insertError } = await supabaseAdmin
      .from("contact_message_replies")
      .insert({
        contact_message_id: contactMessage.id,
        reply_content: cleanedContent,
        sent_by: null, // null indicates customer reply
        sender_type: "customer",
        email_message_id: emailData.message_id,
        sent_at: new Date().toISOString(),
      });

    if (insertError) {
      console.error("Failed to insert customer reply:", insertError);
      throw insertError;
    }

    console.log("Customer reply saved successfully");

    // Update the contact message status to indicate new reply
    await supabaseAdmin
      .from("contact_messages")
      .update({ 
        status: "pending",
        updated_at: new Date().toISOString(),
      })
      .eq("id", contactMessage.id);

    // Notify staff about the customer reply
    await notifyStaffOfReply(supabaseAdmin, contactMessage);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error processing inbound email:", error);
    // Return 200 to acknowledge receipt (prevent retries for processing errors)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

// Extract email address from "Name <email@example.com>" format
function extractEmail(from: string): string {
  const match = from.match(/<([^>]+)>/);
  return match ? match[1] : from;
}

// Clean up email content to remove quoted replies and signatures
function cleanEmailContent(content: string): string {
  // Remove HTML tags if present
  let cleaned = content.replace(/<[^>]*>/g, " ").trim();
  
  // Remove common quote markers
  const lines = cleaned.split("\n");
  const cleanedLines: string[] = [];
  
  for (const line of lines) {
    // Stop at common reply indicators
    if (line.match(/^On .+ wrote:$/i)) break;
    if (line.match(/^From:.*@/i)) break;
    if (line.match(/^-{3,}.*Original Message.*-{3,}$/i)) break;
    if (line.match(/^>{2,}/)) break; // Multiple quote markers
    
    // Skip lines that are just quote markers
    if (line.trim() === ">") continue;
    
    cleanedLines.push(line);
  }
  
  return cleanedLines.join("\n").trim() || content.trim();
}

// Notify staff about new customer reply
async function notifyStaffOfReply(supabase: any, contactMessage: any) {
  try {
    // Get all staff members
    const { data: staffRoles } = await supabase
      .from("user_roles")
      .select("user_id");

    if (!staffRoles || staffRoles.length === 0) {
      console.log("No staff members found to notify");
      return;
    }

    const staffUserIds = staffRoles.map((r: any) => r.user_id);

    // Create in-app notifications for all staff
    const notifications = staffUserIds.map((userId: string) => ({
      user_id: userId,
      title: "Customer Reply Received",
      message: `${contactMessage.name} replied to: "${contactMessage.subject}"`,
      type: "contact_reply",
      link: "/admin/contact-messages",
      is_read: false,
    }));

    await supabase.from("notifications").insert(notifications);
    console.log(`Notified ${staffUserIds.length} staff members about customer reply`);

    // Send push notifications
    const { data: subscriptions } = await supabase
      .from("push_subscriptions")
      .select("*")
      .in("user_id", staffUserIds);

    if (subscriptions && subscriptions.length > 0) {
      // Use the send-push-notification function for each subscription
      for (const sub of subscriptions) {
        try {
          await supabase.functions.invoke("send-push-notification", {
            body: {
              subscription: {
                endpoint: sub.endpoint,
                keys: {
                  p256dh: sub.p256dh_key,
                  auth: sub.auth_key,
                },
              },
              payload: {
                title: "Customer Reply Received",
                body: `${contactMessage.name} replied to: "${contactMessage.subject}"`,
                url: "/admin/contact-messages",
              },
            },
          });
        } catch (pushError) {
          console.error("Failed to send push notification:", pushError);
        }
      }
    }
  } catch (error) {
    console.error("Error notifying staff:", error);
  }
}

serve(handler);
