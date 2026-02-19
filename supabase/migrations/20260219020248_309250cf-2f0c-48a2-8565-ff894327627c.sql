
-- Cache table for AI responses (smart search + lua analysis)
CREATE TABLE public.ai_response_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cache_key TEXT NOT NULL UNIQUE,
  function_name TEXT NOT NULL,
  response JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Index for fast lookups and cleanup
CREATE INDEX idx_ai_response_cache_key ON public.ai_response_cache (cache_key);
CREATE INDEX idx_ai_response_cache_expires ON public.ai_response_cache (expires_at);

-- Enable RLS (service role only)
ALTER TABLE public.ai_response_cache ENABLE ROW LEVEL SECURITY;

-- No public policies - only service role can access this table
