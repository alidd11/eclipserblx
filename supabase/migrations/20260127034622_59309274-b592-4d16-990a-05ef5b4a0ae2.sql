-- Create seller_documents table for admin-created documents shared with sellers
CREATE TABLE public.seller_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  file_path TEXT,
  file_name TEXT,
  file_type TEXT,
  file_size BIGINT,
  external_url TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  is_active BOOLEAN NOT NULL DEFAULT true,
  requires_acknowledgement BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table to track document acknowledgements by sellers
CREATE TABLE public.seller_document_acknowledgements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES public.seller_documents(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  acknowledged_by UUID REFERENCES auth.users(id),
  acknowledged_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(document_id, store_id)
);

-- Create table to track document notifications sent to sellers
CREATE TABLE public.seller_document_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES public.seller_documents(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  read_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(document_id, store_id)
);

-- Enable RLS
ALTER TABLE public.seller_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_document_acknowledgements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_document_notifications ENABLE ROW LEVEL SECURITY;

-- RLS policies for seller_documents
CREATE POLICY "Admins can manage seller documents"
  ON public.seller_documents FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Sellers can view active documents"
  ON public.seller_documents FOR SELECT
  USING (
    is_active = true 
    AND EXISTS (
      SELECT 1 FROM public.stores s
      WHERE s.owner_id = auth.uid()
    )
  );

-- RLS policies for acknowledgements
CREATE POLICY "Admins can view all acknowledgements"
  ON public.seller_document_acknowledgements FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Sellers can manage their own acknowledgements"
  ON public.seller_document_acknowledgements FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.stores s
      WHERE s.id = seller_document_acknowledgements.store_id AND s.owner_id = auth.uid()
    )
  );

-- RLS policies for notifications
CREATE POLICY "Admins can manage all notifications"
  ON public.seller_document_notifications FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Sellers can view and update their own notifications"
  ON public.seller_document_notifications FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.stores s
      WHERE s.id = seller_document_notifications.store_id AND s.owner_id = auth.uid()
    )
  );

-- Create trigger for updated_at
CREATE TRIGGER update_seller_documents_updated_at
  BEFORE UPDATE ON public.seller_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_seller_documents_category ON public.seller_documents(category);
CREATE INDEX idx_seller_documents_is_active ON public.seller_documents(is_active);
CREATE INDEX idx_seller_document_notifications_store_id ON public.seller_document_notifications(store_id);
CREATE INDEX idx_seller_document_notifications_read_at ON public.seller_document_notifications(read_at);

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.seller_document_notifications;