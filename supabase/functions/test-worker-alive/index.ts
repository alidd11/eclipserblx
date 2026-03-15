import { handleCors, jsonOk, internalError } from "../_shared/edge-response.ts";

Deno.serve(async (req) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  try {
    const CF_TOKEN = Deno.env.get("CLOUDFLARE_API_TOKEN");
    const CF_ZONE_ID = Deno.env.get("CLOUDFLARE_ZONE_ID");
    if (!CF_TOKEN || !CF_ZONE_ID) return jsonOk({ error: "Missing secrets" }, 500);

    const headers = { Authorization: `Bearer ${CF_TOKEN}`, "Content-Type": "application/json" };

    // Get account ID
    const zoneResp = await fetch(`https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}`, { headers });
    const zoneData = await zoneResp.json();
    const accountId = zoneData.result?.account?.id;

    // Deploy a MINIMAL test worker that just adds a header to prove Workers execute
    const testScript = `
export default {
  async fetch(request) {
    var response = await fetch(request);
    var newResp = new Response(response.body, response);
    newResp.headers.set("X-Eclipse-Test", "worker-is-alive");
    return newResp;
  }
};`;

    const workerName = "eclipse-og-proxy";
    const boundary = "----TestBoundary" + Date.now();
    const metadata = JSON.stringify({ main_module: "worker.js", compatibility_date: "2024-01-01" });
    const body = [
      `--${boundary}`,
      'Content-Disposition: form-data; name="metadata"; filename="metadata.json"',
      "Content-Type: application/json",
      "",
      metadata,
      `--${boundary}`,
      'Content-Disposition: form-data; name="worker.js"; filename="worker.js"',
      "Content-Type: application/javascript+module",
      "",
      testScript,
      `--${boundary}--`,
    ].join("\r\n");

    const uploadResp = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/${workerName}`,
      {
        method: "PUT",
        headers: { Authorization: `Bearer ${CF_TOKEN}`, "Content-Type": `multipart/form-data; boundary=${boundary}` },
        body,
      }
    );
    const uploadData = await uploadResp.json();

    if (!uploadData.success) {
      return jsonOk({ error: "Upload failed", details: uploadData.errors });
    }

    // Wait a moment for propagation
    await new Promise(r => setTimeout(r, 3000));

    // Now test if the header appears
    const testResp = await fetch("https://eclipserblx.com/", {
      headers: { "User-Agent": "Mozilla/5.0 TestClient" },
      redirect: "manual",
    });
    const testHeaders: Record<string, string> = {};
    testResp.headers.forEach((v, k) => { testHeaders[k] = v; });
    await testResp.text();

    return jsonOk({
      upload: { success: uploadData.success },
      test: {
        status: testResp.status,
        xEclipseTest: testHeaders["x-eclipse-test"] || null,
        server: testHeaders["server"] || null,
        cfRay: testHeaders["cf-ray"] || null,
      },
      note: "If x-eclipse-test is null, Workers are NOT executing on this zone. You need to redeploy the full worker after this test.",
    });
  } catch (e) {
    return internalError(e);
  }
});
