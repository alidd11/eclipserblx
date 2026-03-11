const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function cf(token: string, url: string, init?: RequestInit) {
  const resp = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  return resp.json();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const CF_TOKEN = Deno.env.get("CLOUDFLARE_API_TOKEN")!;
  const CF_ZONE_ID = Deno.env.get("CLOUDFLARE_ZONE_ID")!;
  const zoneBase = `https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}`;

  const results: Record<string, any> = {};

  // 1. List all custom hostnames to find same-zone ones
  const chList = await cf(CF_TOKEN, `${zoneBase}/custom_hostnames?per_page=50`);
  results.custom_hostnames = chList.result?.map((ch: any) => ({
    id: ch.id, hostname: ch.hostname, status: ch.status, ssl_status: ch.ssl?.status
  }));

  // 2. Delete any custom hostnames for *.eclipserblx.com subdomains (same-zone = broken)
  const sameZoneCHs = (chList.result ?? []).filter((ch: any) => 
    ch.hostname.endsWith(".eclipserblx.com")
  );
  results.deleted_custom_hostnames = [];
  for (const ch of sameZoneCHs) {
    const del = await cf(CF_TOKEN, `${zoneBase}/custom_hostnames/${ch.id}`, { method: "DELETE" });
    results.deleted_custom_hostnames.push({ id: ch.id, hostname: ch.hostname, result: del });
  }

  // 3. Check current wildcard DNS record
  const dnsRecords = await cf(CF_TOKEN, `${zoneBase}/dns_records?name=*.eclipserblx.com&per_page=50`);
  results.wildcard_records = dnsRecords.result;

  // 4. Delete existing wildcard records
  for (const rec of (dnsRecords.result ?? [])) {
    await cf(CF_TOKEN, `${zoneBase}/dns_records/${rec.id}`, { method: "DELETE" });
  }

  // 5. Create a proxied AAAA record with 100:: (Cloudflare's standard placeholder for Worker-backed domains)
  const createAAAA = await cf(CF_TOKEN, `${zoneBase}/dns_records`, {
    method: "POST",
    body: JSON.stringify({
      type: "AAAA",
      name: "*.eclipserblx.com",
      content: "100::",
      proxied: true,
      ttl: 1,
    }),
  });
  results.new_wildcard_aaaa = createAAAA;

  // 6. Also check/ensure stores.eclipserblx.com fallback origin exists
  const storesDns = await cf(CF_TOKEN, `${zoneBase}/dns_records?name=stores.eclipserblx.com&per_page=10`);
  results.stores_dns = storesDns.result;

  // If no stores.eclipserblx.com record, create one
  if (!storesDns.result || storesDns.result.length === 0) {
    const createStores = await cf(CF_TOKEN, `${zoneBase}/dns_records`, {
      method: "POST",
      body: JSON.stringify({
        type: "AAAA",
        name: "stores.eclipserblx.com",
        content: "100::",
        proxied: true,
        ttl: 1,
      }),
    });
    results.created_stores_record = createStores;
  }

  return new Response(JSON.stringify(results, null, 2), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
