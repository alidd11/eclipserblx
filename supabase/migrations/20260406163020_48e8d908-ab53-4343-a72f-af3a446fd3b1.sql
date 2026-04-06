-- Fix: chat_read_receipts SELECT policy is too permissive (allows all authenticated users to read all receipts)
DROP POLICY IF EXISTS "Users can view all read receipts" ON public.chat_read_receipts;

-- Staff need to see all receipts for admin chat; regular users only see their own
CREATE POLICY "Users can view own read receipts"
ON public.chat_read_receipts
FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR is_staff(auth.uid()));

-- Add RLS policy on realtime.messages to restrict channel subscriptions
-- Note: This requires the realtime schema extension. If not available, this is a no-op.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'realtime' AND tablename = 'messages') THEN
    ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'realtime.messages RLS setup skipped: %', SQLERRM;
END $$;