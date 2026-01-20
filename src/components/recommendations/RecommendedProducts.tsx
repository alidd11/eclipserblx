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
        <div className="flex items-center gap-2 mb-6">
          <Sparkles className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-bold">{title}</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: limit }).map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-lg" />
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
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-bold">{title}</h2>
        </div>
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <StrategyIcon className="h-4 w-4" />
          <span>{strategyLabel}</span>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
