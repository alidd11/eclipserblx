
-- Drop 4 unused indexes (0 scans each)
DROP INDEX IF EXISTS idx_data_audit_log_changed_at;
DROP INDEX IF EXISTS idx_data_audit_log_changed_by;
DROP INDEX IF EXISTS idx_products_name_trgm;
DROP INDEX IF EXISTS idx_products_description_trgm;
