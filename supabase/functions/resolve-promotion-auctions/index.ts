import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Try to award a slot to bidders in descending bid order.
 * Falls through to next bidder if spend_credits fails.
 * Returns the list of winner IDs and the list of outbid IDs.
 */
async function awardSlots(
  supabase: ReturnType<typeof createClient>,
  bids: any[],
  maxWinners: number,
  auctionDate: string,
  slotLabel: string,
): Promise<{ winnerIds: string[]; outbidIds: string[] }> {
  const winnerIds: string[] = [];
  const outbidIds: string[] = [];

  for (const bid of bids) {
    if (winnerIds.length >= maxWinners) {
      // Already have enough winners — this bidder is outbid
      outbidIds.push(bid.id);
      continue;
    }

    // Try to charge this bidder
    const { data: spent } = await supabase.rpc('spend_credits', {
      p_user_id: bid.user_id,
      p_amount: bid.max_bid,
      p_description: `Promotion: ${slotLabel} (${auctionDate})`,
    });

    if (spent) {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      await supabase
        .from('product_promotions')
        .update({
          status: 'active',
          current_bid: bid.max_bid,
          started_at: new Date().toISOString(),
          expires_at: expiresAt.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', bid.id);

      winnerIds.push(bid.id);
    } else {
      // Can't afford — mark as outbid so next bidder can try
      outbidIds.push(bid.id);
    }
  }

  // Batch-update all outbid records
  if (outbidIds.length > 0) {
    await supabase
      .from('product_promotions')
      .update({ status: 'outbid', updated_at: new Date().toISOString() })
      .in('id', outbidIds);
  }

  return { winnerIds, outbidIds };
}

/**
 * Send a seller notification for each outbid user.
 */
async function notifyOutbidSellers(
  supabase: ReturnType<typeof createClient>,
  outbidBids: any[],
  slotLabel: string,
) {
  if (outbidBids.length === 0) return;

  const notifications = outbidBids.map((bid) => ({
    user_id: bid.user_id,
    type: 'promotion',
    title: 'Outbid on Promotion',
    message: `Your ${slotLabel} bid of ${bid.max_bid} credits was outbid. Your credits were not charged.`,
    action_url: '/seller/promote',
  }));

  await supabase.from('seller_notifications').insert(notifications);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const auctionDate = new Date().toISOString().split('T')[0];

    // ── DUPLICATE RESOLVE GUARD ──
    const { data: existingAuction } = await supabase
      .from('promotion_auctions')
      .select('id')
      .eq('auction_date', auctionDate)
      .eq('slot_type', 'featured')
      .limit(1)
      .maybeSingle();

    if (existingAuction) {
      console.log(`Auction for ${auctionDate} already resolved, skipping.`);
      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: 'already_resolved' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── FEATURED SLOT (1 winner, fall-through) ──
    const { data: featuredBids } = await supabase
      .from('product_promotions')
      .select('*')
      .eq('slot_type', 'featured')
      .eq('status', 'pending_auction')
      .order('max_bid', { ascending: false });

    const featured = await awardSlots(
      supabase, featuredBids || [], 1, auctionDate, 'Featured slot'
    );

    // Notify outbid sellers
    const featuredOutbid = (featuredBids || []).filter(b => featured.outbidIds.includes(b.id));
    await notifyOutbidSellers(supabase, featuredOutbid, 'Featured slot');

    // Log featured auction
    await supabase.from('promotion_auctions').insert({
      auction_date: auctionDate,
      slot_type: 'featured',
      winners: featured.winnerIds,
      total_bids: featuredBids?.length || 0,
    });

    // ── CATEGORY SPOTLIGHT (3 winners per category, fall-through) ──
    const { data: spotlightBids } = await supabase
      .from('product_promotions')
      .select('*')
      .eq('slot_type', 'category_spotlight')
      .eq('status', 'pending_auction')
      .order('max_bid', { ascending: false });

    const byCategory: Record<string, any[]> = {};
    for (const bid of spotlightBids || []) {
      const catId = bid.category_id || 'uncategorized';
      if (!byCategory[catId]) byCategory[catId] = [];
      byCategory[catId]!.push(bid);
    }

    for (const [categoryId, bids] of Object.entries(byCategory)) {
      if (!bids) continue;

      const catResult = await awardSlots(
        supabase, bids, 3, auctionDate, 'Category Spotlight'
      );

      const catOutbid = bids.filter(b => catResult.outbidIds.includes(b.id));
      await notifyOutbidSellers(supabase, catOutbid, 'Category Spotlight');

      await supabase.from('promotion_auctions').insert({
        auction_date: auctionDate,
        slot_type: 'category_spotlight',
        category_id: categoryId === 'uncategorized' ? null : categoryId,
        winners: catResult.winnerIds,
        total_bids: bids.length,
      });
    }

    // ── STORE SPOTLIGHT (1 winner, fall-through) ──
    const { data: storeSpotlightBids } = await supabase
      .from('product_promotions')
      .select('*')
      .eq('slot_type', 'store_spotlight')
      .eq('status', 'pending_auction')
      .order('max_bid', { ascending: false });

    const storeResult = await awardSlots(
      supabase, storeSpotlightBids || [], 1, auctionDate, 'Store Spotlight'
    );

    const storeOutbid = (storeSpotlightBids || []).filter(b => storeResult.outbidIds.includes(b.id));
    await notifyOutbidSellers(supabase, storeOutbid, 'Store Spotlight');

    await supabase.from('promotion_auctions').insert({
      auction_date: auctionDate,
      slot_type: 'store_spotlight',
      winners: storeResult.winnerIds,
      total_bids: storeSpotlightBids?.length || 0,
    });

    // ── EXPIRE old active promotions ──
    await supabase
      .from('product_promotions')
      .update({ status: 'expired', updated_at: new Date().toISOString() })
      .eq('status', 'active')
      .lt('expires_at', new Date().toISOString());

    return new Response(
      JSON.stringify({
        success: true,
        featured_winners: featured.winnerIds.length,
        store_spotlight_winners: storeResult.winnerIds.length,
      }),
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
