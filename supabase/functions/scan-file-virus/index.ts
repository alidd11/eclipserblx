import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ScanRequest {
  fileBase64: string;
  fileName: string;
}

interface ScanResponse {
  isClean: boolean;
  virusName?: string;
  error?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const CLOUDMERSIVE_API_KEY = Deno.env.get("CLOUDMERSIVE_API_KEY");
    
    if (!CLOUDMERSIVE_API_KEY) {
      console.error("CLOUDMERSIVE_API_KEY is not configured");
      return new Response(
        JSON.stringify({ isClean: false, error: "Virus scanning not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { fileBase64, fileName }: ScanRequest = await req.json();

    if (!fileBase64) {
      return new Response(
        JSON.stringify({ isClean: false, error: "No file provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Scanning file: ${fileName}`);

    // Convert base64 to binary
    const binaryData = Uint8Array.from(atob(fileBase64), c => c.charCodeAt(0));
    
    // Create form data with the file
    const formData = new FormData();
    const blob = new Blob([binaryData]);
    formData.append("inputFile", blob, fileName || "upload");

    // Call Cloudmersive Virus Scan API
    const response = await fetch("https://api.cloudmersive.com/virus/scan/file", {
      method: "POST",
      headers: {
        "Apikey": CLOUDMERSIVE_API_KEY,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Cloudmersive API error:", response.status, errorText);
      
      // If rate limited, allow the file through with a warning
      if (response.status === 429) {
        console.warn("Rate limited by Cloudmersive - allowing file through");
        return new Response(
          JSON.stringify({ isClean: true, warning: "Scan quota exceeded - file not scanned" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({ isClean: false, error: "Virus scan failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = await response.json();
    console.log("Cloudmersive scan result:", JSON.stringify(result));

    /*
    Cloudmersive response structure:
    {
      CleanResult: boolean,
      FoundViruses: [{ FileName: string, VirusName: string }] | null,
      ContainsExecutable: boolean,
      ContainsInvalidFile: boolean,
      ContainsScript: boolean,
      ContainsPasswordProtectedFile: boolean,
      ContainsRestrictedFileFormat: boolean,
      ContainsMacros: boolean,
      VerifiedFileFormat: string
    }
    */

    const scanResponse: ScanResponse = {
      isClean: result.CleanResult === true,
    };

    if (!result.CleanResult && result.FoundViruses && result.FoundViruses.length > 0) {
      scanResponse.virusName = result.FoundViruses[0].VirusName;
      console.warn(`Virus detected: ${scanResponse.virusName}`);
    }

    // Also flag files with macros or scripts as potentially dangerous
    if (result.ContainsMacros || result.ContainsScript) {
      console.warn("File contains macros or scripts");
    }

    return new Response(
      JSON.stringify(scanResponse),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Virus scan error:", error);
    return new Response(
      JSON.stringify({ isClean: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
