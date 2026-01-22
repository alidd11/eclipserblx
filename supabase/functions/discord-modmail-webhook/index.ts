import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-secret",
};

interface ModmailPayload {
  discord_user_id: string;
  discord_username: string;
  discord_avatar_url?: string;
  content: string;
  discord_message_id?: string;
  attachments?: { url: string; filename: string }[];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify webhook secret
    const webhookSecret = req.headers.get("x-webhook-secret");
    const expectedSecret = Deno.env.get("DISCORD_WEBHOOK_SECRET");
    
    if (!expectedSecret || webhookSecret !== expectedSecret) {
      console.error("Invalid or missing webhook secret");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const payload: ModmailPayload = await req.json();
    console.log("Received modmail webhook:", JSON.stringify(payload));

    // Validate required fields
    if (!payload.discord_user_id || !payload.discord_username || !payload.content) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: discord_user_id, discord_username, content" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if there's an open ticket for this user
    const { data: existingTicket, error: ticketError } = await supabase
      .from("discord_modmail_tickets")
      .select("id")
      .eq("discord_user_id", payload.discord_user_id)
      .in("status", ["open", "claimed"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (ticketError) {
      console.error("Error checking existing ticket:", ticketError);
      throw ticketError;
    }

    let ticketId: string;

    if (existingTicket) {
      // Add message to existing ticket
      ticketId = existingTicket.id;
      console.log("Adding to existing ticket:", ticketId);
    } else {
      // Create new ticket
      const { data: newTicket, error: createError } = await supabase
        .from("discord_modmail_tickets")
        .insert({
          discord_user_id: payload.discord_user_id,
          discord_username: payload.discord_username,
          discord_avatar_url: payload.discord_avatar_url,
          subject: payload.content.substring(0, 100),
        })
        .select("id")
        .single();

      if (createError) {
        console.error("Error creating ticket:", createError);
        throw createError;
      }

      ticketId = newTicket.id;
      console.log("Created new ticket:", ticketId);
    }

    // Insert the message
    const { error: messageError } = await supabase
      .from("discord_modmail_messages")
      .insert({
        ticket_id: ticketId,
        content: payload.content,
        is_staff_reply: false,
        discord_message_id: payload.discord_message_id,
        attachments: payload.attachments || [],
      });

    if (messageError) {
      console.error("Error inserting message:", messageError);
      throw messageError;
    }

    // Update ticket's updated_at
    await supabase
      .from("discord_modmail_tickets")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", ticketId);

    console.log("Successfully processed modmail message for ticket:", ticketId);

    return new Response(
      JSON.stringify({ success: true, ticket_id: ticketId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error processing modmail webhook:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
