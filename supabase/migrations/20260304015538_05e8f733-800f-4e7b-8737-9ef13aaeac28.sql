
-- Fix applicant_messages: Staff need to INSERT and SELECT messages
CREATE POLICY "Staff can view all applicant messages"
ON public.applicant_messages
FOR SELECT
TO authenticated
USING (is_staff(auth.uid()));

CREATE POLICY "Staff can send messages to applicants"
ON public.applicant_messages
FOR INSERT
TO authenticated
WITH CHECK (is_staff(auth.uid()));
