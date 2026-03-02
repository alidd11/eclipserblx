import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { checkRateLimit, getClientIp, rateLimitResponse, RATE_LIMITS } from '../_shared/rateLimit.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BalanceAmount {
  amount: number;
  currency: string;
  source_types?: Record<string, number>;
}

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[GET-STRIPE-BALANCE] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Rate limit
    const clientIp = getClientIp(req);
    const rl = checkRateLimit({ ...RATE_LIMITS.API, identifier: clientIp, action: 'get-stripe-balance' });
    if (!rl.allowed) return rateLimitResponse(rl, corsHeaders);

    logStep("Function started");

    // CRITICAL: Admin-only endpoint - verify staff role
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Verify staff permission
    const { data: isStaff } = await supabaseClient.rpc('has_role', {
      _user_id: userData.user.id,
      _role: 'admin'
    });

    if (!isStaff) {
      logStep("Access denied - not admin", { userId: userData.user.id });
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    logStep("Admin authenticated", { userId: userData.user.id });

    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) throw new Error('Stripe secret key not configured');

    const stripe = new Stripe(stripeSecretKey, { apiVersion: '2023-10-16' });

    // Fetch actual Stripe balance
    const balance = await stripe.balance.retrieve();

    const availableGBP = (balance.available as BalanceAmount[]).find((b: BalanceAmount) => b.currency === 'gbp');
    const pendingGBP = (balance.pending as BalanceAmount[]).find((b: BalanceAmount) => b.currency === 'gbp');

    const now = new Date();
    const thirtyDaysAgo = Math.floor(new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).getTime() / 1000);
    const sevenDaysAgo = Math.floor(new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).getTime() / 1000);
    const todayStart = Math.floor(new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() / 1000);

    const transactions = await stripe.balanceTransactions.list({
      limit: 100,
      created: { gte: thirtyDaysAgo },
      type: 'charge',
    });

    const refundTransactions = await stripe.balanceTransactions.list({
      limit: 100,
      created: { gte: thirtyDaysAgo },
      type: 'refund',
    });

    let totalGross30d = 0, totalFees30d = 0, totalNet30d = 0;
    let totalGross7d = 0, totalFees7d = 0, totalNet7d = 0;
    let totalGrossToday = 0, totalFeesToday = 0, totalNetToday = 0;
    let totalRefunds30d = 0, totalRefunds7d = 0, totalRefundsToday = 0;
    let refundCount30d = 0, refundCount7d = 0, refundCountToday = 0;

    const dailyData: Record<string, { gross: number; fees: number; net: number; count: number; refunds: number; refundCount: number }> = {};
    
    for (let i = 0; i < 30; i++) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateKey = date.toISOString().split('T')[0];
      dailyData[dateKey] = { gross: 0, fees: 0, net: 0, count: 0, refunds: 0, refundCount: 0 };
    }

    for (const tx of transactions.data) {
      if (tx.currency !== 'gbp') continue;
      const grossAmount = tx.amount / 100;
      const feeAmount = tx.fee / 100;
      const netAmount = tx.net / 100;
      const dateKey = new Date(tx.created * 1000).toISOString().split('T')[0];

      totalGross30d += grossAmount; totalFees30d += feeAmount; totalNet30d += netAmount;
      if (tx.created >= sevenDaysAgo) { totalGross7d += grossAmount; totalFees7d += feeAmount; totalNet7d += netAmount; }
      if (tx.created >= todayStart) { totalGrossToday += grossAmount; totalFeesToday += feeAmount; totalNetToday += netAmount; }
      if (dailyData[dateKey]) { dailyData[dateKey].gross += grossAmount; dailyData[dateKey].fees += feeAmount; dailyData[dateKey].net += netAmount; dailyData[dateKey].count += 1; }
    }

    for (const tx of refundTransactions.data) {
      if (tx.currency !== 'gbp') continue;
      const refundAmount = Math.abs(tx.amount / 100);
      const dateKey = new Date(tx.created * 1000).toISOString().split('T')[0];

      totalRefunds30d += refundAmount; refundCount30d += 1;
      if (tx.created >= sevenDaysAgo) { totalRefunds7d += refundAmount; refundCount7d += 1; }
      if (tx.created >= todayStart) { totalRefundsToday += refundAmount; refundCountToday += 1; }
      if (dailyData[dateKey]) { dailyData[dateKey].refunds += refundAmount; dailyData[dateKey].refundCount += 1; }
    }

    const avgFeePercent = totalGross30d > 0 ? (totalFees30d / totalGross30d) * 100 : 0;

    const dailyTrend = Object.entries(dailyData)
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const response = {
      balance: {
        available: availableGBP ? availableGBP.amount / 100 : 0,
        pending: pendingGBP ? pendingGBP.amount / 100 : 0,
        currency: 'gbp',
      },
      summary: {
        today: { gross: totalGrossToday, fees: totalFeesToday, net: totalNetToday, refunds: totalRefundsToday, refundCount: refundCountToday },
        last7Days: { gross: totalGross7d, fees: totalFees7d, net: totalNet7d, refunds: totalRefunds7d, refundCount: refundCount7d },
        last30Days: { gross: totalGross30d, fees: totalFees30d, net: totalNet30d, refunds: totalRefunds30d, refundCount: refundCount30d },
        avgFeePercent: avgFeePercent.toFixed(2),
      },
      dailyTrend,
      transactionCount: transactions.data.length,
      refundCount: refundTransactions.data.length,
    };

    logStep("Response prepared", { transactionCount: transactions.data.length });

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
