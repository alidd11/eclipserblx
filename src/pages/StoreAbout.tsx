import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { StoreLayout } from '@/components/store/StoreLayout';
import { ChevronLeft, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { sanitizeHtml } from '@/lib/sanitize';
import { PUBLIC_STORE_COLUMNS } from '@/lib/storeColumns';

export default function StoreAbout() {
  const { slug } = useParams<{ slug: string }>();

  const { data: store, isLoading } = useQuery({
    queryKey: ['store-about', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stores')
        .select(PUBLIC_STORE_COLUMNS)
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
        {/* Hero Section with Banner Background */}
        <div className="relative rounded-2xl overflow-hidden mb-8">
          {/* Banner Background */}
          {store.banner_url ? (
            <div 
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${store.banner_url})` }}
            />
          ) : (
            <div 
              className="absolute inset-0"
              style={{ background: `linear-gradient(135deg, ${accentColor}30, ${accentColor}10)` }}
            />
          )}
          {/* Dark overlay for readability */}
          <div className="absolute inset-0 bg-black/60" />
          
          {/* Content */}
          <div className="relative z-10 py-16 px-6 flex flex-col items-center justify-center text-center">
            {/* Store Logo */}
            {store.logo_url && (
              <div className="mb-6">
                <img 
                  src={store.logo_url} 
                  alt={store.name}
                  className="h-24 w-24 rounded-2xl object-cover border-4 border-white/20 shadow-xl"
                />
              </div>
            )}
            
            {/* Store Name */}
            <h1 className="text-3xl font-bold text-white mb-2">{store.name}</h1>
            
            {/* Back Button */}
            <Button variant="outline" size="sm" asChild className="mt-4 bg-white/10 border-white/20 text-white hover:bg-white/20">
              <Link to={`/store/${slug}`} className="gap-2">
                <ChevronLeft className="h-4 w-4" />
                Back to Store
              </Link>
            </Button>
          </div>
        </div>

        {/* About Content */}
        <div className="prose prose-sm max-w-none dark:prose-invert text-center mx-auto max-w-2xl">
        {(store as any).about_content ? (
            <div 
              dangerouslySetInnerHTML={{ __html: sanitizeHtml((store as any).about_content) }}
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
            <div className={`py-12 ${isDarkTheme ? 'text-zinc-500' : 'text-muted-foreground'}`}>
              <Info className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>This store hasn't added their about information yet.</p>
            </div>
          )}
        </div>
      </div>
    </StoreLayout>
  );
}
