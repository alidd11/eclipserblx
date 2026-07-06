import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireServiceRole } from "../_shared/auth-guard.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOG = (step: string, d?: unknown) => {
  const s = d ? ` - ${JSON.stringify(d)}` : "";
  console.log(`[FINANCE-NOTIFY] ${step}${s}`);
};

/** Sends an embed to a Discord channel via the bot API */
async function sendBotMessage(channelId: string, embed: Record<string, unknown>, botToken: string) {
  const res = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bot ${botToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ embeds: [embed] }),
  });
  if (!res.ok) {
    const text = await res.text();
    LOG("Bot message failed", { status: res.status, channelId, text });
    return false;
  }
  return true;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders }
  const _unauth = requireServiceRole(req, corsHeaders);
  if (_unauth) return _unauth;
);
  }

  try {
    const botToken = Deno.env.get("DISCORD_CUSTOMER_BOT_TOKEN");
    if (!botToken) throw new Error("DISCORD_CUSTOMER_BOT_TOKEN not set");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { type, data } = await req.json();
    LOG("Received", { type });

    // Resolve customer_id from userId if provided
    let customerId: string | null = null;
    if (data.userId) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("customer_id")
        .eq("user_id", data.userId)
        .maybeSingle();
      customerId = profile?.customer_id || null;
    }

    // Fetch all finance channel IDs (stored as "ch_<id>" to prevent JSONB precision loss)
    const { data: settings } = await supabase
      .from("settings")
      .select("key, value")
      .like("key", "finance_channel_%");

    const channels: Record<string, string> = {};
    for (const s of settings ?? []) {
      const name = s.key.replace("finance_channel_", "");
      let val = typeof s.value === "string" ? s.value : String(s.value);
      val = val.replace(/^"|"$/g, "").replace(/^ch_/, "");
      channels[name] = val;
    }

    let embed: Record<string, unknown> = {};
    let channel = "";

    switch (type) {
      case "new_sale": {
        channel = "sales";
        const { orderId, productNames, total, sellerName, storeName } = data;
        embed = {
          title: "\uD83D\uDCB0 New Sale",
          color: 0x2ecc71,
          fields: [
            { name: "\uD83D\uDCE6 Products", value: (productNames || []).join("\n") || "N/A", inline: false },
            { name: "\uD83C\uDFEA Store", value: storeName || sellerName || "Unknown", inline: true },
            { name: "\uD83D\uDCB7 Total", value: `\u00A3${Number(total || 0).toFixed(2)}`, inline: true },
            ...(customerId ? [{ name: "\uD83D\uDC64 Customer", value: customerId, inline: true }] : []),
          ],
          footer: { text: `Order: ${orderId || "N/A"}` },
          timestamp: new Date().toISOString(),
        };
        break;
      }

      case "dispute_opened": {
        channel = "disputes";
        const { disputeNumber, reason, amount, storeName: store, orderId: oid } = data;
        embed = {
          title: "\u26A0\uFE0F Dispute Opened",
          color: 0xe74c3c,
          fields: [
            { name: "Dispute #", value: disputeNumber || "N/A", inline: true },
            { name: "Amount", value: `\u00A3${Number(amount || 0).toFixed(2)}`, inline: true },
            { name: "Store", value: store || "N/A", inline: true },
            ...(customerId ? [{ name: "\uD83D\uDC64 Customer", value: customerId, inline: true }] : []),
            { name: "Order", value: oid || "N/A", inline: true },
            { name: "Reason", value: (reason || "No reason provided").slice(0, 200), inline: false },
          ],
          timestamp: new Date().toISOString(),
        };
        break;
      }

      case "dispute_escalated": {
        channel = "disputes";
        const { disputeNumber: dn, amount: amt, escalationReason } = data;
        embed = {
          title: "\uD83D\uDD34 Dispute Escalated to Eclipse",
          color: 0xff0000,
          fields: [
            { name: "Dispute #", value: dn || "N/A", inline: true },
            { name: "Amount", value: `\u00A3${Number(amt || 0).toFixed(2)}`, inline: true },
            { name: "Escalation Reason", value: (escalationReason || "N/A").slice(0, 300), inline: false },
          ],
          timestamp: new Date().toISOString(),
        };
        break;
      }

      case "dispute_resolved": {
        channel = "disputes";
        const { disputeNumber: drn, resolution, amount: dra } = data;
        embed = {
          title: "\u2705 Dispute Resolved",
          color: 0x2ecc71,
          fields: [
            { name: "Dispute #", value: drn || "N/A", inline: true },
            { name: "Amount", value: `\u00A3${Number(dra || 0).toFixed(2)}`, inline: true },
            { name: "Resolution", value: resolution || "N/A", inline: false },
          ],
          timestamp: new Date().toISOString(),
        };
        break;
      }

      case "refund_processed": {
        channel = "refunds";
        const { orderId: roi, amount: ra, storeName: rs, reason: rr } = data;
        embed = {
          title: "\uD83D\uDD04 Refund Processed",
          color: 0xf39c12,
          fields: [
            { name: "Amount", value: `\u00A3${Number(ra || 0).toFixed(2)}`, inline: true },
            { name: "Store", value: rs || "N/A", inline: true },
            ...(customerId ? [{ name: "\uD83D\uDC64 Customer", value: customerId, inline: true }] : []),
            { name: "Order", value: roi || "N/A", inline: true },
            { name: "Reason", value: (rr || "N/A").slice(0, 200), inline: false },
          ],
          timestamp: new Date().toISOString(),
        };
        break;
      }

      case "payout_requested": {
        channel = "payouts";
        const { sellerName: pn, storeName: ps, amount: pa, method: pm } = data;
        embed = {
          title: "\uD83D\uDCE4 Payout Requested",
          color: 0x3498db,
          fields: [
            { name: "Seller", value: pn || "N/A", inline: true },
            { name: "Store", value: ps || "N/A", inline: true },
            { name: "Amount", value: `\u00A3${Number(pa || 0).toFixed(2)}`, inline: true },
            { name: "Method", value: pm || "N/A", inline: true },
          ],
          timestamp: new Date().toISOString(),
        };
        break;
      }

      case "payout_completed": {
        channel = "payouts";
        const { sellerName: pcn, amount: pca, method: pcm } = data;
        embed = {
          title: "\u2705 Payout Completed",
          color: 0x2ecc71,
          fields: [
            { name: "Seller", value: pcn || "N/A", inline: true },
            { name: "Amount", value: `\u00A3${Number(pca || 0).toFixed(2)}`, inline: true },
            { name: "Method", value: pcm || "N/A", inline: true },
          ],
          timestamp: new Date().toISOString(),
        };
        break;
      }

      case "payout_failed": {
        channel = "payouts";
        const { sellerName: pfn, amount: pfa, error: pfe } = data;
        embed = {
          title: "\u274C Payout Failed",
          color: 0xe74c3c,
          fields: [
            { name: "Seller", value: pfn || "N/A", inline: true },
            { name: "Amount", value: `\u00A3${Number(pfa || 0).toFixed(2)}`, inline: true },
            { name: "Error", value: (pfe || "Unknown error").slice(0, 300), inline: false },
          ],
          timestamp: new Date().toISOString(),
        };
        break;
      }

      case "security_alert": {
        channel = "security";
        const { alertType, description, userId: sui, ipAddress, severity } = data;
        const colorMap: Record<string, number> = { critical: 0xff0000, high: 0xe74c3c, medium: 0xf39c12, low: 0x3498db };
        embed = {
          title: `\uD83D\uDEE1\uFE0F Security Alert: ${alertType || "Unknown"}`,
          color: colorMap[severity] || 0xe74c3c,
          fields: [
            { name: "Severity", value: (severity || "medium").toUpperCase(), inline: true },
            { name: "User ID", value: sui || "N/A", inline: true },
            ...(ipAddress ? [{ name: "IP Address", value: ipAddress, inline: true }] : []),
            { name: "Details", value: (description || "No details").slice(0, 500), inline: false },
          ],
          timestamp: new Date().toISOString(),
        };
        break;
      }

      case "ip_ban": {
        channel = "security";
        const { ipAddress: bip, reason: br, bannedBy } = data;
        embed = {
          title: "\uD83D\uDEAB IP Banned",
          color: 0xff0000,
          fields: [
            { name: "IP Address", value: bip || "N/A", inline: true },
            { name: "Banned By", value: bannedBy || "System", inline: true },
            { name: "Reason", value: (br || "N/A").slice(0, 300), inline: false },
          ],
          timestamp: new Date().toISOString(),
        };
        break;
      }

      default:
        return new Response(JSON.stringify({ error: `Unknown type: ${type}` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    const channelId = channels[channel];
    if (!channelId) {
      LOG("No channel ID for", { channel });
      return new Response(JSON.stringify({ skipped: true, message: `No channel ID for ${channel}` }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    embed.author = { name: "Eclipse Finances" };
    const sent = await sendBotMessage(channelId, embed, botToken);

    return new Response(JSON.stringify({ success: sent, channel }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    LOG("Error", { error: String(error) });
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
