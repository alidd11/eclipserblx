import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { checkRateLimit, getClientIp, rateLimitResponse, RATE_LIMITS } from '../_shared/rateLimit.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ExportConfig {
  tableName: string;
  columns: string;
  fileName: string;
}

const EXPORT_TABLES: ExportConfig[] = [
  { tableName: 'profiles', columns: '*', fileName: 'profiles' },
  { tableName: 'orders', columns: '*', fileName: 'orders' },
  { tableName: 'order_items', columns: '*', fileName: 'order_items' },
  { tableName: 'products', columns: 'id, name, description, price, category_id, store_id, is_active, created_at, updated_at', fileName: 'products' },
  { tableName: 'stores', columns: 'id, owner_id, store_id, name, slug, is_verified, is_active, status, created_at, updated_at', fileName: 'stores' },
  { tableName: 'reviews', columns: '*', fileName: 'reviews' },
  { tableName: 'affiliate_commissions', columns: '*', fileName: 'affiliate_commissions' },
  { tableName: 'seller_transactions', columns: '*', fileName: 'seller_transactions' },
];

// Whitelist of valid table names to prevent injection
const VALID_TABLE_NAMES = new Set(EXPORT_TABLES.map(t => t.tableName));

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Rate limit - expensive operation
    const clientIp = getClientIp(req);
    const rl = checkRateLimit({ ...RATE_LIMITS.EXPENSIVE, identifier: clientIp, action: 'export-data-backup' });
    if (!rl.allowed) return rateLimitResponse(rl, corsHeaders);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    // CRITICAL: Always require admin authentication - no unauthenticated cron path
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await serviceClient.auth.getUser(token);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Require admin role specifically
    const { data: roles } = await serviceClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin');

    if (!roles || roles.length === 0) {
      console.error('Non-admin attempted data export:', user.id);
      return new Response(
        JSON.stringify({ error: 'Forbidden: Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Starting data export - triggered by admin ${user.id}`);

    const timestamp = new Date().toISOString().split('T')[0];
    const exportId = crypto.randomUUID();
    const exportResults: Array<{ table: string; count: number; success: boolean; error?: string }> = [];

    // Create export record
    await serviceClient
      .from('data_exports')
      .insert({
        id: exportId,
        export_type: 'full_backup',
        status: 'processing',
        started_at: new Date().toISOString(),
        created_by: user.id,
      });

    let totalRecords = 0;
    const exportData: Record<string, unknown[]> = {};

    for (const config of EXPORT_TABLES) {
      // Validate table name against whitelist
      if (!VALID_TABLE_NAMES.has(config.tableName)) continue;

      try {
        console.log(`Exporting table: ${config.tableName}`);

        let allData: unknown[] = [];
        let page = 0;
        const pageSize = 1000;
        const MAX_PAGES = 100; // Safety cap: max 100k rows per table
        let hasMore = true;

        while (hasMore && page < MAX_PAGES) {
          const { data, error } = await serviceClient
            .from(config.tableName)
            .select(config.columns)
            .range(page * pageSize, (page + 1) * pageSize - 1);

          if (error) throw error;

          if (data && data.length > 0) {
            allData = allData.concat(data);
            page++;
            hasMore = data.length === pageSize;
          } else {
            hasMore = false;
          }
        }

        exportData[config.tableName] = allData;
        totalRecords += allData.length;

        exportResults.push({ table: config.tableName, count: allData.length, success: true });
        console.log(`Exported ${allData.length} records from ${config.tableName}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`Error exporting ${config.tableName}:`, error);
        exportResults.push({ table: config.tableName, count: 0, success: false, error: errorMessage });
      }
    }

    const backupPayload = {
      exportId,
      timestamp: new Date().toISOString(),
      tables: exportData,
      metadata: { totalRecords, tableResults: exportResults },
    };

    const fileName = `backup-${timestamp}-${exportId.slice(0, 8)}.json`;
    const filePath = `backups/${fileName}`;

    // Check if bucket exists
    const { data: buckets } = await serviceClient.storage.listBuckets();
    if (!buckets?.find(b => b.name === 'staff-documents')) {
      await serviceClient.storage.createBucket('staff-documents', {
        public: false,
        fileSizeLimit: 52428800,
      });
    }

    const { error: uploadError } = await serviceClient.storage
      .from('staff-documents')
      .upload(filePath, JSON.stringify(backupPayload, null, 2), {
        contentType: 'application/json',
        upsert: true,
      });

    if (uploadError) {
      console.error('Failed to upload backup:', uploadError);
      await serviceClient.from('data_exports').update({
        status: 'failed', error_message: uploadError.message,
        completed_at: new Date().toISOString(),
      }).eq('id', exportId);

      return new Response(
        JSON.stringify({ error: 'Failed to store backup' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    await serviceClient.from('data_exports').update({
      status: 'completed', file_path: filePath,
      record_count: totalRecords, completed_at: new Date().toISOString(),
    }).eq('id', exportId);

    // Audit log
    await serviceClient.from('audit_logs').insert({
      user_id: user.id,
      action: 'data_export',
      resource: 'system',
      details: {
        export_id: exportId, file_path: filePath,
        total_records: totalRecords,
        tables_exported: exportResults.filter(r => r.success).length,
      },
    });

    console.log(`Export completed: ${totalRecords} records to ${filePath}`);

    return new Response(
      JSON.stringify({
        success: true, exportId, filePath, totalRecords, tableResults: exportResults,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Unexpected error during export:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});