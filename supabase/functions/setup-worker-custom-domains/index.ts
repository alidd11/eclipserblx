import { handleCors, jsonOk, internalError } from "../_shared/edge-response.ts";

const WORKER_NAME = "eclipse-og-proxy";
const DOMAINS = ["eclipserblx.com", "www.eclipserblx.com"];

type DnsRecord = {
  id: string;
  type: string;
  name: string;
  content: string;
  proxied?: boolean;
  ttl?: number;
};

Deno.serve(async (req) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  try {
    const CF_TOKEN = Deno.env.get("CLOUDFLARE_API_TOKEN");
    const CF_ZONE_ID = Deno.env.get("CLOUDFLARE_ZONE_ID");
    if (!CF_TOKEN || !CF_ZONE_ID) {
      return jsonOk({ error: "Missing CLOUDFLARE_API_TOKEN or CLOUDFLARE_ZONE_ID" }, 500);
    }

    const headers = {
      Authorization: `Bearer ${CF_TOKEN}`,
      "Content-Type": "application/json",
    };

    // First, get the account ID from the zone
    const zoneResp = await fetch(`https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}`, { headers });
    const zoneData = await zoneResp.json();
    if (!zoneData?.success) {
      return jsonOk({ error: "Failed to fetch zone", details: zoneData?.errors }, 500);
    }
    const accountId = zoneData.result.account.id;

    const addCustomDomain = async (domain: string) => {
      const addResp = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/domains`,
        {
          method: "PUT",
          headers,
          body: JSON.stringify({
            hostname: domain,
            zone_id: CF_ZONE_ID,
            service: WORKER_NAME,
            environment: "production",
            override_existing_dns_record: true,
          }),
        }
      );
      return addResp.json();
    };

    const listDnsConflicts = async (domain: string): Promise<DnsRecord[]> => {
      const dnsResp = await fetch(
        `https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/dns_records?name=${encodeURIComponent(domain)}&per_page=100`,
        { headers }
      );
      const dnsData = await dnsResp.json();
      if (!dnsData?.success || !Array.isArray(dnsData?.result)) return [];
      return dnsData.result.filter((r: DnsRecord) => ["A", "AAAA", "CNAME"].includes(r.type));
    };

    const deleteDnsRecord = async (recordId: string) => {
      const delResp = await fetch(
        `https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/dns_records/${recordId}`,
        { method: "DELETE", headers }
      );
      return delResp.json();
    };

    const restoreDnsRecord = async (record: DnsRecord) => {
      const createResp = await fetch(
        `https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/dns_records`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            type: record.type,
            name: record.name,
            content: record.content,
            proxied: record.proxied ?? true,
            ttl: record.ttl && record.ttl > 0 ? record.ttl : 1,
          }),
        }
      );
      return createResp.json();
    };

    // Check existing custom domains for this worker
    const existingResp = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/domains?zone_id=${CF_ZONE_ID}&service=${WORKER_NAME}`,
      { headers }
    );
    const existingData = await existingResp.json();
    const existingDomains = (existingData?.result || []).map((d: any) => d.hostname);

    const results: any[] = [];
    let successCount = 0;

    for (const domain of DOMAINS) {
      if (existingDomains.includes(domain)) {
        successCount += 1;
        results.push({ domain, action: "already_exists", deleted_conflicts: [] });
        continue;
      }

      let addData = await addCustomDomain(domain);
      let deletedConflicts: Array<{
        id: string;
        type: string;
        name: string;
        content: string;
        proxied?: boolean;
        ttl?: number;
      }> = [];

      const hasConflictError = (addData?.errors || []).some(
        (e: any) => e?.code === 100117 || String(e?.message || "").toLowerCase().includes("externally managed dns")
      );

      // If Cloudflare says DNS records are blocking custom-domain binding, remove those records and retry.
      if (!addData?.success && hasConflictError) {
        const conflicts = await listDnsConflicts(domain);
        for (const rec of conflicts) {
          const delData = await deleteDnsRecord(rec.id);
          if (delData?.success) {
            deletedConflicts.push({
              id: rec.id,
              type: rec.type,
              name: rec.name,
              content: rec.content,
              proxied: rec.proxied,
              ttl: rec.ttl,
            });
          }
        }

        addData = await addCustomDomain(domain);

        // Roll back DNS if binding still fails after conflict cleanup.
        if (!addData?.success && deletedConflicts.length > 0) {
          for (const rec of deletedConflicts) {
            await restoreDnsRecord(rec);
          }
        }
      }

      if (addData?.success) {
        successCount += 1;
        results.push({
          domain,
          action: "added",
          result: addData?.result,
          errors: [],
          deleted_conflicts: deletedConflicts,
        });
      } else {
        results.push({
          domain,
          action: "failed",
          result: null,
          errors: addData?.errors || [],
          deleted_conflicts: deletedConflicts,
        });
      }
    }

    // List existing Worker Routes and only remove apex routes if BOTH custom domains succeeded.
    const routesResp = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/workers/routes`,
      { headers }
    );
    const routesData = await routesResp.json();
    const oldRoutes = (routesData?.result || []).filter(
      (r: any) =>
        r.script === WORKER_NAME &&
        (r.pattern === "eclipserblx.com/*" || r.pattern === "www.eclipserblx.com/*")
    );

    const deletedRoutes: any[] = [];
    const shouldDeleteApexRoutes = successCount === DOMAINS.length;

    if (shouldDeleteApexRoutes) {
      for (const route of oldRoutes) {
        const delResp = await fetch(
          `https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/workers/routes/${route.id}`,
          { method: "DELETE", headers }
        );
        const delData = await delResp.json();
        deletedRoutes.push({
          pattern: route.pattern,
          id: route.id,
          deleted: delData?.success,
        });
      }
    }

    return jsonOk({
      custom_domains: results,
      deleted_old_routes: deletedRoutes,
      note: shouldDeleteApexRoutes
        ? "Custom domain bindings are active for apex + www. Old apex route-based entries were removed. The *.eclipserblx.com/* wildcard route is preserved."
        : "Apex route-based entries were preserved because custom-domain binding did not fully succeed.",
    });
  } catch (e) {
    return internalError(e);
  }
});