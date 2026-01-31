-- =============================================
-- DATA PROTECTION: Soft Deletes & Audit Triggers
-- =============================================

-- 1. Add deleted_at columns to critical tables for soft deletes
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- 2. Create indexes for efficient soft delete filtering
CREATE INDEX IF NOT EXISTS idx_profiles_deleted_at ON public.profiles(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_orders_deleted_at ON public.orders(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_products_deleted_at ON public.products(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_stores_deleted_at ON public.stores(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_reviews_deleted_at ON public.reviews(deleted_at) WHERE deleted_at IS NULL;

-- 3. Create data_audit_log table for comprehensive change tracking
CREATE TABLE IF NOT EXISTS public.data_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  record_id TEXT NOT NULL,
  operation TEXT NOT NULL CHECK (operation IN ('UPDATE', 'DELETE')),
  old_data JSONB,
  new_data JSONB,
  changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_address TEXT
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_data_audit_log_table ON public.data_audit_log(table_name);
CREATE INDEX IF NOT EXISTS idx_data_audit_log_record ON public.data_audit_log(record_id);
CREATE INDEX IF NOT EXISTS idx_data_audit_log_changed_at ON public.data_audit_log(changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_data_audit_log_changed_by ON public.data_audit_log(changed_by);

-- Enable RLS on audit log
ALTER TABLE public.data_audit_log ENABLE ROW LEVEL SECURITY;

-- Only staff can view audit logs
CREATE POLICY "Staff can view audit logs"
ON public.data_audit_log FOR SELECT
TO authenticated
USING (public.is_staff(auth.uid()));

-- 4. Create generic audit trigger function
CREATE OR REPLACE FUNCTION public.audit_data_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  record_pk TEXT;
BEGIN
  -- Get the primary key value (assumes 'id' column exists)
  IF TG_OP = 'DELETE' THEN
    record_pk := OLD.id::TEXT;
  ELSE
    record_pk := COALESCE(NEW.id::TEXT, OLD.id::TEXT);
  END IF;

  INSERT INTO public.data_audit_log (
    table_name,
    record_id,
    operation,
    old_data,
    new_data,
    changed_by
  ) VALUES (
    TG_TABLE_NAME,
    record_pk,
    TG_OP,
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('UPDATE', 'INSERT') THEN to_jsonb(NEW) ELSE NULL END,
    auth.uid()
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

-- 5. Attach audit triggers to critical tables
DROP TRIGGER IF EXISTS audit_profiles_changes ON public.profiles;
CREATE TRIGGER audit_profiles_changes
  AFTER UPDATE OR DELETE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.audit_data_changes();

DROP TRIGGER IF EXISTS audit_orders_changes ON public.orders;
CREATE TRIGGER audit_orders_changes
  AFTER UPDATE OR DELETE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.audit_data_changes();

DROP TRIGGER IF EXISTS audit_products_changes ON public.products;
CREATE TRIGGER audit_products_changes
  AFTER UPDATE OR DELETE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.audit_data_changes();

DROP TRIGGER IF EXISTS audit_stores_changes ON public.stores;
CREATE TRIGGER audit_stores_changes
  AFTER UPDATE OR DELETE ON public.stores
  FOR EACH ROW EXECUTE FUNCTION public.audit_data_changes();

DROP TRIGGER IF EXISTS audit_reviews_changes ON public.reviews;
CREATE TRIGGER audit_reviews_changes
  AFTER UPDATE OR DELETE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.audit_data_changes();

-- 6. Create helper function for soft delete (instead of hard delete)
CREATE OR REPLACE FUNCTION public.soft_delete(
  p_table_name TEXT,
  p_record_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  EXECUTE format('UPDATE public.%I SET deleted_at = now() WHERE id = $1 AND deleted_at IS NULL', p_table_name)
  USING p_record_id;
  
  RETURN FOUND;
END;
$$;

-- 7. Create helper function to restore soft-deleted records
CREATE OR REPLACE FUNCTION public.restore_deleted(
  p_table_name TEXT,
  p_record_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  EXECUTE format('UPDATE public.%I SET deleted_at = NULL WHERE id = $1 AND deleted_at IS NOT NULL', p_table_name)
  USING p_record_id;
  
  RETURN FOUND;
END;
$$;

-- 8. Create data_exports table to track scheduled exports
CREATE TABLE IF NOT EXISTS public.data_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  export_type TEXT NOT NULL,
  file_path TEXT,
  record_count INTEGER,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Enable RLS
ALTER TABLE public.data_exports ENABLE ROW LEVEL SECURITY;

-- Only admins can view exports
CREATE POLICY "Admins can view data exports"
ON public.data_exports FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can create data exports"
ON public.data_exports FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));