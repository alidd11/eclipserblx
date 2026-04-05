import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit, getClientIp, rateLimitResponse } from "../_shared/rateLimit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface Message {
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  tool_call_id?: string;
}

// Keywords that trigger escalation to human staff
const ESCALATION_KEYWORDS = [
  "speak to human", "talk to human", "real person", "human agent",
  "human support", "escalate", "manager", "supervisor", "refund",
  "complaint", "lawsuit", "legal", "lawyer", "angry", "furious",
  "unacceptable", "transfer me",
];

// Keywords that indicate customer wants to close chat
const CLOSING_PHRASES = [
  "that's all", "thats all", "that's everything", "thats everything",
  "thanks that's all", "thank you that's all", "nothing else",
  "no more questions", "i'm done", "im done", "i am done", "all good",
  "all done", "bye", "goodbye", "close chat", "end chat", "close this",
  "that will be all", "that's it", "thats it", "okay thanks", "ok thanks",
  "perfect thanks", "great thanks", "awesome thanks", "have a good day",
  "have a nice day", "cheers", "take care",
];

function shouldEscalate(message: string): boolean {
  const lower = message.toLowerCase();
  return ESCALATION_KEYWORDS.some((k) => lower.includes(k));
}

function shouldCloseChat(message: string): boolean {
  const lower = message.toLowerCase().trim();
  return CLOSING_PHRASES.some((p) => lower.includes(p));
}

// ── Tool definitions for AI tool-calling ──────────────────────────
const TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "lookup_order",
      description: "Fetch full details for a specific order by its ID, including all items and download stats.",
      parameters: {
        type: "object",
        properties: {
          order_id: { type: "string", description: "The order UUID to look up" },
        },
        required: ["order_id"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "check_download_status",
      description: "Check the download count and limit for a specific order item.",
      parameters: {
        type: "object",
        properties: {
          order_item_id: { type: "string", description: "The order_item UUID" },
        },
        required: ["order_item_id"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "reset_download_count",
      description: "Reset the download counter to 0 for a specific order item so the customer can re-download.",
      parameters: {
        type: "object",
        properties: {
          order_item_id: { type: "string", description: "The order_item UUID" },
        },
        required: ["order_item_id"],
        additionalProperties: false,
      },
    },
  },
];

// ── Tool execution ────────────────────────────────────────────────
async function executeTool(
  name: string,
  args: Record<string, string>,
  supabase: ReturnType<typeof createClient>,
  customerUserId: string | null,
): Promise<string> {
  try {
    if (name === "lookup_order") {
      const { data, error } = await supabase
        .from("orders")
        .select(`
          id, total, status, created_at, currency,
          order_items (
            id, product_name, price, quantity, download_count, max_downloads_per_purchase
          )
        `)
        .eq("id", args.order_id)
        .maybeSingle();

      if (error) return JSON.stringify({ error: error.message });
      if (!data) return JSON.stringify({ error: "Order not found" });

      // Security: only allow lookup of the customer's own orders
      // We check via a separate query since the select above doesn't include user_id filtering
      const { data: ownerCheck } = await supabase
        .from("orders")
        .select("id")
        .eq("id", args.order_id)
        .eq("user_id", customerUserId ?? "")
        .maybeSingle();

      if (!ownerCheck) return JSON.stringify({ error: "Order not found for this customer" });

      return JSON.stringify(data);
    }

    if (name === "check_download_status") {
      const { data, error } = await supabase
        .from("order_items")
        .select("id, product_name, download_count, max_downloads_per_purchase, order_id")
        .eq("id", args.order_item_id)
        .maybeSingle();

      if (error) return JSON.stringify({ error: error.message });
      if (!data) return JSON.stringify({ error: "Order item not found" });

      // Verify ownership
      if (customerUserId) {
        const { data: ownerCheck } = await supabase
          .from("orders")
          .select("id")
          .eq("id", data.order_id)
          .eq("user_id", customerUserId)
          .maybeSingle();
        if (!ownerCheck) return JSON.stringify({ error: "Item not found for this customer" });
      }

      return JSON.stringify({
        product_name: data.product_name,
        download_count: data.download_count ?? 0,
        max_downloads: data.max_downloads_per_purchase,
        remaining: data.max_downloads_per_purchase
          ? Math.max(0, data.max_downloads_per_purchase - (data.download_count ?? 0))
          : "unlimited",
      });
    }

    if (name === "reset_download_count") {
      // Verify ownership first
      const { data: item } = await supabase
        .from("order_items")
        .select("id, order_id, product_name")
        .eq("id", args.order_item_id)
        .maybeSingle();

      if (!item) return JSON.stringify({ error: "Order item not found" });

      if (customerUserId) {
        const { data: ownerCheck } = await supabase
          .from("orders")
          .select("id")
          .eq("id", item.order_id)
          .eq("user_id", customerUserId)
          .maybeSingle();
        if (!ownerCheck) return JSON.stringify({ error: "Item not found for this customer" });
      }

      const { error } = await supabase
        .from("order_items")
        .update({ download_count: 0 })
        .eq("id", args.order_item_id);

      if (error) return JSON.stringify({ error: error.message });
      return JSON.stringify({ success: true, product_name: item.product_name, message: "Download count reset to 0" });
    }

    return JSON.stringify({ error: `Unknown tool: ${name}` });
  } catch (e) {
    return JSON.stringify({ error: e instanceof Error ? e.message : "Tool execution failed" });
  }
}

// ── Fetch customer order history for context injection ────────────
async function fetchOrderContext(
  supabase: ReturnType<typeof createClient>,
  userId: string,
): Promise<string> {
  const { data: orders, error } = await supabase
    .from("orders")
    .select(`
      id, total, status, created_at, currency,
      order_items (
        id, product_name, price, quantity, download_count, max_downloads_per_purchase
      )
    `)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(10);

  if (error || !orders || orders.length === 0) {
    return "No order history found for this customer.";
  }

  const lines = orders.map((o: any) => {
    const date = new Date(o.created_at).toLocaleDateString("en-GB", {
      day: "numeric", month: "short", year: "numeric",
    });
    const itemLines = (o.order_items || []).map((item: any) => {
      const dl = item.download_count ?? 0;
      const max = item.max_downloads_per_purchase;
      const dlStr = max ? `(downloaded ${dl}/${max} times)` : `(downloaded ${dl} times, no limit)`;
      return `  - "${item.product_name}" [item_id: ${item.id}] ${dlStr}`;
    });
    return `Order ${o.id.substring(0, 8)}... \u2014 ${date} \u2014 \u00A3${o.total} \u2014 Status: ${o.status}\n${itemLines.join("\n")}`;
  });

  return lines.join("\n\n");
}

// ── Build system prompt ───────────────────────────────────────────
function buildSystemPrompt(issueCategory: string | null, orderContext: string): string {
  return `You are Eclipse Support AI, an intelligent and empathetic customer support agent for Eclipse, a Roblox asset marketplace.

ROLE & CAPABILITIES:
- You have access to the customer's full order history (shown below)
- You can look up specific orders, check download statuses, and reset download counters
- You proactively reference order data when relevant \u2014 never ask for an order number if you can identify it from context
- When a customer mentions a product name, match it against their order history
- Present order info naturally: "I can see your order for 'Product Name' placed on Jan 5th..."

CUSTOMER ORDER HISTORY:
${orderContext}

Issue category: ${issueCategory || "General"}

RESPONSE GUIDELINES:
- Be warm, professional, and concise (2-4 sentences typically)
- For download issues: check the download status first, then offer to reset if needed
- For order questions: reference the specific order details you can see
- For refunds or complex billing: recommend speaking with a human agent
- For technical product issues: provide troubleshooting steps when possible
- Never make promises about refunds or compensation \u2014 defer to human staff
- If you cannot help, suggest escalating to a human agent
- When using tools, explain what you're doing: "Let me check your download status..."

ESCALATE TO HUMAN FOR:
- Refund requests (after acknowledging the issue)
- Billing disputes
- Complex technical issues you cannot resolve
- Complaints or legal matters
- When the customer explicitly asks for a human

TOOL USAGE:
- Use lookup_order when you need detailed info about a specific order
- Use check_download_status to verify download counts before advising
- Use reset_download_count when a customer cannot download and a reset would help
- Always verify the action with the customer before resetting downloads`;
}

// ── Main handler ──────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const clientIp = getClientIp(req);
  const rateLimitResult = checkRateLimit({
    maxRequests: 20,
    windowMs: 60000,
    identifier: clientIp,
    action: "ai-chat-support",
  });

  if (!rateLimitResult.allowed) {
    return rateLimitResponse(rateLimitResult, corsHeaders);
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { conversationId, userMessage, issueCategory, userId } = await req.json();

    if (!conversationId || !userMessage) {
      return new Response(
        JSON.stringify({ error: "Missing conversationId or userMessage" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (typeof userMessage !== "string" || userMessage.length > 2000) {
      return new Response(
        JSON.stringify({ error: "Message too long (max 2000 characters)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (typeof conversationId !== "string" || conversationId.length > 100) {
      return new Response(
        JSON.stringify({ error: "Invalid conversation ID" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    console.log("[AI-CHAT] Processing message for conversation:", conversationId);

    // Resolve userId from conversation if not provided
    let customerUserId = userId || null;
    if (!customerUserId) {
      const { data: conv } = await supabase
        .from("chat_conversations")
        .select("user_id")
        .eq("id", conversationId)
        .maybeSingle();
      customerUserId = conv?.user_id || null;
    }

    // Check escalation
    if (shouldEscalate(userMessage)) {
      console.log("[AI-CHAT] Escalation triggered");
      await supabase
        .from("chat_conversations")
        .update({ status: "active", assigned_to: null })
        .eq("id", conversationId);

      const escalationMessage =
        "I understand you'd like to speak with a human agent. I'm connecting you with our support team now. Please hold on, a staff member will be with you shortly during our operating hours (9AM-7PM Mon-Sat).";

      await supabase.from("chat_messages").insert({
        conversation_id: conversationId,
        sender_type: "agent",
        message: escalationMessage,
        message_type: "escalation",
      });

      return new Response(
        JSON.stringify({ response: escalationMessage, escalated: true, messageType: "escalation" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Fetch order context
    let orderContext = "No order history available (customer not identified).";
    if (customerUserId) {
      orderContext = await fetchOrderContext(supabase, customerUserId);
    }

    // Fetch conversation history
    const { data: history } = await supabase
      .from("chat_messages")
      .select("message, sender_type, created_at")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(20);

    // Build messages
    const messages: Message[] = [
      { role: "system", content: buildSystemPrompt(issueCategory, orderContext) },
    ];

    if (history) {
      for (const msg of history) {
        messages.push({
          role: msg.sender_type === "customer" ? "user" : "assistant",
          content: msg.message,
        });
      }
    }

    messages.push({ role: "user", content: userMessage });

    console.log("[AI-CHAT] Calling AI with", messages.length, "messages and tools");

    // ── AI call with tool-calling loop ─────────────────────────────
    let finalAiMessage = "";
    let loopCount = 0;
    const MAX_TOOL_LOOPS = 3;

    while (loopCount < MAX_TOOL_LOOPS) {
      loopCount++;

      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages,
          max_tokens: 800,
          temperature: 0.7,
          tools: TOOLS,
          tool_choice: "auto",
        }),
      });

      if (!aiResponse.ok) {
        const errorText = await aiResponse.text();
        console.error("[AI-CHAT] AI Gateway error:", aiResponse.status, errorText);
        if (aiResponse.status === 429) {
          return new Response(
            JSON.stringify({ error: "AI service is busy. Please try again in a moment." }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
        if (aiResponse.status === 402) {
          return new Response(
            JSON.stringify({ error: "AI service temporarily unavailable." }),
            { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
        throw new Error(`AI Gateway error: ${aiResponse.status}`);
      }

      const aiData = await aiResponse.json();
      const choice = aiData.choices?.[0];

      if (!choice) throw new Error("No response from AI");

      // Check for tool calls
      const toolCalls = choice.message?.tool_calls;
      if (toolCalls && toolCalls.length > 0) {
        // Add assistant message with tool calls to history
        messages.push(choice.message);

        // Execute each tool call
        for (const tc of toolCalls) {
          const fnName = tc.function.name;
          let fnArgs: Record<string, string> = {};
          try {
            fnArgs = JSON.parse(tc.function.arguments);
          } catch {
            fnArgs = {};
          }

          console.log(`[AI-CHAT] Executing tool: ${fnName}`, fnArgs);
          const result = await executeTool(fnName, fnArgs, supabase, customerUserId);

          messages.push({
            role: "tool",
            content: result,
            tool_call_id: tc.id,
          });
        }

        // Continue loop to get AI's final response after tool results
        continue;
      }

      // No tool calls — we have the final response
      finalAiMessage = choice.message?.content || "";
      break;
    }

    if (!finalAiMessage) {
      throw new Error("No final response from AI after tool execution");
    }

    console.log("[AI-CHAT] AI response received, saving to database");

    // Save AI response
    const { error: insertError } = await supabase.from("chat_messages").insert({
      conversation_id: conversationId,
      sender_type: "agent",
      message: finalAiMessage,
      message_type: "ai_response",
    });

    if (insertError) {
      console.error("[AI-CHAT] Error saving AI response:", insertError);
    }

    // Check if AI recommended escalation
    const aiRecommendedEscalation =
      finalAiMessage.toLowerCase().includes("speak with a human") ||
      finalAiMessage.toLowerCase().includes("human agent") ||
      finalAiMessage.toLowerCase().includes("staff member");

    // Check if customer wants to close
    const customerWantsToClose = shouldCloseChat(userMessage);
    if (customerWantsToClose) {
      console.log("[AI-CHAT] Customer indicated they want to close chat");
      await supabase
        .from("chat_conversations")
        .update({ status: "closed", updated_at: new Date().toISOString() })
        .eq("id", conversationId);
    }

    return new Response(
      JSON.stringify({
        response: finalAiMessage,
        escalated: false,
        aiRecommendedEscalation,
        shouldClose: customerWantsToClose,
        messageType: "ai_response",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("[AI-CHAT] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
