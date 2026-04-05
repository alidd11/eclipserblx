import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Extract fingerprint from file bytes
function extractFingerprint(data: Uint8Array): string | null {
  const text = new TextDecoder("utf-8", { fatal: false }).decode(data);

  // Binary fingerprint format
  const binMatch = text.match(/\x00ECL_FP:(ECL-[A-Z0-9]{8})\x00/);
  if (binMatch) return binMatch[1];

  // Lua watermark format
  const luaMatch = text.match(/local _=string\.char\(([0-9,]+)\)/);
  if (luaMatch) {
    try {
      const chars = luaMatch[1].split(",").map(Number);
      return String.fromCharCode(...chars);
    } catch {
      /* ignore */
    }
  }

  return null;
}

// Simple SHA-256 hash of file for dedup
async function hashFile(data: Uint8Array): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: userError,
    } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const productId = formData.get("productId") as string | null;
    const storeId = formData.get("storeId") as string | null;
    const notes = formData.get("notes") as string | null;

    if (!file || !productId || !storeId) {
      return new Response(
        JSON.stringify({
          error: "file, productId, and storeId are required",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Verify caller owns the store
    const { data: store } = await supabase
      .from("stores")
      .select("id, owner_id")
      .eq("id", storeId)
      .eq("owner_id", user.id)
      .single();

    if (!store) {
      return new Response(
        JSON.stringify({ error: "You do not own this store" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Read file and extract fingerprint
    const fileBytes = new Uint8Array(await file.arrayBuffer());
    const fileHash = await hashFile(fileBytes);
    const fingerprint = extractFingerprint(fileBytes);

    let matchedUserId: string | null = null;
    let matchedDisplayName: string | null = null;

    if (fingerprint) {
      // Look up the fingerprint in download_logs by matching the watermark hash pattern
      // The watermark is generated from userId:orderId:productId
      // We search download_logs for this product to find the user
      const { data: logs } = await supabase
        .from("download_logs")
        .select("user_id, profiles!inner(display_name)")
        .eq("product_id", productId)
        .order("downloaded_at", { ascending: false })
        .limit(100);

      if (logs) {
        // Regenerate watermark hash for each user to find the match
        for (const log of logs) {
          // We need order info too - fetch orders for this user+product
          const { data: orderItems } = await supabase
            .from("order_items")
            .select("id, order_id")
            .eq("product_id", productId);

          if (orderItems) {
            for (const oi of orderItems) {
              const raw = `${log.user_id}:${oi.order_id}:${productId}`;
              let hash = 0;
              for (let i = 0; i < raw.length; i++) {
                const char = raw.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash = hash & hash;
              }
              const hex = Math.abs(hash).toString(36).toUpperCase();
              const candidate = `ECL-${hex.padStart(8, "0").slice(0, 8)}`;

              if (candidate === fingerprint) {
                matchedUserId = log.user_id;
                matchedDisplayName = (log as any).profiles?.display_name || null;
                break;
              }
            }
          }
          if (matchedUserId) break;
        }
      }
    }

    // Create the leak report
    const { data: report, error: reportErr } = await supabase
      .from("leak_reports")
      .insert({
        store_id: storeId,
        product_id: productId,
        reported_by: user.id,
        file_hash: fileHash,
        extracted_fingerprint: fingerprint,
        matched_user_id: matchedUserId,
        matched_display_name: matchedDisplayName,
        status: "pending",
        notes: notes || null,
      })
      .select()
      .single();

    if (reportErr) {
      console.error("Failed to create leak report:", reportErr);
      return new Response(
        JSON.stringify({ error: "Failed to create report" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        report: {
          id: report.id,
          fingerprint_found: !!fingerprint,
          fingerprint: fingerprint,
          buyer_identified: !!matchedUserId,
          matched_display_name: matchedDisplayName,
          file_hash: fileHash,
          status: report.status,
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Report leak error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
