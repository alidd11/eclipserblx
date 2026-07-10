import { Link } from 'react-router-dom';
import { ProductCard } from '@/components/ui/ProductCard';
import { PromotedBadge } from '@/components/marketplace/PromotedBadge';
import { getFirstImageUrl } from '@/lib/mediaUtils';

interface PromotedProductCardProps {
  product: {
    id: string;
    name: string;
    product_number: number;
    price: number;
    images: string[] | null;
    category_id: string | null;
    is_resellable: boolean;
    categories: { name: string; slug: string } | null;
    stores: {
      name: string;
      slug: string;
      logo_url: string | null;
      is_verified: boolean;
      eclipse_plus_discount_enabled: boolean;
    } | null;
  };
  onClickTracked: () => void;
}

export function PromotedProductCard({ product, onClickTracked }: PromotedProductCardProps) {
  return (
    <div className="relative" onClick={onClickTracked}>
      <div className="absolute top-2 left-2 z-10">
        <PromotedBadge size="sm" />
      </div>
      <ProductCard
        id={product.id}
        name={product.name}
        slug={String(product.product_number)}
        price={product.price}
        image={getFirstImageUrl(product.images, 620, 465, 'contain')}
        images={product.images}
        category={product.categories?.name}
        categorySlug={product.categories?.slug}
        categoryId={product.category_id}
        isResellable={product.is_resellable}
        storeName={product.stores?.name}
        storeSlug={product.stores?.slug}
        storeLogo={product.stores?.logo_url}
        isVerified={product.stores?.is_verified}
        storeEclipseEnabled={product.stores?.eclipse_plus_discount_enabled}
      />
    </div>
  );
}
