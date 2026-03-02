import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Returns a ref callback that triggers prefetching when the linked element
 * becomes visible in the viewport (via IntersectionObserver).
 * Useful for store/product links to warm the cache before the user clicks.
 */
export function usePrefetchStoreOnVisible() {
  const queryClient = useQueryClient();
  const observerRef = useRef<IntersectionObserver | null>(null);
  const observedRef = useRef(new Set<string>());

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const slug = (entry.target as HTMLElement).dataset.prefetchSlug;
          if (!slug || observedRef.current.has(slug)) continue;

          observedRef.current.add(slug);
          observerRef.current?.unobserve(entry.target);

          queryClient.prefetchQuery({
            queryKey: ['public-store', slug],
            queryFn: async () => {
              const { data } = await supabase
                .from('stores')
                .select('id, name, slug, logo_url, banner_url, accent_color, is_verified, is_trusted, bio, theme, discord_url, twitter_url, youtube_url, tiktok_url, website_url')
                .eq('slug', slug)
                .eq('is_active', true)
                .eq('status', 'approved')
                .maybeSingle();
              return data;
            },
            staleTime: 1000 * 60 * 3,
          });
        }
      },
      { rootMargin: '200px' }
    );

    return () => {
      observerRef.current?.disconnect();
    };
  }, [queryClient]);

  const observe = useCallback((el: HTMLElement | null) => {
    if (el && observerRef.current) {
      observerRef.current.observe(el);
    }
  }, []);

  return observe;
}
