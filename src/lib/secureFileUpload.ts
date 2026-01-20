import { supabase } from "@/integrations/supabase/client";

export interface FileValidationOptions {
  maxSize?: number; // in bytes
  allowedTypes?: string[];
  allowedExtensions?: string[];
}

export interface SecurityScanResult {
  isAllowed: boolean;
  reason?: string;
  virusName?: string;
  luaRiskLevel?: "low" | "medium" | "high";
  luaConcerns?: string[];
  isNsfw?: boolean;
}

interface VirusScanResponse {
  isClean: boolean;
  virusName?: string;
  warning?: string;
  error?: string;
}

interface LuaAnalysisResponse {
  isSafe: boolean;
  riskLevel: "low" | "medium" | "high";
  concerns: string[];
  error?: string;
}

interface NsfwCheckResponse {
  isNSFW: boolean;
  reason?: string;
}

const LUA_EXTENSIONS = [".lua", ".luau"];
const ROBLOX_FILE_EXTENSIONS = [".rbxm", ".rbxmx", ".rbxl", ".rbxlx"];
const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp"];

/**
 * Validates a file before upload - runs client-side checks
 */
export function validateFile(file: File, options: FileValidationOptions = {}): { valid: boolean; error?: string } {
  const { 
    maxSize = 50 * 1024 * 1024, // 50MB default
    allowedTypes = [],
    allowedExtensions = []
  } = options;

  // Check file size
  if (file.size > maxSize) {
    const sizeMB = Math.round(maxSize / (1024 * 1024));
    return { valid: false, error: `File size exceeds ${sizeMB}MB limit` };
  }

  // Check MIME type if specified
  if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
    return { valid: false, error: `File type "${file.type}" is not allowed` };
  }

  // Check extension if specified
  if (allowedExtensions.length > 0) {
    const ext = getFileExtension(file.name).toLowerCase();
    if (!allowedExtensions.includes(ext)) {
      return { valid: false, error: `File extension "${ext}" is not allowed` };
    }
  }

  return { valid: true };
}

/**
 * Get file extension including the dot
 */
function getFileExtension(fileName: string): string {
  const lastDot = fileName.lastIndexOf(".");
  return lastDot > 0 ? fileName.substring(lastDot).toLowerCase() : "";
}

/**
 * Convert file to base64
 */
async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove data URL prefix if present
      const base64 = result.includes(",") ? result.split(",")[1] : result;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Read file as text (for Lua script analysis)
 */
async function fileToText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

/**
 * Check if file is a Lua script
 */
function isLuaFile(fileName: string): boolean {
  const ext = getFileExtension(fileName);
  return LUA_EXTENSIONS.includes(ext);
}

/**
 * Check if file is a Roblox asset file
 */
function isRobloxFile(fileName: string): boolean {
  const ext = getFileExtension(fileName);
  return ROBLOX_FILE_EXTENSIONS.includes(ext);
}

/**
 * Check if file is an image
 */
function isImageFile(fileName: string, mimeType?: string): boolean {
  if (mimeType && mimeType.startsWith("image/")) return true;
  const ext = getFileExtension(fileName);
  return IMAGE_EXTENSIONS.includes(ext);
}

/**
 * Scan file for viruses using Cloudmersive
 */
async function scanForVirus(fileBase64: string, fileName: string): Promise<VirusScanResponse> {
  try {
    const { data, error } = await supabase.functions.invoke("scan-file-virus", {
      body: { fileBase64, fileName }
    });

    if (error) {
      console.error("Virus scan invocation error:", error);
      // Allow file through on scan failure (fail open for availability)
      return { isClean: true, warning: "Scan unavailable" };
    }

    return data as VirusScanResponse;
  } catch (err) {
    console.error("Virus scan error:", err);
    return { isClean: true, warning: "Scan failed" };
  }
}

/**
 * Analyze Lua script for malicious patterns using AI
 */
async function analyzeLuaScript(scriptContent: string, fileName: string): Promise<LuaAnalysisResponse> {
  try {
    const { data, error } = await supabase.functions.invoke("analyze-lua-script", {
      body: { scriptContent, fileName }
    });

    if (error) {
      console.error("Lua analysis invocation error:", error);
      return { isSafe: true, riskLevel: "low", concerns: [], error: "Analysis unavailable" };
    }

    return data as LuaAnalysisResponse;
  } catch (err) {
    console.error("Lua analysis error:", err);
    return { isSafe: true, riskLevel: "low", concerns: [], error: "Analysis failed" };
  }
}

/**
 * Check image for NSFW content
 */
async function checkNsfw(imageBase64: string): Promise<NsfwCheckResponse> {
  try {
    const { data, error } = await supabase.functions.invoke("check-nsfw", {
      body: { imageBase64 }
    });

    if (error) {
      console.error("NSFW check invocation error:", error);
      return { isNSFW: false };
    }

    return data as NsfwCheckResponse;
  } catch (err) {
    console.error("NSFW check error:", err);
    return { isNSFW: false };
  }
}

/**
 * Perform comprehensive security scan on a file
 * Pipeline: Virus scan → Lua analysis (if applicable) → NSFW check (if image)
 */
export async function performSecurityScan(
  file: File, 
  options: {
    skipVirusScan?: boolean;
    skipLuaAnalysis?: boolean;
    skipNsfwCheck?: boolean;
    blockMediumRiskLua?: boolean; // Whether to block medium-risk Lua files
  } = {}
): Promise<SecurityScanResult> {
  const { 
    skipVirusScan = false, 
    skipLuaAnalysis = false, 
    skipNsfwCheck = false,
    blockMediumRiskLua = false 
  } = options;

  const fileName = file.name;
  console.log(`Starting security scan for: ${fileName}`);

  // Step 1: Virus scan (for all files)
  if (!skipVirusScan) {
    try {
      const fileBase64 = await fileToBase64(file);
      const virusResult = await scanForVirus(fileBase64, fileName);

      if (!virusResult.isClean) {
        console.warn(`Virus detected in ${fileName}: ${virusResult.virusName}`);
        return {
          isAllowed: false,
          reason: `Malware detected: ${virusResult.virusName || "Unknown threat"}`,
          virusName: virusResult.virusName
        };
      }
    } catch (err) {
      console.error("Virus scan failed:", err);
      // Continue - fail open
    }
  }

  // Step 2: Lua script analysis (for .lua files)
  if (!skipLuaAnalysis && (isLuaFile(fileName) || isRobloxFile(fileName))) {
    try {
      let scriptContent: string;
      
      if (isLuaFile(fileName)) {
        scriptContent = await fileToText(file);
      } else {
        // For Roblox files, they're XML-based, so we can still analyze them
        scriptContent = await fileToText(file);
      }

      const luaResult = await analyzeLuaScript(scriptContent, fileName);

      if (luaResult.riskLevel === "high") {
        console.warn(`High-risk Lua script blocked: ${fileName}`);
        return {
          isAllowed: false,
          reason: "Script contains potentially malicious code",
          luaRiskLevel: luaResult.riskLevel,
          luaConcerns: luaResult.concerns
        };
      }

      if (blockMediumRiskLua && luaResult.riskLevel === "medium") {
        console.warn(`Medium-risk Lua script blocked: ${fileName}`);
        return {
          isAllowed: false,
          reason: "Script contains suspicious patterns",
          luaRiskLevel: luaResult.riskLevel,
          luaConcerns: luaResult.concerns
        };
      }

      // Return concerns even if allowed (for warnings)
      if (luaResult.concerns.length > 0) {
        return {
          isAllowed: true,
          luaRiskLevel: luaResult.riskLevel,
          luaConcerns: luaResult.concerns
        };
      }
    } catch (err) {
      console.error("Lua analysis failed:", err);
      // Continue - fail open
    }
  }

  // Step 3: NSFW check (for images)
  if (!skipNsfwCheck && isImageFile(fileName, file.type)) {
    try {
      const imageBase64 = await fileToBase64(file);
      const nsfwResult = await checkNsfw(imageBase64);

      if (nsfwResult.isNSFW) {
        console.warn(`NSFW content blocked: ${fileName}`);
        return {
          isAllowed: false,
          reason: nsfwResult.reason || "Image contains inappropriate content",
          isNsfw: true
        };
      }
    } catch (err) {
      console.error("NSFW check failed:", err);
      // Continue - fail open
    }
  }

  // All checks passed
  return { isAllowed: true };
}

/**
 * Upload file to Supabase storage with security scanning
 */
export async function secureUpload(
  file: File,
  bucket: string,
  path: string,
  options: {
    validation?: FileValidationOptions;
    skipVirusScan?: boolean;
    skipLuaAnalysis?: boolean;
    skipNsfwCheck?: boolean;
    blockMediumRiskLua?: boolean;
    upsert?: boolean;
  } = {}
): Promise<{ 
  success: boolean; 
  url?: string; 
  path?: string;
  error?: string;
  securityResult?: SecurityScanResult;
}> {
  // Step 1: Client-side validation
  if (options.validation) {
    const validationResult = validateFile(file, options.validation);
    if (!validationResult.valid) {
      return { success: false, error: validationResult.error };
    }
  }

  // Step 2: Security scan
  const scanResult = await performSecurityScan(file, {
    skipVirusScan: options.skipVirusScan,
    skipLuaAnalysis: options.skipLuaAnalysis,
    skipNsfwCheck: options.skipNsfwCheck,
    blockMediumRiskLua: options.blockMediumRiskLua
  });

  if (!scanResult.isAllowed) {
    return { 
      success: false, 
      error: scanResult.reason || "File blocked by security scan",
      securityResult: scanResult
    };
  }

  // Step 3: Upload to Supabase Storage
  try {
    const { data, error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(path, file, { upsert: options.upsert ?? false });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      return { success: false, error: uploadError.message };
    }

    // Get public URL
    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(data.path);

    return { 
      success: true, 
      url: urlData.publicUrl, 
      path: data.path,
      securityResult: scanResult
    };
  } catch (err) {
    console.error("Upload error:", err);
    return { success: false, error: err instanceof Error ? err.message : "Upload failed" };
  }
}
