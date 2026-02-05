import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface QuarantineRequest {
  storeId: string;
  productId?: string;
  fileName: string;
  fileSize: number;
  threatType: string;
  threatDetails: Record<string, unknown>;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: QuarantineRequest = await req.json();
    const { storeId, productId, fileName, fileSize, threatType, threatDetails } = body;

    if (!storeId || !fileName || !threatType) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Quarantining file: ${fileName} from store ${storeId} - Threat: ${threatType}`);

    // Generate quarantine path
    const timestamp = Date.now();
    const quarantinePath = `${storeId}/${timestamp}_${fileName}`;

    // 1. Record the quarantined file
    const { data: quarantineRecord, error: insertError } = await supabase
      .from("quarantined_files")
      .insert({
        store_id: storeId,
        product_id: productId || null,
        original_file_name: fileName,
        original_file_path: `uploads/${fileName}`,
        quarantine_path: quarantinePath,
        file_type: fileName.split('.').pop()?.toLowerCase() || 'unknown',
        file_size: fileSize,
        threat_type: threatType,
        threat_details: threatDetails,
        scan_results: threatDetails,
        status: 'quarantined'
      })
      .select()
      .single();

    if (insertError) {
      console.error("Failed to record quarantine:", insertError);
      throw insertError;
    }

    // 2. Update seller trust score
    const isBlocked = ['virus', 'known_malicious', 'blocked_extension', 'magic_mismatch'].includes(threatType);
    const isFlagged = !isBlocked;

    const { error: scoreError } = await supabase.rpc('update_seller_trust_score', {
      p_store_id: storeId,
      p_is_flagged: isFlagged,
      p_is_blocked: isBlocked,
      p_violation_type: threatType
    });

    if (scoreError) {
      console.error("Failed to update trust score:", scoreError);
      // Don't throw - quarantine record is more important
    }

    // 3. If there's a file hash, add it to the registry
    if (threatDetails.fileHash && isBlocked) {
      await supabase
        .from("file_hash_registry")
        .upsert({
          file_hash: threatDetails.fileHash as string,
          hash_algorithm: 'SHA-256',
          is_blocked: true,
          threat_type: threatType,
          threat_details: threatDetails.reason as string || 'Blocked during upload',
          last_seen_at: new Date().toISOString()
        }, {
          onConflict: 'file_hash'
        });
    }

    console.log(`File quarantined successfully: ${quarantineRecord.id}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        quarantineId: quarantineRecord.id,
        trustScoreUpdated: !scoreError
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Quarantine error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
