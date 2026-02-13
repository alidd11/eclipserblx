import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

const FALLBACK_IMAGES = [
  'https://qlnbergwjfrmgkjhrbkj.supabase.co/storage/v1/object/public/product-images/1768231586799-p0e74.jpg',
  'https://qlnbergwjfrmgkjhrbkj.supabase.co/storage/v1/object/public/product-images/1768245493010-ygk9yj.jpg',
  'https://qlnbergwjfrmgkjhrbkj.supabase.co/storage/v1/object/public/product-images/1768232146077-xbu2e.jpg',
  'https://qlnbergwjfrmgkjhrbkj.supabase.co/storage/v1/object/public/product-images/1768246213862-yuscet.jpg',
  'https://qlnbergwjfrmgkjhrbkj.supabase.co/storage/v1/object/public/product-images/1768245871938-5585x.jpg',
  'https://qlnbergwjfrmgkjhrbkj.supabase.co/storage/v1/object/public/product-images/1768228214084-01l3uc.jpg',
  'https://qlnbergwjfrmgkjhrbkj.supabase.co/storage/v1/object/public/product-images/1768230859056-b6y9tur.jpg',
  'https://qlnbergwjfrmgkjhrbkj.supabase.co/storage/v1/object/public/product-images/1768229028790-nipuc5.jpg',
];

export function HeroBanner() {
  const [images, setImages] = useState<string[]>(FALLBACK_IMAGES);

  useEffect(() => {
    async function fetchImages() {
      try {
        const { data } = await supabase
          .from('products')
          .select('images, stores!inner(slug)')
          .eq('stores.slug', 'eclipse-store')
          .eq('is_active', true)
          .is('deleted_at', null)
          .order('download_count', { ascending: false, nullsFirst: false })
          .limit(8);

        if (data && data.length > 0) {
          const imgs = data
            .map((p: any) => (p.images as string[])?.[0])
            .filter(Boolean) as string[];
          if (imgs.length >= 4) setImages(imgs);
        }
      } catch {
        // Use fallback images
      }
    }
    fetchImages();
  }, []);

  return (
    <div className="absolute inset-x-0 top-0 h-[420px] sm:h-[480px] overflow-hidden">
      {/* Product image collage grid */}
      <div className="absolute inset-0 grid grid-cols-4 grid-rows-2 gap-px">
        {images.slice(0, 8).map((src, i) => (
          <div key={i} className="relative overflow-hidden">
            <img
              src={src}
              alt=""
              loading="lazy"
              className="absolute inset-0 w-full h-full object-cover scale-105"
            />
          </div>
        ))}
      </div>

      {/* Dark overlay — visible but subtle, like ClearlyDev (~60%) */}
      <div className="absolute inset-0 bg-background/60" />

      {/* Left text-protection gradient */}
      <div className="absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-background/80 to-transparent" />

      {/* Bottom hard fade into page background */}
      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-background via-background/90 to-transparent" />

      {/* Top subtle fade under navbar */}
      <div className="absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-background/40 to-transparent" />
    </div>
  );
}
