import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { checkRateLimit, getClientIp, rateLimitResponse, RATE_LIMITS } from "../_shared/rateLimit.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OrderItem {
  product_name: string;
  price: number;
  category_slug?: string;
}

interface BotInstallationCode {
  product_name: string;
  installation_code: string;
}

interface OrderConfirmationRequest {
  orderId: string;
  customerEmail: string;
  items: OrderItem[];
  subtotal: number;
  total: number;
  paymentMethod: string;
  orderDate: string;
  hasBotPurchase?: boolean;
  botInstallationCodes?: BotInstallationCode[];
  discount?: number;
}

interface EnrichedItem {
  product_name: string;
  price: number;
  category_slug?: string;
  category_name?: string;
  description?: string;
  image_url?: string;
  store_name?: string;
}

function logStep(step: string, details?: any) {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[ORDER-CONFIRMATION] ${step}${detailsStr}`);
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

async function enrichItems(items: OrderItem[]): Promise<EnrichedItem[]> {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const productNames = items.map(i => i.product_name);
    const { data: products } = await supabase
      .from("products")
      .select(`
        name,
        description,
        images,
        store_id,
        category_id,
        categories!inner(name, slug),
        stores!inner(name)
      `)
      .in("name", productNames);

    const productMap = new Map<string, any>();
    if (products) {
      for (const p of products) {
        productMap.set(p.name, p);
      }
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;

    return items.map(item => {
      const product = productMap.get(item.product_name);
      let imageUrl: string | undefined;
      
      if (product?.images?.length > 0) {
        const img = product.images[0];
        if (img.startsWith("http")) {
          imageUrl = img;
        } else {
          imageUrl = `${supabaseUrl}/storage/v1/object/public/product-images/${img}`;
        }
      }

      const desc = product?.description
        ? product.description.substring(0, 80) + (product.description.length > 80 ? '...' : '')
        : undefined;

      return {
        product_name: item.product_name,
        price: item.price,
        category_slug: item.category_slug || (product?.categories as any)?.slug,
        category_name: (product?.categories as any)?.name,
        description: desc,
        image_url: imageUrl,
        store_name: (product?.stores as any)?.name,
      };
    });
  } catch (e) {
    logStep("Enrichment failed (non-fatal), using basic items", { error: String(e) });
    return items.map(item => ({ ...item }));
  }
}

function getCategoryLabel(item: EnrichedItem): string {
  if (item.category_name) return item.category_name;
  if (item.category_slug) {
    return item.category_slug.charAt(0).toUpperCase() + item.category_slug.slice(1).replace(/-/g, ' ');
  }
  return 'Digital Product';
}

function getPaymentLabel(method: string): string {
  switch (method.toLowerCase()) {
    case 'card': return 'Card';
    case 'apple_pay': return 'Apple Pay';
    case 'google_pay': return 'Google Pay';
    case 'credits': return 'Eclipse Credits';
    default: return method.charAt(0).toUpperCase() + method.slice(1);
  }
}

function generateEmailHtml(data: OrderConfirmationRequest, enrichedItems: EnrichedItem[]): string {
  const hasBotPurchase = data.hasBotPurchase || data.botInstallationCodes?.length || data.items.some(item =>
    item.category_slug === 'bots' || item.product_name.toLowerCase().includes('bot')
  );
  const botCodes = data.botInstallationCodes || [];
  const discount = data.discount || 0;
  const year = new Date().getFullYear();

  // Product cards
  const itemsHtml = enrichedItems.map((item, idx) => {
    const categoryLabel = getCategoryLabel(item);
    const isLast = idx === enrichedItems.length - 1;

    const imageCell = item.image_url
      ? `<td style="width: 64px; vertical-align: top; padding-right: 14px;">
           <img src="${item.image_url}" width="64" height="64" alt="${item.product_name}" style="display: block; border-radius: 8px; object-fit: cover;" />
         </td>`
      : `<td style="width: 64px; vertical-align: top; padding-right: 14px;">
           <div style="width: 64px; height: 64px; border-radius: 8px; background: #1a1a2e; display: flex; align-items: center; justify-content: center;">
             <span style="font-size: 24px; color: #a855f7;">&#9881;</span>
           </div>
         </td>`;

    return `
    <tr>
      <td style="padding: 16px 0;${!isLast ? ' border-bottom: 1px solid #1e1e2e;' : ''}">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            ${imageCell}
            <td style="vertical-align: top;">
              <p style="margin: 0 0 3px 0; font-size: 15px; font-weight: 600; color: #ffffff;">${item.product_name}</p>
              ${item.description ? `<p style="margin: 0 0 6px 0; font-size: 12px; color: #737373; line-height: 1.4;">${item.description}</p>` : ''}
              <table cellpadding="0" cellspacing="0"><tr>
                <td style="padding: 2px 8px; background: #1a1a2e; border-radius: 4px; font-size: 11px; color: #a3a3a3; text-transform: uppercase; letter-spacing: 0.5px;">${categoryLabel}</td>
                ${item.store_name ? `<td style="padding: 2px 8px; margin-left: 6px; font-size: 11px; color: #525252;">&nbsp;&middot;&nbsp;${item.store_name}</td>` : ''}
              </tr></table>
            </td>
            <td style="vertical-align: top; text-align: right; white-space: nowrap;">
              <p style="margin: 0; font-size: 15px; font-weight: 600; color: #a855f7;">&pound;${item.price.toFixed(2)}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>`;
  }).join('');

  // Pricing breakdown
  const showSubtotal = discount > 0 || data.subtotal !== data.total;
  const pricingRows: string[] = [];

  if (showSubtotal) {
    pricingRows.push(`
      <tr>
        <td style="padding: 6px 0; font-size: 14px; color: #a3a3a3;">Subtotal</td>
        <td style="padding: 6px 0; font-size: 14px; color: #a3a3a3; text-align: right;">&pound;${data.subtotal.toFixed(2)}</td>
      </tr>`);
  }
  if (discount > 0) {
    pricingRows.push(`
      <tr>
        <td style="padding: 6px 0; font-size: 14px; color: #22c55e;">Discount</td>
        <td style="padding: 6px 0; font-size: 14px; color: #22c55e; text-align: right;">-&pound;${discount.toFixed(2)}</td>
      </tr>`);
  }

  // Bot codes section
  const botCodesHtml = botCodes.length > 0 ? `
    <tr>
      <td style="padding: 24px 0 0 0;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background: #111119; border-radius: 10px; border: 1px solid #1e1e2e;">
          <tr><td style="padding: 20px;">
            <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #ffffff;">Installation Codes</p>
            <p style="margin: 0 0 16px 0; font-size: 12px; color: #737373;">Save these. You'll need them when requesting bot setup.</p>
            ${botCodes.map(code => `
              <p style="margin: 0 0 4px 0; font-size: 12px; color: #a3a3a3;">${code.product_name}</p>
              <p style="margin: 0 0 14px 0; font-size: 18px; font-weight: 700; color: #a855f7; font-family: 'Courier New', monospace; letter-spacing: 3px;">${code.installation_code}</p>
            `).join('')}
          </td></tr>
        </table>
      </td>
    </tr>` : '';

  // Bot notice
  const botNoticeHtml = hasBotPurchase ? `
    <tr>
      <td style="padding: 20px 0 0 0;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background: #111119; border-radius: 10px; border: 1px solid #1e1e2e;">
          <tr><td style="padding: 20px;">
            <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #ffffff;">Bot Setup</p>
            <p style="margin: 0 0 12px 0; font-size: 13px; color: #a3a3a3; line-height: 1.6;">Your bot needs to be configured by our team. Open a support ticket with your installation code, and we'll have it running within 24-48 hours.</p>
            <a href="https://eclipserblx.com/support" style="display: inline-block; background: #1e1e2e; color: #a855f7; padding: 8px 16px; border-radius: 6px; text-decoration: none; font-size: 13px; font-weight: 500;">Open Support Ticket</a>
          </td></tr>
        </table>
      </td>
    </tr>` : '';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #09090b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #09090b;">
    <tr>
      <td align="center" style="padding: 40px 16px;">
        <table width="560" cellpadding="0" cellspacing="0" style="max-width: 560px; width: 100%;">

          <!-- Header -->
          <tr>
            <td style="padding-bottom: 28px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <span style="font-size: 20px; font-weight: 700; color: #ffffff; letter-spacing: 2px; font-family: Georgia, 'Times New Roman', serif;">ECLIPSE</span>
                  </td>
                  <td style="text-align: right;">
                    <span style="display: inline-block; padding: 4px 10px; background: #0f2a1a; border: 1px solid #166534; border-radius: 6px; font-size: 11px; font-weight: 600; color: #4ade80; text-transform: uppercase; letter-spacing: 0.5px;">Paid</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Title Card -->
          <tr>
            <td style="padding-bottom: 24px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background: #111119; border-radius: 12px; border: 1px solid #1e1e2e;">
                <tr>
                  <td style="padding: 24px;">
                    <p style="margin: 0 0 4px 0; font-size: 12px; color: #737373; text-transform: uppercase; letter-spacing: 1px;">Order Confirmation</p>
                    <h1 style="margin: 0 0 20px 0; font-size: 22px; font-weight: 600; color: #ffffff;">Receipt</h1>

                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="width: 50%; vertical-align: top; padding-bottom: 12px;">
                          <p style="margin: 0 0 2px 0; font-size: 11px; color: #525252; text-transform: uppercase; letter-spacing: 0.5px;">Order ID</p>
                          <p style="margin: 0; font-size: 13px; color: #e4e4e7; font-family: 'Courier New', monospace;">${data.orderId.length > 12 ? data.orderId.substring(0, 12) + '...' : data.orderId}</p>
                        </td>
                        <td style="width: 50%; vertical-align: top; padding-bottom: 12px;">
                          <p style="margin: 0 0 2px 0; font-size: 11px; color: #525252; text-transform: uppercase; letter-spacing: 0.5px;">Date</p>
                          <p style="margin: 0; font-size: 13px; color: #e4e4e7;">${formatDate(data.orderDate)}</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="width: 50%; vertical-align: top;">
                          <p style="margin: 0 0 2px 0; font-size: 11px; color: #525252; text-transform: uppercase; letter-spacing: 0.5px;">Payment</p>
                          <p style="margin: 0; font-size: 13px; color: #e4e4e7;">${getPaymentLabel(data.paymentMethod)}</p>
                        </td>
                        <td style="width: 50%; vertical-align: top;">
                          <p style="margin: 0 0 2px 0; font-size: 11px; color: #525252; text-transform: uppercase; letter-spacing: 0.5px;">Email</p>
                          <p style="margin: 0; font-size: 13px; color: #e4e4e7;">${data.customerEmail}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Products Card -->
          <tr>
            <td style="padding-bottom: 24px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background: #111119; border-radius: 12px; border: 1px solid #1e1e2e;">
                <tr>
                  <td style="padding: 24px;">
                    <p style="margin: 0 0 16px 0; font-size: 12px; color: #525252; text-transform: uppercase; letter-spacing: 1px; font-weight: 500;">Items Purchased</p>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      ${itemsHtml}
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Pricing Card -->
          <tr>
            <td style="padding-bottom: 24px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background: #111119; border-radius: 12px; border: 1px solid #1e1e2e;">
                <tr>
                  <td style="padding: 24px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      ${pricingRows.join('')}
                      <tr>
                        <td style="padding: 14px 0 0 0; border-top: 1px solid #1e1e2e; font-size: 17px; font-weight: 700; color: #ffffff;">Total</td>
                        <td style="padding: 14px 0 0 0; border-top: 1px solid #1e1e2e; font-size: 17px; font-weight: 700; color: #a855f7; text-align: right;">&pound;${data.total.toFixed(2)}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          ${botCodesHtml}
          ${botNoticeHtml}

          <!-- Actions -->
          <tr>
            <td style="padding: 24px 0;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding-right: 10px;">
                    <a href="https://eclipserblx.com/downloads" style="display: inline-block; background: #a855f7; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 600;">Access Downloads</a>
                  </td>
                  <td>
                    <a href="https://eclipserblx.com/my-purchases" style="display: inline-block; background: #1e1e2e; color: #e4e4e7; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 500; border: 1px solid #2a2a3e;">View Order</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="border-top: 1px solid #1e1e2e; padding-top: 24px;">
              <p style="margin: 0 0 8px 0; font-size: 12px; color: #525252;">Need help? <a href="https://eclipserblx.com/support" style="color: #737373; text-decoration: none;">Contact support</a></p>
              <p style="margin: 0 0 4px 0; font-size: 11px; color: #404040;"><a href="https://eclipserblx.com" style="color: #525252; text-decoration: none;">eclipserblx.com</a></p>
              <p style="margin: 0; font-size: 11px; color: #333;">&copy; ${year} Eclipse</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function generateTextReceipt(data: OrderConfirmationRequest, enrichedItems: EnrichedItem[]): string {
  const w = 52;
  const sep = '─'.repeat(w);
  const pad = (left: string, right: string) => {
    const gap = Math.max(2, w - left.length - right.length);
    return left + ' '.repeat(gap) + right;
  };

  const discount = data.discount || 0;
  const botCodes = data.botInstallationCodes || [];
  const lines: string[] = [];

  // Header
  lines.push('');
  lines.push('  ╔═══════════════════════════════════════════════╗');
  lines.push('  ║              E C L I P S E                    ║');
  lines.push('  ║            Order Receipt                      ║');
  lines.push('  ╚═══════════════════════════════════════════════╝');
  lines.push('');

  // Order details
  lines.push(`  ${sep}`);
  lines.push('  ORDER DETAILS');
  lines.push(`  ${sep}`);
  lines.push('');
  lines.push(pad('  Order ID', data.orderId));
  lines.push(pad('  Date', formatDate(data.orderDate)));
  lines.push(pad('  Email', data.customerEmail));
  lines.push(pad('  Payment', getPaymentLabel(data.paymentMethod)));
  lines.push('');

  // Products
  lines.push(`  ${sep}`);
  lines.push('  ITEMS PURCHASED');
  lines.push(`  ${sep}`);
  lines.push('');

  enrichedItems.forEach((item, idx) => {
    if (idx > 0) lines.push('');
    lines.push(`  ${item.product_name}`);
    if (item.store_name) lines.push(`    Store: ${item.store_name}`);
    if (item.category_name) lines.push(`    Category: ${item.category_name}`);
    lines.push(pad('    Price', `£${item.price.toFixed(2)}`));
  });

  lines.push('');

  // Pricing
  lines.push(`  ${sep}`);
  lines.push('  PAYMENT SUMMARY');
  lines.push(`  ${sep}`);
  lines.push('');

  if (discount > 0 || data.subtotal !== data.total) {
    lines.push(pad('  Subtotal', `£${data.subtotal.toFixed(2)}`));
  }
  if (discount > 0) {
    lines.push(pad('  Discount', `-£${discount.toFixed(2)}`));
  }
  lines.push(pad('  Total Paid', `£${data.total.toFixed(2)}`));
  lines.push('');

  // Bot codes
  if (botCodes.length > 0) {
    lines.push(`  ${sep}`);
    lines.push('  INSTALLATION CODES');
    lines.push(`  ${sep}`);
    lines.push('');
    botCodes.forEach(code => {
      lines.push(`  ${code.product_name}`);
      lines.push(`  Code: ${code.installation_code}`);
      lines.push('');
    });
  }

  // Footer
  lines.push(`  ${sep}`);
  lines.push('');
  lines.push('  eclipserblx.com');
  lines.push(`  © ${new Date().getFullYear()} Eclipse. All rights reserved.`);
  lines.push('');

  return lines.join('\n');
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const clientIp = getClientIp(req);
  const rateLimitResult = checkRateLimit({
    ...RATE_LIMITS.WRITE,
    identifier: clientIp,
    action: 'send-order-confirmation',
  });

  if (!rateLimitResult.allowed) {
    logStep("Rate limit exceeded", { ip: clientIp });
    return rateLimitResponse(rateLimitResult, corsHeaders);
  }

  try {
    const data: OrderConfirmationRequest = await req.json();
    logStep("Processing order confirmation", { orderId: data.orderId, email: data.customerEmail });

    // Enrich items with product images, descriptions, categories, store info
    logStep("Enriching items with product data");
    const enrichedItems = await enrichItems(data.items);
    logStep("Enrichment complete", { enrichedCount: enrichedItems.filter(i => i.image_url).length });

    // Generate text receipt attachment
    const receiptText = generateTextReceipt(data, enrichedItems);
    const encoder = new TextEncoder();
    const receiptBytes = encoder.encode(receiptText);
    const receiptBase64 = btoa(String.fromCharCode(...receiptBytes));

    // Generate HTML email
    const emailHtml = generateEmailHtml(data, enrichedItems);

    logStep("Sending confirmation email");
    const emailResponse = await resend.emails.send({
      from: "Eclipse <noreply@eclipserblx.com>",
      to: [data.customerEmail],
      subject: `Receipt - ${data.orderId.length > 12 ? data.orderId.substring(0, 12) : data.orderId}`,
      html: emailHtml,
      attachments: [
        {
          filename: `Eclipse-Receipt-${data.orderId.substring(0, 8)}.txt`,
          content: receiptBase64,
        },
      ],
    });

    logStep("Email sent successfully", { response: emailResponse });

    return new Response(JSON.stringify({ success: true, emailResponse }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("[ORDER-CONFIRMATION] Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
};

serve(handler);
