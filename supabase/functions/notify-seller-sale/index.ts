import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const resend = new Resend(Deno.env.get("RESEND_API_KEY") as string);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SaleNotificationRequest {
  store_id: string;
  order_id: string;
  product_name: string;
  amount: number;
  buyer_name?: string;
}

interface DisputeNotificationRequest {
  store_id: string;
  order_id: string;
  product_name: string;
  reason: string;
  amount: number;
}

type NotificationRequest = 
  | { type: 'sale' } & SaleNotificationRequest
  | { type: 'dispute' } & DisputeNotificationRequest;

const logStep = (step: string, details?: Record<string, unknown>) => {
  console.log(`[NOTIFY-SELLER-SALE] ${step}`, details ? JSON.stringify(details) : '');
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: NotificationRequest = await req.json();
    logStep("Received request", { type: body.type, store_id: body.store_id });

    // Get store owner info
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('owner_id, name')
      .eq('id', body.store_id)
      .single();

    if (storeError || !store) throw new Error("Store not found");

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('display_name, email')
      .eq('user_id', store.owner_id)
      .single();

    if (profileError || !profile) throw new Error("Seller profile not found");

    let emailContent: { subject: string; title: string; message: string };
    let notificationType: string;
    let notificationTitle: string;
    let notificationMessage: string;

    if (body.type === 'sale') {
      notificationType = 'sale';
      notificationTitle = 'New Sale!';
      notificationMessage = `You sold "${body.product_name}" for £${body.amount.toFixed(2)}${body.buyer_name ? ` to ${body.buyer_name}` : ''}.`;

      emailContent = {
        subject: `You made a sale — ${body.product_name}`,
        title: 'New Sale',
        message: `
          <p style="margin: 0 0 16px 0; font-size: 15px; color: #a3a3a3; line-height: 1.6;">Hi ${profile.display_name},</p>
          <p style="margin: 0 0 16px 0; font-size: 15px; color: #a3a3a3; line-height: 1.6;">
            Someone just purchased <strong style="color: #e4e4e7;">${body.product_name}</strong> from your store.
          </p>
          <div style="background: #1a1a2e; border-radius: 8px; padding: 16px; margin: 0 0 16px 0;">
            <table width="100%" cellspacing="0" cellpadding="0">
              <tr>
                <td style="font-size: 13px; color: #737373; padding-bottom: 8px;">Product</td>
                <td style="font-size: 13px; color: #e4e4e7; text-align: right; padding-bottom: 8px;">${body.product_name}</td>
              </tr>
              <tr>
                <td style="font-size: 13px; color: #737373; padding-bottom: 8px;">Amount</td>
                <td style="font-size: 13px; color: #22c55e; text-align: right; padding-bottom: 8px; font-weight: 600;">£${body.amount.toFixed(2)}</td>
              </tr>
              <tr>
                <td style="font-size: 13px; color: #737373;">Order</td>
                <td style="font-size: 13px; color: #a3a3a3; text-align: right; font-family: monospace;">${body.order_id.substring(0, 8)}...</td>
              </tr>
            </table>
          </div>
          <p style="margin: 0; font-size: 14px; color: #a3a3a3; line-height: 1.6;">
            View your sales in the <a href="https://eclipserblx.com/seller/orders" style="color: #a855f7; text-decoration: none;">Seller Dashboard</a>.
          </p>
        `,
      };
    } else {
      notificationType = 'dispute';
      notificationTitle = 'Dispute Filed';
      notificationMessage = `A dispute has been filed on "${body.product_name}" (£${body.amount.toFixed(2)}). Reason: ${body.reason}`;

      emailContent = {
        subject: `Dispute filed on your product — ${body.product_name}`,
        title: 'Dispute Notification',
        message: `
          <p style="margin: 0 0 16px 0; font-size: 15px; color: #a3a3a3; line-height: 1.6;">Hi ${profile.display_name},</p>
          <p style="margin: 0 0 16px 0; font-size: 15px; color: #a3a3a3; line-height: 1.6;">
            A dispute has been filed on an order involving <strong style="color: #e4e4e7;">${body.product_name}</strong>.
          </p>
          <div style="background: #1a1a2e; border-left: 3px solid #ef4444; border-radius: 0 8px 8px 0; padding: 16px; margin: 0 0 16px 0;">
            <table width="100%" cellspacing="0" cellpadding="0">
              <tr>
                <td style="font-size: 13px; color: #737373; padding-bottom: 8px;">Product</td>
                <td style="font-size: 13px; color: #e4e4e7; text-align: right; padding-bottom: 8px;">${body.product_name}</td>
              </tr>
              <tr>
                <td style="font-size: 13px; color: #737373; padding-bottom: 8px;">Amount</td>
                <td style="font-size: 13px; color: #ef4444; text-align: right; padding-bottom: 8px; font-weight: 600;">£${body.amount.toFixed(2)}</td>
              </tr>
              <tr>
                <td style="font-size: 13px; color: #737373; padding-bottom: 8px;">Reason</td>
                <td style="font-size: 13px; color: #a3a3a3; text-align: right; padding-bottom: 8px;">${body.reason}</td>
              </tr>
            </table>
          </div>
          <p style="margin: 0 0 16px 0; font-size: 14px; color: #a3a3a3; line-height: 1.6;">
            Please review this dispute in your <a href="https://eclipserblx.com/seller/orders" style="color: #a855f7; text-decoration: none;">Seller Dashboard</a>. If the dispute is resolved in the buyer's favour, the sale amount may be reversed.
          </p>
          <p style="margin: 0; font-size: 13px; color: #525252; line-height: 1.6;">
            If you have evidence to support your case, you can submit it via the dashboard or contact support.
          </p>
        `,
      };
    }

    // 1. Create in-app notification
    const { error: notifError } = await supabase
      .from('seller_notifications')
      .insert({
        user_id: store.owner_id,
        type: notificationType,
        title: notificationTitle,
        message: notificationMessage,
        action_url: '/seller/orders',
      });

    if (notifError) {
      logStep("Failed to create in-app notification", { error: notifError.message });
    }

    // 2. Send email
    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0f; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellspacing="0" cellpadding="0" style="background-color: #0a0a0f;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table width="520" cellspacing="0" cellpadding="0" style="max-width: 520px;">
          <tr>
            <td style="padding-bottom: 32px;">
              <span style="font-size: 20px; font-weight: 700; color: #ffffff; letter-spacing: 2px; font-family: Georgia, serif;">ECLIPSE</span>
            </td>
          </tr>
          <tr>
            <td>
              <h1 style="font-size: 22px; font-weight: 600; color: #ffffff; margin: 0 0 20px 0;">${emailContent.title}</h1>
              ${emailContent.message}
              <p style="margin: 24px 0 0 0; font-size: 15px; color: #a3a3a3; line-height: 1.6;">
                Cheers,<br>
                <strong style="color: #e4e4e7;">The Eclipse Team</strong>
              </p>
            </td>
          </tr>
          <tr>
            <td style="border-top: 1px solid #222; padding-top: 24px; margin-top: 32px;">
              <p style="margin: 0; font-size: 11px; color: #404040;">Eclipse &middot; <a href="https://eclipserblx.com" style="color: #737373; text-decoration: none;">eclipserblx.com</a></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    const emailResponse = await resend.emails.send({
      from: "Eclipse <noreply@eclipserblx.com>",
      to: [profile.email],
      subject: emailContent.subject,
      html: emailHtml,
    });

    logStep("Notification sent", { type: body.type, email: emailResponse });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    logStep("Error", { error: error.message });
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
