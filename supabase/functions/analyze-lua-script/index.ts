import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AnalyzeRequest {
  scriptContent: string;
  fileName: string;
}

interface AnalyzeResponse {
  isSafe: boolean;
  riskLevel: "low" | "medium" | "high";
  concerns: string[];
  error?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      return new Response(
        JSON.stringify({ isSafe: true, riskLevel: "low", concerns: [], error: "AI analysis not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { scriptContent, fileName }: AnalyzeRequest = await req.json();

    if (!scriptContent) {
      return new Response(
        JSON.stringify({ isSafe: true, riskLevel: "low", concerns: [] }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Analyzing Lua script: ${fileName}, length: ${scriptContent.length} chars`);

    // Truncate very long scripts to avoid token limits
    const maxLength = 50000;
    const truncatedContent = scriptContent.length > maxLength 
      ? scriptContent.substring(0, maxLength) + "\n-- [TRUNCATED]" 
      : scriptContent;

    const systemPrompt = `You are a Roblox Lua script security analyzer. Analyze the provided script for malicious patterns.

Look for these security concerns:
1. **Obfuscation**: Heavy string encoding (loadstring, string.char abuse), unreadable variable names, base64-like patterns
2. **Network requests**: HttpService calls, especially to unknown domains, Discord webhooks, paste sites
3. **Data exfiltration**: Sending player data (UserIds, usernames, chat) to external servers
4. **Backdoors**: Remote code execution, eval-like patterns, getfenv/setfenv abuse
5. **Credential theft**: Attempting to access or steal user information
6. **Exploit loaders**: Loading external scripts from paste bins or unknown URLs
7. **Elevated privileges**: Attempts to access DataStoreService unusually, teleport players maliciously

Respond ONLY with a JSON object (no markdown, no extra text):
{
  "isSafe": boolean,
  "riskLevel": "low" | "medium" | "high",
  "concerns": string[]
}

- isSafe: false if any medium/high risk patterns found
- riskLevel: "high" for clear malware, "medium" for suspicious patterns, "low" for safe scripts
- concerns: Array of specific security concerns found (max 5, be concise)`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Analyze this Roblox Lua script for security issues:\n\n\`\`\`lua\n${truncatedContent}\n\`\`\`` }
        ],
        temperature: 0.1, // Low temperature for consistent analysis
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI API error:", response.status, errorText);
      
      if (response.status === 429 || response.status === 402) {
        console.warn("AI rate limited - allowing file through with basic checks");
        // Fall back to basic pattern matching
        return performBasicAnalysis(scriptContent, fileName);
      }
      
      return new Response(
        JSON.stringify({ isSafe: true, riskLevel: "low", concerns: [], error: "AI analysis failed" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiResult = await response.json();
    const content = aiResult.choices?.[0]?.message?.content;
    
    console.log("AI analysis raw response:", content);

    if (!content) {
      return performBasicAnalysis(scriptContent, fileName);
    }

    try {
      // Clean the response - remove markdown code blocks if present
      let cleanedContent = content.trim();
      if (cleanedContent.startsWith("```json")) {
        cleanedContent = cleanedContent.slice(7);
      } else if (cleanedContent.startsWith("```")) {
        cleanedContent = cleanedContent.slice(3);
      }
      if (cleanedContent.endsWith("```")) {
        cleanedContent = cleanedContent.slice(0, -3);
      }
      cleanedContent = cleanedContent.trim();

      const analysis: AnalyzeResponse = JSON.parse(cleanedContent);
      
      // Validate the response structure
      if (typeof analysis.isSafe !== "boolean" || !["low", "medium", "high"].includes(analysis.riskLevel)) {
        throw new Error("Invalid response structure");
      }

      console.log(`Script analysis complete: ${fileName} - Risk: ${analysis.riskLevel}, Safe: ${analysis.isSafe}`);

      return new Response(
        JSON.stringify(analysis),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      return performBasicAnalysis(scriptContent, fileName);
    }

  } catch (error) {
    console.error("Lua script analysis error:", error);
    return new Response(
      JSON.stringify({ isSafe: true, riskLevel: "low", concerns: [], error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Basic pattern matching fallback when AI is unavailable
function performBasicAnalysis(scriptContent: string, fileName: string): Response {
  console.log(`Performing basic pattern analysis for: ${fileName}`);
  
  const concerns: string[] = [];
  let riskLevel: "low" | "medium" | "high" = "low";
  
  const lowerContent = scriptContent.toLowerCase();
  
  // Check for obfuscation patterns
  if (lowerContent.includes("loadstring") && (lowerContent.includes("string.char") || lowerContent.includes("\\x"))) {
    concerns.push("Potential obfuscated code detected (loadstring + encoding)");
    riskLevel = "high";
  }
  
  // Check for common malicious URLs
  const suspiciousPatterns = [
    /discord\.com\/api\/webhooks/i,
    /pastebin\.com\/raw/i,
    /roblox-api\./i,
    /getfenv|setfenv/i,
  ];
  
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(scriptContent)) {
      concerns.push(`Suspicious pattern detected: ${pattern.source.substring(0, 30)}...`);
      if (riskLevel === "low") riskLevel = "medium";
    }
  }
  
  // Check for HttpService calls to unknown domains
  if (/httpservice/i.test(scriptContent) && /\:request|\:get|\:post/i.test(scriptContent)) {
    concerns.push("External HTTP requests detected - verify destination URLs");
    if (riskLevel === "low") riskLevel = "medium";
  }
  
  // Excessive base64-like patterns
  const base64Matches = scriptContent.match(/[A-Za-z0-9+/=]{50,}/g);
  if (base64Matches && base64Matches.length > 3) {
    concerns.push("Multiple encoded strings detected - potential obfuscation");
    if (riskLevel === "low") riskLevel = "medium";
  }

  const isSafe = riskLevel === "low";
  
  console.log(`Basic analysis complete: ${fileName} - Risk: ${riskLevel}, Concerns: ${concerns.length}`);

  return new Response(
    JSON.stringify({ isSafe, riskLevel, concerns }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}
