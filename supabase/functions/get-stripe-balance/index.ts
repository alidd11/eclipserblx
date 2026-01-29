import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BalanceAmount {
  amount: number;
  currency: string;
  source_types?: Record<string, number>;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) {
      throw new Error('Stripe secret key not configured');
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
    });

    // Fetch actual Stripe balance
    const balance = await stripe.balance.retrieve();
    console.log('Stripe balance retrieved:', JSON.stringify(balance));

    // Get available and pending balances (handle multiple currencies)
    const availableGBP = (balance.available as BalanceAmount[]).find((b: BalanceAmount) => b.currency === 'gbp');
    const pendingGBP = (balance.pending as BalanceAmount[]).find((b: BalanceAmount) => b.currency === 'gbp');

    // Fetch recent charges to calculate actual fees paid
    const now = new Date();
    const thirtyDaysAgo = Math.floor(new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).getTime() / 1000);
    const sevenDaysAgo = Math.floor(new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).getTime() / 1000);
    const todayStart = Math.floor(new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() / 1000);

    // Fetch balance transactions to get actual fees
    const transactions = await stripe.balanceTransactions.list({
      limit: 100,
      created: { gte: thirtyDaysAgo },
      type: 'charge',
    });

    console.log(`Retrieved ${transactions.data.length} balance transactions`);

    // Calculate actual fees and amounts
    let totalGross30d = 0;
    let totalFees30d = 0;
    let totalNet30d = 0;
    let totalGross7d = 0;
    let totalFees7d = 0;
    let totalNet7d = 0;
    let totalGrossToday = 0;
    let totalFeesToday = 0;
    let totalNetToday = 0;

    // Daily breakdown for chart
    const dailyData: Record<string, { gross: number; fees: number; net: number; count: number }> = {};
    
    // Initialize last 30 days
    for (let i = 0; i < 30; i++) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateKey = date.toISOString().split('T')[0];
      dailyData[dateKey] = { gross: 0, fees: 0, net: 0, count: 0 };
    }

    for (const tx of transactions.data) {
      // Only count GBP transactions (or convert if needed)
      if (tx.currency !== 'gbp') continue;

      const grossAmount = tx.amount / 100; // Convert from pence
      const feeAmount = tx.fee / 100;
      const netAmount = tx.net / 100;
      const txDate = new Date(tx.created * 1000);
      const dateKey = txDate.toISOString().split('T')[0];

      // 30-day totals
      totalGross30d += grossAmount;
      totalFees30d += feeAmount;
      totalNet30d += netAmount;

      // 7-day totals
      if (tx.created >= sevenDaysAgo) {
        totalGross7d += grossAmount;
        totalFees7d += feeAmount;
        totalNet7d += netAmount;
      }

      // Today totals
      if (tx.created >= todayStart) {
        totalGrossToday += grossAmount;
        totalFeesToday += feeAmount;
        totalNetToday += netAmount;
      }

      // Daily breakdown
      if (dailyData[dateKey]) {
        dailyData[dateKey].gross += grossAmount;
        dailyData[dateKey].fees += feeAmount;
        dailyData[dateKey].net += netAmount;
        dailyData[dateKey].count += 1;
      }
    }

    // Calculate average fee percentage
    const avgFeePercent = totalGross30d > 0 ? (totalFees30d / totalGross30d) * 100 : 0;

    // Convert daily data to array sorted by date
    const dailyTrend = Object.entries(dailyData)
      .map(([date, data]) => ({
        date,
        ...data,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const response = {
      balance: {
        available: availableGBP ? availableGBP.amount / 100 : 0,
        pending: pendingGBP ? pendingGBP.amount / 100 : 0,
        currency: 'gbp',
      },
      summary: {
        today: {
          gross: totalGrossToday,
          fees: totalFeesToday,
          net: totalNetToday,
        },
        last7Days: {
          gross: totalGross7d,
          fees: totalFees7d,
          net: totalNet7d,
        },
        last30Days: {
          gross: totalGross30d,
          fees: totalFees30d,
          net: totalNet30d,
        },
        avgFeePercent: avgFeePercent.toFixed(2),
      },
      dailyTrend,
      transactionCount: transactions.data.length,
    };

    console.log('Response prepared:', JSON.stringify(response.summary));

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('Error fetching Stripe balance:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
