import { createClient } from "npm:@supabase/supabase-js@2";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

function anonClient() {
  // Public product catalog — anon key + RLS is enough.
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

export default defineTool({
  name: "search_products",
  title: "Search products",
  description:
    "Search Eclipse's public Roblox marketplace catalog by keyword. Returns id, title, price (GBP), category and slug.",
  inputSchema: {
    query: z.string().trim().min(1).max(120).describe("Search keywords, e.g. 'sports car', 'city map'."),
    limit: z.number().int().min(1).max(25).optional().describe("Max results (1–25, default 10)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ query, limit }, _ctx: ToolContext) => {
    const supabase = anonClient();
    const max = limit ?? 10;
    const { data, error } = await supabase
      .from("products")
      .select("id, title, slug, price, category, thumbnail_url")
      .eq("status", "published")
      .ilike("title", `%${query}%`)
      .limit(max);
    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { results: data ?? [] },
    };
  },
});
