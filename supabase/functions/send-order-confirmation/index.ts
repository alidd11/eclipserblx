import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";
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

function generateTextReceipt(data: OrderConfirmationRequest): string {
  const w = 44;
  const pad = (left: string, right: string) => {
    const gap = Math.max(2, w - left.length - right.length);
    return left + ' '.repeat(gap) + right;
  };

  const lines: string[] = [];

  lines.push('ECLIPSE');
  lines.push('');
  lines.push('ORDER RECEIPT');
  lines.push('-'.repeat(w));
  lines.push('');
  lines.push(pad('Order', data.orderId));
  lines.push(pad('Date', formatDate(data.orderDate)));
  lines.push(pad('Email', data.customerEmail));
  lines.push(pad('Payment', data.paymentMethod.charAt(0).toUpperCase() + data.paymentMethod.slice(1)));
  lines.push('');
  lines.push('-'.repeat(w));
  
  data.items.forEach((item) => {
    lines.push(pad(item.product_name, `£${item.price.toFixed(2)}`));
  });

  lines.push('-'.repeat(w));
  lines.push('');

  if (data.subtotal !== data.total) {
    lines.push(pad('Subtotal', `£${data.subtotal.toFixed(2)}`));
  }
  lines.push(pad('Total', `£${data.total.toFixed(2)}`));
  lines.push('');

  const botCodes = data.botInstallationCodes || [];
  if (botCodes.length > 0) {
    lines.push('-'.repeat(w));
    lines.push('INSTALLATION CODES');
    lines.push('');
    botCodes.forEach(code => {
      lines.push(`${code.product_name}`);
      lines.push(`${code.installation_code}`);
      lines.push('');
    });
  }

  lines.push('-'.repeat(w));
  lines.push('eclipserblx.com');
  lines.push(`© ${new Date().getFullYear()} Eclipse`);

  return lines.join('\n');
}

function generateEmailHtml(data: OrderConfirmationRequest): string {
  const hasBotPurchase = data.hasBotPurchase || data.botInstallationCodes?.length || data.items.some(item => 
    item.category_slug === 'bots' || 
    item.product_name.toLowerCase().includes('bot')
  );
  
  const botCodes = data.botInstallationCodes || [];

  const itemsHtml = data.items
    .map(
      (item) => `
      <tr>
        <td style="padding: 10px 0; border-bottom: 1px solid #222; color: #e0e0e0; font-size: 14px;">${item.product_name}</td>
        <td style="padding: 10px 0; border-bottom: 1px solid #222; color: #a855f7; text-align: right; font-weight: 600; font-size: 14px;">£${item.price.toFixed(2)}</td>
      </tr>`
    )
    .join("");

  const botCodesHtml = botCodes.length > 0 ? `
          <tr>
            <td style="padding: 24px 0;">
              <p style="margin: 0 0 12px 0; font-size: 15px; font-weight: 600; color: #ffffff;">Your Installation Codes</p>
              <p style="margin: 0 0 16px 0; font-size: 13px; color: #a3a3a3;">Save these codes. You'll need them when opening a support ticket for bot installation. Each code is single-use.</p>
              ${botCodes.map(code => `
                <p style="margin: 0 0 8px 0; font-size: 13px; color: #a3a3a3;">${code.product_name}</p>
                <p style="margin: 0 0 16px 0; font-size: 18px; font-weight: 700; color: #a855f7; font-family: 'Courier New', monospace; letter-spacing: 2px;">${code.installation_code}</p>
              `).join('')}
            </td>
          </tr>
  ` : '';

  const botNoticeHtml = hasBotPurchase ? `
          <tr>
            <td style="padding: 0 0 24px 0;">
              <p style="margin: 0 0 8px 0; font-size: 15px; font-weight: 600; color: #ffffff;">Bot installation</p>
              <p style="margin: 0 0 12px 0; font-size: 14px; color: #a3a3a3; line-height: 1.6;">Your bot needs to be set up by our team. To get started:</p>
              <ol style="margin: 0 0 16px 0; padding-left: 20px; color: #a3a3a3; font-size: 14px; line-height: 1.8;">
                <li>Open a support ticket on our website or Discord</li>
                <li>Include your installation code from above</li>
                <li>Provide your Discord server ID or Roblox game details</li>
                <li>We'll have your bot running within 24-48 hours</li>
              </ol>
              <a href="https://eclipserblx.com/support" style="color: #a855f7; font-size: 14px; text-decoration: none;">Open a support ticket</a>
              &nbsp;&middot;&nbsp;
              <a href="https://eclipserblx.com/bot-installation" style="color: #a855f7; font-size: 14px; text-decoration: none;">Installation guide</a>
            </td>
          </tr>
  ` : '';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0f; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0f;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table width="520" cellpadding="0" cellspacing="0" style="max-width: 520px;">
          <tr>
            <td style="padding-bottom: 32px;">
              <span style="font-size: 20px; font-weight: 700; color: #ffffff; letter-spacing: 2px; font-family: Georgia, serif;">ECLIPSE</span>
            </td>
          </tr>
          <tr>
            <td>
              <h1 style="margin: 0 0 8px 0; color: #ffffff; font-size: 22px; font-weight: 600;">Order confirmed</h1>
              <p style="margin: 0 0 24px 0; color: #a3a3a3; font-size: 14px;">Thanks for your purchase.</p>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom: 24px;">
              <p style="margin: 0 0 4px 0; color: #737373; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Order ID</p>
              <p style="margin: 0 0 12px 0; color: #ffffff; font-size: 14px;">${data.orderId}</p>
              <p style="margin: 0 0 4px 0; color: #737373; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Date</p>
              <p style="margin: 0; color: #ffffff; font-size: 14px;">${formatDate(data.orderDate)}</p>
            </td>
          </tr>
          <tr>
            <td>
              <table width="100%" cellpadding="0" cellspacing="0">
                <thead>
                  <tr>
                    <th style="padding: 8px 0; text-align: left; color: #737373; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid #333; font-weight: 500;">Product</th>
                    <th style="padding: 8px 0; text-align: right; color: #737373; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid #333; font-weight: 500;">Price</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsHtml}
                </tbody>
                <tfoot>
                  <tr>
                    <td style="padding: 12px 0; color: #ffffff; font-weight: 600; font-size: 15px;">Total</td>
                    <td style="padding: 12px 0; color: #a855f7; font-weight: 600; font-size: 16px; text-align: right;">£${data.total.toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>
            </td>
          </tr>

          ${botCodesHtml}
          ${botNoticeHtml}

          <tr>
            <td style="padding: 24px 0;">
              <p style="margin: 0 0 16px 0; color: #a3a3a3; font-size: 14px;">
                ${hasBotPurchase ? 'Need other downloads? Access them here.' : 'Your downloads are ready.'}
              </p>
              <a href="https://eclipserblx.com/downloads" style="display: inline-block; background: #a855f7; color: white; padding: 12px 28px; text-decoration: none; font-weight: 600; font-size: 14px;">
                Access Downloads
              </a>
            </td>
          </tr>

          <tr>
            <td style="border-top: 1px solid #222; padding-top: 24px;">
              <p style="margin: 0 0 8px 0; color: #525252; font-size: 12px;">A receipt is attached for your records.</p>
              <p style="margin: 0 0 8px 0; color: #525252; font-size: 12px;">Questions? Email <a href="mailto:support@eclipserblx.com" style="color: #737373; text-decoration: none;">support@eclipserblx.com</a></p>
              <p style="font-size: 11px; color: #404040; margin: 12px 0 0 0;">&copy; ${new Date().getFullYear()} Eclipse</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
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
    console.log(`[ORDER-CONFIRMATION] Rate limit exceeded for IP: ${clientIp}`);
    return rateLimitResponse(rateLimitResult, corsHeaders);
  }

  try {
    const data: OrderConfirmationRequest = await req.json();
    logStep("Processing order confirmation", { orderId: data.orderId, email: data.customerEmail });

    logStep("Generating receipt");
    const receiptText = generateTextReceipt(data);
    const encoder = new TextEncoder();
    const receiptBytes = encoder.encode(receiptText);
    const receiptBase64 = btoa(String.fromCharCode(...receiptBytes));
    logStep("Receipt generated successfully");

    const emailHtml = generateEmailHtml(data);

    logStep("Sending confirmation email");
    const emailResponse = await resend.emails.send({
      from: "Eclipse <noreply@eclipserblx.com>",
      to: [data.customerEmail],
      subject: `Order Confirmed - ${data.orderId.substring(0, 8)}`,
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