import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendBotMessage, buildSettingsMap } from "../_shared/discord-bot.ts";
import { checkRateLimit, getClientIp, rateLimitResponse, RATE_LIMITS } from "../_shared/rateLimit.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOG = (step: string, d?: unknown) => {
  const s = d ? ` - ${JSON.stringify(d)}` : '';
  console.log(`[send-product-drop-webhook] ${step}${s}`);
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Rate limiting
  const clientIp = getClientIp(req);
  const rl = checkRateLimit({ ...RATE_LIMITS.WRITE, identifier: clientIp, action: 'product-drop-webhook' });
  if (!rl.allowed) return rateLimitResponse(rl, corsHeaders);

  try {
    // Auth guard: require service-role or authenticated staff
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const token = authHeader.replace("Bearer ", "");
    const isServiceRole = token === supabaseServiceKey;

    if (!isServiceRole) {
      const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(token);
      if (claimsErr || !claimsData?.claims?.sub) {
        return new Response(
          JSON.stringify({ success: false, error: 'Unauthorized' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
        );
      }

      const userId = claimsData.claims.sub;
      const adminClient = createClient(supabaseUrl, supabaseServiceKey);
      const { data: roles } = await adminClient.from("user_roles").select("role").eq("user_id", userId);
      const staffRoles = new Set(["admin", "owner", "moderator"]);
      const isStaff = roles?.some((r: any) => staffRoles.has(r.role));
      if (!isStaff) {
        return new Response(
          JSON.stringify({ success: false, error: 'Forbidden' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
        );
      }
    }

    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
    const { productId, isEarlyAccess } = await req.json();

    if (!productId || !UUID_RE.test(productId)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Valid Product ID required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Fetch product with store info
    const { data: product, error: productError } = await supabaseClient
      .from('products')
      .select(`id, name, slug, product_number, price, images, description, stores!inner(name, slug)`)
      .eq('id', productId)
      .single();

    if (productError || !product) {
      return new Response(
        JSON.stringify({ success: false, error: 'Product not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    // Fetch webhook settings
    const channelKey = isEarlyAccess ? 'early_product_drops_discord_channel_id' : 'product_drops_discord_channel_id';
    const webhookKey = isEarlyAccess ? 'early_product_drops_discord_webhook_url' : 'product_drops_discord_webhook_url';
    const roleIdKey = isEarlyAccess ? 'early_product_drops_discord_role_id' : 'product_drops_discord_role_id';

    const { data: settings } = await supabaseClient
      .from('settings')
      .select('key, value')
      .in('key', [channelKey, webhookKey, roleIdKey]);

    const settingsMap = buildSettingsMap(settings);
    const channelId = settingsMap[channelKey];
    const webhookUrl = settingsMap[webhookKey];
    const roleId = settingsMap[roleIdKey];

    if (!channelId && !webhookUrl) {
      return new Response(
        JSON.stringify({ success: false, error: `No ${isEarlyAccess ? 'early access' : 'product drops'} channel configured` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Build payload
    const productLink = `https://eclipserblx.com/products/${(product as any).product_number || encodeURIComponent(product.slug)}`;
    const images = product.images || [];
    const storeName = (product as any).stores?.name || 'Unknown Store';
    const color = isEarlyAccess ? 0x8B5CF6 : 0x00CED1;
    const footerText = isEarlyAccess ? 'Eclipse Marketplace • Early Access' : 'Eclipse Marketplace • Product Drop';

    let description = product.description
      ? product.description.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim()
      : null;
    if (description && description.length > 200) {
      description = description.substring(0, 197) + '...';
    }

    const embeds: any[] = [{
      title: isEarlyAccess ? '👑 Early Access Drop!' : '🎉 New Product Drop!',
      description: isEarlyAccess
        ? `**${product.name}**\n\n*Members get early access!*${description ? `\n\n${description}` : ''}`
        : `**${product.name}**${description ? `\n\n${description}` : ''}`,
      color,
      fields: [
        { name: '🏪 Store', value: storeName, inline: true },
        { name: '💰 Price', value: `£${Number(product.price).toFixed(2)}`, inline: true },
        ...(isEarlyAccess ? [{ name: '⏰ Early Access', value: '24 hours', inline: true }] : []),
        { name: '🔗 Link', value: `[${product.name}](${productLink})`, inline: false },
      ],
    }];

    if (images[0] && images[1]) {
      embeds.push({ color, image: { url: images[0] } });
      embeds.push({ color, image: { url: images[1] }, footer: { text: footerText }, timestamp: new Date().toISOString() });
    } else if (images[0]) {
      embeds.push({ color, image: { url: images[0] }, footer: { text: footerText }, timestamp: new Date().toISOString() });
    }

    if (channelId) {
      const result = await sendBotMessage(channelId, {
        content: roleId ? `<@&${roleId}>` : undefined,
        embeds,
        allowed_mentions: roleId ? { roles: [roleId] } : undefined,
      });

      if (!result.success) {
        return new Response(
          JSON.stringify({ success: false, error: 'Discord bot message failed' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
      }
    } else {
      const discordResponse = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: roleId ? `<@&${roleId}>` : undefined,
          embeds,
        }),
      });

      if (!discordResponse.ok) {
        await discordResponse.text(); // consume body
        return new Response(
          JSON.stringify({ success: false, error: 'Discord webhook failed' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
      }
    }

    LOG(`Sent ${isEarlyAccess ? 'early access' : 'product'} drop for: ${product.name}`);

    return new Response(
      JSON.stringify({ success: true, message: `${isEarlyAccess ? 'Early access' : 'Product'} drop sent for ${product.name}` }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    LOG('ERROR', { message: error instanceof Error ? error.message : 'Unknown error' });
    return new Response(
      JSON.stringify({ success: false, error: 'Internal error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
