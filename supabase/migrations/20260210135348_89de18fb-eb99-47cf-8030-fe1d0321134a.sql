
-- Table to cache NSFW scan results by image hash
CREATE TABLE public.nsfw_scan_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  image_hash TEXT NOT NULL UNIQUE,
  is_nsfw BOOLEAN NOT NULL DEFAULT false,
  reason TEXT DEFAULT '',
  scanned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  scan_count INTEGER NOT NULL DEFAULT 1
);

-- Index for fast hash lookups
CREATE INDEX idx_nsfw_scan_cache_hash ON public.nsfw_scan_cache(image_hash);

-- Auto-cleanup old entries (older than 30 days)
CREATE INDEX idx_nsfw_scan_cache_scanned_at ON public.nsfw_scan_cache(scanned_at);

-- Enable RLS
ALTER TABLE public.nsfw_scan_cache ENABLE ROW LEVEL SECURITY;

-- Allow edge functions (service role) to read/write, block anon access
-- No public policies needed - only service role accesses this
