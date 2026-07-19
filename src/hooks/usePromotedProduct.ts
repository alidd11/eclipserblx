import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface PromotedProduct {
  promotionId: string;
  pricingModel: string;
  cpcBid: number;
  cpmBid: number;
  product: {
    id: string;
    name: string;
    slug: string;
    product_number: number;
    price: number;
    images: string[] | null;
    description: string | null;
    category_id: string | null;
    is_resellable: boolean;
    download_count: number;
    categories: { name: string; slug: string } | null;
    stores: {
      name: string;
      slug: string;
      logo_url: string | null;
      is_verified: boolean;
      
    } | null;
  } | null;
}

export function usePromotedProduct(zone: string, categoryId?: string) {
  const impressionTracked = useRef(false);

  const { data, isLoading } = useQuery({
    queryKey: ['promoted-product', zone, categoryId],
    queryFn: async () => {
      // Get weighted promotion from RPC
      const { data: promoData, error: promoError } = await supabase
        .rpc('get_weighted_promotion', {
          p_zone: zone,
          p_category_id: categoryId || undefined,
        });

      if (promoError || !promoData || promoData.length === 0) return null;

      const promo = promoData[0];

      // Fetch full product details
      const { data: productData, error: productError } = await supabase
        .from('products')
        .select(`
          id, name, slug, product_number, price, images, description, category_id,
          is_resellable, download_count,
          categories (name, slug),
          stores!inner (name, slug, logo_url, is_verified, is_active, is_testing)
        `)
        .eq('id', promo.product_id)
        .eq('is_active', true)
        .maybeSingle();

      if (productError || !productData) return null;

      const store = (productData as any).stores;
      if (!store || !store.is_active || store.is_testing) return null;

      return {
        promotionId: promo.promotion_id,
        pricingModel: promo.pricing_model,
        cpcBid: promo.cpc_bid,
        cpmBid: promo.cpm_bid,
        product: productData as any,
      } as PromotedProduct;
    },
    staleTime: 60 * 1000, // 1 minute
    refetchOnWindowFocus: false,
  });

  // Track impression on mount
  useEffect(() => {
    if (data?.promotionId && !impressionTracked.current) {
      impressionTracked.current = true;
      supabase.rpc('charge_promotion_impression', {
        p_promotion_id: data.promotionId,
        p_count: 1,
      }).then(() => {}, () => {});
    }
  }, [data?.promotionId]);

  // Reset tracking ref when promotion changes
  useEffect(() => {
    impressionTracked.current = false;
  }, [zone, categoryId]);

  const trackClick = async () => {
    if (!data?.promotionId) return;
    try {
      await supabase.rpc('record_promotion_click', {
        p_promotion_id: data.promotionId,
      });
    } catch {};
  };

  return {
    promotedProduct: data,
    isLoading,
    trackClick,
  };
}
