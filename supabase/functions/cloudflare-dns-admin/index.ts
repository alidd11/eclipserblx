import { handleCors, jsonOk, jsonError } from "../_shared/edge-response.ts";

const CF_API = "https://api.cloudflare.com/client/v4";

Deno.serve(async (req) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  try {
    // For internal admin use only - validate via a body secret
    const adminSecret = body?.admin_secret;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const authToken = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
    const apiKey = req.headers.get("apikey") ?? "";
    const isAuthed = authToken === serviceKey || apiKey === serviceKey || adminSecret === serviceKey;
    if (!isAuthed) {
      // Log what we received for debugging
      return jsonError("Unauthorized", 401);
    }

    const body = await req.json();
    const action = body?.action;
    const cfToken = Deno.env.get("CLOUDFLARE_API_TOKEN")!;
    const cfZoneId = Deno.env.get("CLOUDFLARE_ZONE_ID")!;

    if (action === "add-wildcard-record") {
      // First check if wildcard record already exists
      const listResp = await fetch(
        `${CF_API}/zones/${cfZoneId}/dns_records?type=A&name=*.eclipserblx.com`,
        { headers: { Authorization: `Bearer ${cfToken}`, "Content-Type": "application/json" } }
      );
      const listData = await listResp.json();
      
      if (listData?.result?.length > 0) {
        return jsonOk({ message: "Wildcard record already exists", existing: listData.result });
      }

      // Create wildcard A record
      const createResp = await fetch(
        `${CF_API}/zones/${cfZoneId}/dns_records`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${cfToken}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "A",
            name: "*",
            content: "185.158.133.1",
            proxied: true,
            ttl: 1, // auto
          }),
        }
      );
      const createData = await createResp.json();
      
      if (createData?.success) {
        return jsonOk({ message: "Wildcard A record created successfully", record: createData.result });
      } else {
        return jsonError(`Cloudflare API error: ${JSON.stringify(createData?.errors)}`, 500);
      }
    }

    if (action === "list-dns-records") {
      const name = body?.name ?? "";
      const url = name 
        ? `${CF_API}/zones/${cfZoneId}/dns_records?name=${encodeURIComponent(name)}`
        : `${CF_API}/zones/${cfZoneId}/dns_records?per_page=50`;
      const resp = await fetch(url, {
        headers: { Authorization: `Bearer ${cfToken}`, "Content-Type": "application/json" },
      });
      const data = await resp.json();
      return jsonOk({ records: data?.result ?? [] });
    }

    return jsonError("Unknown action. Supported: add-wildcard-record, list-dns-records", 400);
  } catch (e: any) {
    return jsonError(e.message, 500);
  }
});
