import { handleCors, jsonOk, jsonError, unauthorized, internalError } from "../_shared/edge-response.ts";
import { checkRateLimit, getClientIp, rateLimitResponse, RATE_LIMITS } from "../_shared/rateLimit.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.12";

/**
 * IONOS DNS Manager Edge Function
 * Supports both IONOS Hosting DNS API and IONOS Cloud DNS API.
 * 
 * Actions:
 *   list-zones        — list all DNS zones
 *   get-zone          — get zone details + records (params: zoneId)
 *   create-record     — add a DNS record   (params: zoneId, name, type, content, ttl?, prio?)
 *   update-record     — update a DNS record (params: zoneId, recordId, name, type, content, ttl?, prio?)
 *   delete-record     — remove a DNS record (params: zoneId, recordId)
 *   health-check      — verify API connectivity
 */

// IONOS API base URLs
const HOSTING_API = "https://api.hosting.ionos.com/dns";
const CLOUD_API = "https://dns.de-fra.ionos.com";

interface IonosRequest {
  action: string;
  zoneId?: string;
  recordId?: string;
  name?: string;
  type?: string;
  content?: string;
  ttl?: number;
  prio?: number;
}

Deno.serve(async (req) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body: IonosRequest = await req.json().catch(() => ({ action: "health-check" }));

    // Health-check is allowed without auth for testing connectivity
    if (body.action !== "health-check") {
      // Auth check — require admin role
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) return unauthorized();

      const token = authHeader.replace("Bearer ", "");
      
      // Allow service role key to bypass user auth
      const isServiceRole = token === supabaseKey;
      
      if (!isServiceRole) {
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (authError || !user) return unauthorized();

        const { data: roles } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .eq("role", "admin");

        if (!roles || roles.length === 0) {
          return jsonError("Admin access required", 403, "FORBIDDEN");
        }
      }
    }

    // Rate limit
    const ip = getClientIp(req);
    const rl = checkRateLimit({ ...RATE_LIMITS.API, identifier: ip, action: "ionos-dns" });
    if (!rl.allowed) return rateLimitResponse(rl, {});

    const IONOS_KEY = Deno.env.get("IONOS_API_KEY");
    if (!IONOS_KEY) return jsonError("IONOS_API_KEY secret not configured", 500);
    const { action } = body;

    // Detect API type from key format
    // Hosting API keys are "publicPrefix.secret"
    // Cloud API keys are Bearer tokens
    const isHostingKey = IONOS_KEY.includes(".");
    
    if (isHostingKey) {
      return await handleHostingApi(IONOS_KEY, body);
    } else {
      return await handleCloudApi(IONOS_KEY, body);
    }
  } catch (err) {
    return internalError(err);
  }
});

// ─── IONOS Hosting DNS API ───────────────────────────────────────────

async function hostingFetch(apiKey: string, path: string, options: RequestInit = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);

  try {
    const resp = await fetch(`${HOSTING_API}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        "X-API-Key": apiKey,
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    });
    return resp;
  } finally {
    clearTimeout(timeout);
  }
}

async function handleHostingApi(apiKey: string, body: IonosRequest): Promise<Response> {
  const { action, zoneId, recordId, name, type, content, ttl, prio } = body;

  switch (action) {
    case "health-check": {
      const resp = await hostingFetch(apiKey, "/v1/zones");
      if (resp.ok) {
        return jsonOk({ ok: true, apiType: "hosting", message: "IONOS Hosting DNS API connected" });
      }
      const errText = await resp.text();
      return jsonError(`API connectivity failed: ${errText}`, resp.status);
    }

    case "list-zones": {
      const resp = await hostingFetch(apiKey, "/v1/zones");
      if (!resp.ok) {
        const errText = await resp.text();
        return jsonError(`Failed to list zones: ${errText}`, resp.status);
      }
      const zones = await resp.json();
      return jsonOk({ zones, apiType: "hosting" });
    }

    case "get-zone": {
      if (!zoneId) return jsonError("zoneId is required");
      const resp = await hostingFetch(apiKey, `/v1/zones/${zoneId}`);
      if (!resp.ok) {
        const errText = await resp.text();
        return jsonError(`Failed to get zone: ${errText}`, resp.status);
      }
      const zone = await resp.json();
      return jsonOk({ zone, apiType: "hosting" });
    }

    case "create-record": {
      if (!zoneId || !name || !type || !content) {
        return jsonError("zoneId, name, type, and content are required");
      }
      const recordData = [{
        name,
        type: type.toUpperCase(),
        content,
        ttl: ttl || 3600,
        prio: prio || 0,
      }];
      const resp = await hostingFetch(apiKey, `/v1/zones/${zoneId}/records`, {
        method: "POST",
        body: JSON.stringify(recordData),
      });
      if (!resp.ok) {
        const errText = await resp.text();
        return jsonError(`Failed to create record: ${errText}`, resp.status);
      }
      const result = await resp.json();
      return jsonOk({ record: result, apiType: "hosting" }, 201);
    }

    case "update-record": {
      if (!zoneId || !recordId || !name || !type || !content) {
        return jsonError("zoneId, recordId, name, type, and content are required");
      }
      const updateData = {
        name,
        type: type.toUpperCase(),
        content,
        ttl: ttl || 3600,
        prio: prio || 0,
      };
      const resp = await hostingFetch(apiKey, `/v1/zones/${zoneId}/records/${recordId}`, {
        method: "PUT",
        body: JSON.stringify(updateData),
      });
      if (!resp.ok) {
        const errText = await resp.text();
        return jsonError(`Failed to update record: ${errText}`, resp.status);
      }
      const result = await resp.json();
      return jsonOk({ record: result, apiType: "hosting" });
    }

    case "delete-record": {
      if (!zoneId || !recordId) {
        return jsonError("zoneId and recordId are required");
      }
      const resp = await hostingFetch(apiKey, `/v1/zones/${zoneId}/records/${recordId}`, {
        method: "DELETE",
      });
      if (!resp.ok) {
        const errText = await resp.text();
        return jsonError(`Failed to delete record: ${errText}`, resp.status);
      }
      await resp.text(); // consume body
      return jsonOk({ deleted: true, recordId, apiType: "hosting" });
    }

    default:
      return jsonError(`Unknown action: ${action}. Valid: health-check, list-zones, get-zone, create-record, update-record, delete-record`);
  }
}

// ─── IONOS Cloud DNS API ─────────────────────────────────────────────

async function cloudFetch(apiKey: string, path: string, options: RequestInit = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);

  try {
    const resp = await fetch(`${CLOUD_API}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    });
    return resp;
  } finally {
    clearTimeout(timeout);
  }
}

async function handleCloudApi(apiKey: string, body: IonosRequest): Promise<Response> {
  const { action, zoneId, recordId, name, type, content, ttl, prio } = body;

  switch (action) {
    case "health-check": {
      const resp = await cloudFetch(apiKey, "/zones");
      if (resp.ok) {
        return jsonOk({ ok: true, apiType: "cloud", message: "IONOS Cloud DNS API connected" });
      }
      const errText = await resp.text();
      return jsonError(`API connectivity failed: ${errText}`, resp.status);
    }

    case "list-zones": {
      const resp = await cloudFetch(apiKey, "/zones");
      if (!resp.ok) {
        const errText = await resp.text();
        return jsonError(`Failed to list zones: ${errText}`, resp.status);
      }
      const data = await resp.json();
      return jsonOk({ zones: data.items || data, apiType: "cloud" });
    }

    case "get-zone": {
      if (!zoneId) return jsonError("zoneId is required");
      const resp = await cloudFetch(apiKey, `/zones/${zoneId}`);
      if (!resp.ok) {
        const errText = await resp.text();
        return jsonError(`Failed to get zone: ${errText}`, resp.status);
      }
      const zone = await resp.json();
      // Also fetch records
      const recordsResp = await cloudFetch(apiKey, `/zones/${zoneId}/records`);
      const records = recordsResp.ok ? await recordsResp.json() : { items: [] };
      return jsonOk({ zone, records: records.items || records, apiType: "cloud" });
    }

    case "create-record": {
      if (!zoneId || !name || !type || !content) {
        return jsonError("zoneId, name, type, and content are required");
      }
      const recordData = {
        properties: {
          name,
          type: type.toUpperCase(),
          content,
          ttl: ttl || 3600,
          priority: prio || 0,
          enabled: true,
        },
      };
      const resp = await cloudFetch(apiKey, `/zones/${zoneId}/records`, {
        method: "POST",
        body: JSON.stringify(recordData),
      });
      if (!resp.ok) {
        const errText = await resp.text();
        return jsonError(`Failed to create record: ${errText}`, resp.status);
      }
      const result = await resp.json();
      return jsonOk({ record: result, apiType: "cloud" }, 201);
    }

    case "update-record": {
      if (!zoneId || !recordId || !name || !type || !content) {
        return jsonError("zoneId, recordId, name, type, and content are required");
      }
      const updateData = {
        properties: {
          name,
          type: type.toUpperCase(),
          content,
          ttl: ttl || 3600,
          priority: prio || 0,
          enabled: true,
        },
      };
      const resp = await cloudFetch(apiKey, `/zones/${zoneId}/records/${recordId}`, {
        method: "PUT",
        body: JSON.stringify(updateData),
      });
      if (!resp.ok) {
        const errText = await resp.text();
        return jsonError(`Failed to update record: ${errText}`, resp.status);
      }
      const result = await resp.json();
      return jsonOk({ record: result, apiType: "cloud" });
    }

    case "delete-record": {
      if (!zoneId || !recordId) {
        return jsonError("zoneId and recordId are required");
      }
      const resp = await cloudFetch(apiKey, `/zones/${zoneId}/records/${recordId}`, {
        method: "DELETE",
      });
      if (!resp.ok) {
        const errText = await resp.text();
        return jsonError(`Failed to delete record: ${errText}`, resp.status);
      }
      await resp.text();
      return jsonOk({ deleted: true, recordId, apiType: "cloud" });
    }

    default:
      return jsonError(`Unknown action: ${action}. Valid: health-check, list-zones, get-zone, create-record, update-record, delete-record`);
  }
}
