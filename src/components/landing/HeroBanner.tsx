import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Fallback images from Eclipse store products (pre-fetched for instant render)
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

  // Optionally fetch fresh images from the Eclipse store
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
    <div className="absolute inset-0 overflow-hidden">
      {/* Solid dark background base */}
      <div className="absolute inset-0 bg-background" />

      {/* Product image collage — ClearlyDev-style faded background */}
      <div className="absolute inset-0 grid grid-cols-4 grid-rows-2 gap-0">
        {images.slice(0, 8).map((src, i) => (
          <div key={i} className="relative overflow-hidden">
            <img
              src={src}
              alt=""
              loading="lazy"
              className="absolute inset-0 w-full h-full object-cover"
            />
          </div>
        ))}
      </div>

      {/* Heavy dark overlay to keep images extremely subtle */}
      <div className="absolute inset-0 bg-background/85 dark:bg-background/90" />

      {/* Noise texture for grain/depth */}
      <div 
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Left fade — protects text readability */}
      <div className="absolute inset-y-0 left-0 w-2/3 bg-gradient-to-r from-background via-background/80 to-transparent" />

      {/* Bottom fade */}
      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-background to-transparent" />
      
      {/* Top fade */}
      <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-background to-transparent" />
    </div>
  );
}
