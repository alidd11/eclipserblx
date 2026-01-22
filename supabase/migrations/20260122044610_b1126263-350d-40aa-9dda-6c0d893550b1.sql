-- Create store_conversations table to group messages
CREATE TABLE public.store_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  subject TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  last_message_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create store_messages table for customer-to-store communication
CREATE TABLE public.store_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.store_conversations(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('customer', 'seller')),
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX idx_store_messages_conversation ON public.store_messages(conversation_id);
CREATE INDEX idx_store_messages_store ON public.store_messages(store_id);
CREATE INDEX idx_store_messages_customer ON public.store_messages(customer_id);
CREATE INDEX idx_store_conversations_store ON public.store_conversations(store_id);
CREATE INDEX idx_store_conversations_customer ON public.store_conversations(customer_id);

-- Enable RLS
ALTER TABLE public.store_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_conversations ENABLE ROW LEVEL SECURITY;

-- RLS for store_conversations: customers can see their own conversations
CREATE POLICY "Customers can view their own conversations"
ON public.store_conversations
FOR SELECT
USING (auth.uid() = customer_id);

-- RLS for store_conversations: sellers can see conversations for their store (using owner_id)
CREATE POLICY "Sellers can view their store conversations"
ON public.store_conversations
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.stores 
    WHERE stores.id = store_conversations.store_id 
    AND stores.owner_id = auth.uid()
  )
);

-- RLS for store_conversations: customers can create conversations for stores they purchased from
CREATE POLICY "Customers can create conversations for purchased stores"
ON public.store_conversations
FOR INSERT
WITH CHECK (
  auth.uid() = customer_id
  AND EXISTS (
    SELECT 1 FROM public.orders o
    JOIN public.order_items oi ON o.id = oi.order_id
    JOIN public.products p ON oi.product_id = p.id
    WHERE o.user_id = auth.uid()
    AND o.status = 'completed'
    AND p.store_id = store_conversations.store_id
  )
);

-- RLS for store_conversations: both parties can update (close) conversations
CREATE POLICY "Participants can update conversations"
ON public.store_conversations
FOR UPDATE
USING (
  auth.uid() = customer_id
  OR EXISTS (
    SELECT 1 FROM public.stores 
    WHERE stores.id = store_conversations.store_id 
    AND stores.owner_id = auth.uid()
  )
);

-- RLS for store_messages: customers can view messages in their conversations
CREATE POLICY "Customers can view their messages"
ON public.store_messages
FOR SELECT
USING (auth.uid() = customer_id);

-- RLS for store_messages: sellers can view messages for their store (using owner_id)
CREATE POLICY "Sellers can view their store messages"
ON public.store_messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.stores 
    WHERE stores.id = store_messages.store_id 
    AND stores.owner_id = auth.uid()
  )
);

-- RLS for store_messages: customers can send messages in their conversations
CREATE POLICY "Customers can send messages"
ON public.store_messages
FOR INSERT
WITH CHECK (
  auth.uid() = customer_id
  AND sender_type = 'customer'
  AND EXISTS (
    SELECT 1 FROM public.store_conversations
    WHERE store_conversations.id = store_messages.conversation_id
    AND store_conversations.customer_id = auth.uid()
  )
);

-- RLS for store_messages: sellers can send messages in their store conversations (using owner_id)
CREATE POLICY "Sellers can send messages"
ON public.store_messages
FOR INSERT
WITH CHECK (
  sender_type = 'seller'
  AND EXISTS (
    SELECT 1 FROM public.stores 
    WHERE stores.id = store_messages.store_id 
    AND stores.owner_id = auth.uid()
  )
);

-- RLS for store_messages: message recipients can mark as read (using owner_id)
CREATE POLICY "Recipients can mark messages as read"
ON public.store_messages
FOR UPDATE
USING (
  (sender_type = 'seller' AND auth.uid() = customer_id)
  OR (sender_type = 'customer' AND EXISTS (
    SELECT 1 FROM public.stores 
    WHERE stores.id = store_messages.store_id 
    AND stores.owner_id = auth.uid()
  ))
);

-- Enable realtime for store messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.store_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.store_conversations;