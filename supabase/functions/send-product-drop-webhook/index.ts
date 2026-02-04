import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { productId, isEarlyAccess } = await req.json();

    if (!productId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Product ID required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Fetch product with store info
    const { data: product, error: productError } = await supabaseClient
      .from('products')
      .select(`
        id, name, slug, price, images,
        stores!inner(name, slug)
      `)
      .eq('id', productId)
      .single();

    if (productError || !product) {
      return new Response(
        JSON.stringify({ success: false, error: 'Product not found', details: productError?.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    // Fetch webhook settings
    const webhookKey = isEarlyAccess ? 'early_product_drops_discord_webhook_url' : 'product_drops_discord_webhook_url';
    const roleIdKey = isEarlyAccess ? 'early_product_drops_discord_role_id' : 'product_drops_discord_role_id';

    const { data: settings } = await supabaseClient
      .from('settings')
      .select('key, value')
      .in('key', [webhookKey, roleIdKey]);

    const settingsMap: Record<string, string> = {};
    settings?.forEach((s: any) => {
      settingsMap[s.key] = String(s.value).replace(/^"|"$/g, '');
    });

    const webhookUrl = settingsMap[webhookKey];
    const roleId = settingsMap[roleIdKey];

    if (!webhookUrl) {
      return new Response(
        JSON.stringify({ success: false, error: `No ${isEarlyAccess ? 'early access' : 'product drops'} webhook configured` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Build the webhook payload
    const productLink = `https://eclipserblx.com/products/${product.slug}`;
    const images = product.images || [];
    const storeName = (product as any).stores?.name || 'Unknown Store';
    const color = isEarlyAccess ? 0x8B5CF6 : 0x00CED1; // Violet for early, Cyan for regular

    const embeds: any[] = [
      {
        title: isEarlyAccess ? '👑 Early Access Drop!' : '🎉 New Product Drop!',
        description: isEarlyAccess 
          ? `**${product.name}**\n\n*Eclipse+ members get early access!*`
          : `**${product.name}**`,
        color,
        fields: [
          { name: '🏪 Store', value: storeName, inline: true },
          { name: '💰 Price', value: `£${Number(product.price).toFixed(2)}`, inline: true },
          ...(isEarlyAccess ? [{ name: '⏰ Early Access', value: '24 hours', inline: true }] : []),
          { name: '🔗 Link', value: `[${product.name}](${productLink})`, inline: false },
        ],
        thumbnail: images[0] ? { url: images[0] } : undefined,
        footer: { text: isEarlyAccess ? 'Eclipse Marketplace • Eclipse+ Early Access' : 'Eclipse Marketplace • Product Drop' },
        timestamp: new Date().toISOString(),
      },
    ];

    // Add first 2 images as separate embeds
    if (images[0]) {
      embeds.push({ color, image: { url: images[0] } });
    }
    if (images[1]) {
      embeds.push({ color, image: { url: images[1] } });
    }

    // Send to Discord
    const discordResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: roleId ? `<@&${roleId}>` : undefined,
        embeds,
      }),
    });

    if (!discordResponse.ok) {
      const errorText = await discordResponse.text();
      return new Response(
        JSON.stringify({ success: false, error: 'Discord webhook failed', details: errorText }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    console.log(`[send-product-drop-webhook] Sent ${isEarlyAccess ? 'early access' : 'product'} drop for: ${product.name}`);

    return new Response(
      JSON.stringify({ success: true, message: `${isEarlyAccess ? 'Early access' : 'Product'} drop sent for ${product.name}` }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[send-product-drop-webhook] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal error', details: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
