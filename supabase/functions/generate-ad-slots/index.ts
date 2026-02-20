import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TIME_SLOTS = ['09:00', '13:00', '17:00', '21:00'];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Generate slots for the next 14 days
    const slotsToInsert = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < 14; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];

      for (const time of TIME_SLOTS) {
        slotsToInsert.push({ slot_date: dateStr, slot_time: time });
      }
    }

    // Insert, ignoring conflicts (slots that already exist)
    const { error } = await supabaseAdmin
      .from("ad_schedule_slots")
      .upsert(slotsToInsert, { onConflict: "slot_date,slot_time", ignoreDuplicates: true });

    if (error) throw error;

    console.log(`Generated ${slotsToInsert.length} slots`);

    return new Response(JSON.stringify({ success: true, generated: slotsToInsert.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
