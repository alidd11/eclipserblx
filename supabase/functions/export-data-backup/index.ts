import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);
    
    // Check if this is an authenticated admin request or a cron job
    const authHeader = req.headers.get('Authorization');
    let isAuthorized = false;
    let userId: string | null = null;
    
    if (authHeader) {
      const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
      const userClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      
      const { data: { user } } = await userClient.auth.getUser();
      if (user) {
        userId = user.id;
        // Check if user is admin
        const { data: roles } = await serviceClient
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'admin');
        
        isAuthorized = !!(roles && roles.length > 0);
      }
    } else {
      // For cron jobs, check for a special header or allow without auth
      // In production, you'd want to verify this is actually from pg_cron
      const cronSecret = req.headers.get('x-cron-secret');
      isAuthorized = cronSecret === Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    }
    
    // For manual triggers, require admin auth
    // For cron, it runs with service role
    const isCronJob = !authHeader;
    
    if (!isAuthorized && !isCronJob) {
      console.error('Unauthorized export attempt');
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log(`Starting data export - ${isCronJob ? 'Scheduled' : 'Manual'} trigger`);
    
    const timestamp = new Date().toISOString().split('T')[0];
    const exportId = crypto.randomUUID();
    const exportResults: Array<{ table: string; count: number; success: boolean; error?: string }> = [];
    
    // Create export record
    const { data: exportRecord, error: exportError } = await serviceClient
      .from('data_exports')
      .insert({
        id: exportId,
        export_type: 'full_backup',
        status: 'processing',
        started_at: new Date().toISOString(),
        created_by: userId,
      })
      .select()
      .single();
    
    if (exportError) {
      console.error('Failed to create export record:', exportError);
    }
    
    let totalRecords = 0;
    const exportData: Record<string, any[]> = {};
    
    // Export each table
    for (const config of EXPORT_TABLES) {
      try {
        console.log(`Exporting table: ${config.tableName}`);
        
        // Fetch all data (paginated for large tables)
        let allData: any[] = [];
        let page = 0;
        const pageSize = 1000;
        let hasMore = true;
        
        while (hasMore) {
          const { data, error } = await serviceClient
            .from(config.tableName)
            .select(config.columns)
            .range(page * pageSize, (page + 1) * pageSize - 1);
          
          if (error) {
            throw error;
          }
          
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
        
        exportResults.push({
          table: config.tableName,
          count: allData.length,
          success: true,
        });
        
        console.log(`Exported ${allData.length} records from ${config.tableName}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`Error exporting ${config.tableName}:`, error);
        exportResults.push({
          table: config.tableName,
          count: 0,
          success: false,
          error: errorMessage,
        });
      }
    }
    
    // Create the backup JSON
    const backupPayload = {
      exportId,
      timestamp: new Date().toISOString(),
      tables: exportData,
      metadata: {
        totalRecords,
        tableResults: exportResults,
      },
    };
    
    // Store backup in Supabase Storage
    const fileName = `backup-${timestamp}-${exportId.slice(0, 8)}.json`;
    const filePath = `backups/${fileName}`;
    
    // Check if staff-documents bucket exists, create if not
    const { data: buckets } = await serviceClient.storage.listBuckets();
    const backupBucket = buckets?.find(b => b.name === 'staff-documents');
    
    if (!backupBucket) {
      console.log('Creating staff-documents bucket...');
      await serviceClient.storage.createBucket('staff-documents', {
        public: false,
        fileSizeLimit: 52428800, // 50MB
      });
    }
    
    // Upload the backup
    const { error: uploadError } = await serviceClient.storage
      .from('staff-documents')
      .upload(filePath, JSON.stringify(backupPayload, null, 2), {
        contentType: 'application/json',
        upsert: true,
      });
    
    if (uploadError) {
      console.error('Failed to upload backup:', uploadError);
      
      // Update export record with failure
      await serviceClient
        .from('data_exports')
        .update({
          status: 'failed',
          error_message: uploadError.message,
          completed_at: new Date().toISOString(),
        })
        .eq('id', exportId);
      
      return new Response(
        JSON.stringify({ 
          error: 'Failed to store backup', 
          details: uploadError.message,
          exportResults,
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Update export record with success
    await serviceClient
      .from('data_exports')
      .update({
        status: 'completed',
        file_path: filePath,
        record_count: totalRecords,
        completed_at: new Date().toISOString(),
      })
      .eq('id', exportId);
    
    // Log the action
    await serviceClient.from('audit_logs').insert({
      user_id: userId || '00000000-0000-0000-0000-000000000000',
      action: 'data_export',
      resource: 'system',
      details: {
        export_id: exportId,
        file_path: filePath,
        total_records: totalRecords,
        tables_exported: exportResults.filter(r => r.success).length,
        triggered_by: isCronJob ? 'scheduled' : 'manual',
      },
    });
    
    console.log(`Export completed successfully: ${totalRecords} records to ${filePath}`);
    
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Data export completed successfully',
        exportId,
        filePath,
        totalRecords,
        tableResults: exportResults,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Unexpected error during export:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
