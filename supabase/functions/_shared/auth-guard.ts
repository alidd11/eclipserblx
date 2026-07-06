// Shared auth guards for edge functions.
// Use requireServiceRole for internal cron/system-only functions
// Use requireAdmin for admin-triggered functions.

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const jsonHeaders = { "Content-Type": "application/json" };

export function requireServiceRole(req: Request, extraHeaders: Record<string, string> = {}): Response | null {
  const auth = req.headers.get("Authorization") || req.headers.get("authorization") || "";
  const token = auth.replace(/^Bearer\s+/i, "");
  const expected = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!expected || token !== expected) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...jsonHeaders, ...extraHeaders },
    });
  }
  return null;
}

export async function requireAdmin(
  req: Request,
  extraHeaders: Record<string, string> = {},
): Promise<{ error: Response } | { user: { id: string; email?: string }; supabase: SupabaseClient }> {
  const auth = req.headers.get("Authorization") || req.headers.get("authorization") || "";
  if (!auth.toLowerCase().startsWith("bearer ")) {
    return { error: new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...jsonHeaders, ...extraHeaders } }) };
  }
  const token = auth.slice(7);
  const url = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // If token matches service role, allow.
  if (token === serviceKey) {
    const supabase = createClient(url, serviceKey);
    return { user: { id: "service_role" }, supabase };
  }

  const supabase = createClient(url, serviceKey);
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) {
    return { error: new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...jsonHeaders, ...extraHeaders } }) };
  }
  const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", data.user.id);
  const isAdmin = roles?.some((r: { role: string }) => ["admin", "lead_administrator"].includes(r.role));
  if (!isAdmin) {
    return { error: new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...jsonHeaders, ...extraHeaders } }) };
  }
  return { user: { id: data.user.id, email: data.user.email }, supabase };
}

export async function requireStaff(
  req: Request,
  extraHeaders: Record<string, string> = {},
): Promise<{ error: Response } | { user: { id: string; email?: string }; supabase: SupabaseClient }> {
  const auth = req.headers.get("Authorization") || req.headers.get("authorization") || "";
  if (!auth.toLowerCase().startsWith("bearer ")) {
    return { error: new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...jsonHeaders, ...extraHeaders } }) };
  }
  const token = auth.slice(7);
  const url = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  if (token === serviceKey) {
    return { user: { id: "service_role" }, supabase: createClient(url, serviceKey) };
  }
  const supabase = createClient(url, serviceKey);
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) {
    return { error: new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...jsonHeaders, ...extraHeaders } }) };
  }
  const staffRoles = new Set([
    "admin",
    "lead_administrator",
    "lead_manager",
    "moderator",
    "support_agent",
    "manager",
    "staff",
  ]);
  const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", data.user.id);
  const isStaff = roles?.some((r: { role: string }) => staffRoles.has(r.role));
  if (!isStaff) {
    return { error: new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...jsonHeaders, ...extraHeaders } }) };
  }
  return { user: { id: data.user.id, email: data.user.email }, supabase };
}
