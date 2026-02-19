import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

const CACHE_TTL_DAYS = 7;

// Simple hash function for script content
async function hashContent(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

serve(async (req) => {
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

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check cache by script hash
    const contentHash = await hashContent(scriptContent);
    const cacheKey = `lua_analysis:${contentHash}`;

    const { data: cached } = await supabase
      .from("ai_response_cache")
      .select("response")
      .eq("cache_key", cacheKey)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (cached) {
      console.log(`Cache hit for Lua script: ${fileName} (hash: ${contentHash.slice(0, 8)})`);
      return new Response(
        JSON.stringify(cached.response),
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

## CRITICAL DANGEROUS PATTERNS (HIGH RISK - BLOCK):
1. **loadstring()** - Dynamic code execution, often used for obfuscation
2. **getfenv/setfenv** - Environment manipulation, sandbox escape attempts
3. **rawget/rawset on _G** - Global table manipulation for persistence
4. **string.dump** - Bytecode dumping for obfuscation
5. **debug library abuse** - debug.getinfo, debug.setmetatable for exploits
6. **require() with URLs** - Loading external malicious modules
7. **RunService.Heartbeat with heavy loops** - Lag exploits

## OBFUSCATION INDICATORS (HIGH RISK):
- Excessive string.char() chains (>10 calls)
- Base64-like long strings (50+ alphanumeric chars)
- Variable names that are random characters (a1b2c3, _0x prefix)
- String concatenation building URLs character by character
- XOR/bit operations on strings for encoding
- Nested function calls to decode strings

## NETWORK CONCERNS (MEDIUM-HIGH RISK):
- HttpService:RequestAsync, HttpService:GetAsync, HttpService:PostAsync
- Discord webhook URLs (discord.com/api/webhooks)
- Pastebin, hastebin, rentry URLs
- Unknown external domains
- Sending player.UserId, player.Name to external servers

## DATA EXFILTRATION (HIGH RISK):
- Collecting player chat messages
- Accessing player position/movement patterns
- Reading DataStore keys without authorization
- Gathering server information (game.PlaceId, game.JobId)

## PRIVILEGE ESCALATION (HIGH RISK):
- TeleportService without proper validation
- Kick/ban functions without permission checks
- MarketplaceService purchase prompts to unauthorized items

Respond ONLY with a JSON object (no markdown, no extra text):
{
  "isSafe": boolean,
  "riskLevel": "low" | "medium" | "high",
  "concerns": string[],
  "dangerousAPIs": string[],
  "obfuscationScore": number
}

- isSafe: false if any medium/high risk patterns found
- riskLevel: "high" for loadstring/getfenv/obfuscation, "medium" for suspicious network/data patterns, "low" for safe scripts
- concerns: Array of specific security concerns found (max 5, be concise)
- dangerousAPIs: Array of dangerous API calls found (loadstring, getfenv, etc)
- obfuscationScore: 0-100 score where 0=clear code, 100=heavily obfuscated`;

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
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI API error:", response.status, errorText);
      
      if (response.status === 429 || response.status === 402) {
        console.warn("AI rate limited - allowing file through with basic checks");
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
      // Clean the response
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

      const analysis = JSON.parse(cleanedContent);
      
      if (typeof analysis.isSafe !== "boolean" || !["low", "medium", "high"].includes(analysis.riskLevel)) {
        throw new Error("Invalid response structure");
      }

      const analysisResponse: AnalyzeResponse = {
        isSafe: analysis.isSafe,
        riskLevel: analysis.riskLevel,
        concerns: analysis.concerns || [],
      };

      if (analysis.dangerousAPIs && analysis.dangerousAPIs.length > 0) {
        analysisResponse.concerns = [
          ...analysisResponse.concerns,
          `Dangerous APIs detected: ${analysis.dangerousAPIs.join(', ')}`
        ];
        if (analysis.dangerousAPIs.some((api: string) => 
          ['loadstring', 'getfenv', 'setfenv', 'string.dump'].includes(api.toLowerCase())
        )) {
          analysisResponse.riskLevel = 'high';
          analysisResponse.isSafe = false;
        }
      }

      if (analysis.obfuscationScore && analysis.obfuscationScore > 70) {
        analysisResponse.concerns = [
          ...analysisResponse.concerns,
          `High obfuscation detected (score: ${analysis.obfuscationScore}/100)`
        ];
        if (analysisResponse.riskLevel === 'low') {
          analysisResponse.riskLevel = 'medium';
        }
      }

      console.log(`Script analysis complete: ${fileName} - Risk: ${analysisResponse.riskLevel}, Safe: ${analysisResponse.isSafe}, Concerns: ${analysisResponse.concerns.length}`);

      // Cache result (fire-and-forget)
      const expiresAt = new Date(Date.now() + CACHE_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();
      supabase
        .from("ai_response_cache")
        .upsert({ cache_key: cacheKey, function_name: "analyze-lua-script", response: analysis, expires_at: expiresAt }, { onConflict: "cache_key" })
        .then(({ error }) => { if (error) console.error("Cache write error:", error); });

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
  
  const dangerousAPIs = [
    { pattern: /\bloadstring\s*\(/gi, name: 'loadstring', risk: 'high' },
    { pattern: /\bgetfenv\s*\(/gi, name: 'getfenv', risk: 'high' },
    { pattern: /\bsetfenv\s*\(/gi, name: 'setfenv', risk: 'high' },
    { pattern: /\bstring\.dump\s*\(/gi, name: 'string.dump', risk: 'high' },
    { pattern: /\bdebug\.(getinfo|setmetatable|getmetatable|setupvalue)\s*\(/gi, name: 'debug library', risk: 'high' },
    { pattern: /\brawset\s*\(\s*_G/gi, name: 'rawset _G', risk: 'high' },
    { pattern: /\brawget\s*\(\s*_G/gi, name: 'rawget _G', risk: 'medium' },
  ];

  for (const api of dangerousAPIs) {
    if (api.pattern.test(scriptContent)) {
      concerns.push(`Dangerous API: ${api.name} detected`);
      if (api.risk === 'high') riskLevel = 'high';
      else if (riskLevel === 'low') riskLevel = 'medium';
    }
  }

  if (lowerContent.includes("loadstring") && (lowerContent.includes("string.char") || /\\x[0-9a-f]{2}/i.test(scriptContent))) {
    concerns.push("Obfuscated code detected (loadstring + encoding)");
    riskLevel = "high";
  }

  const stringCharMatches = scriptContent.match(/string\.char\s*\(/gi);
  if (stringCharMatches && stringCharMatches.length > 10) {
    concerns.push(`Heavy string.char usage (${stringCharMatches.length} calls) - obfuscation indicator`);
    if (riskLevel === "low") riskLevel = "medium";
  }

  const randomVarPattern = /\b(_0x[a-f0-9]+|[a-z]{1,2}\d{2,}|_[A-Z]{5,})\s*=/g;
  const randomVarMatches = scriptContent.match(randomVarPattern);
  if (randomVarMatches && randomVarMatches.length > 5) {
    concerns.push("Obfuscated variable names detected");
    if (riskLevel === "low") riskLevel = "medium";
  }

  const base64Matches = scriptContent.match(/[A-Za-z0-9+/=]{50,}/g);
  if (base64Matches && base64Matches.length > 3) {
    concerns.push(`Multiple encoded strings detected (${base64Matches.length} instances)`);
    if (riskLevel === "low") riskLevel = "medium";
  }

  const networkPatterns = [
    { pattern: /discord\.com\/api\/webhooks/i, name: 'Discord webhook' },
    { pattern: /pastebin\.com\/raw/i, name: 'Pastebin' },
    { pattern: /hastebin\.com/i, name: 'Hastebin' },
    { pattern: /rentry\.co/i, name: 'Rentry' },
  ];

  for (const np of networkPatterns) {
    if (np.pattern.test(scriptContent)) {
      concerns.push(`External service detected: ${np.name}`);
      if (riskLevel === "low") riskLevel = "medium";
    }
  }

  if (/httpservice/i.test(scriptContent) && /:(request|get|post)async/i.test(scriptContent)) {
    concerns.push("External HTTP requests detected - verify destination URLs");
    if (riskLevel === "low") riskLevel = "medium";
  }

  if (/player\.(userid|name)/i.test(scriptContent) && /httpservice/i.test(scriptContent)) {
    concerns.push("Potential data exfiltration: Player data with HTTP requests");
    if (riskLevel === "low") riskLevel = "medium";
  }

  if (/\.chatted|textchatservice|chat\.chatted/i.test(scriptContent) && /httpservice/i.test(scriptContent)) {
    concerns.push("Potential chat logging: Chat events with HTTP requests");
    riskLevel = "high";
  }

  const isSafe = riskLevel === "low";
  console.log(`Basic analysis complete: ${fileName} - Risk: ${riskLevel}, Concerns: ${concerns.length}`);

  return new Response(
    JSON.stringify({ isSafe, riskLevel, concerns }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}
