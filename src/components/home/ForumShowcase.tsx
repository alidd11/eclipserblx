import { Link } from 'react-router-dom';
import { MessageSquare, ArrowRight, Users, TrendingUp } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';

export function ForumShowcase() {
  const { data: categories, isLoading } = useQuery({
    queryKey: ['forum-categories-home'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('forum_categories')
        .select('*')
        .order('display_order', { ascending: true })
        .limit(4);

      if (error) throw error;
      return data;
    },
  });

  const iconMap: Record<string, React.ElementType> = {
    MessageSquare,
    Users,
    TrendingUp,
  };

  const gradientMap: Record<number, string> = {
    0: 'from-purple-500/20 to-purple-600/20',
    1: 'from-blue-500/20 to-blue-600/20',
    2: 'from-emerald-500/20 to-emerald-600/20',
    3: 'from-amber-500/20 to-amber-600/20',
  };

  if (isLoading) {
    return (
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <Skeleton className="h-8 w-64 mx-auto mb-4" />
            <Skeleton className="h-5 w-96 mx-auto" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-48 rounded-xl" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 px-4">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
            Join the Community
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Connect with fellow creators, share your work, and get help from the community
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {categories?.map((category, index) => {
            const IconComponent = iconMap[category.icon || ''] || MessageSquare;
            const gradient = gradientMap[index % 4];

            return (
              <Link
                key={category.id}
                to={`/forum?category=${category.slug}`}
                className="group relative overflow-hidden rounded-xl border border-border bg-card p-6 transition-all duration-300 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                
                <div className="relative z-10">
                  <div className="mb-4 inline-flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 text-primary">
                    <IconComponent className="h-6 w-6" />
                  </div>
                  
                  <h3 className="font-display font-semibold text-lg mb-2 group-hover:text-primary transition-colors">
                    {category.name}
                  </h3>
                  
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                    {category.description || 'Join the discussion'}
                  </p>
                  
                  <div className="flex items-center text-sm text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                    <span>Browse Forum</span>
                    <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        <div className="text-center mt-8">
          <Link
            to="/forum"
            className="inline-flex items-center gap-2 text-primary hover:text-primary/80 font-medium transition-colors"
          >
            View All Forums
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
