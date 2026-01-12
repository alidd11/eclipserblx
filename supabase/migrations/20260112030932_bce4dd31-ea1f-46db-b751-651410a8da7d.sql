-- Add message_type and secure_data columns to chat_messages for secure code verification
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS message_type TEXT DEFAULT 'text';
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS secure_data JSONB DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN chat_messages.message_type IS 'Type of message: text, code_verification, etc.';
COMMENT ON COLUMN chat_messages.secure_data IS 'Stores obscured verification data (masked code, status, product info)';