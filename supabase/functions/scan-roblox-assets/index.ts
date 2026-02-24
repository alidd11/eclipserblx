import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SCAN-ROBLOX-ASSETS] ${step}${detailsStr}`);
};

// Roblox API: get asset details including creator info
async function getRobloxAssetDetails(assetId: string): Promise<{
  success: boolean;
  assetName?: string;
  creatorId?: string;
  creatorName?: string;
  creatorType?: string;
  error?: string;
}> {
  try {
    const res = await fetch(
      `https://economy.roblox.com/v2/assets/${assetId}/details`,
      { headers: { Accept: "application/json" } }
    );

    if (!res.ok) {
      if (res.status === 404) {
        return { success: false, error: "Asset not found" };
      }
      return { success: false, error: `Roblox API error: ${res.status}` };
    }

    const data = await res.json();
    return {
      success: true,
      assetName: data.Name,
      creatorId: String(data.Creator?.Id),
      creatorName: data.Creator?.Name,
      creatorType: data.Creator?.CreatorType,
    };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  // Create scan run record
  const { data: scanRun, error: scanRunError } = await supabaseClient
    .from("ip_monitor_scan_runs")
    .insert({ status: "running" })
    .select()
    .single();

  if (scanRunError) {
    logStep("ERROR creating scan run", scanRunError);
    return new Response(JSON.stringify({ error: "Failed to create scan run" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const scanRunId = scanRun.id;
  logStep("Scan run started", { scanRunId });

  try {
    // Get all IP Shield subscribers with monitoring enabled (pro + enterprise)
    // We need to check which creators have active subscriptions with monitoring
    // For now, fetch all registry entries that have roblox_asset_ids
    const { data: registryEntries, error: registryError } = await supabaseClient
      .from("creator_ip_registry")
      .select("id, creator_id, title, roblox_asset_ids")
      .not("roblox_asset_ids", "is", null);

    if (registryError) {
      throw new Error(`Failed to fetch registry: ${registryError.message}`);
    }

    if (!registryEntries || registryEntries.length === 0) {
      logStep("No registry entries with Roblox asset IDs found");
      await supabaseClient.from("ip_monitor_scan_runs").update({
        status: "completed",
        completed_at: new Date().toISOString(),
        total_assets_scanned: 0,
        total_alerts_generated: 0,
      }).eq("id", scanRunId);

      return new Response(JSON.stringify({ message: "No assets to scan" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Collect unique creator IDs to check subscription status
    const creatorIds = [...new Set(registryEntries.map(e => e.creator_id))];

    // Get Roblox user IDs linked to each creator (from profiles)
    const { data: profiles } = await supabaseClient
      .from("profiles")
      .select("user_id, roblox_user_id, email, display_name")
      .in("user_id", creatorIds);

    const profileMap = new Map(
      (profiles || []).map(p => [p.user_id, p])
    );

    let totalScanned = 0;
    let totalAlerts = 0;
    const alertsByCreator: Map<string, Array<{
      assetId: string;
      assetName: string;
      registryTitle: string;
      currentOwnerName: string;
      currentOwnerId: string;
    }>> = new Map();

    // Scan each registry entry's asset IDs
    for (const entry of registryEntries) {
      if (!entry.roblox_asset_ids || entry.roblox_asset_ids.length === 0) continue;

      const creatorProfile = profileMap.get(entry.creator_id);
      const creatorRobloxId = creatorProfile?.roblox_user_id;

      if (!creatorRobloxId) {
        logStep("Creator has no linked Roblox account, skipping", { creatorId: entry.creator_id });
        continue;
      }

      for (const assetId of entry.roblox_asset_ids) {
        totalScanned++;

        // Rate limit: small delay between API calls
        if (totalScanned > 1) {
          await new Promise(r => setTimeout(r, 500));
        }

        const assetDetails = await getRobloxAssetDetails(assetId);

        if (!assetDetails.success) {
          logStep("Failed to fetch asset", { assetId, error: assetDetails.error });
          continue;
        }

        // Compare creator - check if the asset's creator matches the registered creator's Roblox ID
        if (assetDetails.creatorId && assetDetails.creatorId !== creatorRobloxId) {
          logStep("MISMATCH DETECTED", {
            assetId,
            expectedRobloxId: creatorRobloxId,
            actualCreatorId: assetDetails.creatorId,
            actualCreatorName: assetDetails.creatorName,
          });

          // Check if we already have an alert for this exact asset + creator combo (avoid duplicates)
          const { data: existingAlert } = await supabaseClient
            .from("ip_monitor_alerts")
            .select("id")
            .eq("registry_entry_id", entry.id)
            .eq("roblox_asset_id", assetId)
            .eq("current_owner_id", assetDetails.creatorId)
            .is("dismissed_at", null)
            .limit(1);

          if (existingAlert && existingAlert.length > 0) {
            logStep("Alert already exists, skipping", { assetId });
            continue;
          }

          // Insert alert
          await supabaseClient.from("ip_monitor_alerts").insert({
            registry_entry_id: entry.id,
            creator_id: entry.creator_id,
            roblox_asset_id: assetId,
            alert_type: "ownership_mismatch",
            current_owner_id: assetDetails.creatorId,
            current_owner_name: assetDetails.creatorName,
            asset_name: assetDetails.assetName,
            details: {
              creator_type: assetDetails.creatorType,
              expected_roblox_id: creatorRobloxId,
              registry_title: entry.title,
            },
          });

          totalAlerts++;

          // Group alerts by creator for email batching
          if (!alertsByCreator.has(entry.creator_id)) {
            alertsByCreator.set(entry.creator_id, []);
          }
          alertsByCreator.get(entry.creator_id)!.push({
            assetId,
            assetName: assetDetails.assetName || assetId,
            registryTitle: entry.title,
            currentOwnerName: assetDetails.creatorName || "Unknown",
            currentOwnerId: assetDetails.creatorId || "Unknown",
          });
        }
      }
    }

    logStep("Scan complete", { totalScanned, totalAlerts });

    // Send email alerts per creator
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (resendApiKey && alertsByCreator.size > 0) {
      for (const [creatorId, alerts] of alertsByCreator) {
        const profile = profileMap.get(creatorId);
        if (!profile?.email) {
          logStep("No email for creator, skipping notification", { creatorId });
          continue;
        }

        const alertRows = alerts
          .map(
            a =>
              `<tr>
                <td style="padding: 10px 12px; border-bottom: 1px solid #1a1a2e; color: #e4e4e7; font-size: 14px;">${a.assetName}</td>
                <td style="padding: 10px 12px; border-bottom: 1px solid #1a1a2e; color: #a3a3a3; font-size: 14px;">${a.assetId}</td>
                <td style="padding: 10px 12px; border-bottom: 1px solid #1a1a2e; color: #ef4444; font-size: 14px;">${a.currentOwnerName}</td>
              </tr>`
          )
          .join("");

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
        <table width="600" cellspacing="0" cellpadding="0" style="max-width: 600px;">
          <tr>
            <td style="padding-bottom: 32px;">
              <span style="font-size: 20px; font-weight: 700; color: #ffffff; letter-spacing: 2px; font-family: Georgia, serif;">ECLIPSE</span>
              <span style="font-size: 12px; color: #a855f7; margin-left: 8px; font-weight: 600;">IP SHIELD</span>
            </td>
          </tr>
          <tr>
            <td>
              <h1 style="font-size: 22px; font-weight: 600; color: #ffffff; margin: 0 0 20px 0;">⚠️ IP Monitor Alert</h1>
              <p style="margin: 0 0 16px 0; font-size: 15px; color: #a3a3a3; line-height: 1.6;">
                Hi ${profile.display_name || "there"},
              </p>
              <p style="margin: 0 0 16px 0; font-size: 15px; color: #a3a3a3; line-height: 1.6;">
                Our weekly scan detected <strong style="color: #ef4444;">${alerts.length} Roblox asset(s)</strong> registered in your IP Registry that appear to be owned by a different account. This could indicate unauthorized re-uploads of your work.
              </p>
              <table width="100%" cellspacing="0" cellpadding="0" style="background: #111118; border-radius: 8px; overflow: hidden; margin: 20px 0;">
                <thead>
                  <tr style="background: #1a1a2e;">
                    <th style="padding: 10px 12px; text-align: left; color: #737373; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Asset</th>
                    <th style="padding: 10px 12px; text-align: left; color: #737373; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">ID</th>
                    <th style="padding: 10px 12px; text-align: left; color: #737373; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Current Owner</th>
                  </tr>
                </thead>
                <tbody>${alertRows}</tbody>
              </table>
              <p style="margin: 0 0 20px 0; font-size: 15px; color: #a3a3a3; line-height: 1.6;">
                You can file a takedown request directly from your IP Shield dashboard to address these potential infringements.
              </p>
              <a href="https://eclipserblx.com/ip-shield" style="display: inline-block; background: #a855f7; color: #ffffff; padding: 12px 28px; text-decoration: none; font-weight: 600; font-size: 14px; border-radius: 6px;">
                View IP Shield Dashboard
              </a>
              <p style="margin: 24px 0 0 0; font-size: 13px; color: #525252;">
                This is an automated scan. If these are expected (e.g. group-owned assets), you can dismiss the alerts in your dashboard.
              </p>
            </td>
          </tr>
          <tr>
            <td style="border-top: 1px solid #222; padding-top: 24px; margin-top: 32px;">
              <p style="margin: 0; font-size: 11px; color: #404040;">Eclipse &middot; IP Shield Monitoring &middot; <a href="https://eclipserblx.com" style="color: #737373; text-decoration: none;">eclipserblx.com</a></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

        try {
          const emailRes = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${resendApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: "Eclipse IP Shield <noreply@eclipserblx.com>",
              to: [profile.email],
              subject: `⚠️ IP Alert: ${alerts.length} asset(s) flagged in your registry`,
              html: emailHtml,
            }),
          });

          if (emailRes.ok) {
            logStep("Email sent", { creatorId, email: profile.email });
            // Mark alerts as emailed
            const alertIds = alerts.map(a => a.assetId);
            await supabaseClient
              .from("ip_monitor_alerts")
              .update({ emailed_at: new Date().toISOString() })
              .eq("creator_id", creatorId)
              .in("roblox_asset_id", alertIds)
              .is("emailed_at", null);
          } else {
            logStep("Email failed", { creatorId, status: emailRes.status });
          }
        } catch (emailErr) {
          logStep("Email error", { creatorId, error: String(emailErr) });
        }
      }
    }

    // Update scan run as completed
    await supabaseClient.from("ip_monitor_scan_runs").update({
      status: "completed",
      completed_at: new Date().toISOString(),
      total_assets_scanned: totalScanned,
      total_alerts_generated: totalAlerts,
    }).eq("id", scanRunId);

    return new Response(
      JSON.stringify({
        success: true,
        scan_run_id: scanRunId,
        total_scanned: totalScanned,
        total_alerts: totalAlerts,
        creators_notified: alertsByCreator.size,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("SCAN ERROR", { message: errorMessage });

    await supabaseClient.from("ip_monitor_scan_runs").update({
      status: "failed",
      completed_at: new Date().toISOString(),
      error_message: errorMessage,
    }).eq("id", scanRunId);

    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
