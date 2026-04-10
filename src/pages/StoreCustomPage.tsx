import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import DOMPurify from 'dompurify';
import { usePublicStore } from '@/hooks/usePublicStore';
import { StoreNotFound } from '@/components/store/StoreNotFound';

export default function StoreCustomPage() {
  const { storeSlug, pageSlug } = useParams<{ storeSlug: string; pageSlug: string }>();

  // Centralised store validation
  const { store, isLoading: storeLoading, notFound: storeNotFound } = usePublicStore(storeSlug);

  const { data: page, isLoading: pageLoading, error } = useQuery({
    queryKey: ['store-custom-page', store?.id, pageSlug],
    queryFn: async () => {
      const { data, error: pageErr } = await supabase
        .from('store_pages')
        .select('*')
        .eq('store_id', store!.id)
        .eq('slug', pageSlug!)
        .eq('is_published', true)
        .single();
      if (pageErr || !data) throw new Error('Page not found');
      return data;
    },
    enabled: !!store?.id && !!pageSlug,
  });

  const isLoading = storeLoading || pageLoading;

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

  if (storeNotFound) {
    return <StoreNotFound />;
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
