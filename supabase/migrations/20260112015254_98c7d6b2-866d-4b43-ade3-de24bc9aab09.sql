-- Add status column to bot_installation_codes table
ALTER TABLE bot_installation_codes 
ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending';

-- Add check constraint for valid statuses
ALTER TABLE bot_installation_codes 
ADD CONSTRAINT bot_installation_codes_status_check 
CHECK (status IN ('pending', 'verified', 'installing', 'completed'));

-- Migrate existing data based on current state
UPDATE bot_installation_codes 
SET status = CASE
  WHEN is_used = true THEN 'completed'
  WHEN processed_by IS NOT NULL THEN 'verified'
  ELSE 'pending'
END
WHERE status = 'pending' OR status IS NULL;