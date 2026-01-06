-- Allow only admins to delete download logs
CREATE POLICY "Admins can delete download logs"
ON public.download_logs
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));