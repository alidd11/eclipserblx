import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import DOMPurify from 'dompurify';

export default function StoreCustomPage() {
  const { storeSlug, pageSlug } = useParams<{ storeSlug: string; pageSlug: string }>();

  const { data: page, isLoading, error } = useQuery({
    queryKey: ['store-custom-page', storeSlug, pageSlug],
    queryFn: async () => {
      // First get the store by slug
      const { data: store, error: storeErr } = await supabase
        .from('stores')
        .select('id')
        .eq('slug', storeSlug!)
        .single();
      if (storeErr || !store) throw new Error('Store not found');

      const { data, error: pageErr } = await supabase
        .from('store_pages')
        .select('*')
        .eq('store_id', store.id)
        .eq('slug', pageSlug!)
        .eq('is_published', true)
        .single();
      if (pageErr || !data) throw new Error('Page not found');
      return data;
    },
    enabled: !!storeSlug && !!pageSlug,
  });

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-4">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !page) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold mb-2">Page Not Found</h1>
        <p className="text-muted-foreground">This page doesn't exist or has been unpublished.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">{page.title}</h1>
      <div 
        className="prose prose-sm dark:prose-invert max-w-none"
        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(page.content || '') }}
      />
    </div>
  );
}
