import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { StoreLayout } from '@/components/store/StoreLayout';
import { ChevronLeft, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

export default function StoreAbout() {
  const { slug } = useParams<{ slug: string }>();

  const { data: store, isLoading } = useQuery({
    queryKey: ['store-about', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .eq('slug', slug)
        .eq('is_active', true)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Skeleton className="h-32 w-64" />
      </div>
    );
  }

  if (!store) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <h1 className="text-2xl font-bold">Store not found</h1>
        <Button asChild>
          <Link to="/products">Browse All Stores</Link>
        </Button>
      </div>
    );
  }

  const accentColor = store.accent_color || '#8b5cf6';
  const theme = store.theme || 'default';
  const isDarkTheme = theme === 'dark';

  return (
    <StoreLayout
      store={store}
      activeTab={null}
      onTabChange={() => {}}
      bio={store.bio}
    >
      <div className={`min-h-[60vh] ${isDarkTheme ? 'text-white' : ''}`}>
        {/* Back Button */}
        <div className="mb-6">
          <Button variant="ghost" size="sm" asChild>
            <Link to={`/store/${slug}`} className="gap-2">
              <ChevronLeft className="h-4 w-4" />
              Back to Store
            </Link>
          </Button>
        </div>

        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div 
            className="p-3 rounded-xl"
            style={{ backgroundColor: `${accentColor}20` }}
          >
            <Info className="h-6 w-6" style={{ color: accentColor }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold">About {store.name}</h1>
            <p className={`text-sm ${isDarkTheme ? 'text-zinc-400' : 'text-muted-foreground'}`}>
              Learn more about this store
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="prose prose-sm max-w-none dark:prose-invert">
          {store.about_content ? (
            <div 
              dangerouslySetInnerHTML={{ __html: store.about_content }}
              className={`${isDarkTheme ? 'text-zinc-300' : 'text-foreground'}`}
            />
          ) : store.bio ? (
            <div className={`space-y-4 ${isDarkTheme ? 'text-zinc-300' : 'text-foreground'}`}>
              <p className="text-lg italic">"{store.bio}"</p>
              {store.description && (
                <p>{store.description}</p>
              )}
            </div>
          ) : (
            <div className={`text-center py-12 ${isDarkTheme ? 'text-zinc-500' : 'text-muted-foreground'}`}>
              <Info className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>This store hasn't added their about information yet.</p>
            </div>
          )}
        </div>
      </div>
    </StoreLayout>
  );
}
