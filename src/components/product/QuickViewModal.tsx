import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ShoppingCart, Check, ExternalLink, Star, BadgeCheck } from 'lucide-react';
import { useCart } from '@/hooks/useCart';
import { useCurrency } from '@/hooks/useCurrency';
import { useNavigate } from 'react-router-dom';
import { getFirstImageUrl } from '@/lib/mediaUtils';

interface QuickViewModalProps {
  productId: string | null;
  onClose: () => void;
}

export function QuickViewModal({ productId, onClose }: QuickViewModalProps) {
  const navigate = useNavigate();
  const { addItem, isInCart } = useCart();
  const { formatPrice } = useCurrency();
  const [imgIndex, setImgIndex] = useState(0);

  const { data: product } = useQuery({
    queryKey: ['quick-view', productId],
    queryFn: async () => {
      if (!productId) return null;
      const { data, error } = await supabase
        .from('products')
        .select(`
          id, name, slug, product_number, price, images, description,
          category_id, categories(name),
          stores(name, slug, logo_url, is_verified)
        `)
        .eq('id', productId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!productId,
  });

  if (!product) return null;

  const images = (product.images as string[]) || [];
  const store = product.stores as any;
  const inCart = isInCart(product.id);
  const currentImage = images[imgIndex] || getFirstImageUrl(product.images);

  return (
    <Dialog open={!!productId} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-lg p-0 overflow-hidden">
        {/* Image */}
        <div className="relative aspect-[4/3] bg-muted">
          {currentImage ? (
            <img src={currentImage} alt={product.name} className="w-full h-full object-contain" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">No image</div>
          )}
          {/* Thumbnail dots */}
          {images.length > 1 && (
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
              {images.slice(0, 5).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setImgIndex(i)}
                  className={`h-1.5 w-1.5 rounded-full transition-colors ${i === imgIndex ? 'bg-primary' : 'bg-background/50'}`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <div className="p-4 space-y-3">
          {/* Store */}
          {store && (
            <div className="flex items-center gap-2">
              {store.logo_url && (
                <img src={store.logo_url} alt="" className="h-5 w-5 rounded-sm object-cover" />
              )}
              <span className="text-xs text-muted-foreground">{store.name}</span>
              {store.is_verified && <BadgeCheck className="h-3 w-3 text-blue-400" />}
            </div>
          )}

          <h3 className="text-lg font-bold leading-tight">{product.name}</h3>

          {product.description && (
            <p className="text-sm text-muted-foreground line-clamp-3">{product.description}</p>
          )}

          <p className="text-xl font-bold">{formatPrice(product.price)}</p>

          <div className="flex gap-2">
            <Button
              className="flex-1"
              variant={inCart ? "secondary" : "default"}
              onClick={() => {
                if (!inCart) {
                  addItem({
                    id: product.id,
                    name: product.name,
                    price: product.price,
                    image: currentImage || undefined,
                    slug: product.slug,
                    category_id: product.category_id ?? undefined,
                    store_name: store?.name,
                  });
                }
              }}
            >
              {inCart ? (
                <><Check className="h-4 w-4 mr-1.5" /> In Cart</>
              ) : (
                <><ShoppingCart className="h-4 w-4 mr-1.5" /> Add to Cart</>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                onClose();
                navigate(`/products/${(product as any).product_number}`);
              }}
            >
              <ExternalLink className="h-4 w-4 mr-1.5" /> Details
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
