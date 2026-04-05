

## Enterprise AI-Dominated Live Chat — Order-Aware Support Agent

### What This Does
Transforms the live chat from a basic AI responder into an intelligent support agent that automatically fetches and understands the customer's order history, identifies which order they're discussing, and provides contextual help with real data — no more asking customers for order numbers.

### Architecture

```text
Customer opens chat
        │
        ▼
  ┌─────────────────────────┐
  │  Edge Function receives  │
  │  message + user_id       │
  │          │                │
  │  ┌───────▼──────────┐    │
  │  │ Fetch customer's  │    │
  │  │ recent orders +   │    │
  │  │ order items +     │    │
  │  │ download stats    │    │
  │  └───────┬──────────┘    │
  │          │                │
  │  ┌───────▼──────────┐    │
  │  │ Inject order data │    │
  │  │ into AI system    │    │
  │  │ prompt as context │    │
  │  └───────┬──────────┘    │
  │          │                │
  │  ┌───────▼──────────┐    │
  │  │ AI uses tool-call │    │
  │  │ to take actions:  │    │
  │  │ - lookup order    │    │
  │  │ - check downloads │    │
  │  │ - reset dl count  │    │
  │  └──────────────────┘    │
  └─────────────────────────┘
```

### Implementation Steps

**1. Update `ai-chat-support` edge function — Order context injection**
- Accept `userId` from the request body (passed from frontend)
- Before calling the AI, query the customer's recent orders (last 10) with `order_items` joined
- Query download history for those order items
- Format this data as structured context in the system prompt:
  ```
  CUSTOMER ORDER HISTORY:
  Order #abc123 — Jan 5 2026 — $12.99 — Status: completed
    - "Neon Car Model" (downloaded 3/5 times)
    - "Racing Track Pack" (downloaded 0/5 times)
  Order #def456 — Dec 20 2025 — $8.50 — Status: refunded
    - "Sunset Skybox" (downloaded 1/5 times)
  ```
- Add tool-calling definitions so the AI can take actions:
  - `lookup_order` — fetch specific order details by ID
  - `check_download_status` — check remaining downloads for an item
  - `reset_download_count` — reset download counter for an order item (for common support cases)

**2. Enhance the system prompt**
- Instruct the AI to proactively reference order data when relevant
- When a customer mentions a product name, the AI should match it against their order history
- AI should never ask for an order number if it can identify the order from context
- AI should present order info naturally: "I can see your order for 'Neon Car Model' placed on Jan 5th..."
- Add structured response guidelines for order-specific scenarios (download issues, missing items, status checks)

**3. Update frontend (`LiveChat.tsx` + `ChatSidePanel.tsx`)**
- Pass `userId` in the edge function invocation body
- Display order context cards inline when AI references an order (parse `message_type: "order_context"`)
- Show a compact order summary card with: product name, order date, status, download count
- Add a "View Order" button on order cards that links to the customer's order page

**4. Update admin `LiveChat.tsx` — Staff order panel**
- When staff views a conversation, auto-fetch and display the customer's recent orders in a collapsible side panel
- Staff can click an order to insert its details into the chat context
- Show download analytics per order item

**5. Add AI action execution in the edge function**
- Implement tool-calling loop: if AI returns a tool call, execute it server-side and feed results back
- `lookup_order`: query `orders` + `order_items` by order ID, return formatted details
- `check_download_status`: return current download count vs limit for an order item
- `reset_download_count`: reset `download_count` to 0 on `order_items` (common support action)
- After executing tools, re-call AI with results for a natural language response

### Technical Details

- **No database migration needed** — all data comes from existing `orders`, `order_items` tables
- The edge function uses `SUPABASE_SERVICE_ROLE_KEY` so it can read orders regardless of RLS
- Tool calls use the OpenAI-compatible `tools` parameter with `tool_choice: "auto"`
- Order data is limited to last 10 orders to stay within token limits
- User ID is validated against the conversation's `user_id` to prevent data leakage
- The AI model stays `google/gemini-3-flash-preview` for speed, with `max_tokens` increased to 800

### Files Changed
- `supabase/functions/ai-chat-support/index.ts` — Major rewrite: order fetching, tool definitions, tool execution loop
- `src/pages/LiveChat.tsx` — Pass `userId`, render order context cards
- `src/components/chat/ChatSidePanel.tsx` — Pass `userId`, render order context cards
- `src/pages/admin/LiveChat.tsx` — Add customer orders side panel

