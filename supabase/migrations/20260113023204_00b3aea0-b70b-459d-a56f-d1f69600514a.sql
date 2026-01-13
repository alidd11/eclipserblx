-- Create staff notes table for internal performance tracking
CREATE TABLE public.staff_notes (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    staff_user_id UUID NOT NULL,
    author_id UUID NOT NULL,
    content TEXT NOT NULL,
    note_type TEXT DEFAULT 'general',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.staff_notes ENABLE ROW LEVEL SECURITY;

-- Only admins can view staff notes
CREATE POLICY "Admins can view staff notes"
ON public.staff_notes
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can insert staff notes
CREATE POLICY "Admins can insert staff notes"
ON public.staff_notes
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Only admins can update their own notes
CREATE POLICY "Admins can update their own notes"
ON public.staff_notes
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin') AND author_id = auth.uid());

-- Only admins can delete their own notes
CREATE POLICY "Admins can delete their own notes"
ON public.staff_notes
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin') AND author_id = auth.uid());

-- Add trigger for updated_at
CREATE TRIGGER update_staff_notes_updated_at
BEFORE UPDATE ON public.staff_notes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for faster lookups
CREATE INDEX idx_staff_notes_staff_user_id ON public.staff_notes(staff_user_id);
CREATE INDEX idx_staff_notes_created_at ON public.staff_notes(created_at DESC);