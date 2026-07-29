// Drop-in replacement for the Supabase JS client.
//
// On Lovable Cloud the service_role key is never exposed to external hosts, so
// the bot cannot create a real Supabase client. Instead this module mimics the
// subset of the supabase-js query-builder API the bot uses and routes every
// call through the `bot-gateway` edge function (see ./gateway.js), which holds
// the service role server-side. Existing call sites — `supabase.from(...)`,
// `supabase.auth.admin.getUserById`, `supabase.storage...`, `supabase.rpc` —
// keep working unchanged.
import { gatewayCall } from './gateway.js';

// A chainable query builder. Records the query, then executes it against the
// gateway's generic db.* primitives when awaited or terminated.
class QueryBuilder {
  constructor(table) {
    this.table = table;
    this.action = 'select';
    this.columns = '*';
    this.selectOpts = {};
    this.values = undefined;
    this.filters = [];
    this._order = undefined;
    this._limit = undefined;
    this.wantSingle = false;
    this.wantMaybeSingle = false;
    this.returning = false;
    this.onConflict = undefined;
  }

  select(columns = '*', opts = {}) {
    if (this.action === 'select') {
      this.columns = columns || '*';
      this.selectOpts = opts || {};
    } else {
      // .insert(...).select() / .update(...).select() → return the affected rows
      this.returning = true;
    }
    return this;
  }

  insert(values) { this.action = 'insert'; this.values = values; return this; }
  update(values) { this.action = 'update'; this.values = values; return this; }
  delete() { this.action = 'delete'; return this; }
  upsert(values, opts = {}) { this.action = 'upsert'; this.values = values; this.onConflict = opts.onConflict; return this; }

  eq(c, v) { this.filters.push({ op: 'eq', column: c, value: v }); return this; }
  neq(c, v) { this.filters.push({ op: 'neq', column: c, value: v }); return this; }
  gt(c, v) { this.filters.push({ op: 'gt', column: c, value: v }); return this; }
  gte(c, v) { this.filters.push({ op: 'gte', column: c, value: v }); return this; }
  lt(c, v) { this.filters.push({ op: 'lt', column: c, value: v }); return this; }
  lte(c, v) { this.filters.push({ op: 'lte', column: c, value: v }); return this; }
  like(c, v) { this.filters.push({ op: 'like', column: c, value: v }); return this; }
  ilike(c, v) { this.filters.push({ op: 'ilike', column: c, value: v }); return this; }
  in(c, v) { this.filters.push({ op: 'in', column: c, value: v }); return this; }
  is(c, v) { this.filters.push({ op: 'is', column: c, value: v }); return this; }
  not(c, notOp, v) { this.filters.push({ op: 'not', column: c, not_op: notOp, value: v }); return this; }
  // .match({ col: val, ... }) — equality on each key
  match(obj) { for (const [c, v] of Object.entries(obj || {})) this.filters.push({ op: 'eq', column: c, value: v }); return this; }

  order(column, opts = {}) { this._order = { column, ascending: opts.ascending !== false }; return this; }
  limit(n) { this._limit = n; return this; }

  single() { this.wantSingle = true; return this._run(); }
  maybeSingle() { this.wantMaybeSingle = true; return this._run(); }

  // Thenable: `await supabase.from(x).select()...` works without an explicit terminator.
  then(resolve, reject) { return this._run().then(resolve, reject); }
  catch(reject) { return this._run().catch(reject); }

  async _run() {
    try {
      if (this.action === 'select') {
        const params = { table: this.table, columns: this.columns, filters: this.filters };
        if (this._order) params.order = this._order;
        if (this._limit != null) params.limit = this._limit;
        if (this.wantSingle) params.single = true;
        if (this.wantMaybeSingle) params.maybeSingle = true;
        if (this.selectOpts.count) params.count = this.selectOpts.count;
        if (this.selectOpts.head) params.head = true;
        const res = await gatewayCall('db.select', params);
        return { data: res?.rows ?? null, count: res?.count ?? null, error: null };
      }

      if (this.action === 'insert' || this.action === 'update' || this.action === 'upsert') {
        const opMap = { insert: 'db.insert', update: 'db.update', upsert: 'db.upsert' };
        const params = { table: this.table, values: this.values };
        if (this.action === 'update') params.filters = this.filters;
        if (this.action === 'upsert' && this.onConflict) params.onConflict = this.onConflict;
        if (this.action !== 'upsert') params.returning = this.returning;
        let rows = await gatewayCall(opMap[this.action], params);
        if ((this.wantSingle || this.wantMaybeSingle) && Array.isArray(rows)) rows = rows[0] ?? null;
        return { data: rows ?? null, error: null };
      }

      if (this.action === 'delete') {
        const rows = await gatewayCall('db.delete', { table: this.table, filters: this.filters });
        return { data: rows ?? null, error: null };
      }

      return { data: null, error: { message: `unsupported action: ${this.action}` } };
    } catch (e) {
      // Mirror supabase-js: errors are returned, not thrown, so `if (error)` works.
      return { data: null, error: { message: e?.message || String(e) } };
    }
  }
}

export const supabase = {
  from(table) { return new QueryBuilder(table); },

  async rpc(fn, args = {}) {
    try {
      const data = await gatewayCall('rpc', { fn, args });
      return { data: data ?? null, error: null };
    } catch (e) {
      return { data: null, error: { message: e?.message || String(e) } };
    }
  },

  auth: {
    admin: {
      async getUserById(userId) {
        try {
          const user = await gatewayCall('auth.getUserById', { userId });
          return { data: { user: user ?? null }, error: null };
        } catch (e) {
          return { data: { user: null }, error: { message: e?.message || String(e) } };
        }
      },
    },
  },

  storage: {
    from(bucket) {
      return {
        async createSignedUrl(path, expiresIn = 3600) {
          try {
            const data = await gatewayCall('storage.createSignedUrl', { bucket, path, expiresIn });
            return { data: data ?? null, error: null };
          } catch (e) {
            return { data: null, error: { message: e?.message || String(e) } };
          }
        },
      };
    },
  },
};
