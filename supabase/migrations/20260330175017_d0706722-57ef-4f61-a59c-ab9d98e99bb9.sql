
-- Fix chat_messages SELECT policy - restrict anonymous conversation access to staff/assigned agent only
DROP POLICY IF EXISTS "Users can view their chat messages" ON chat_messages;
CREATE POLICY "Users can view their chat messages" ON chat_messages
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chat_conversations
      WHERE chat_conversations.id = chat_messages.conversation_id
      AND (
        chat_conversations.user_id = auth.uid()
        OR (chat_conversations.user_id IS NULL AND is_staff(auth.uid()))
        OR chat_conversations.assigned_to = auth.uid()
      )
    )
  );

-- Fix chat_messages INSERT policy similarly
DROP POLICY IF EXISTS "Users can send messages in their chats" ON chat_messages;
CREATE POLICY "Users can send messages in their chats" ON chat_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM chat_conversations
      WHERE chat_conversations.id = chat_messages.conversation_id
      AND (
        chat_conversations.user_id = auth.uid()
        OR (chat_conversations.user_id IS NULL AND is_staff(auth.uid()))
        OR chat_conversations.assigned_to = auth.uid()
      )
    )
  );
