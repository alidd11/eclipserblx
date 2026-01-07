-- Create staff duty logs table
CREATE TABLE public.staff_duty_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  clock_in TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  clock_out TIMESTAMP WITH TIME ZONE,
  duration_minutes INTEGER,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.staff_duty_logs ENABLE ROW LEVEL SECURITY;

-- Staff can log their own duty
CREATE POLICY "Staff can insert their own duty logs"
ON public.staff_duty_logs
FOR INSERT
WITH CHECK (auth.uid() = user_id AND is_staff(auth.uid()));

-- Staff can update their own duty logs (to clock out)
CREATE POLICY "Staff can update their own duty logs"
ON public.staff_duty_logs
FOR UPDATE
USING (auth.uid() = user_id AND is_staff(auth.uid()));

-- Staff can view their own duty logs
CREATE POLICY "Staff can view their own duty logs"
ON public.staff_duty_logs
FOR SELECT
USING (auth.uid() = user_id);

-- Admins can view all duty logs
CREATE POLICY "Admins can view all duty logs"
ON public.staff_duty_logs
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can manage all duty logs
CREATE POLICY "Admins can manage all duty logs"
ON public.staff_duty_logs
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));