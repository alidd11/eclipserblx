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
    return { action: "updated_existing_A", ok: resp.ok && !!data?.success, record: data?.result };
  }

  // If wrong A exists, update first one; else create.
  if (aRecords.length > 0) {
    const target = aRecords[0];
    const { resp, data } = await cf<DnsRecord>(token, `${zoneBase}/dns_records/${target.id}`, {
      method: "PUT",
      body: JSON.stringify({ type: "A", name, content, proxied: true, ttl: 1 }),
    });
    return { action: "replaced_wrong_A", ok: resp.ok && !!data?.success, previous: target, record: data?.result };
  }

  const { resp, data } = await cf<DnsRecord>(token, `${zoneBase}/dns_records`, {
    method: "POST",
    body: JSON.stringify({ type: "A", name, content, proxied: true, ttl: 1 }),
  });
  return { action: "created_A", ok: resp.ok && !!data?.success, record: data?.result, errors: data?.errors };
}

async function deleteWrongWwwTxt(zoneBase: string, token: string, wwwName: string) {
  const existing = await listByName(zoneBase, token, wwwName);
  const badTxt = existing.filter((r) => r.type === "TXT" && (r.content ?? "").includes("_lovable"));
  const deleted: Array<{ id: string; ok: boolean; content: string }> = [];

  for (const rec of badTxt) {
    const { resp, data } = await cf<unknown>(token, `${zoneBase}/dns_records/${rec.id}`, { method: "DELETE" });
    deleted.push({ id: rec.id, ok: resp.ok && !!data?.success, content: rec.content });
  }

  return { found: badTxt.length, deleted };
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

    const base = `https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}`;

    const apexResult = await upsertA(base, CF_TOKEN, domain, targetIp);
    const wwwResult = await upsertA(base, CF_TOKEN, `www.${domain}`, targetIp);
    const wwwTxtCleanup = await deleteWrongWwwTxt(base, CF_TOKEN, `www.${domain}`);

    return json({ ok: true, domain, targetIp, apexResult, wwwResult, wwwTxtCleanup });
  } catch (e) {
    return json({ error: "Unexpected error", details: e instanceof Error ? e.message : String(e) }, 500);
  }
});
