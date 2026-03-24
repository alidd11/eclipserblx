import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { handleCors, jsonOk, jsonError, unauthorized } from "../_shared/edge-response.ts";

const ALLOWED_TABLES = new Set(["products", "orders", "order_items", "profiles", "categories"]);

serve(async (req: Request): Response | Promise<Response> => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  // Auth: x-api-key header
  const apiKey = req.headers.get("x-api-key");
  const expectedKey = Deno.env.get("ADMIN_API_KEY");
  if (!apiKey || !expectedKey || apiKey !== expectedKey) {
    return unauthorized("Invalid or missing API key");
  }

  // Parse table param
  const url = new URL(req.url);
  const table = url.searchParams.get("table");
  if (!table || !ALLOWED_TABLES.has(table)) {
    return jsonError(`Invalid table. Allowed: ${[...ALLOWED_TABLES].join(", ")}`, 400);
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const selectColumns = table === "products" ? "*, categories(name)" : "*";

    const { data, error } = await supabase
      .from(table)
      .select(selectColumns)
      .order("created_at", { ascending: false })
      .limit(1000);

    if (error) {
      console.error("[admin-api] Query error:", error);
      return jsonError("Query failed: " + error.message, 500);
    }

    return jsonOk({ data });
  } catch (err) {
    console.error("[admin-api] Internal error:", err);
    return jsonError("Internal server error", 500);
  }
});
