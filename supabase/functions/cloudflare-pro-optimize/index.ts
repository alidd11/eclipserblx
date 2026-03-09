import { handleCors, jsonOk, jsonError, internalError } from "../_shared/edge-response.ts";

/**
 * Cloudflare Pro Optimize — applies all Pro-tier settings via the Cloudflare API.
 * Requires CLOUDFLARE_API_TOKEN and CLOUDFLARE_ZONE_ID secrets.
 *
 * Configures: Polish, Super Bot Fight Mode, speed settings, cache rules,
 * redirect rules, transform rules (security + SEO headers), and Crawler Hints.
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
        results[label] = { success: data.success, status: res.status };
      } catch (e) {
        results[label] = { success: false, error: (e as Error).message };
      }
    }

    // ─── 1. SPEED SETTINGS ───────────────────────────────────────

    // Polish — lossy mode (Pro feature) — auto-compresses images at edge
    await Promise.all([
      patchSetting("polish", "lossy", "polish"),
      patchSetting("webp", "on", "webp"),
      patchSetting("brotli", "on", "brotli"),
      patchSetting("early_hints", "on", "early_hints"),
      patchSetting("h2_prioritization", "on", "h2_prioritization"),
      patchSetting("http3", "on", "http3"),
      patchSetting("0rtt", "on", "0rtt"),
      patchSetting("speed_brain", "on", "speed_brain"),
      // Keep these OFF — they break SPAs
      patchSetting("rocket_loader", "off", "rocket_loader_off"),
      patchSetting("mirage", "off", "mirage_off"),
      // Auto minify
      patchSetting("minify", { js: "on", css: "on", html: "on" }, "auto_minify"),
      // Always Online
      patchSetting("always_online", "on", "always_online"),
      // Email obfuscation
      patchSetting("email_obfuscation", "on", "email_obfuscation"),
      // Server side excludes
      patchSetting("server_side_exclude", "on", "server_side_exclude"),
      // Browser integrity check
      patchSetting("browser_check", "on", "browser_check"),
    ]);

    // ─── 2. SUPER BOT FIGHT MODE (Pro) ──────────────────────────

    try {
      const botRes = await fetch(
        `https://api.cloudflare.com/client/v4/zones/${cfZoneId}/bot_management`,
        {
          method: "PUT",
          headers,
          body: JSON.stringify({
            fight_mode: true,
            sbfm_definitely_automated: "block",
            sbfm_likely_automated: "managed_challenge",
            sbfm_verified_bots: "allow",
            sbfm_static_resource_protection: false,
            suppress_session_score: false,
          }),
        }
      );
      const botData = await botRes.json();
      results["super_bot_fight_mode"] = { success: botData.success, status: botRes.status };
    } catch (e) {
      results["super_bot_fight_mode"] = { success: false, error: (e as Error).message };
    }

    // ─── 3. CACHE RULES (Rulesets API) ───────────────────────────

    try {
      // First, check for existing http_request_cache_settings ruleset
      const existingRulesetsRes = await fetch(
        `https://api.cloudflare.com/client/v4/zones/${cfZoneId}/rulesets?phase=http_request_cache_settings`,
        { headers }
      );
      const existingRulesets = await existingRulesetsRes.json();

      const cacheRules = [
        {
          description: "Cache static assets aggressively (Pro)",
          expression: '(http.request.uri.path contains "/assets/" or http.request.uri.path.extension in {"js" "css" "woff2" "woff" "webp" "png" "jpg" "jpeg" "svg" "ico" "gif" "avif"})',
          action: "set_cache_settings",
          action_parameters: {
            cache: true,
            edge_ttl: { mode: "override_origin", default: 2592000 }, // 30 days
            browser_ttl: { mode: "override_origin", default: 31536000 }, // 1 year
          },
        },
        {
          description: "Cache fonts immutably (Pro)",
          expression: 'http.request.uri.path contains "/fonts/"',
          action: "set_cache_settings",
          action_parameters: {
            cache: true,
            edge_ttl: { mode: "override_origin", default: 31536000 }, // 365 days
            browser_ttl: { mode: "override_origin", default: 31536000 },
          },
        },
        {
          description: "Bypass cache for HTML/SPA (Pro)",
          expression: '(http.request.uri.path eq "/" or not http.request.uri.path contains ".")',
          action: "set_cache_settings",
          action_parameters: {
            cache: false,
            browser_ttl: { mode: "override_origin", default: 0 },
          },
        },
      ];

      // If ruleset exists, update it; otherwise create
      const existingRuleset = existingRulesets.result?.find((r: any) => r.phase === "http_request_cache_settings");

      if (existingRuleset) {
        const updateRes = await fetch(
          `https://api.cloudflare.com/client/v4/zones/${cfZoneId}/rulesets/${existingRuleset.id}`,
          {
            method: "PUT",
            headers,
            body: JSON.stringify({
              name: "Eclipse Pro Cache Rules",
              kind: "zone",
              phase: "http_request_cache_settings",
              rules: cacheRules,
            }),
          }
        );
        const updateData = await updateRes.json();
        results["cache_rules"] = { success: updateData.success, action: "updated", status: updateRes.status };
      } else {
        const createRes = await fetch(
          `https://api.cloudflare.com/client/v4/zones/${cfZoneId}/rulesets`,
          {
            method: "POST",
            headers,
            body: JSON.stringify({
              name: "Eclipse Pro Cache Rules",
              kind: "zone",
              phase: "http_request_cache_settings",
              rules: cacheRules,
            }),
          }
        );
        const createData = await createRes.json();
        results["cache_rules"] = { success: createData.success, action: "created", status: createRes.status };
      }
    } catch (e) {
      results["cache_rules"] = { success: false, error: (e as Error).message };
    }

    // ─── 4. REDIRECT RULES ───────────────────────────────────────

    try {
      const existingRedirectRes = await fetch(
        `https://api.cloudflare.com/client/v4/zones/${cfZoneId}/rulesets?phase=http_request_dynamic_redirect`,
        { headers }
      );
      const existingRedirects = await existingRedirectRes.json();

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
        {
          description: "Trailing slash normalization",
          expression: '(ends_with(http.request.uri.path, "/") and http.request.uri.path ne "/")',
          action: "redirect",
          action_parameters: {
            from_value: {
              target_url: {
                expression: 'concat("https://eclipserblx.com", substring(http.request.uri.path, 0, -1))',
              },
              status_code: 301,
              preserve_query_string: true,
            },
          },
        },
      ];

      const existingRedirect = existingRedirects.result?.find((r: any) => r.phase === "http_request_dynamic_redirect");

      if (existingRedirect) {
        const updateRes = await fetch(
          `https://api.cloudflare.com/client/v4/zones/${cfZoneId}/rulesets/${existingRedirect.id}`,
          {
            method: "PUT",
            headers,
            body: JSON.stringify({
              name: "Eclipse Pro Redirect Rules",
              kind: "zone",
              phase: "http_request_dynamic_redirect",
              rules: redirectRules,
            }),
          }
        );
        const updateData = await updateRes.json();
        results["redirect_rules"] = { success: updateData.success, action: "updated", status: updateRes.status };
      } else {
        const createRes = await fetch(
          `https://api.cloudflare.com/client/v4/zones/${cfZoneId}/rulesets`,
          {
            method: "POST",
            headers,
            body: JSON.stringify({
              name: "Eclipse Pro Redirect Rules",
              kind: "zone",
              phase: "http_request_dynamic_redirect",
              rules: redirectRules,
            }),
          }
        );
        const createData = await createRes.json();
        results["redirect_rules"] = { success: createData.success, action: "created", status: createRes.status };
      }
    } catch (e) {
      results["redirect_rules"] = { success: false, error: (e as Error).message };
    }

    // ─── 5. TRANSFORM RULES (Response Headers) ──────────────────

    try {
      const existingTransformRes = await fetch(
        `https://api.cloudflare.com/client/v4/zones/${cfZoneId}/rulesets?phase=http_response_headers_transform`,
        { headers }
      );
      const existingTransforms = await existingTransformRes.json();

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
        {
          description: "Canonical link header for public pages",
          expression: '(not starts_with(http.request.uri.path, "/admin") and not starts_with(http.request.uri.path, "/seller") and not starts_with(http.request.uri.path, "/ip-staff"))',
          action: "rewrite",
          action_parameters: {
            headers: {
              Link: {
                operation: "set",
                expression: 'concat("<https://eclipserblx.com", http.request.uri.path, ">; rel=\\\\\\"canonical\\\\\\"")',
              },
            },
          },
        },
      ];

      const existingTransform = existingTransforms.result?.find((r: any) => r.phase === "http_response_headers_transform");

      if (existingTransform) {
        const updateRes = await fetch(
          `https://api.cloudflare.com/client/v4/zones/${cfZoneId}/rulesets/${existingTransform.id}`,
          {
            method: "PUT",
            headers,
            body: JSON.stringify({
              name: "Eclipse Pro Transform Rules",
              kind: "zone",
              phase: "http_response_headers_transform",
              rules: transformRules,
            }),
          }
        );
        const updateData = await updateRes.json();
        results["transform_rules"] = { success: updateData.success, action: "updated", status: updateRes.status };
      } else {
        const createRes = await fetch(
          `https://api.cloudflare.com/client/v4/zones/${cfZoneId}/rulesets`,
          {
            method: "POST",
            headers,
            body: JSON.stringify({
              name: "Eclipse Pro Transform Rules",
              kind: "zone",
              phase: "http_response_headers_transform",
              rules: transformRules,
            }),
          }
        );
        const createData = await createRes.json();
        results["transform_rules"] = { success: createData.success, action: "created", status: createRes.status };
      }
    } catch (e) {
      results["transform_rules"] = { success: false, error: (e as Error).message };
    }

    // ─── 6. WAF CUSTOM RULES ─────────────────────────────────────

    try {
      const existingWafRes = await fetch(
        `https://api.cloudflare.com/client/v4/zones/${cfZoneId}/rulesets?phase=http_request_firewall_custom`,
        { headers }
      );
      const existingWaf = await existingWafRes.json();

      const wafRules = [
        {
          description: "Rate limit edge function API calls",
          expression: '(http.request.uri.path contains "/functions/v1/")',
          action: "managed_challenge",
          action_parameters: {},
          ratelimit: {
            characteristics: ["ip.src"],
            period: 60,
            requests_per_period: 60,
            mitigation_timeout: 600,
          },
        },
        {
          description: "Challenge admin/staff paths",
          expression: '(starts_with(http.request.uri.path, "/admin") or starts_with(http.request.uri.path, "/ip-staff") or starts_with(http.request.uri.path, "/global-guard"))',
          action: "managed_challenge",
          action_parameters: {},
        },
      ];

      const existingWafRuleset = existingWaf.result?.find((r: any) => r.phase === "http_request_firewall_custom");

      if (existingWafRuleset) {
        // Merge with existing rules — keep existing ones and add ours
        const currentRes = await fetch(
          `https://api.cloudflare.com/client/v4/zones/${cfZoneId}/rulesets/${existingWafRuleset.id}`,
          { headers }
        );
        const currentData = await currentRes.json();
        const existingRules = currentData.result?.rules || [];

        // Remove our previously created rules (by description match)
        const ourDescriptions = new Set(wafRules.map((r) => r.description));
        const filteredExisting = existingRules.filter((r: any) => !ourDescriptions.has(r.description));

        const mergedRules = [...filteredExisting, ...wafRules].map(({ id, version, last_updated, ref, ...r }: any) => r);

        const updateRes = await fetch(
          `https://api.cloudflare.com/client/v4/zones/${cfZoneId}/rulesets/${existingWafRuleset.id}`,
          {
            method: "PUT",
            headers,
            body: JSON.stringify({
              name: "Eclipse Pro WAF Custom Rules",
              kind: "zone",
              phase: "http_request_firewall_custom",
              rules: mergedRules,
            }),
          }
        );
        const updateData = await updateRes.json();
        results["waf_custom_rules"] = { success: updateData.success, action: "updated", status: updateRes.status };
      } else {
        const createRes = await fetch(
          `https://api.cloudflare.com/client/v4/zones/${cfZoneId}/rulesets`,
          {
            method: "POST",
            headers,
            body: JSON.stringify({
              name: "Eclipse Pro WAF Custom Rules",
              kind: "zone",
              phase: "http_request_firewall_custom",
              rules: wafRules,
            }),
          }
        );
        const createData = await createRes.json();
        results["waf_custom_rules"] = { success: createData.success, action: "created", status: createRes.status };
      }
    } catch (e) {
      results["waf_custom_rules"] = { success: false, error: (e as Error).message };
    }

    // ─── 7. ENABLE OWASP MANAGED RULESET (Pro) ──────────────────

    try {
      // Get the entrypoint ruleset for http_request_firewall_managed phase
      const managedRes = await fetch(
        `https://api.cloudflare.com/client/v4/zones/${cfZoneId}/rulesets?phase=http_request_firewall_managed`,
        { headers }
      );
      const managedData = await managedRes.json();

      // The Cloudflare OWASP Core Ruleset ID (well-known)
      const OWASP_RULESET_ID = "4814384a9e5d4991b9815dcfc25d2f1f";
      const CF_MANAGED_RULESET_ID = "efb7b8c949ac4650a09736fc376e9aee";

      const managedRules = [
        {
          description: "Deploy Cloudflare Managed Ruleset",
          action: "execute",
          action_parameters: { id: CF_MANAGED_RULESET_ID },
          expression: "true",
        },
        {
          description: "Deploy OWASP Core Ruleset (Pro)",
          action: "execute",
          action_parameters: {
            id: OWASP_RULESET_ID,
            overrides: {
              action: "managed_challenge",
            },
          },
          expression: "true",
        },
      ];

      const existingManaged = managedData.result?.find((r: any) => r.phase === "http_request_firewall_managed");

      if (existingManaged) {
        const updateRes = await fetch(
          `https://api.cloudflare.com/client/v4/zones/${cfZoneId}/rulesets/${existingManaged.id}`,
          {
            method: "PUT",
            headers,
            body: JSON.stringify({
              name: "Eclipse Pro Managed WAF",
              kind: "zone",
              phase: "http_request_firewall_managed",
              rules: managedRules,
            }),
          }
        );
        const updateData = await updateRes.json();
        results["owasp_managed_ruleset"] = { success: updateData.success, action: "updated", status: updateRes.status };
      } else {
        const createRes = await fetch(
          `https://api.cloudflare.com/client/v4/zones/${cfZoneId}/rulesets`,
          {
            method: "POST",
            headers,
            body: JSON.stringify({
              name: "Eclipse Pro Managed WAF",
              kind: "zone",
              phase: "http_request_firewall_managed",
              rules: managedRules,
            }),
          }
        );
        const createData = await createRes.json();
        results["owasp_managed_ruleset"] = { success: createData.success, action: "created", status: createRes.status };
      }
    } catch (e) {
      results["owasp_managed_ruleset"] = { success: false, error: (e as Error).message };
    }

    // ─── 8. CRAWLER HINTS (Pro) ──────────────────────────────────

    try {
      const crawlerRes = await fetch(
        `https://api.cloudflare.com/client/v4/zones/${cfZoneId}/flags`,
        {
          method: "PATCH",
          headers,
          body: JSON.stringify({ feature: "crawlhints", enabled: true }),
        }
      );
      // Crawler Hints may not have a standard API — try the setting
      results["crawler_hints"] = { attempted: true, status: crawlerRes.status };
      await crawlerRes.text();
    } catch (e) {
      results["crawler_hints"] = { success: false, note: "May need manual activation in dashboard", error: (e as Error).message };
    }

    // ─── SUMMARY ─────────────────────────────────────────────────

    const successCount = Object.values(results).filter((r: any) => r.success === true).length;
    const totalCount = Object.keys(results).length;

    return jsonOk({
      success: true,
      summary: `${successCount}/${totalCount} settings applied successfully`,
      results,
      manual_steps: [
        "Verify Smart Tiered Caching is enabled (Caching → Tiered Cache)",
        "Verify HSTS is configured (SSL/TLS → Edge Certificates)",
        "Enable Crawler Hints if not applied via API (Speed → Optimization → Content Optimization)",
      ],
    });
  } catch (error) {
    return internalError(error, "Cloudflare Pro optimization failed");
  }
});
