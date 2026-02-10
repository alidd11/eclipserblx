-- Change default for eclipse_free_eligible to false (sellers opt-out by default)
ALTER TABLE public.products ALTER COLUMN eclipse_free_eligible SET DEFAULT false;