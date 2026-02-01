-- Make audit_logs.user_id nullable for system-initiated changes
ALTER TABLE public.audit_logs
ALTER COLUMN user_id DROP NOT NULL;