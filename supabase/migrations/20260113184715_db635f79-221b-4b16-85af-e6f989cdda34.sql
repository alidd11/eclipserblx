-- Add category column to staff_documents table
ALTER TABLE public.staff_documents 
ADD COLUMN category text DEFAULT 'general';

-- Add comment for documentation
COMMENT ON COLUMN public.staff_documents.category IS 'Document category: general, contract, id_verification, performance, training, certification, other';