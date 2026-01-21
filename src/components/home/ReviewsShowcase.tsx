import { Star, Quote } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from '@/components/ui/carousel';
import Autoplay from 'embla-carousel-autoplay';
import { useRef } from 'react';

interface Review {
  id: string;
  rating: number;
  title: string | null;
  content: string;
  created_at: string;
  user_id: string;
  product_id: string | null;
  is_external: boolean | null;
  external_source: string | null;
  external_reviewer_name: string | null;
  profiles: { display_name: string | null } | null;
  products: { name: string } | null;
}

export function ReviewsShowcase() {
  const autoplayPlugin = useRef(
    Autoplay({ delay: 4000, stopOnInteraction: false })
  );

  const { data: reviews, isLoading } = useQuery({
    queryKey: ['featured-reviews'],
    queryFn: async () => {
      const { data: reviewsData, error } = await supabase
        .from('reviews')
        .select(`
          id,
          rating,
          title,
          content,
          created_at,
          user_id,
          product_id,
          is_external,
          external_source,
          external_reviewer_name,
          products:product_id(name)
        `)
        .eq('is_approved', true)
        .eq('is_featured', true)
        .order('created_at', { ascending: false })
        .limit(6);

      if (error) throw error;

      // Fetch profiles for non-external reviews
      const userIds = reviewsData?.filter(r => !r.is_external).map(r => r.user_id) || [];
      const { data: profiles } = userIds.length > 0 
        ? await supabase
            .from('profiles')
            .select('user_id, display_name')
            .in('user_id', userIds)
        : { data: [] };

      const profileMap = new Map<string, { user_id: string; display_name: string | null }>(
        profiles?.map(p => [p.user_id, p] as [string, { user_id: string; display_name: string | null }]) || []
      );

      return reviewsData?.map(review => ({
        ...review,
        profiles: review.is_external ? null : (profileMap.get(review.user_id) || null),
      })) as Review[];
    },
  });

  if (isLoading) {
    return (
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <Skeleton className="h-8 w-64 mx-auto mb-4" />
            <Skeleton className="h-5 w-96 mx-auto" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-48 rounded-xl" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (!reviews || reviews.length === 0) {
    return null;
  }

  return (
    <section className="py-16 px-4">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            What Our Customers Say
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            See why creators trust Eclipse for their Roblox development needs
          </p>
        </div>

        <Carousel
          opts={{
            align: 'start',
            loop: true,
          }}
          plugins={[autoplayPlugin.current]}
          className="w-full"
        >
          <CarouselContent className="-ml-4">
            {reviews.map((review) => (
              <CarouselItem key={review.id} className="pl-4 md:basis-1/2 lg:basis-1/3">
                <div className="relative rounded-xl border border-border bg-card p-6 h-full">
                  <Quote className="absolute top-4 right-4 h-8 w-8 text-muted/20" />
                  
                  <div className="flex items-center gap-1 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`h-4 w-4 ${
                          i < review.rating
                            ? 'text-amber-500 fill-amber-500'
                            : 'text-muted'
                        }`}
                      />
                    ))}
                  </div>

                  {review.title && (
                    <h3 className="font-semibold text-lg mb-2">{review.title}</h3>
                  )}

                  <p className="text-muted-foreground text-sm line-clamp-4 mb-4">
                    "{review.content}"
                  </p>

                  <div className="mt-auto pt-4 border-t border-border">
                    <p className="font-medium text-sm">
                      {review.is_external 
                        ? review.external_reviewer_name || 'Anonymous'
                        : review.profiles?.display_name || 'Anonymous'}
                    </p>
                    {review.is_external && review.external_source && (
                      <p className="text-xs text-muted-foreground">
                        via {review.external_source}
                      </p>
                    )}
                    {!review.is_external && review.products?.name && (
                      <p className="text-xs text-muted-foreground">
                        Reviewed: {review.products.name}
                      </p>
                    )}
                  </div>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
      </div>
    </section>
  );
}
