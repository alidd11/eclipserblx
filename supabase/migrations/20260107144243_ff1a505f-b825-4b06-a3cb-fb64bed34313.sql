-- Create staff announcements table
CREATE TABLE public.staff_announcements (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN NOT NULL DEFAULT true
);

-- Enable RLS
ALTER TABLE public.staff_announcements ENABLE ROW LEVEL SECURITY;

-- Staff can view all active announcements
CREATE POLICY "Staff can view announcements"
ON public.staff_announcements
FOR SELECT
USING (public.is_staff(auth.uid()));

-- Only admins can create announcements
CREATE POLICY "Admins can create announcements"
ON public.staff_announcements
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Only admins can update announcements
CREATE POLICY "Admins can update announcements"
ON public.staff_announcements
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can delete announcements
CREATE POLICY "Admins can delete announcements"
ON public.staff_announcements
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));