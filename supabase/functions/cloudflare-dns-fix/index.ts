// supabase/functions/cloudflare-dns-fix/index.ts

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type CloudflareApiResult<T> = {
  success: boolean;
  errors: Array<{ code: number; message: string }>;
  result: T;
};

type DnsRecord = {
  id: string;
  type: string;
  name: string;
  content: string;
  proxied?: boolean;
  ttl?: number;
  meta?: Record<string, unknown>;
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const normalizeDomain = (domain: string) =>
  domain
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "");

async function cf<T>(token: string, url: string, init?: RequestInit) {
  const resp = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const data = (await resp.json().catch(() => null)) as CloudflareApiResult<T> | null;
  return { resp, data };
}

type ZoneInfo = {
  id: string;
  name: string;
  status: string;
  account: { id: string; name: string };
};

type WorkerDomain = {
  id: string;
  hostname: string;
  service: string;
  zone_id?: string;
  environment?: string;
};

async function getZoneInfo(zoneBase: string, token: string) {
  const { resp, data } = await cf<ZoneInfo>(token, zoneBase);
  if (!resp.ok || !data?.success) throw new Error(`Failed to fetch zone info: ${JSON.stringify(data?.errors ?? [])}`);
  return data.result;
}

async function listByName(zoneBase: string, token: string, name: string) {
  const { resp, data } = await cf<DnsRecord[]>(token, `${zoneBase}/dns_records?per_page=100&name=${encodeURIComponent(name)}`);
  if (!resp.ok || !data?.success) throw new Error(`Failed to list DNS records for ${name}: ${JSON.stringify(data?.errors ?? [])}`);
  return data.result;
}

async function upsertA(zoneBase: string, token: string, name: string, content: string) {
  const existing = await listByName(zoneBase, token, name);
  const aRecords = existing.filter((r) => r.type === "A");
  const desired = aRecords.find((r) => r.content === content);

  // If correct A exists, ensure proxied+ttl.
  if (desired) {
    const { resp, data } = await cf<DnsRecord>(token, `${zoneBase}/dns_records/${desired.id}`, {
      method: "PUT",
      body: JSON.stringify({ type: "A", name, content, proxied: true, ttl: 1 }),
    });
    return {
      action: "updated_existing_A",
      ok: resp.ok && !!data?.success,
      record: data?.result ?? null,
      errors: resp.ok && data?.success ? [] : data?.errors ?? [],
    };
  }

  // If wrong A exists, update first one; else create.
  if (aRecords.length > 0) {
    const target = aRecords[0];
    const { resp, data } = await cf<DnsRecord>(token, `${zoneBase}/dns_records/${target.id}`, {
      method: "PUT",
      body: JSON.stringify({ type: "A", name, content, proxied: true, ttl: 1 }),
    });
    return {
      action: "replaced_wrong_A",
      ok: resp.ok && !!data?.success,
      previous: target,
      record: data?.result ?? null,
      errors: resp.ok && data?.success ? [] : data?.errors ?? [],
    };
  }

  const { resp, data } = await cf<DnsRecord>(token, `${zoneBase}/dns_records`, {
    method: "POST",
    body: JSON.stringify({ type: "A", name, content, proxied: true, ttl: 1 }),
  });
  return {
    action: "created_A",
    ok: resp.ok && !!data?.success,
    record: data?.result ?? null,
    errors: resp.ok && data?.success ? [] : data?.errors ?? [],
  };
}

async function deleteWrongWwwTxt(zoneBase: string, token: string, wwwName: string) {
  const existing = await listByName(zoneBase, token, wwwName);
  const badTxt = existing.filter((r) => r.type === "TXT" && (r.content ?? "").includes("_lovable"));
  const deleted: Array<{ id: string; ok: boolean; content: string; errors?: unknown }> = [];

  for (const rec of badTxt) {
    const { resp, data } = await cf<unknown>(token, `${zoneBase}/dns_records/${rec.id}`, { method: "DELETE" });
    deleted.push({
      id: rec.id,
      ok: resp.ok && !!data?.success,
      content: rec.content,
      errors: resp.ok && data?.success ? undefined : data?.errors,
    });
  }

  return { found: badTxt.length, deleted };
}

async function listWorkerDomains(accountId: string, token: string) {
  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/domains`;
  const { resp, data } = await cf<WorkerDomain[]>(token, url);
  if (!resp.ok || !data?.success) throw new Error(`Failed to list worker domains: ${JSON.stringify(data?.errors ?? [])}`);
  return data.result;
}

async function detachWorkerDomain(accountId: string, token: string, domainId: string) {
  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/domains/${domainId}`;
  const { resp, data } = await cf<unknown>(token, url, { method: "DELETE" });
  return { ok: resp.ok && !!data?.success, errors: resp.ok && data?.success ? [] : data?.errors ?? [] };
}

function hasWorkersManagedError(errors: Array<{ code: number; message: string }> | undefined) {
  const list = errors ?? [];
  return list.some((e) => e.code === 81062 || /managed by\s+workers/i.test(e.message));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const CF_TOKEN = Deno.env.get("CLOUDFLARE_API_TOKEN");
    const CF_ZONE_ID = Deno.env.get("CLOUDFLARE_ZONE_ID");
    if (!CF_TOKEN || !CF_ZONE_ID) {
      return json({ error: "Missing CLOUDFLARE_API_TOKEN or CLOUDFLARE_ZONE_ID secret" }, 500);
    }

    const body = await req.json().catch(() => ({}));
    const domain = normalizeDomain(body?.domain ?? "eclipserblx.com");

    // Lovable custom-domain expected A target.
    const targetIp = body?.targetIp ?? "185.158.133.1";

    const zoneBase = `https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}`;
    const zoneInfo = await getZoneInfo(zoneBase, CF_TOKEN);

    let apexResult = await upsertA(zoneBase, CF_TOKEN, domain, targetIp);
    let wwwResult = await upsertA(zoneBase, CF_TOKEN, `www.${domain}`, targetIp);
    const wwwTxtCleanup = await deleteWrongWwwTxt(zoneBase, CF_TOKEN, `www.${domain}`);

    const needsWorkerDetach =
      hasWorkersManagedError(apexResult.errors) || hasWorkersManagedError(wwwResult.errors);

    let workerDomainDetaches: Array<{ id: string; hostname: string; ok: boolean; errors: unknown }> = [];

    if (needsWorkerDetach) {
      const workerDomains = await listWorkerDomains(zoneInfo.account.id, CF_TOKEN);
      const toDetach = workerDomains.filter((d) => {
        const h = d.hostname.toLowerCase();
        return h === domain || h === `www.${domain}`;
      });

      for (const d of toDetach) {
        const det = await detachWorkerDomain(zoneInfo.account.id, CF_TOKEN, d.id);
        workerDomainDetaches.push({ id: d.id, hostname: d.hostname, ok: det.ok, errors: det.errors });
      }

      // Retry A upserts after detach attempt
      apexResult = await upsertA(zoneBase, CF_TOKEN, domain, targetIp);
      wwwResult = await upsertA(zoneBase, CF_TOKEN, `www.${domain}`, targetIp);
    }

    return json({
      ok: true,
      domain,
      targetIp,
      zone: { id: zoneInfo.id, name: zoneInfo.name, status: zoneInfo.status, accountId: zoneInfo.account.id },
      apexResult,
      wwwResult,
      wwwTxtCleanup,
      workerDomainDetaches,
      note:
        "If PageSpeed still can’t resolve, wait a few minutes for DNS propagation and ensure apex + www point to the Lovable IP (A record) with no remaining Worker custom-domain bindings.",
    });
  } catch (e) {
    return json({ error: "Unexpected error", details: e instanceof Error ? e.message : String(e) }, 500);
  }
});
