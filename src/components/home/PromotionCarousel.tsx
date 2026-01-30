import { Link } from 'react-router-dom';
import { Users, Store, ArrowRight, Percent, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import { useCallback, useEffect, useState } from 'react';

const promotions = [
  {
    id: 'affiliate',
    icon: Percent,
    title: 'Join Our Affiliate Programme',
    description: 'Earn commission on every sale you refer. Share products you love and get rewarded.',
    cta: 'Become an Affiliate',
    link: '/affiliate',
    accentColor: 'text-primary',
    bgAccent: 'bg-primary/10',
  },
  {
    id: 'seller',
    icon: Store,
    title: 'Start Selling on Eclipse',
    description: 'Turn your creations into income. Join our verified seller community and reach thousands.',
    cta: 'Become a Seller',
    link: '/account',
    accentColor: 'text-amber-500',
    bgAccent: 'bg-amber-500/10',
  },
];

export function PromotionCarousel() {
  const [emblaRef, emblaApi] = useEmblaCarousel(
    { loop: true, skipSnaps: false },
    [Autoplay({ delay: 8000, stopOnInteraction: false, stopOnMouseEnter: true })]
  );
  const [selectedIndex, setSelectedIndex] = useState(0);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on('select', onSelect);
    onSelect();
    return () => {
      emblaApi.off('select', onSelect);
    };
  }, [emblaApi, onSelect]);

  const scrollTo = useCallback(
    (index: number) => emblaApi && emblaApi.scrollTo(index),
    [emblaApi]
  );

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      {/* Carousel container */}
      <div ref={emblaRef} className="overflow-hidden">
        <div className="flex">
          {promotions.map((promo) => (
            <div key={promo.id} className="flex-[0_0_100%] min-w-0">
              <div className="p-5 md:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  {/* Left content */}
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-xl ${promo.bgAccent} flex items-center justify-center shrink-0`}>
                      <promo.icon className={`h-6 w-6 ${promo.accentColor}`} />
                    </div>
                    <div className="space-y-1">
                      <h3 className="font-semibold text-base md:text-lg">{promo.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed max-w-md">
                        {promo.description}
                      </p>
                    </div>
                  </div>
                  
                  {/* CTA button */}
                  <Link to={promo.link} className="shrink-0">
                    <Button 
                      variant="outline" 
                      className={`border-${promo.id === 'affiliate' ? 'primary/50' : 'amber-500/50'} ${promo.accentColor} hover:bg-${promo.id === 'affiliate' ? 'primary' : 'amber-500'}/10`}
                    >
                      {promo.cta}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Dot indicators */}
      <div className="flex justify-center gap-2 pb-4">
        {promotions.map((_, index) => (
          <button
            key={index}
            onClick={() => scrollTo(index)}
            className={`w-2 h-2 rounded-full transition-all duration-300 ${
              index === selectedIndex 
                ? 'bg-primary w-6' 
                : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
