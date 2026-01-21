import { useAIRecommendations } from '@/hooks/useAIRecommendations';
import { ProductCard } from '@/components/ui/ProductCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Sparkles, TrendingUp, Heart, Layers } from 'lucide-react';

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
      <div className={className}>
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="h-5 w-5 text-primary" />
          <h2 className="text-lg sm:text-xl font-bold">{title}</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 sm:gap-4">
          {Array.from({ length: limit }).map((_, i) => (
            <Skeleton key={i} className="aspect-[3/4] rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !data?.recommendations?.length) {
    return null;
  }

  const StrategyIcon = strategyIcons[data.strategy] || TrendingUp;
  const strategyLabel = strategyLabels[data.strategy] || 'Recommended';

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h2 className="text-lg sm:text-xl font-bold">{title}</h2>
        </div>
        <div className="flex items-center gap-1.5 text-xs sm:text-sm text-muted-foreground">
          <StrategyIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          <span className="hidden xs:inline">{strategyLabel}</span>
        </div>
      </div>
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
          />
        ))}
      </div>
    </div>
  );
};
