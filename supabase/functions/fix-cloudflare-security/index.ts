import { handleCors, jsonOk, internalError } from "../_shared/edge-response.ts";

Deno.serve(async (req) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  try {
    const CF_TOKEN = Deno.env.get("CLOUDFLARE_API_TOKEN");
    const CF_ZONE_ID = Deno.env.get("CLOUDFLARE_ZONE_ID");
    if (!CF_TOKEN || !CF_ZONE_ID) return jsonOk({ error: "Missing secrets" }, 500);

    const headers = {
      Authorization: `Bearer ${CF_TOKEN}`,
      "Content-Type": "application/json",
    };
    const zoneBase = `https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}`;
    const results: Record<string, any> = {};

    // 1. Set Security Level to "medium" (prevents excessive challenges)
    const secResp = await fetch(`${zoneBase}/settings/security_level`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ value: "medium" }),
    });
    results.security_level = await secResp.json();

    // 2. Disable Browser Integrity Check (can trigger challenges on legit traffic)
    const bicResp = await fetch(`${zoneBase}/settings/browser_check`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ value: "off" }),
    });
    results.browser_check = await bicResp.json();

    // 3. Set Challenge Passage TTL to max (1 year = 31536000 seconds)
    const cttlResp = await fetch(`${zoneBase}/settings/challenge_ttl`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ value: 31536000 }),
    });
    results.challenge_ttl = await cttlResp.json();

    // 4. Check and configure Super Bot Fight Mode (SBFM) - set to allow
    // Get current bot management config
    const botResp = await fetch(`${zoneBase}/bot_management`, {
      method: "GET",
      headers,
    });
    const botData = await botResp.json();
    results.current_bot_config = botData.result;

    // Try to update SBFM to be less aggressive
    const botUpdateResp = await fetch(`${zoneBase}/bot_management`, {
      method: "PUT",
      headers,
      body: JSON.stringify({
        fight_mode: false,
        sbfm_definitely_automated: "allow",
        sbfm_likely_automated: "allow",
        sbfm_verified_bots: "allow",
        sbfm_static_resource_protection: false,
      }),
    });
    results.bot_management_update = await botUpdateResp.json();

    // 5. Check for any WAF custom rules that might be causing challenges
    const wafResp = await fetch(
      `${zoneBase}/rulesets/phases/http_request_firewall_custom/entrypoint`,
      { headers }
    );
    const wafData = await wafResp.json();
    const wafRules = wafData.result?.rules || [];
    results.waf_custom_rules = wafRules.map((r: any) => ({
      id: r.id,
      description: r.description,
      action: r.action,
      expression: r.expression,
      enabled: r.enabled,
    }));

    // 5b. Disable the "Challenge admin/staff paths" rule if it exists
    const rulesetId = wafData.result?.id;
    const adminChallengeRule = wafRules.find(
      (r: any) => r.action === "managed_challenge" && r.expression?.includes("/admin")
    );
    if (rulesetId && adminChallengeRule) {
      const updatedRules = wafRules.map((r: any) =>
        r.id === adminChallengeRule.id ? { ...r, enabled: false } : r
      );
      const disableResp = await fetch(
        `${zoneBase}/rulesets/${rulesetId}`,
        {
          method: "PUT",
          headers,
          body: JSON.stringify({ rules: updatedRules }),
        }
      );
      results.admin_challenge_disabled = await disableResp.json();
    } else {
      results.admin_challenge_disabled = "Rule not found or already disabled";
    }

    // 6. Read current settings to confirm
    const settingsToCheck = ["security_level", "challenge_ttl", "browser_check"];
    const currentSettings: Record<string, any> = {};
    for (const setting of settingsToCheck) {
      const resp = await fetch(`${zoneBase}/settings/${setting}`, { headers });
      const data = await resp.json();
      currentSettings[setting] = data.result?.value;
    }
    results.confirmed_settings = currentSettings;

    return jsonOk({
      message: "Security settings updated to reduce verification challenges",
      changes: {
        security_level: "medium (was possibly high/under_attack)",
        browser_check: "off",
        challenge_ttl: "1 year (max)",
        bot_fight_mode: "disabled/allow all",
      },
      results,
    });
  } catch (e) {
    return internalError(e);
  }
});
