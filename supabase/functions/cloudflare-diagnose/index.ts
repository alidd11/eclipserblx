// supabase/functions/cloudflare-diagnose/index.ts

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

async function dohGoogle(name: string, type: string) {
  const url = `https://dns.google/resolve?name=${encodeURIComponent(name)}&type=${encodeURIComponent(type)}`;
  const resp = await fetch(url, { headers: { accept: "application/json" } });
  const data = await resp.json().catch(() => null);
  return { ok: resp.ok, status: resp.status, data };
}

async function dohCloudflare(name: string, type: string) {
  const url = `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(name)}&type=${encodeURIComponent(type)}`;
  const resp = await fetch(url, { headers: { accept: "application/dns-json" } });
  const data = await resp.json().catch(() => null);
  return { ok: resp.ok, status: resp.status, data };
}

async function cfListDnsRecords(zoneId: string, token: string, name: string) {
  const url = `https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records?per_page=100&name=${encodeURIComponent(name)}`;
  const resp = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  const data = (await resp.json().catch(() => null)) as CloudflareApiResult<DnsRecord[]> | null;
  return { ok: resp.ok, status: resp.status, data };
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
    const names = [domain, `www.${domain}`];

    const queries = [
      ...names.flatMap((n) => [
        { name: n, type: "A" },
        { name: n, type: "AAAA" },
        { name: n, type: "CNAME" },
      ]),
    ];

    const [google, cloudflare] = await Promise.all([
      Promise.all(queries.map((q) => dohGoogle(q.name, q.type))),
      Promise.all(queries.map((q) => dohCloudflare(q.name, q.type))),
    ]);

    const cfRecords = await Promise.all(names.map((n) => cfListDnsRecords(CF_ZONE_ID, CF_TOKEN, n)));

    const response = {
      domain,
      checks: {
        doh_google: queries.map((q, i) => ({ ...q, ...google[i] })),
        doh_cloudflare: queries.map((q, i) => ({ ...q, ...cloudflare[i] })),
        cloudflare_dns_records: names.map((n, i) => ({ name: n, ...cfRecords[i] })),
      },
      expected: {
        lovable_ip: "185.158.133.1",
        note:
          "If PageSpeed says it can’t resolve the URL, one or more public resolvers are returning NXDOMAIN/empty answers, or the apex/www records are missing/mis-pointed.",
      },
    };

    return json(response);
  } catch (e) {
    return json({ error: "Unexpected error", details: e instanceof Error ? e.message : String(e) }, 500);
  }
});
