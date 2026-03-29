import { getBranding, getAvatarUrl } from '../utils/embeds.js';
import { publicReply } from '../utils/responses.js';
import { supabase } from '../supabase.js';

export async function handleNewDrops(interaction, serverContext) {
  const branding = getBranding(serverContext);

  // Build query — if in a store server, show only that store's products
  let query = supabase
    .from('products')
    .select('id, name, product_number, price, images, created_at, store_id, stores!inner(name, slug)')
    .eq('is_active', true)
    .eq('moderation_status', 'approved')
    .order('created_at', { ascending: false })
    .limit(5);

  if (serverContext.store) {
    query = query.eq('store_id', serverContext.store.id);
  }

  const { data: products, error } = await query;

  if (error || !products?.length) {
    return interaction.editReply({
      embeds: [{
        color: 0xf59e0b,
        title: '\uD83D\uDCE6 New Drops',
        description: serverContext.store
          ? `No products available from **${serverContext.store.name}** yet.`
          : 'No new products available right now. Check back soon!',
        footer: { text: branding.footer },
      }],
    });
  }

  const siteUrl = 'https://eclipserblx.com';
  const productLines = products.map((p, i) => {
    const storeName = p.stores?.name || 'Unknown';
    const link = `${siteUrl}/products/${p.product_number || p.id}`;
    const price = `\u00A3${Number(p.price).toFixed(2)}`;
    const timeAgo = getTimeAgo(new Date(p.created_at));
    const prefix = i === 0 ? '\uD83D\uDD25' : `**${i + 1}.**`;
    return `${prefix} **[${p.name}](${link})** \u2014 ${price}\n\u2003\uD83C\uDFEA ${storeName} \u2022 ${timeAgo}`;
  });

  const thumbnail = products[0]?.images?.[0] || undefined;

  return publicReply(interaction, [{
    color: branding.color,
    title: serverContext.store
      ? `\uD83D\uDCE6 Latest from ${serverContext.store.name}`
      : '\uD83D\uDCE6 Latest Product Drops',
    description: productLines.join('\n\n'),
    thumbnail: thumbnail ? { url: thumbnail } : undefined,
    footer: {
      text: `${branding.footer} \u2022 /newdrops to see the latest`,
      icon_url: branding.icon,
    },
    timestamp: new Date().toISOString(),
  }]);
}

function getTimeAgo(date) {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}
