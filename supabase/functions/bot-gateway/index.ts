// bot-gateway: privileged proxy for the external eclipse-portal-bot.
// The bot cannot hold the service_role key (Lovable Cloud project) so it
// authenticates to this function with a shared secret and issues privileged
// operations here. verify_jwt = false; gate is the shared secret ONLY.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-bot-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const JSON_HEADERS = { ...CORS, "Content-Type": "application/json" };

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}
function ok(data: unknown): Response {
  return json({ data, error: null }, 200);
}
function err(message: string, status = 400, code?: string): Response {
  return json({ data: null, error: { message, code: code ?? null } }, status);
}

// ── Allowlists ──────────────────────────────────────────────────────────────
// Tables the bot may read via db.select
const READ_TABLES = new Set<string>([
  "profiles",
  "stores",
  "products",
  "orders",
  "order_items",
  "bot_afk_status",
  "bot_mod_actions",
  "bot_command_settings",
  "bot_installation_codes",
  "discord_modmail_tickets",
  "discord_modmail_messages",
  "discord_link_codes",
  "discord_role_configs",
  "global_bans",
  "global_ban_logs",
  "audit_logs",
  "user_roles",
  "store_domains",
]);

// Tables the bot may write via db.insert / db.update / db.delete / db.upsert
const WRITE_TABLES = new Set<string>([
  "bot_afk_status",
  "bot_mod_actions",
  "bot_error_logs",
  "discord_modmail_tickets",
  "discord_modmail_messages",
  "discord_link_codes",
  "global_bans",
  "global_ban_logs",
  "audit_logs",
  "profiles",
  "download_logs",
]);

// RPCs the bot may invoke
const RPC_ALLOW = new Set<string>([
  "increment_download_count",
]);

// Storage buckets the bot may createSignedUrl against
const STORAGE_BUCKETS = new Set<string>([
  "product-assets",
]);

// ── Filter application (for db.* ops) ───────────────────────────────────────
type Filter =
  | { op: "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "like" | "ilike"; column: string; value: unknown }
  | { op: "in"; column: string; value: unknown[] }
  | { op: "is"; column: string; value: null | boolean }
  | { op: "not"; column: string; not_op: string; value: unknown };

function applyFilters<T>(q: T, filters: Filter[] | undefined): T {
  if (!Array.isArray(filters)) return q;
  let qb: any = q;
  for (const f of filters) {
    if (!f || typeof f !== "object" || typeof (f as any).column !== "string") continue;
    switch (f.op) {
      case "eq": qb = qb.eq(f.column, f.value); break;
      case "neq": qb = qb.neq(f.column, f.value); break;
      case "gt": qb = qb.gt(f.column, f.value); break;
      case "gte": qb = qb.gte(f.column, f.value); break;
      case "lt": qb = qb.lt(f.column, f.value); break;
      case "lte": qb = qb.lte(f.column, f.value); break;
      case "like": qb = qb.like(f.column, String(f.value)); break;
      case "ilike": qb = qb.ilike(f.column, String(f.value)); break;
      case "in": qb = qb.in(f.column, f.value); break;
      case "is": qb = qb.is(f.column, f.value as any); break;
      case "not": qb = qb.not(f.column, f.not_op, f.value); break;
    }
  }
  return qb;
}

// ── Handler ────────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  // Shared-secret gate (as its own statement, after preflight)
  const expected = Deno.env.get("BOT_GATEWAY_SECRET");
  if (!expected) return err("BOT_GATEWAY_SECRET not configured", 500, "NO_SECRET");
  const provided = req.headers.get("x-bot-secret") ?? "";
  if (provided !== expected) return err("Unauthorized", 401, "UNAUTHORIZED");

  if (req.method !== "POST") return err("Method not allowed", 405, "METHOD");

  let body: { op?: string; params?: Record<string, any> };
  try {
    body = await req.json();
  } catch {
    return err("Invalid JSON body", 400, "BAD_JSON");
  }
  const op = String(body?.op ?? "");
  const params = (body?.params ?? {}) as Record<string, any>;
  if (!op) return err("Missing op", 400, "NO_OP");

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  try {
    switch (op) {
      // ── High-level convenience ops (match bot semantics) ──────────────────

      // params: { discordUserId: string }
      // returns: profile row (with .email backfilled from auth) | null
      case "getLinkedAccount": {
        const discordId = String(params.discordUserId ?? "");
        if (!discordId) return err("discordUserId required", 400);
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("user_id, display_name, username, customer_id, avatar_url, discord_id, email")
          .eq("discord_id", discordId)
          .maybeSingle();
        if (error) return err(error.message, 400, "DB");
        if (profile && !profile.email) {
          const { data: authUser } = await supabase.auth.admin.getUserById(profile.user_id);
          if (authUser?.user?.email) (profile as any).email = authUser.user.email;
        }
        return ok(profile ?? null);
      }

      // params: { guildId: string }
      // returns: { guildId, isMainServer, store? }
      case "getServerContext": {
        const guildId = String(params.guildId ?? "");
        const mainGuildId = Deno.env.get("DISCORD_MAIN_GUILD_ID") ?? params.mainGuildId ?? "";
        if (!guildId) return ok({ guildId: mainGuildId, isMainServer: true });
        if (mainGuildId && guildId === mainGuildId) return ok({ guildId, isMainServer: true });
        const { data: store, error } = await supabase
          .from("stores")
          .select("id, name, slug, logo_url")
          .eq("discord_guild_id", guildId)
          .eq("status", "approved")
          .maybeSingle();
        if (error) return err(error.message, 400, "DB");
        return ok(store ? { guildId, isMainServer: false, store } : { guildId, isMainServer: false });
      }

      // params: { context, error_message, error_stack?, guild_id?, user_id?, metadata? }
      case "logBotError": {
        const row = {
          context: String(params.context ?? "unknown").slice(0, 200),
          error_message: String(params.error_message ?? "").slice(0, 4000),
          error_stack: params.error_stack ? String(params.error_stack).slice(0, 8000) : null,
          guild_id: params.guild_id ?? null,
          user_id: params.user_id ?? null,
          metadata: params.metadata ?? null,
        };
        const { error } = await supabase.from("bot_error_logs").insert(row);
        if (error) return err(error.message, 400, "DB");
        return ok({ logged: true });
      }

      // params: { bucket, path, expiresIn? }
      case "storage.createSignedUrl": {
        const bucket = String(params.bucket ?? "");
        const path = String(params.path ?? "");
        const expiresIn = Number(params.expiresIn ?? 3600);
        if (!STORAGE_BUCKETS.has(bucket)) return err(`bucket not allowed: ${bucket}`, 403, "FORBIDDEN_BUCKET");
        if (!path) return err("path required", 400);
        const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn);
        if (error) return err(error.message, 400, "STORAGE");
        return ok(data);
      }

      // params: { userId }
      case "auth.getUserById": {
        const userId = String(params.userId ?? "");
        if (!userId) return err("userId required", 400);
        const { data, error } = await supabase.auth.admin.getUserById(userId);
        if (error) return err(error.message, 400, "AUTH");
        return ok(data?.user ? { id: data.user.id, email: data.user.email } : null);
      }

      // ── Generic primitives (allowlisted) ──────────────────────────────────

      // params: { table, columns?, filters?, order?: {column, ascending?}, limit?, single?, maybeSingle?, count?: 'exact'|'planned'|'estimated', head? }
      case "db.select": {
        const table = String(params.table ?? "");
        if (!READ_TABLES.has(table)) return err(`table not allowed: ${table}`, 403, "FORBIDDEN_TABLE");
        const columns = typeof params.columns === "string" && params.columns.length ? params.columns : "*";
        const selectOpts: any = {};
        if (params.count) selectOpts.count = params.count;
        if (params.head) selectOpts.head = true;
        let q: any = supabase.from(table).select(columns, selectOpts);
        q = applyFilters(q, params.filters);
        if (params.order && typeof params.order.column === "string") {
          q = q.order(params.order.column, { ascending: params.order.ascending !== false });
        }
        if (typeof params.limit === "number") q = q.limit(params.limit);
        let result;
        if (params.single) result = await q.single();
        else if (params.maybeSingle) result = await q.maybeSingle();
        else result = await q;
        if (result.error) return err(result.error.message, 400, "DB");
        return ok({ rows: result.data, count: (result as any).count ?? null });
      }

      // params: { table, values (object|array), returning? (bool) }
      case "db.insert": {
        const table = String(params.table ?? "");
        if (!WRITE_TABLES.has(table)) return err(`table not allowed: ${table}`, 403, "FORBIDDEN_TABLE");
        const values = params.values;
        if (!values) return err("values required", 400);
        let q: any = supabase.from(table).insert(values);
        if (params.returning) q = q.select();
        const { data, error } = await q;
        if (error) return err(error.message, 400, "DB");
        return ok(data ?? null);
      }

      // params: { table, values, filters, returning? }
      case "db.update": {
        const table = String(params.table ?? "");
        if (!WRITE_TABLES.has(table)) return err(`table not allowed: ${table}`, 403, "FORBIDDEN_TABLE");
        if (!Array.isArray(params.filters) || params.filters.length === 0) {
          return err("filters required for update", 400);
        }
        let q: any = supabase.from(table).update(params.values ?? {});
        q = applyFilters(q, params.filters);
        if (params.returning) q = q.select();
        const { data, error } = await q;
        if (error) return err(error.message, 400, "DB");
        return ok(data ?? null);
      }

      // params: { table, filters }
      case "db.delete": {
        const table = String(params.table ?? "");
        if (!WRITE_TABLES.has(table)) return err(`table not allowed: ${table}`, 403, "FORBIDDEN_TABLE");
        if (!Array.isArray(params.filters) || params.filters.length === 0) {
          return err("filters required for delete", 400);
        }
        let q: any = supabase.from(table).delete();
        q = applyFilters(q, params.filters);
        const { data, error } = await q;
        if (error) return err(error.message, 400, "DB");
        return ok(data ?? null);
      }

      // params: { table, values, onConflict? }
      case "db.upsert": {
        const table = String(params.table ?? "");
        if (!WRITE_TABLES.has(table)) return err(`table not allowed: ${table}`, 403, "FORBIDDEN_TABLE");
        const opts: any = {};
        if (params.onConflict) opts.onConflict = String(params.onConflict);
        const { data, error } = await supabase.from(table).upsert(params.values ?? {}, opts).select();
        if (error) return err(error.message, 400, "DB");
        return ok(data ?? null);
      }

      // params: { fn, args? }
      case "rpc": {
        const fn = String(params.fn ?? "");
        if (!RPC_ALLOW.has(fn)) return err(`rpc not allowed: ${fn}`, 403, "FORBIDDEN_RPC");
        const { data, error } = await supabase.rpc(fn, params.args ?? {});
        if (error) return err(error.message, 400, "RPC");
        return ok(data ?? null);
      }

      // Simple health probe
      case "ping":
        return ok({ pong: true, at: new Date().toISOString() });

      default:
        return err(`unknown op: ${op}`, 400, "UNKNOWN_OP");
    }
  } catch (e) {
    console.error("[bot-gateway] uncaught", e);
    return err((e as Error)?.message ?? "internal error", 500, "INTERNAL");
  }
});
