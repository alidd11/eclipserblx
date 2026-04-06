
DROP POLICY IF EXISTS "Applicants can view own application by token" ON public.job_applications;
DROP POLICY IF EXISTS "Applicants can read messages for their application" ON public.applicant_messages;
DROP POLICY IF EXISTS "Applicants can mark messages as read" ON public.applicant_messages;

CREATE OR REPLACE FUNCTION public.validate_applicant_token(p_token uuid)
RETURNS TABLE(id uuid, "position" text, applicant_name text, status text, created_at timestamptz, reviewed_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ja.id, ja."position", ja.applicant_name, ja.status, ja.created_at, ja.reviewed_at
  FROM job_applications ja
  WHERE ja.access_token = p_token;
$$;

CREATE OR REPLACE FUNCTION public.get_applicant_messages(p_token uuid)
RETURNS TABLE(id uuid, subject text, message text, created_at timestamptz, is_read boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT am.id, am.subject, am.message, am.created_at, am.is_read
  FROM applicant_messages am
  JOIN job_applications ja ON ja.id = am.application_id
  WHERE ja.access_token = p_token
  ORDER BY am.created_at DESC;
$$;

CREATE OR REPLACE FUNCTION public.mark_applicant_messages_read(p_token uuid, p_message_ids uuid[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE applicant_messages
  SET is_read = true
  WHERE id = ANY(p_message_ids)
    AND application_id IN (
      SELECT id FROM job_applications WHERE access_token = p_token
    );
END;
$$;
