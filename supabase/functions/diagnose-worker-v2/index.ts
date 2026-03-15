import { handleCors, jsonOk, internalError } from "../_shared/edge-response.ts";

Deno.serve(async (req) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  try {
    const CF_TOKEN = Deno.env.get("CLOUDFLARE_API_TOKEN");
    const CF_ZONE_ID = Deno.env.get("CLOUDFLARE_ZONE_ID");
    if (!CF_TOKEN || !CF_ZONE_ID) return jsonOk({ error: "Missing secrets" }, 500);

    const headers: Record<string, string> = { 
      Authorization: `Bearer ${CF_TOKEN}`,
      "Content-Type": "application/json"
    };

    // Get account ID
    const zoneResp = await fetch(`https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}`, { headers });
    const zoneData = await zoneResp.json();
    const accountId = zoneData.result?.account?.id;

    // 1. Check worker subdomain enabled
    const subdomainResp = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/subdomain`,
      { headers }
    );
    const subdomainData = await subdomainResp.json();

    // 2. Check worker details/settings
    const settingsResp = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/eclipse-og-proxy/settings`,
      { headers }
    );
    const settingsData = await settingsResp.json();

    // 3. Check worker deployments
    const deploymentsResp = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/eclipse-og-proxy/deployments`,
      { headers }
    );
    const deploymentsData = await deploymentsResp.json();

    // 4. Test the Worker directly by fetching through Cloudflare
    // Use a bot UA to trigger OG serving
    let workerTestResult: any = null;
    try {
      const testResp = await fetch("https://eclipserblx.com/share/products/73", {
        headers: { 
          "User-Agent": "Discordbot/2.0",
        },
        redirect: "manual"
      });
      workerTestResult = {
        status: testResp.status,
        headers: Object.fromEntries([...testResp.headers.entries()].filter(([k]) => 
          ["content-type", "x-eclipse-worker", "location", "cf-ray", "server", "cache-control"].includes(k.toLowerCase())
        )),
        bodyPreview: (await testResp.text()).slice(0, 500),
      };
    } catch (e) {
      workerTestResult = { error: (e as Error).message };
    }

    // 5. Test with regular UA
    let humanTestResult: any = null;
    try {
      const testResp = await fetch("https://eclipserblx.com/share/products/73", {
        headers: { 
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
        redirect: "manual"
      });
      humanTestResult = {
        status: testResp.status,
        headers: Object.fromEntries([...testResp.headers.entries()].filter(([k]) => 
          ["content-type", "x-eclipse-worker", "location", "cf-ray", "server", "cache-control"].includes(k.toLowerCase())
        )),
        bodyPreview: (await testResp.text()).slice(0, 500),
      };
    } catch (e) {
      humanTestResult = { error: (e as Error).message };
    }

    return jsonOk({
      subdomain: subdomainData,
      settings: settingsData,
      deployments: deploymentsData.result?.deployments?.slice(0, 3),
      workerTestBot: workerTestResult,
      workerTestHuman: humanTestResult,
    });
  } catch (e) {
    return internalError(e);
  }
});
