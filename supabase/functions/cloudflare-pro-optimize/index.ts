import { handleCors, jsonOk, jsonError, internalError } from "../_shared/edge-response.ts";

/**
 * Cloudflare Pro Optimize — applies all Pro-tier settings via the Cloudflare API.
 * Requires CLOUDFLARE_API_TOKEN and CLOUDFLARE_ZONE_ID secrets.
 */

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const cfApiToken = Deno.env.get("CLOUDFLARE_API_TOKEN");
    const cfZoneId = Deno.env.get("CLOUDFLARE_ZONE_ID");

    if (!cfApiToken || !cfZoneId) {
      return jsonError("Missing Cloudflare credentials", 500);
    }

    const headers = {
      Authorization: `Bearer ${cfApiToken}`,
      "Content-Type": "application/json",
    };

    const results: Record<string, unknown> = {};

    // Helper for Cloudflare PATCH settings
    async function patchSetting(endpoint: string, value: unknown, label: string) {
      try {
        const res = await fetch(`https://api.cloudflare.com/client/v4/zones/${cfZoneId}/settings/${endpoint}`, {
          method: "PATCH",
          headers,
          body: JSON.stringify({ value }),
        });
        const data = await res.json();
        if (!data.success) console.error(`[CF] ${label} failed:`, JSON.stringify(data.errors));
        results[label] = { success: data.success, status: res.status };
      } catch (e) {
        results[label] = { success: false, error: (e as Error).message };
      }
    }

    // Helper for Cloudflare API calls with error logging
    const errors: Record<string, unknown> = {};

    async function cfApi(url: string, method: string, body: unknown, label: string) {
      try {
        const res = await fetch(url, {
          method,
          headers,
          body: body ? JSON.stringify(body) : undefined,
        });
        const data = await res.json();
        if (!data.success) {
          errors[label] = { status: res.status, errors: data.errors, messages: data.messages };
        }
        return { data, status: res.status };
      } catch (e) {
        errors[label] = { exception: (e as Error).message };
        return { data: { success: false }, status: 0, error: (e as Error).message };
      }
    }

    // ─── 1. SPEED SETTINGS ───────────────────────────────────────

    await Promise.all([
      patchSetting("polish", "lossy", "polish"),
      patchSetting("webp", "on", "webp"),
      patchSetting("brotli", "on", "brotli"),
      patchSetting("early_hints", "on", "early_hints"),
      patchSetting("h2_prioritization", "on", "h2_prioritization"),
      patchSetting("http3", "on", "http3"),
      patchSetting("0rtt", "on", "0rtt"),
      patchSetting("speed_brain", "on", "speed_brain"),
      patchSetting("rocket_loader", "off", "rocket_loader_off"),
      patchSetting("mirage", "off", "mirage_off"),
      patchSetting("minify", { js: "on", css: "on", html: "on" }, "auto_minify"),
      patchSetting("always_online", "on", "always_online"),
      patchSetting("email_obfuscation", "on", "email_obfuscation"),
      patchSetting("server_side_exclude", "on", "server_side_exclude"),
      patchSetting("browser_check", "on", "browser_check"),
    ]);

    // ─── 2. SUPER BOT FIGHT MODE (Pro) ──────────────────────────

    // First GET current config, then PATCH only supported fields
    try {
      const getBot = await cfApi(
        `https://api.cloudflare.com/client/v4/zones/${cfZoneId}/bot_management`,
        "GET", null, "bot_management_get"
      );
      console.log("[CF] Current bot_management:", JSON.stringify(getBot.data?.result || {}));

      // Pro tier: only sbfm_definitely_automated, sbfm_verified_bots, sbfm_static_resource_protection, enable_js
      // fight_mode is Free-only, sbfm_likely_automated is Business+ only
      const botUpdate = await cfApi(
        `https://api.cloudflare.com/client/v4/zones/${cfZoneId}/bot_management`,
        "PUT",
        {
          enable_js: true,
          sbfm_definitely_automated: "block",
          sbfm_verified_bots: "allow",
          sbfm_static_resource_protection: false,
        },
        "super_bot_fight_mode"
      );
      results["super_bot_fight_mode"] = { success: botUpdate.data.success, status: botUpdate.status };
    } catch (e) {
      results["super_bot_fight_mode"] = { success: false, error: (e as Error).message };
    }

    // ─── 3. CACHE RULES (Rulesets API) ───────────────────────────

    try {
      const listRes = await cfApi(
        `https://api.cloudflare.com/client/v4/zones/${cfZoneId}/rulesets`,
        "GET", null, "list_rulesets"
      );
      const allRulesets = listRes.data.result || [];

      const cacheRules = [
        {
          description: "Cache static assets aggressively (Pro)",
          expression: '(http.request.uri.path contains "/assets/" or http.request.uri.path.extension in {"js" "css" "woff2" "woff" "webp" "png" "jpg" "jpeg" "svg" "ico" "gif" "avif"})',
          action: "set_cache_settings",
          action_parameters: {
            cache: true,
            edge_ttl: { mode: "override_origin", default: 2592000 },
            browser_ttl: { mode: "override_origin", default: 31536000 },
          },
        },
        {
          description: "Cache fonts immutably (Pro)",
          expression: 'http.request.uri.path contains "/fonts/"',
          action: "set_cache_settings",
          action_parameters: {
            cache: true,
            edge_ttl: { mode: "override_origin", default: 31536000 },
            browser_ttl: { mode: "override_origin", default: 31536000 },
          },
        },
        {
          description: "Bypass cache for HTML/SPA (Pro)",
          expression: '(http.request.uri.path eq "/" or not http.request.uri.path contains ".")',
          action: "set_cache_settings",
          action_parameters: {
            cache: false,
          },
        },
      ];

      const existingCache = allRulesets.find((r: any) => r.phase === "http_request_cache_settings");
      const cachePayload = {
        name: "Eclipse Pro Cache Rules",
        kind: "zone",
        phase: "http_request_cache_settings",
        rules: cacheRules,
      };

      if (existingCache) {
        const r = await cfApi(
          `https://api.cloudflare.com/client/v4/zones/${cfZoneId}/rulesets/${existingCache.id}`,
          "PUT", cachePayload, "cache_rules"
        );
        results["cache_rules"] = { success: r.data.success, action: "updated", status: r.status };
      } else {
        const r = await cfApi(
          `https://api.cloudflare.com/client/v4/zones/${cfZoneId}/rulesets`,
          "POST", cachePayload, "cache_rules"
        );
        results["cache_rules"] = { success: r.data.success, action: "created", status: r.status };
      }
    } catch (e) {
      results["cache_rules"] = { success: false, error: (e as Error).message };
    }

    // ─── 4. REDIRECT RULES (Single Redirect phase) ─────────────

    try {
      const listRes = await cfApi(
        `https://api.cloudflare.com/client/v4/zones/${cfZoneId}/rulesets`,
        "GET", null, "list_rulesets_redirect"
      );
      const allRulesets = listRes.data.result || [];

      const redirectRules = [
        {
          description: "www to root redirect (301)",
          expression: '(http.host eq "www.eclipserblx.com")',
          action: "redirect",
          action_parameters: {
            from_value: {
              target_url: {
                expression: 'concat("https://eclipserblx.com", http.request.uri.path)',
              },
              status_code: 301,
              preserve_query_string: true,
            },
          },
        },
      ];

      // "Single Redirect" permission maps to http_request_dynamic_redirect phase
      const existingRedirect = allRulesets.find((r: any) =>
        r.phase === "http_request_dynamic_redirect"
      );

      if (existingRedirect) {
        const r = await cfApi(
          `https://api.cloudflare.com/client/v4/zones/${cfZoneId}/rulesets/${existingRedirect.id}`,
          "PUT",
          {
            name: existingRedirect.name || "Eclipse Redirect Rules",
            kind: existingRedirect.kind || "zone",
            phase: "http_request_dynamic_redirect",
            rules: redirectRules,
          },
          "redirect_rules"
        );
        results["redirect_rules"] = { success: r.data.success, action: "updated", status: r.status };
      } else {
        const r = await cfApi(
          `https://api.cloudflare.com/client/v4/zones/${cfZoneId}/rulesets`,
          "POST",
          {
            name: "Eclipse Redirect Rules",
            kind: "zone",
            phase: "http_request_dynamic_redirect",
            rules: redirectRules,
          },
          "redirect_rules"
        );
        results["redirect_rules"] = { success: r.data.success, action: "created", status: r.status };
      }
    } catch (e) {
      results["redirect_rules"] = { success: false, error: (e as Error).message };
    }

    // ─── 5. TRANSFORM RULES (Response Headers) ──────────────────

    try {
      const listRes = await cfApi(
        `https://api.cloudflare.com/client/v4/zones/${cfZoneId}/rulesets`,
        "GET", null, "list_rulesets_transform"
      );
      const allRulesets = listRes.data.result || [];

      const transformRules = [
        {
          description: "Security headers on all responses",
          expression: "true",
          action: "rewrite",
          action_parameters: {
            headers: {
              "X-Content-Type-Options": { operation: "set", value: "nosniff" },
              "X-Frame-Options": { operation: "set", value: "SAMEORIGIN" },
              "Referrer-Policy": { operation: "set", value: "strict-origin-when-cross-origin" },
              "Permissions-Policy": { operation: "set", value: "camera=(), microphone=(), geolocation=()" },
            },
          },
        },
        {
          description: "noindex for admin/seller/staff paths",
          expression: '(starts_with(http.request.uri.path, "/admin") or starts_with(http.request.uri.path, "/seller") or starts_with(http.request.uri.path, "/ip-staff") or starts_with(http.request.uri.path, "/global-guard"))',
          action: "rewrite",
          action_parameters: {
            headers: {
              "X-Robots-Tag": { operation: "set", value: "noindex, nofollow" },
            },
          },
        },
      ];

      const existingTransform = allRulesets.find((r: any) => r.phase === "http_response_headers_transform");

      if (existingTransform) {
        // Preserve original name and kind when updating
        const r = await cfApi(
          `https://api.cloudflare.com/client/v4/zones/${cfZoneId}/rulesets/${existingTransform.id}`,
          "PUT",
          {
            name: existingTransform.name,
            kind: existingTransform.kind,
            phase: "http_response_headers_transform",
            rules: transformRules,
          },
          "transform_rules"
        );
        results["transform_rules"] = { success: r.data.success, action: "updated", status: r.status };
      } else {
        const r = await cfApi(
          `https://api.cloudflare.com/client/v4/zones/${cfZoneId}/rulesets`,
          "POST", transformPayload, "transform_rules"
        );
        results["transform_rules"] = { success: r.data.success, action: "created", status: r.status };
      }
    } catch (e) {
      results["transform_rules"] = { success: false, error: (e as Error).message };
    }

    // ─── 6. WAF CUSTOM RULES ─────────────────────────────────────

    try {
      const listRes = await cfApi(
        `https://api.cloudflare.com/client/v4/zones/${cfZoneId}/rulesets`,
        "GET", null, "list_rulesets_waf"
      );
      const allRulesets = listRes.data.result || [];

      // Simple rules without rate limiting (rate limit rules have stricter API requirements)
      const wafRules = [
        {
          description: "Challenge admin/staff paths",
          expression: '(starts_with(http.request.uri.path, "/admin") or starts_with(http.request.uri.path, "/ip-staff") or starts_with(http.request.uri.path, "/global-guard"))',
          action: "managed_challenge",
          action_parameters: {},
        },
      ];

      const existingWaf = allRulesets.find((r: any) => r.phase === "http_request_firewall_custom");

      if (existingWaf) {
        // Get existing rules and merge
        const currentRes = await cfApi(
          `https://api.cloudflare.com/client/v4/zones/${cfZoneId}/rulesets/${existingWaf.id}`,
          "GET", null, "waf_get_existing"
        );
        const existingRules = currentRes.data.result?.rules || [];
        console.log("[CF] Existing WAF rules:", existingRules.length);

        const ourDescriptions = new Set(wafRules.map((r) => r.description));
        const filteredExisting = existingRules
          .filter((r: any) => !ourDescriptions.has(r.description))
          .map(({ id, version, last_updated, ref, categories, ...r }: any) => r);

        const mergedRules = [...filteredExisting, ...wafRules];

        const r = await cfApi(
          `https://api.cloudflare.com/client/v4/zones/${cfZoneId}/rulesets/${existingWaf.id}`,
          "PUT",
          {
            name: "Eclipse Pro WAF Custom Rules",
            kind: "zone",
            phase: "http_request_firewall_custom",
            rules: mergedRules,
          },
          "waf_custom_rules"
        );
        results["waf_custom_rules"] = { success: r.data.success, action: "updated", status: r.status };
      } else {
        const r = await cfApi(
          `https://api.cloudflare.com/client/v4/zones/${cfZoneId}/rulesets`,
          "POST",
          {
            name: "Eclipse Pro WAF Custom Rules",
            kind: "zone",
            phase: "http_request_firewall_custom",
            rules: wafRules,
          },
          "waf_custom_rules"
        );
        results["waf_custom_rules"] = { success: r.data.success, action: "created", status: r.status };
      }
    } catch (e) {
      results["waf_custom_rules"] = { success: false, error: (e as Error).message };
    }

    // ─── 7. ENABLE OWASP MANAGED RULESET (Pro) ──────────────────
    // Managed WAF rulesets are deployed via the zone-level entrypoint.
    // Find existing or create new entrypoint.

    try {
      const OWASP_RULESET_ID = "4814384a9e5d4991b9815dcfc25d2f1f";
      const CF_MANAGED_RULESET_ID = "efb7b8c949ac4650a09736fc376e9aee";

      const managedRules = [
        {
          description: "Deploy Cloudflare Managed Ruleset",
          action: "execute",
          action_parameters: { id: CF_MANAGED_RULESET_ID },
          expression: "true",
          enabled: true,
        },
        {
          description: "Deploy OWASP Core Ruleset (Pro)",
          action: "execute",
          action_parameters: { id: OWASP_RULESET_ID },
          expression: "true",
          enabled: true,
        },
      ];

      // Use the zone entrypoint API directly — avoids stale ruleset ID issues
      const r = await cfApi(
        `https://api.cloudflare.com/client/v4/zones/${cfZoneId}/rulesets/phases/http_request_firewall_managed/entrypoint`,
        "PUT",
        {
          rules: managedRules,
        },
        "owasp_managed_ruleset"
      );
      results["owasp_managed_ruleset"] = { success: r.data.success, status: r.status };
    } catch (e) {
      results["owasp_managed_ruleset"] = { success: false, error: (e as Error).message };
    }

    // ─── 8. CRAWLER HINTS (Pro) ──────────────────────────────────

    results["crawler_hints"] = { note: "Enable manually: Speed → Optimization → Content Optimization → Crawler Hints" };

    // ─── SUMMARY ─────────────────────────────────────────────────

    const successCount = Object.values(results).filter((r: any) => r.success === true).length;
    const totalCount = Object.keys(results).length;

    return jsonOk({
      success: true,
      summary: `${successCount}/${totalCount} settings applied successfully`,
      results,
      error_details: Object.keys(errors).length > 0 ? errors : undefined,
      manual_steps: [
        "Verify Smart Tiered Caching is enabled (Caching → Tiered Cache)",
        "Verify HSTS is configured (SSL/TLS → Edge Certificates)",
        "Enable Crawler Hints (Speed → Optimization → Content Optimization)",
      ],
    });
  } catch (error) {
    return internalError(error, "Cloudflare Pro optimization failed");
  }
});
