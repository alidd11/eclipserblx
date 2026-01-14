import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[REVIEW-REMINDERS] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Starting review reminder processing");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date();

    // Get all pending review reminders (not yet submitted reviews)
    const { data: reminders, error: fetchError } = await supabase
      .from("review_reminders")
      .select("*")
      .eq("review_submitted", false);

    if (fetchError) {
      throw new Error(`Failed to fetch reminders: ${fetchError.message}`);
    }

    logStep("Found pending reminders", { count: reminders?.length || 0 });

    let notificationsSent = 0;

    for (const reminder of reminders || []) {
      const createdAt = new Date(reminder.created_at);
      const hoursSincePurchase = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);

      // Check if user has already submitted a review for this product
      const { data: existingReview } = await supabase
        .from("reviews")
        .select("id")
        .eq("user_id", reminder.user_id)
        .eq("product_id", reminder.product_id)
        .limit(1)
        .single();

      if (existingReview) {
        // Mark reminder as submitted
        await supabase
          .from("review_reminders")
          .update({ review_submitted: true, updated_at: now.toISOString() })
          .eq("id", reminder.id);
        logStep("User already submitted review, marking complete", { reminderId: reminder.id });
        continue;
      }

      let shouldSendReminder = false;
      let updateField: string | null = null;
      let reminderType = "";

      // 1 hour reminder (between 1-2 hours)
      if (!reminder.reminder_1h_sent && hoursSincePurchase >= 1 && hoursSincePurchase < 24) {
        shouldSendReminder = true;
        updateField = "reminder_1h_sent";
        reminderType = "1h";
      }
      // 24 hour reminder (between 24-72 hours)
      else if (!reminder.reminder_24h_sent && hoursSincePurchase >= 24 && hoursSincePurchase < 72) {
        shouldSendReminder = true;
        updateField = "reminder_24h_sent";
        reminderType = "24h";
      }
      // 72 hour reminder (after 72 hours)
      else if (!reminder.reminder_72h_sent && hoursSincePurchase >= 72) {
        shouldSendReminder = true;
        updateField = "reminder_72h_sent";
        reminderType = "72h";
      }

      if (shouldSendReminder && updateField) {
        logStep("Sending reminder", { 
          reminderId: reminder.id, 
          type: reminderType, 
          productName: reminder.product_name 
        });

        // Create in-app notification
        await supabase.from("notifications").insert({
          user_id: reminder.user_id,
          type: "review_reminder",
          title: "Share Your Experience! ⭐",
          message: `How are you enjoying ${reminder.product_name}? We'd love to hear your thoughts! Leave a review and help others decide.`,
          link: reminder.product_id ? `/products/${reminder.product_id}#reviews` : "/products",
        });

        // Send push notification
        try {
          const pushResponse = await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify({
              userId: reminder.user_id,
              title: "Share Your Experience! ⭐",
              body: `How are you enjoying ${reminder.product_name}? Leave a review!`,
              url: reminder.product_id ? `/products/${reminder.product_id}#reviews` : "/products",
              tag: `review-reminder-${reminder.id}-${reminderType}`,
            }),
          });

          if (!pushResponse.ok) {
            logStep("Push notification failed", { status: pushResponse.status });
          }
        } catch (pushError) {
          logStep("Push notification error", { error: String(pushError) });
        }

        // Update reminder to mark this notification as sent
        await supabase
          .from("review_reminders")
          .update({ [updateField]: true, updated_at: now.toISOString() })
          .eq("id", reminder.id);

        notificationsSent++;
      }
    }

    logStep("Processing complete", { notificationsSent });

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed: reminders?.length || 0,
        notificationsSent 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    logStep("Error processing review reminders", { error: String(error) });
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
