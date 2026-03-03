
-- Prune staff_activity older than 60 days (frees ~2MB+)
DELETE FROM public.staff_activity WHERE created_at < now() - interval '60 days';

-- Prune page_visits older than 90 days
DELETE FROM public.page_visits WHERE created_at < now() - interval '90 days';

-- Add missing indexes on commonly filtered columns
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_ad_schedule_slots_user_id ON public.ad_schedule_slots (user_id);
