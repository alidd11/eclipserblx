-- Create ad schedule slots table
CREATE TABLE public.ad_schedule_slots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slot_date DATE NOT NULL,
  slot_time TEXT NOT NULL, -- '09:00', '13:00', '17:00', '21:00' (UK time)
  user_id UUID NULL,
  ad_id UUID NULL REFERENCES public.discord_advertisements(id) ON DELETE SET NULL,
  tier TEXT NOT NULL DEFAULT 'basic',
  booked_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (slot_date, slot_time)
);

-- Enable RLS
ALTER TABLE public.ad_schedule_slots ENABLE ROW LEVEL SECURITY;

-- Anyone with a subscription can view slots (to see availability)
CREATE POLICY "Authenticated users can view slots"
ON public.ad_schedule_slots FOR SELECT
TO authenticated
USING (true);

-- Users can book a slot for themselves
CREATE POLICY "Users can book slots"
ON public.ad_schedule_slots FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can update their own slots
CREATE POLICY "Users can update own slots"
ON public.ad_schedule_slots FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Pre-populate slots for the next 14 days
INSERT INTO public.ad_schedule_slots (slot_date, slot_time)
SELECT 
  generate_series::DATE as slot_date,
  unnest(ARRAY['09:00', '13:00', '17:00', '21:00']) as slot_time
FROM generate_series(CURRENT_DATE, CURRENT_DATE + INTERVAL '13 days', INTERVAL '1 day');