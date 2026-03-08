import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type WorkerRoute = {
  id: string;
  pattern: string;
  script?: string;
};

type CloudflareApiResult<T> = {
  success: boolean;
  errors: Array<{ code: number; message: string }>;
  result: T;
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const normalizeDomain = (domain: string) => domain.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "");

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const CF_TOKEN = Deno.env.get("CLOUDFLARE_API_TOKEN");
    const CF_ZONE_ID = Deno.env.get("CLOUDFLARE_ZONE_ID");

    if (!CF_TOKEN || !CF_ZONE_ID) {
      return json({ error: "Missing CLOUDFLARE_API_TOKEN or CLOUDFLARE_ZONE_ID secret" }, 500);
    }

    const body = await req.json().catch(() => ({}));
    const domain = normalizeDomain(body?.domain ?? "eclipserblx.com");
    const disableWorkerOnApex = body?.disableWorkerOnApex !== false;
    const purgeCache = body?.purgeCache !== false;

    const headers = {
      Authorization: `Bearer ${CF_TOKEN}`,
      "Content-Type": "application/json",
    };

    const base = `https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}`;

    const zoneResp = await fetch(`${base}`, { headers });
    const zoneData = (await zoneResp.json()) as CloudflareApiResult<{ id: string; name: string; status: string }>;

    if (!zoneResp.ok || !zoneData.success) {
      return json({ step: "zone_check_failed", details: zoneData.errors ?? [] }, 400);
    }

    const routesResp = await fetch(`${base}/workers/routes`, { headers });
    const routesData = (await routesResp.json()) as CloudflareApiResult<WorkerRoute[]>;

    if (!routesResp.ok || !routesData.success) {
      return json({ step: "routes_fetch_failed", details: routesData.errors ?? [] }, 400);
    }

    const apexPatterns = new Set([
      `${domain}/*`,
      `www.${domain}/*`,
      `${domain}/`,
      `www.${domain}/`,
      `*${domain}/*`,
    ]);

    const matchingRoutes = routesData.result.filter((route) => {
      const pattern = route.pattern.toLowerCase();
      if (apexPatterns.has(pattern)) return true;
      return pattern.includes(`${domain}/*`) || pattern.includes(`www.${domain}/*`);
    });

    const disabledRoutes: Array<{ id: string; pattern: string; script?: string; deleted: boolean; error?: unknown }> = [];

    if (disableWorkerOnApex) {
      for (const route of matchingRoutes) {
        if (!route.script) continue;

        const delResp = await fetch(`${base}/workers/routes/${route.id}`, {
          method: "DELETE",
          headers,
        });

        const delData = (await delResp.json()) as CloudflareApiResult<unknown>;

        disabledRoutes.push({
          id: route.id,
          pattern: route.pattern,
          script: route.script,
          deleted: delResp.ok && delData.success,
          error: delResp.ok && delData.success ? undefined : delData.errors,
        });
      }
    }

    let purgeResult: { success: boolean; errors?: unknown } | null = null;

    if (purgeCache) {
      const purgeResp = await fetch(`${base}/purge_cache`, {
        method: "POST",
        headers,
        body: JSON.stringify({ purge_everything: true }),
      });

      const purgeData = (await purgeResp.json()) as CloudflareApiResult<{ id: string }>;
      purgeResult = {
        success: purgeResp.ok && purgeData.success,
        errors: purgeResp.ok && purgeData.success ? undefined : purgeData.errors,
      };
    }

    return json({
      ok: true,
      zone: {
        id: zoneData.result.id,
        name: zoneData.result.name,
        status: zoneData.result.status,
      },
      matchingRoutes,
      disabledRoutes,
      purgeResult,
      message: "Cloudflare emergency actions complete",
    });
  } catch (error) {
    return json(
      {
        error: "Unexpected error",
        details: error instanceof Error ? error.message : String(error),
      },
      500,
    );
  }
});
