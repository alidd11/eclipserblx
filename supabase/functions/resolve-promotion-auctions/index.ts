import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const auctionDate = new Date().toISOString().split('T')[0];

    // ── FEATURED SLOT (1 winner) ──
    const { data: featuredBids } = await supabase
      .from('product_promotions')
      .select('*')
      .eq('slot_type', 'featured')
      .eq('status', 'pending_auction')
      .order('max_bid', { ascending: false });

    const featuredWinners: string[] = [];
    if (featuredBids && featuredBids.length > 0) {
      const winner = featuredBids[0];

      // Spend credits
      const { data: spent } = await supabase.rpc('spend_credits', {
        p_user_id: winner.user_id,
        p_amount: winner.max_bid,
        p_description: `Promotion: Featured slot (${auctionDate})`,
      });

      if (spent) {
        // Activate winner
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        await supabase
          .from('product_promotions')
          .update({
            status: 'active',
            current_bid: winner.max_bid,
            started_at: new Date().toISOString(),
            expires_at: expiresAt.toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', winner.id);

        featuredWinners.push(winner.id);

        // Outbid losers
        const loserIds = featuredBids.slice(1).map(b => b.id);
        if (loserIds.length > 0) {
          await supabase
            .from('product_promotions')
            .update({ status: 'outbid', updated_at: new Date().toISOString() })
            .in('id', loserIds);
        }
      }
    }

    // Log featured auction
    await supabase.from('promotion_auctions').insert({
      auction_date: auctionDate,
      slot_type: 'featured',
      winners: featuredWinners,
      total_bids: featuredBids?.length || 0,
    });

    // ── CATEGORY SPOTLIGHT (3 winners per category) ──
    const { data: spotlightBids } = await supabase
      .from('product_promotions')
      .select('*')
      .eq('slot_type', 'category_spotlight')
      .eq('status', 'pending_auction')
      .order('max_bid', { ascending: false });

    // Group by category
    const byCategory: Record<string, typeof spotlightBids> = {};
    for (const bid of spotlightBids || []) {
      const catId = bid.category_id || 'uncategorized';
      if (!byCategory[catId]) byCategory[catId] = [];
      byCategory[catId]!.push(bid);
    }

    for (const [categoryId, bids] of Object.entries(byCategory)) {
      if (!bids) continue;
      const winners = bids.slice(0, 3);
      const losers = bids.slice(3);
      const winnerIds: string[] = [];

      for (const winner of winners) {
        const { data: spent } = await supabase.rpc('spend_credits', {
          p_user_id: winner.user_id,
          p_amount: winner.max_bid,
          p_description: `Promotion: Category Spotlight (${auctionDate})`,
        });

        if (spent) {
          const expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + 7);

          await supabase
            .from('product_promotions')
            .update({
              status: 'active',
              current_bid: winner.max_bid,
              started_at: new Date().toISOString(),
              expires_at: expiresAt.toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', winner.id);

          winnerIds.push(winner.id);
        }
      }

      // Outbid losers
      const loserIds = losers.map(b => b.id);
      if (loserIds.length > 0) {
        await supabase
          .from('product_promotions')
          .update({ status: 'outbid', updated_at: new Date().toISOString() })
          .in('id', loserIds);
      }

      // Log
      await supabase.from('promotion_auctions').insert({
        auction_date: auctionDate,
        slot_type: 'category_spotlight',
        category_id: categoryId === 'uncategorized' ? null : categoryId,
        winners: winnerIds,
        total_bids: bids.length,
      });
    }

    // ── EXPIRE old active promotions ──
    await supabase
      .from('product_promotions')
      .update({ status: 'expired', updated_at: new Date().toISOString() })
      .eq('status', 'active')
      .lt('expires_at', new Date().toISOString());

    return new Response(
      JSON.stringify({ success: true, featured_winners: featuredWinners.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Auction resolution error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
