import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

interface ChatMessage {
  id: string;
  message: string;
  sender_type: string;
  created_at: string;
}

// Keywords that trigger escalation to human staff
const ESCALATION_KEYWORDS = [
  "speak to human",
  "talk to human",
  "real person",
  "human agent",
  "human support",
  "escalate",
  "manager",
  "supervisor",
  "refund",
  "complaint",
  "lawsuit",
  "legal",
  "lawyer",
  "angry",
  "furious",
  "unacceptable",
  "transfer me",
];

// Keywords/phrases that indicate customer wants to close chat
const CLOSING_PHRASES = [
  "that's all",
  "thats all",
  "that's everything",
  "thats everything",
  "thanks that's all",
  "thank you that's all",
  "nothing else",
  "no more questions",
  "i'm done",
  "im done",
  "i am done",
  "all good",
  "all done",
  "bye",
  "goodbye",
  "close chat",
  "end chat",
  "close this",
  "that will be all",
  "that's it",
  "thats it",
  "i think that's everything",
  "i think thats everything",
  "okay thanks",
  "ok thanks",
  "perfect thanks",
  "great thanks",
  "awesome thanks",
  "have a good day",
  "have a nice day",
  "cheers",
  "take care",
];

function shouldEscalate(message: string): boolean {
  const lowerMessage = message.toLowerCase();
  return ESCALATION_KEYWORDS.some((keyword) => lowerMessage.includes(keyword));
}

function shouldCloseChat(message: string): boolean {
  const lowerMessage = message.toLowerCase().trim();
  return CLOSING_PHRASES.some((phrase) => lowerMessage.includes(phrase));
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { conversationId, userMessage, issueCategory } = await req.json();

    if (!conversationId || !userMessage) {
      return new Response(
        JSON.stringify({ error: "Missing conversationId or userMessage" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[AI-CHAT] Processing message for conversation:", conversationId);

    // Check if user wants to escalate
    if (shouldEscalate(userMessage)) {
      console.log("[AI-CHAT] Escalation triggered by user message");
      
      // Mark conversation for human review
      await supabase
        .from("chat_conversations")
        .update({ 
          status: "active",
          assigned_to: null // Clear AI assignment so staff can pick up
        })
        .eq("id", conversationId);

      // Send escalation message
      const escalationMessage = "I understand you'd like to speak with a human agent. I'm connecting you with our support team now. Please hold on, a staff member will be with you shortly during our operating hours (9AM-7PM Mon-Sat).";
      
      await supabase.from("chat_messages").insert({
        conversation_id: conversationId,
        sender_type: "agent",
        message: escalationMessage,
        message_type: "escalation",
      });

      return new Response(
        JSON.stringify({ 
          response: escalationMessage, 
          escalated: true,
          messageType: "escalation"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch conversation history for context
    const { data: history, error: historyError } = await supabase
      .from("chat_messages")
      .select("message, sender_type, created_at")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(20);

    if (historyError) {
      console.error("[AI-CHAT] Error fetching history:", historyError);
    }

    // Build messages array for AI
    const messages: Message[] = [
      {
        role: "system",
        content: `You are Eclipse Support AI, a helpful and friendly customer support assistant for Eclipse, a Roblox asset marketplace. 

Your role:
- Help customers with questions about orders, products, technical issues, and billing
- Provide clear, concise, and helpful responses
- Be warm and professional
- If you cannot help with something, suggest the customer speak with a human agent

Issue category for this conversation: ${issueCategory || "General"}

Important guidelines:
- For order-specific issues, ask for the order number if not provided
- For refunds or complex billing issues, recommend speaking with a human agent
- For technical product issues, provide troubleshooting steps when possible
- Always be empathetic and understanding
- Keep responses concise (2-4 sentences typically)
- Never make promises about refunds or compensation - defer to human staff
- If unsure, recommend speaking with a human agent

You can help with:
- Product questions and recommendations
- Order status inquiries
- General how-to questions
- Account questions
- Basic troubleshooting

Escalate to human for:
- Refund requests
- Billing disputes
- Complex technical issues
- Complaints
- Legal matters`
      }
    ];

    // Add conversation history
    if (history && history.length > 0) {
      for (const msg of history) {
        messages.push({
          role: msg.sender_type === "customer" ? "user" : "assistant",
          content: msg.message,
        });
      }
    }

    // Add current message
    messages.push({
      role: "user",
      content: userMessage,
    });

    console.log("[AI-CHAT] Calling Lovable AI with", messages.length, "messages");

    // Call Lovable AI Gateway
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages,
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("[AI-CHAT] AI Gateway error:", aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "AI service is busy. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI service temporarily unavailable." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`AI Gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const aiMessage = aiData.choices?.[0]?.message?.content;

    if (!aiMessage) {
      throw new Error("No response from AI");
    }

    console.log("[AI-CHAT] AI response received, saving to database");

    // Save AI response to database
    const { error: insertError } = await supabase.from("chat_messages").insert({
      conversation_id: conversationId,
      sender_type: "agent",
      message: aiMessage,
      message_type: "ai_response",
    });

    if (insertError) {
      console.error("[AI-CHAT] Error saving AI response:", insertError);
      // Still return the AI response even if saving failed
      // The message will come through via realtime if save succeeded
    }

    // Check if AI recommended escalation in its response
    const aiRecommendedEscalation = 
      aiMessage.toLowerCase().includes("speak with a human") ||
      aiMessage.toLowerCase().includes("human agent") ||
      aiMessage.toLowerCase().includes("staff member");

    // Check if customer is trying to close the chat
    const customerWantsToClose = shouldCloseChat(userMessage);
    
    // If customer wants to close, update conversation status
    if (customerWantsToClose) {
      console.log("[AI-CHAT] Customer indicated they want to close chat");
      await supabase
        .from("chat_conversations")
        .update({ status: "closed", updated_at: new Date().toISOString() })
        .eq("id", conversationId);
    }

    return new Response(
      JSON.stringify({ 
        response: aiMessage,
        escalated: false,
        aiRecommendedEscalation,
        shouldClose: customerWantsToClose,
        messageType: "ai_response"
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[AI-CHAT] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
