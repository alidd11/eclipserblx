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
  const [isReady, setIsReady] = useState(false);
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
    
    // Mark as ready once embla is initialized
    setIsReady(true);
    
    emblaApi.on('select', onSelect);
    emblaApi.on('reInit', onSelect);
    onSelect();
    
    return () => {
      emblaApi.off('select', onSelect);
      emblaApi.off('reInit', onSelect);
    };
  }, [emblaApi, onSelect]);

  const scrollTo = useCallback(
    (index: number) => emblaApi && emblaApi.scrollTo(index),
    [emblaApi]
  );

  // Always render content, but control visibility with opacity for smooth transition
  const currentPromo = promotions[selectedIndex] || promotions[0];

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      {/* Carousel container - with opacity transition */}
      <div 
        ref={emblaRef} 
        className={`overflow-hidden transition-opacity duration-300 ${isReady ? 'opacity-100' : 'opacity-0 absolute'}`}
      >
        <div className="flex">
          {promotions.map((promo) => (
            <div key={promo.id} className="flex-[0_0_100%] min-w-0">
              <div className="p-5 md:p-6">
                <div className="flex items-center justify-between gap-4">
                  {/* Left content */}
                  <div className="flex items-center gap-4 min-w-0">
                    <div className={`w-12 h-12 rounded-xl ${promo.bgAccent} flex items-center justify-center shrink-0`}>
                      <promo.icon className={`h-6 w-6 ${promo.accentColor}`} />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-base md:text-lg truncate">{promo.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2 max-w-md">
                        {promo.description}
                      </p>
                    </div>
                  </div>
                  
                  {/* CTA button - Right aligned */}
                  <Link to={promo.link} className="shrink-0 hidden sm:block">
                    <Button 
                      variant="outline" 
                      className={`${promo.id === 'affiliate' ? 'border-primary/50 text-primary hover:bg-primary/10' : 'border-amber-500/50 text-amber-500 hover:bg-amber-500/10'}`}
                    >
                      {promo.cta}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
                
                {/* Mobile CTA - Below content */}
                <Link to={promo.link} className="block sm:hidden mt-4">
                  <Button 
                    variant="outline" 
                    className={`w-full ${promo.id === 'affiliate' ? 'border-primary/50 text-primary hover:bg-primary/10' : 'border-amber-500/50 text-amber-500 hover:bg-amber-500/10'}`}
                  >
                    {promo.cta}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Fallback content shown until carousel is ready */}
      {!isReady && (
        <div className="p-5 md:p-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              <div className={`w-12 h-12 rounded-xl ${currentPromo.bgAccent} flex items-center justify-center shrink-0`}>
                <currentPromo.icon className={`h-6 w-6 ${currentPromo.accentColor}`} />
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-base md:text-lg truncate">{currentPromo.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2 max-w-md">
                  {currentPromo.description}
                </p>
              </div>
            </div>
            <Link to={currentPromo.link} className="shrink-0 hidden sm:block">
              <Button 
                variant="outline" 
                className={`${currentPromo.id === 'affiliate' ? 'border-primary/50 text-primary hover:bg-primary/10' : 'border-amber-500/50 text-amber-500 hover:bg-amber-500/10'}`}
              >
                {currentPromo.cta}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
          <Link to={currentPromo.link} className="block sm:hidden mt-4">
            <Button 
              variant="outline" 
              className={`w-full ${currentPromo.id === 'affiliate' ? 'border-primary/50 text-primary hover:bg-primary/10' : 'border-amber-500/50 text-amber-500 hover:bg-amber-500/10'}`}
            >
              {currentPromo.cta}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      )}

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
