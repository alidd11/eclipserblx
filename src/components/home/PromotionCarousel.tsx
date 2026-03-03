import { Link } from 'react-router-dom';
import { ArrowRight, Shield, Users, Store, Coins } from 'lucide-react';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

export function PromotionCarousel() {
  const { t } = useTranslation();
  const [emblaRef, emblaApi] = useEmblaCarousel(
    { loop: true, skipSnaps: false },
    [Autoplay({ delay: 8000, stopOnInteraction: false, stopOnMouseEnter: true })]
  );
  const [selectedIndex, setSelectedIndex] = useState(0);

  const promotions = [
    {
      id: 'ip-shield',
      title: 'Protect Your Creations with IP Shield',
      description: 'DMCA takedowns, copy detection & ownership monitoring for Roblox creators.',
      cta: 'Learn More',
      link: '/ip-shield',
      icon: Shield,
      accentClass: 'bg-primary',
    },
    {
      id: 'affiliate',
      title: t('landing.affiliateTitle'),
      description: t('landing.affiliateDesc'),
      cta: t('landing.affiliateCta'),
      link: '/affiliate',
      icon: Users,
      accentClass: 'bg-primary',
    },
    {
      id: 'seller',
      title: t('landing.sellerTitle'),
      description: t('landing.sellerDesc'),
      cta: t('landing.sellerCta'),
      link: '/account',
      icon: Store,
      accentClass: 'bg-primary',
    },
    {
      id: 'credits',
      title: 'Save on Fees with Eclipse Credits',
      description: 'Pay with credits to skip transaction fees and check out instantly.',
      cta: 'Top Up',
      link: '/wallet',
      icon: Coins,
      accentClass: 'bg-primary',
    },
  ];

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
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

  const renderSlide = (promo: typeof promotions[0]) => {
    const Icon = promo.icon;
    return (
      <Link
        to={promo.link}
        className="block px-4 sm:px-5 py-4 sm:py-4 active:bg-muted/40 transition-colors"
      >
        {/* Mobile: stacked layout, Desktop: horizontal */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <div className="flex items-start sm:items-center gap-3 min-w-0">
            <div className={`w-0.5 self-stretch sm:h-10 ${promo.accentClass} rounded-full shrink-0`} />
            <div className="flex items-center gap-2.5 shrink-0">
              <Icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-[13px] text-foreground uppercase tracking-wide leading-snug">
                {promo.title}
              </h3>
              <p className="text-xs text-muted-foreground line-clamp-2 sm:line-clamp-1 mt-0.5">
                {promo.description}
              </p>
            </div>
          </div>
          <div className="shrink-0 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary sm:text-muted-foreground pl-[calc(0.125rem+0.75rem+2.5rem)] sm:pl-0">
            {promo.cta}
            <ArrowRight className="h-3.5 w-3.5" />
          </div>
        </div>
      </Link>
    );
  };

  return (
    <div className="border border-border bg-card rounded-md overflow-hidden">
      <div ref={emblaRef} className="overflow-hidden">
        <div className="flex">
          {promotions.map((promo) => (
            <div key={promo.id} className="flex-[0_0_100%] min-w-0">
              {renderSlide(promo)}
            </div>
          ))}
        </div>
      </div>

      {/* Dots */}
      <div className="flex justify-center gap-1.5 pb-3">
        {promotions.map((_, index) => (
          <button
            key={index}
            onClick={() => scrollTo(index)}
            className={`h-0.5 rounded-full transition-all duration-300 ${
              index === selectedIndex ? 'bg-foreground w-5' : 'bg-border w-2'
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
