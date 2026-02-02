import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[GET-CREDIT-BALANCE] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const user = userData.user;
    if (!user) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id });

    // Get credit balance
    const { data: balance, error: balanceError } = await supabaseAdmin
      .from("credit_balances")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (balanceError) {
      logStep("ERROR fetching balance", { error: balanceError.message });
      throw new Error(`Failed to fetch balance: ${balanceError.message}`);
    }

    // If no balance record, return zeros
    const creditData = balance || {
      balance: 0,
      total_purchased: 0,
      total_gifted: 0,
      total_spent: 0,
      eclipse_plus_bonus_claimed: false,
    };

    logStep("Balance retrieved", { balance: creditData.balance });

    // Get recent transactions (last 50)
    const { data: transactions, error: txError } = await supabaseAdmin
      .from("credit_transactions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (txError) {
      logStep("ERROR fetching transactions", { error: txError.message });
    }

    return new Response(JSON.stringify({ 
      balance: Number(creditData.balance),
      total_purchased: Number(creditData.total_purchased),
      total_gifted: Number(creditData.total_gifted),
      total_spent: Number(creditData.total_spent),
      eclipse_plus_bonus_claimed: creditData.eclipse_plus_bonus_claimed,
      transactions: transactions || [],
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
