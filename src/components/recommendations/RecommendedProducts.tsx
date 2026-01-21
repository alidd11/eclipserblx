import { useAIRecommendations } from '@/hooks/useAIRecommendations';
import { ProductCard } from '@/components/ui/ProductCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Sparkles, TrendingUp, Heart, Layers } from 'lucide-react';
import { SectionWrapper } from '@/components/home/SectionWrapper';

interface RecommendedProductsProps {
  productId?: string;
  limit?: number;
  title?: string;
  className?: string;
}

const strategyIcons = {
  followed_stores: Heart,
  similar_categories: Layers,
  similar_products: Layers,
  popular: TrendingUp,
};

const strategyLabels = {
  followed_stores: 'From stores you follow',
  similar_categories: 'Based on your interests',
  similar_products: 'Similar products',
  popular: 'Trending now',
};

export const RecommendedProducts = ({
  productId,
  limit = 6,
  title = 'Recommended for You',
  className = '',
}: RecommendedProductsProps) => {
  const { data, isLoading, error } = useAIRecommendations(productId, limit);

  if (isLoading) {
    return (
      <SectionWrapper className={className}>
        <div className="rounded-2xl border border-border bg-card p-6 md:p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-bold">{title}</h2>
              <p className="text-sm text-muted-foreground">Personalized picks for you</p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 sm:gap-4">
            {Array.from({ length: limit }).map((_, i) => (
              <Skeleton key={i} className="aspect-[3/4] rounded-lg" />
            ))}
          </div>
        </div>
      </SectionWrapper>
    );
  }

  if (error || !data?.recommendations?.length) {
    return null;
  }

  const StrategyIcon = strategyIcons[data.strategy] || TrendingUp;
  const strategyLabel = strategyLabels[data.strategy] || 'Recommended';

  return (
    <SectionWrapper className={className}>
      <div className="rounded-2xl border border-border bg-card p-6 md:p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-bold">{title}</h2>
              <p className="text-sm text-muted-foreground">Personalized picks for you</p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted text-muted-foreground">
            <StrategyIcon className="h-3.5 w-3.5" />
            <span className="text-xs font-medium">{strategyLabel}</span>
          </div>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 sm:gap-4">
          {data.recommendations.map((product) => (
            <ProductCard
              key={product.id}
              id={product.id}
              name={product.name}
              price={product.price}
              image={product.images?.[0] || '/placeholder.svg'}
              slug={product.slug}
              category={product.categories?.name}
              storeName={product.stores?.name}
              storeSlug={product.stores?.slug}
              storeLogo={product.stores?.logo_url}
              isVerified={product.stores?.is_verified}
              isTrusted={product.stores?.is_trusted}
            />
          ))}
        </div>
      </div>
    </SectionWrapper>
  );
};
