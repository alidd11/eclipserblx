import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ReplyPayload {
  ticket_id: string;
  content: string;
  staff_name?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the user is authenticated and is staff
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user is staff
    const { data: isStaff } = await supabase.rpc("is_staff", { _user_id: user.id });
    if (!isStaff) {
      return new Response(
        JSON.stringify({ error: "Unauthorized - staff only" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const payload: ReplyPayload = await req.json();
    console.log("Processing modmail reply:", JSON.stringify(payload));

    if (!payload.ticket_id || !payload.content) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: ticket_id, content" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the ticket details
    const { data: ticket, error: ticketError } = await supabase
      .from("discord_modmail_tickets")
      .select("*")
      .eq("id", payload.ticket_id)
      .single();

    if (ticketError || !ticket) {
      return new Response(
        JSON.stringify({ error: "Ticket not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get staff profile for name
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name, username")
      .eq("user_id", user.id)
      .single();

    const staffName = payload.staff_name || profile?.display_name || profile?.username || "Staff";

    // Send DM via Discord API
    const botToken = Deno.env.get("DISCORD_CUSTOMER_BOT_TOKEN");
    if (!botToken) {
      console.error("DISCORD_CUSTOMER_BOT_TOKEN not configured");
      return new Response(
        JSON.stringify({ error: "Discord bot token not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create DM channel with the user
    const dmChannelResponse = await fetch(`https://discord.com/api/v10/users/@me/channels`, {
      method: "POST",
      headers: {
        Authorization: `Bot ${botToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ recipient_id: ticket.discord_user_id }),
    });

    if (!dmChannelResponse.ok) {
      const errorText = await dmChannelResponse.text();
      console.error("Failed to create DM channel:", dmChannelResponse.status, errorText);
      
      // Still save the message locally even if Discord fails
      await supabase.from("discord_modmail_messages").insert({
        ticket_id: payload.ticket_id,
        content: payload.content,
        is_staff_reply: true,
        staff_user_id: user.id,
      });

      // IMPORTANT: Return 200 so the client can show a friendly warning instead of a hard failure.
      return new Response(
        JSON.stringify({
          success: false,
          saved_locally: true,
          dm_sent: false,
          error: "Failed to send to Discord (user may have DMs disabled or blocked the bot)",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const dmChannel = await dmChannelResponse.json();

    // Send the embed message
    // Discord uses embed title + description for push notification previews
    // Keep description concise for clean mobile notifications
    const ticketRef = ticket.subject 
      ? ticket.subject.substring(0, 30) + (ticket.subject.length > 30 ? "..." : "")
      : `#${ticket.id.substring(0, 8)}`;
    
    const embed = {
      color: 0x7C3AED, // Purple to match Eclipse theme
      author: {
        name: `${staffName} replied`,
        icon_url: "https://eclipserblx.com/favicon.ico",
      },
      title: `📩 ${ticketRef}`,
      description: payload.content,
      footer: {
        text: "Reply using /reply in your DMs to continue",
        icon_url: "https://eclipserblx.com/favicon.ico",
      },
      timestamp: new Date().toISOString(),
    };

    const messageResponse = await fetch(`https://discord.com/api/v10/channels/${dmChannel.id}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bot ${botToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ embeds: [embed] }),
    });

    if (!messageResponse.ok) {
      const errorText = await messageResponse.text();
      console.error("Failed to send message:", messageResponse.status, errorText);
      
      // Save locally anyway
      await supabase.from("discord_modmail_messages").insert({
        ticket_id: payload.ticket_id,
        content: payload.content,
        is_staff_reply: true,
        staff_user_id: user.id,
      });

      // IMPORTANT: Return 200 so the client can show a warning (and not surface a generic non-2xx error)
      return new Response(
        JSON.stringify({
          success: false,
          saved_locally: true,
          dm_sent: false,
          error: "Failed to deliver DM to the customer (message was saved)",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const sentMessage = await messageResponse.json();

    // Save the message to database
    const { error: insertError } = await supabase.from("discord_modmail_messages").insert({
      ticket_id: payload.ticket_id,
      content: payload.content,
      is_staff_reply: true,
      staff_user_id: user.id,
      discord_message_id: sentMessage.id,
    });

    if (insertError) {
      console.error("Error saving message:", insertError);
    }

    // Update ticket status and timestamp
    await supabase
      .from("discord_modmail_tickets")
      .update({ 
        updated_at: new Date().toISOString(),
        status: ticket.status === "open" ? "claimed" : ticket.status,
        claimed_by: ticket.claimed_by || user.id,
        claimed_at: ticket.claimed_at || new Date().toISOString(),
      })
      .eq("id", payload.ticket_id);

    console.log("Successfully sent modmail reply for ticket:", payload.ticket_id);

    return new Response(
      JSON.stringify({ success: true, message_id: sentMessage.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error processing modmail reply:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
