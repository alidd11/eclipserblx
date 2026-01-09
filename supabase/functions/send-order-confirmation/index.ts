import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";

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

interface OrderConfirmationRequest {
  orderId: string;
  customerEmail: string;
  items: OrderItem[];
  subtotal: number;
  total: number;
  paymentMethod: string;
  orderDate: string;
  hasBotPurchase?: boolean;
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
  const line = "═".repeat(50);
  const thinLine = "─".repeat(50);
  
  let receipt = `
${line}
                    ECLIPSE
              Digital Marketplace
                  RECEIPT
${line}

Order ID:      ${data.orderId}
Date:          ${formatDate(data.orderDate)}
Email:         ${data.customerEmail}
Payment:       ${data.paymentMethod.charAt(0).toUpperCase() + data.paymentMethod.slice(1)}

${thinLine}
ITEMS
${thinLine}
`;

  data.items.forEach((item) => {
    const nameLength = item.product_name.length;
    const priceStr = `£${item.price.toFixed(2)}`;
    const spaces = Math.max(2, 48 - nameLength - priceStr.length);
    receipt += `${item.product_name}${" ".repeat(spaces)}${priceStr}\n`;
  });

  receipt += `
${thinLine}
Subtotal:${" ".repeat(33)}£${data.subtotal.toFixed(2)}
${line}
TOTAL:${" ".repeat(36)}£${data.total.toFixed(2)}
${line}

        Thank you for your purchase!
    
    Website: eclipserblx.com
    Support: support@eclipserblx.com

${line}
          © ${new Date().getFullYear()} Eclipse
           All rights reserved.
`;

  return receipt;
}

function generateEmailHtml(data: OrderConfirmationRequest): string {
  // Check if order contains bot purchases
  const hasBotPurchase = data.hasBotPurchase || data.items.some(item => 
    item.category_slug === 'bots' || 
    item.product_name.toLowerCase().includes('bot')
  );

  const itemsHtml = data.items
    .map(
      (item) => `
      <tr>
        <td style="padding: 12px 16px; border-bottom: 1px solid #2d2d2d; color: #e0e0e0; font-family: 'Rajdhani', Arial, sans-serif;">
          ${item.product_name}
        </td>
        <td style="padding: 12px 16px; border-bottom: 1px solid #2d2d2d; color: #a855f7; font-family: 'Rajdhani', Arial, sans-serif; text-align: right; font-weight: 600;">
          £${item.price.toFixed(2)}
        </td>
      </tr>
    `
    )
    .join("");

  // Bot installation notice section
  const botInstallationNotice = hasBotPurchase ? `
          <!-- Bot Installation Notice -->
          <tr>
            <td style="padding: 0 40px 32px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(147, 51, 234, 0.15) 100%); border-radius: 12px; border: 2px solid rgba(59, 130, 246, 0.3); overflow: hidden;">
                <tr>
                  <td style="padding: 24px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding-bottom: 16px;">
                          <h3 style="margin: 0; color: #60a5fa; font-size: 18px; font-weight: 700; font-family: 'Cinzel', serif;">
                            🤖 Bot Installation Required
                          </h3>
                        </td>
                      </tr>
                      <tr>
                        <td>
                          <p style="margin: 0 0 16px 0; color: #e0e0e0; font-size: 14px; line-height: 1.6;">
                            Your bot purchase requires manual installation by our team. To get your bot set up:
                          </p>
                          <ol style="margin: 0 0 20px 0; padding-left: 20px; color: #c0c0c0; font-size: 14px; line-height: 1.8;">
                            <li style="margin-bottom: 8px;">Open a support ticket on our website or Discord server</li>
                            <li style="margin-bottom: 8px;">Include your <strong style="color: #a855f7;">Order ID: ${data.orderId}</strong></li>
                            <li style="margin-bottom: 8px;">Provide your Discord server ID or Roblox game details</li>
                            <li>Our team will install and configure your bot within 24-48 hours</li>
                          </ol>
                          <table cellpadding="0" cellspacing="0" style="margin-top: 8px;">
                            <tr>
                              <td style="padding-right: 12px;">
                                <a href="https://eclipserblx.com/support" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">
                                  Open Support Ticket
                                </a>
                              </td>
                              <td>
                                <a href="https://eclipserblx.com/bot-installation" style="display: inline-block; background: transparent; color: #60a5fa; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; border: 1px solid #3b82f6;">
                                  Installation Guide
                                </a>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
  ` : '';

  // Download CTA - only show if there are non-bot items or no bot purchase
  const downloadCta = `
          <!-- Download CTA -->
          <tr>
            <td style="padding: 0 40px 40px 40px; text-align: center;">
              <p style="margin: 0 0 20px 0; color: #a0a0a0; font-size: 14px;">
                ${hasBotPurchase 
                  ? 'Need other downloads? Access your digital products here.' 
                  : 'Your digital products are ready for download!'}
              </p>
              <a href="https://eclipserblx.com/downloads" style="display: inline-block; background: linear-gradient(135deg, #a855f7 0%, #7c3aed 100%); color: white; padding: 16px 40px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; letter-spacing: 0.5px;">
                Access Your Downloads
              </a>
            </td>
          </tr>
  `;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Order Confirmation</title>
  <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700&family=Rajdhani:wght@400;500;600&display=swap" rel="stylesheet">
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: 'Rajdhani', Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #1a1a2e 0%, #16161a 100%); border-radius: 16px; overflow: hidden; border: 1px solid #2d2d2d;">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #1e1e2e 0%, #0d0d0d 100%); padding: 32px 40px; text-align: center; border-bottom: 1px solid #a855f7;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <div style="width: 56px; height: 56px; background: linear-gradient(135deg, #a855f7 0%, #7c3aed 100%); border-radius: 12px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px;">
                      <span style="color: white; font-size: 28px; font-weight: bold; font-family: 'Cinzel', serif; line-height: 56px;">E</span>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; font-family: 'Cinzel', serif; letter-spacing: 2px;">
                      ORDER CONFIRMED
                    </h1>
                    <p style="margin: 8px 0 0 0; color: #a0a0a0; font-size: 14px;">
                      Thank you for your purchase!
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Order Info -->
          <tr>
            <td style="padding: 32px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background: rgba(168, 85, 247, 0.1); border-radius: 12px; border: 1px solid rgba(168, 85, 247, 0.2); padding: 20px;">
                <tr>
                  <td style="padding: 16px;">
                    <p style="margin: 0 0 8px 0; color: #a0a0a0; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Order ID</p>
                    <p style="margin: 0; color: #ffffff; font-size: 14px; font-weight: 600;">${data.orderId}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 0 16px 16px 16px;">
                    <p style="margin: 0 0 8px 0; color: #a0a0a0; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Date</p>
                    <p style="margin: 0; color: #ffffff; font-size: 14px;">${formatDate(data.orderDate)}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Items -->
          <tr>
            <td style="padding: 0 40px 32px 40px;">
              <h2 style="margin: 0 0 16px 0; color: #ffffff; font-size: 18px; font-weight: 600; font-family: 'Cinzel', serif;">
                Your Items
              </h2>
              <table width="100%" cellpadding="0" cellspacing="0" style="background: rgba(255, 255, 255, 0.03); border-radius: 12px; overflow: hidden; border: 1px solid #2d2d2d;">
                <thead>
                  <tr style="background: rgba(168, 85, 247, 0.1);">
                    <th style="padding: 12px 16px; text-align: left; color: #a855f7; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Product</th>
                    <th style="padding: 12px 16px; text-align: right; color: #a855f7; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Price</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsHtml}
                </tbody>
                <tfoot>
                  <tr style="background: rgba(168, 85, 247, 0.15);">
                    <td style="padding: 16px; color: #ffffff; font-weight: 700; font-size: 16px;">Total</td>
                    <td style="padding: 16px; color: #a855f7; font-weight: 700; font-size: 18px; text-align: right;">£${data.total.toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>
            </td>
          </tr>
          
          ${botInstallationNotice}
          
          ${downloadCta}
          
          <!-- Footer -->
          <tr>
            <td style="background: #0d0d0d; padding: 24px 40px; text-align: center; border-top: 1px solid #2d2d2d;">
              <p style="margin: 0 0 8px 0; color: #a0a0a0; font-size: 12px;">
                A receipt is attached to this email for your records.
              </p>
              <p style="margin: 0; color: #606060; font-size: 11px;">
                Questions? Contact us at <a href="mailto:support@eclipserblx.com" style="color: #a855f7; text-decoration: none;">support@eclipserblx.com</a>
              </p>
              <p style="margin: 16px 0 0 0; color: #404040; font-size: 10px;">
                © ${new Date().getFullYear()} Eclipse. All rights reserved.
              </p>
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

  try {
    const data: OrderConfirmationRequest = await req.json();
    logStep("Processing order confirmation", { orderId: data.orderId, email: data.customerEmail });

    // Generate text receipt
    logStep("Generating receipt");
    const receiptText = generateTextReceipt(data);
    const receiptBase64 = btoa(receiptText);
    logStep("Receipt generated successfully");

    // Generate email HTML
    const emailHtml = generateEmailHtml(data);

    // Send email with receipt attachment
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
