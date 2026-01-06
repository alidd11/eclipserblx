-- Create audit_logs table for tracking sensitive page access
CREATE TABLE public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    action TEXT NOT NULL,
    resource TEXT NOT NULL,
    details JSONB,
    ip_address TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create staff_activity table for tracking staff login/logout and ticket/chat actions
CREATE TABLE public.staff_activity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    activity_type TEXT NOT NULL CHECK (activity_type IN ('login', 'logout', 'ticket_claimed', 'ticket_completed', 'chat_claimed', 'chat_completed')),
    resource_id UUID,
    resource_type TEXT,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_activity ENABLE ROW LEVEL SECURITY;

-- RLS Policies for audit_logs - only admins can view
CREATE POLICY "Admins can view audit logs" ON public.audit_logs 
FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Staff can insert audit logs" ON public.audit_logs 
FOR INSERT WITH CHECK (public.is_staff(auth.uid()));

-- RLS Policies for staff_activity - staff can view, staff can insert their own
CREATE POLICY "Staff can view all activity" ON public.staff_activity 
FOR SELECT USING (public.is_staff(auth.uid()));

CREATE POLICY "Staff can log their own activity" ON public.staff_activity 
FOR INSERT WITH CHECK (auth.uid() = user_id AND public.is_staff(auth.uid()));

-- Enable realtime for staff_activity
ALTER PUBLICATION supabase_realtime ADD TABLE public.staff_activity;