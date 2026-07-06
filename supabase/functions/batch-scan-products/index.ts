import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Lua extensions to look for inside zip
const LUA_EXTENSIONS = [".lua", ".luau"];
const ROBLOX_EXTENSIONS = [".rbxm", ".rbxmx", ".rbxl", ".rbxlx"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Auth check - only admins (mandatory)
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.replace("Bearer ", "");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    if (token !== serviceKey) {
      const { data: userRes, error: userErr } = await supabase.auth.getUser(token);
      if (userErr || !userRes?.user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userRes.user.id);
      const isAdmin = roles?.some(r => ["admin", "lead_administrator"].includes(r.role));
      if (!isAdmin) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Get pending products with files but no scan results
    const { data: products, error: fetchError } = await supabase
      .from("products")
      .select("id, name, asset_file_url, store_id")
      .eq("moderation_status", "pending")
      .is("moderation_flags", null)
      .not("asset_file_url", "is", null)
      .limit(50);

    if (fetchError) {
      throw new Error(`Failed to fetch products: ${fetchError.message}`);
    }

    if (!products || products.length === 0) {
      return new Response(JSON.stringify({ message: "No products to scan", scanned: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Starting batch scan for ${products.length} products...`);

    const results: { id: string; name: string; status: string; flags: any }[] = [];

    for (const product of products) {
      try {
        console.log(`Scanning: ${product.name} (${product.id})`);
        
        // Download the zip from storage
        const filePath = product.asset_file_url;
        const { data: fileData, error: downloadError } = await supabase.storage
          .from("product-assets")
          .download(filePath);

        if (downloadError || !fileData) {
          console.error(`Failed to download ${filePath}:`, downloadError?.message);
          
          // Mark as scanned with no file found
          const flags = {
            scan_timestamp: new Date().toISOString(),
            scan_error: "File could not be downloaded",
            lua_risk_level: "unknown",
            lua_concerns: [],
            nsfw_flags: [],
          };
          
          await supabase
            .from("products")
            .update({ moderation_flags: flags })
            .eq("id", product.id);
          
          results.push({ id: product.id, name: product.name, status: "download_failed", flags });
          continue;
        }

        // Read zip contents - look for Lua files
        const arrayBuffer = await fileData.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        
        // Basic zip file entry scanning
        const luaContents: { name: string; content: string }[] = [];
        let hasRobloxFiles = false;
        let totalFiles = 0;
        const fileNames: string[] = [];

        // Parse zip central directory to find files
        // ZIP end of central directory record starts with 0x06054b50
        let eocdPos = -1;
        for (let i = bytes.length - 22; i >= 0; i--) {
          if (bytes[i] === 0x50 && bytes[i+1] === 0x4b && bytes[i+2] === 0x05 && bytes[i+3] === 0x06) {
            eocdPos = i;
            break;
          }
        }

        if (eocdPos === -1) {
          console.log(`${product.name}: Not a valid zip file`);
          const flags = {
            scan_timestamp: new Date().toISOString(),
            scan_note: "File is not a valid zip archive",
            lua_risk_level: "low",
            lua_concerns: [],
            nsfw_flags: [],
          };
          await supabase.from("products").update({ moderation_flags: flags }).eq("id", product.id);
          results.push({ id: product.id, name: product.name, status: "not_zip", flags });
          continue;
        }

        // Parse local file headers to extract file names and Lua content
        let offset = 0;
        while (offset < bytes.length - 30) {
          // Local file header signature: 0x04034b50
          if (bytes[offset] !== 0x50 || bytes[offset+1] !== 0x4b || bytes[offset+2] !== 0x03 || bytes[offset+3] !== 0x04) {
            break;
          }

          const compressionMethod = bytes[offset + 8] | (bytes[offset + 9] << 8);
          const compressedSize = bytes[offset + 18] | (bytes[offset + 19] << 8) | (bytes[offset + 20] << 16) | (bytes[offset + 21] << 24);
          const uncompressedSize = bytes[offset + 22] | (bytes[offset + 23] << 8) | (bytes[offset + 24] << 16) | (bytes[offset + 25] << 24);
          const nameLength = bytes[offset + 26] | (bytes[offset + 27] << 8);
          const extraLength = bytes[offset + 28] | (bytes[offset + 29] << 8);

          const nameBytes = bytes.slice(offset + 30, offset + 30 + nameLength);
          const fileName = new TextDecoder().decode(nameBytes);
          
          totalFiles++;
          fileNames.push(fileName);

          const dataStart = offset + 30 + nameLength + extraLength;
          const ext = fileName.toLowerCase().substring(fileName.lastIndexOf("."));

          // Check for Roblox files
          if (ROBLOX_EXTENSIONS.includes(ext)) {
            hasRobloxFiles = true;
          }

          // Extract Lua files (only uncompressed/stored for simplicity)
          if (LUA_EXTENSIONS.includes(ext) && compressionMethod === 0 && uncompressedSize > 0 && uncompressedSize < 500000) {
            try {
              const contentBytes = bytes.slice(dataStart, dataStart + uncompressedSize);
              const content = new TextDecoder().decode(contentBytes);
              luaContents.push({ name: fileName, content });
            } catch (e) {
              console.warn(`Failed to extract ${fileName}:`, e);
            }
          }

          // Move to next file header
          offset = dataStart + (compressedSize > 0 ? compressedSize : uncompressedSize);
        }

        console.log(`${product.name}: ${totalFiles} files found, ${luaContents.length} Lua files extracted, ${hasRobloxFiles ? 'has' : 'no'} Roblox files`);

        // Perform basic Lua analysis on extracted scripts
        const allConcerns: string[] = [];
        let overallRiskLevel: "low" | "medium" | "high" = "low";

        for (const lua of luaContents) {
          const analysis = analyzeScript(lua.content, lua.name);
          if (analysis.concerns.length > 0) {
            allConcerns.push(...analysis.concerns.map(c => `[${lua.name}] ${c}`));
          }
          if (analysis.riskLevel === "high") overallRiskLevel = "high";
          else if (analysis.riskLevel === "medium" && overallRiskLevel === "low") overallRiskLevel = "medium";
        }

        const flags = {
          scan_timestamp: new Date().toISOString(),
          lua_risk_level: overallRiskLevel,
          lua_concerns: allConcerns.slice(0, 10),
          nsfw_flags: [],
          total_files: totalFiles,
          lua_files_found: luaContents.length,
          has_roblox_files: hasRobloxFiles,
          file_names_sample: fileNames.slice(0, 20),
        };

        await supabase
          .from("products")
          .update({ moderation_flags: flags })
          .eq("id", product.id);

        results.push({ id: product.id, name: product.name, status: "scanned", flags });
        console.log(`✓ ${product.name}: ${overallRiskLevel} risk, ${allConcerns.length} concerns`);

      } catch (productError) {
        console.error(`Error scanning ${product.name}:`, productError);
        results.push({ 
          id: product.id, 
          name: product.name, 
          status: "error", 
          flags: { error: productError instanceof Error ? productError.message : "Unknown error" }
        });
      }
    }

    const summary = {
      total: products.length,
      scanned: results.filter(r => r.status === "scanned").length,
      errors: results.filter(r => r.status === "error" || r.status === "download_failed").length,
      flagged: results.filter(r => r.flags?.lua_risk_level === "medium" || r.flags?.lua_risk_level === "high").length,
      results,
    };

    console.log(`Batch scan complete: ${summary.scanned} scanned, ${summary.flagged} flagged, ${summary.errors} errors`);

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Batch scan error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Basic pattern matching analysis (same as the fallback in analyze-lua-script)
function analyzeScript(content: string, fileName: string): { riskLevel: "low" | "medium" | "high"; concerns: string[] } {
  const concerns: string[] = [];
  let riskLevel: "low" | "medium" | "high" = "low";
  const lowerContent = content.toLowerCase();

  const dangerousAPIs = [
    { pattern: /\bloadstring\s*\(/gi, name: "loadstring", risk: "high" },
    { pattern: /\bgetfenv\s*\(/gi, name: "getfenv", risk: "high" },
    { pattern: /\bsetfenv\s*\(/gi, name: "setfenv", risk: "high" },
    { pattern: /\bstring\.dump\s*\(/gi, name: "string.dump", risk: "high" },
    { pattern: /\bdebug\.(getinfo|setmetatable|getmetatable|setupvalue)\s*\(/gi, name: "debug library", risk: "high" },
    { pattern: /\brawset\s*\(\s*_G/gi, name: "rawset _G", risk: "high" },
    { pattern: /\brawget\s*\(\s*_G/gi, name: "rawget _G", risk: "medium" },
  ];

  for (const api of dangerousAPIs) {
    if (api.pattern.test(content)) {
      concerns.push(`Dangerous API: ${api.name}`);
      if (api.risk === "high") riskLevel = "high";
      else if (riskLevel === "low") riskLevel = "medium";
    }
  }

  if (lowerContent.includes("loadstring") && (lowerContent.includes("string.char") || /\\x[0-9a-f]{2}/i.test(content))) {
    concerns.push("Obfuscated code (loadstring + encoding)");
    riskLevel = "high";
  }

  const stringCharMatches = content.match(/string\.char\s*\(/gi);
  if (stringCharMatches && stringCharMatches.length > 10) {
    concerns.push(`Heavy string.char usage (${stringCharMatches.length} calls)`);
    if (riskLevel === "low") riskLevel = "medium";
  }

  const randomVarPattern = /\b(_0x[a-f0-9]+|[a-z]{1,2}\d{2,}|_[A-Z]{5,})\s*=/g;
  const randomVarMatches = content.match(randomVarPattern);
  if (randomVarMatches && randomVarMatches.length > 5) {
    concerns.push("Obfuscated variable names");
    if (riskLevel === "low") riskLevel = "medium";
  }

  const base64Matches = content.match(/[A-Za-z0-9+/=]{50,}/g);
  if (base64Matches && base64Matches.length > 3) {
    concerns.push(`Encoded strings detected (${base64Matches.length})`);
    if (riskLevel === "low") riskLevel = "medium";
  }

  if (/discord\.com\/api\/webhooks/i.test(content)) concerns.push("Discord webhook URL");
  if (/pastebin\.com\/raw/i.test(content)) concerns.push("Pastebin URL");

  if (/httpservice/i.test(content) && /:(request|get|post)async/i.test(content)) {
    concerns.push("External HTTP requests");
    if (riskLevel === "low") riskLevel = "medium";
  }

  if (/player\.(userid|name)/i.test(content) && /httpservice/i.test(content)) {
    concerns.push("Potential data exfiltration");
    if (riskLevel === "low") riskLevel = "medium";
  }

  if (/\.chatted|textchatservice/i.test(content) && /httpservice/i.test(content)) {
    concerns.push("Chat logging with HTTP");
    riskLevel = "high";
  }

  return { riskLevel, concerns };
}
