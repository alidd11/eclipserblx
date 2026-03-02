/**
 * Standardized edge function response helpers.
 * Ensures consistent error shapes, CORS headers, and security headers across all functions.
 */

export const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
};

/** Security headers appended to every non-OPTIONS response */
const securityHeaders: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
};

function mergedHeaders(extra?: Record<string, string>): Record<string, string> {
  return { ...corsHeaders, ...securityHeaders, ...extra };
}

/** Handle CORS preflight */
export function handleCors(req: Request): Response | null {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  return null;
}

/** Standard JSON success response */
export function jsonOk<T>(data: T, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: mergedHeaders({ "Content-Type": "application/json" }),
  });
}

/** Standard JSON error response with consistent shape */
export function jsonError(
  message: string,
  status = 400,
  code?: string
): Response {
  const body: { error: string; code?: string } = { error: message };
  if (code) body.code = code;
  return new Response(JSON.stringify(body), {
    status,
    headers: mergedHeaders({ "Content-Type": "application/json" }),
  });
}

/** 401 Unauthorized */
export function unauthorized(message = "Authentication required"): Response {
  return jsonError(message, 401, "UNAUTHORIZED");
}

/** 403 Forbidden */
export function forbidden(message = "Access denied"): Response {
  return jsonError(message, 403, "FORBIDDEN");
}

/** 404 Not Found */
export function notFound(message = "Resource not found"): Response {
  return jsonError(message, 404, "NOT_FOUND");
}

/** 429 Rate Limited */
export function rateLimited(message = "Too many requests"): Response {
  return jsonError(message, 429, "RATE_LIMITED");
}

/** 500 Internal Error — logs the original error for debugging */
export function internalError(error: unknown, publicMessage = "Internal server error"): Response {
  console.error("[EdgeFunction] Internal error:", error);
  return jsonError(publicMessage, 500, "INTERNAL_ERROR");
}
